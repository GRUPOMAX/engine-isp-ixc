import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { connectSSE } from '@/lib/sse';
import EventActivityTreemap from '@/components/EventActivityTreemap';
import HeartbeatSummary from '@/components/HeartbeatSummary';

// Séries empilhadas por origem (ordem importa)
const SERIES = [
  { key: 'open',       label: 'openConectado', grad: ['#34D399', '#10B981'], dot: 'bg-emerald-500' },
  { key: 'heartbeat',  label: 'heartbeat',     grad: ['#22D3EE', '#06B6D4'], dot: 'bg-cyan-500'    },
  { key: 'api',        label: 'API',           grad: ['#38BDF8', '#0EA5E9'], dot: 'bg-sky-500'     },
  { key: 'rule',       label: 'RULE',          grad: ['#A78BFA', '#8B5CF6'], dot: 'bg-violet-500'  },
  { key: 'db',         label: 'DB',            grad: ['#94A3B8', '#64748B'], dot: 'bg-slate-500'   },
  { key: 'engine',     label: 'ENGINE',        grad: ['#FDE047', '#F59E0B'], dot: 'bg-amber-500'   },
  { key: 'cache',      label: 'Cache',         grad: ['#FCA5A5', '#EF4444'], dot: 'bg-rose-500'    },
  { key: 'sync',       label: 'sync',          grad: ['#34D399', '#10B981'], dot: 'bg-emerald-600' },
  { key: 'reconcile',  label: 'reconcile',     grad: ['#F472B6', '#DB2777'], dot: 'bg-pink-500'    },
  { key: 'healthz',    label: 'healthz',       grad: ['#F59E0B', '#B45309'], dot: 'bg-amber-600'   },
  { key: 'ixc',        label: 'IXC',           grad: ['#60A5FA', '#2563EB'], dot: 'bg-blue-500'    },
  { key: 'isp',        label: 'ISP',           grad: ['#2DD4BF', '#0D9488'], dot: 'bg-teal-500'    },
  { key: 'events',     label: 'events',        grad: ['#F97316', '#EA580C'], dot: 'bg-orange-500'  },
  { key: 'sse',        label: 'SSE',           grad: ['#93C5FD', '#3B82F6'], dot: 'bg-blue-400'    },
  { key: 'other',      label: 'outros',        grad: ['#E879F9', '#D946EF'], dot: 'bg-fuchsia-500' },
];

const seriesByKey = SERIES.reduce((a, s) => ((a[s.key] = s), a), {});

function Dot({ source }) {
  const cls = seriesByKey[source]?.dot || seriesByKey.other.dot;
  return <span className={`mt-1 inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function Row({ evt }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-200/40 dark:border-neutral-800/60 py-2">
      <div className="flex items-start gap-2">
        <Dot source={evt.source} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-neutral-500">{evt.time}</div>
          <div className="text-sm font-medium break-words">{evt.name}</div>
          {evt.data && (
            <button
              onClick={() => setOpen(o => !o)}
              className="mt-1 text-[11px] px-2 py-0.5 rounded border border-neutral-700/40 hover:bg-neutral-800/40"
            >
              {open ? 'Esconder payload' : 'Ver payload'}
            </button>
          )}
        </div>
      </div>
      {evt.data && open && (
        <pre className="mt-1 rounded-lg bg-neutral-100/60 dark:bg-neutral-900/60 p-2 text-xs max-h-40 w-full max-w-full overflow-auto">
          {JSON.stringify(evt.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// normaliza strings de canal/serviço
function normalizeKey(v) {
  const k = String(v || '').toLowerCase();
  if (!k) return '';
  if (k.startsWith('db')) return 'db';
  if (k.includes('engine')) return 'engine';
  if (k.includes('health')) return 'healthz';
  if (k.includes('cache')) return 'cache';
  if (k.includes('reconcile')) return 'reconcile';
  if (k.includes('heartbeat')) return 'heartbeat';
  if (k.includes('events')) return 'events';
  if (k.includes('ixc')) return 'ixc';
  if (k.includes('isp')) return 'isp';
  if (k.includes('api')) return 'api';
  if (k.includes('rule')) return 'rule';
  if (k.includes('sync')) return 'sync';
  if (k.includes('sse')) return 'sse';
  return k;
}

// classifica origem: prioriza __ch; senão, tenta pelo nome do evento e por labels do payload
function classifySource(eventName, data) {
  const ch = normalizeKey(data?.__ch);
  if (seriesByKey[ch]) return ch;

  const n = normalizeKey(eventName);
  if (seriesByKey[n]) return n;

  const label = normalizeKey(data?.payload?.label || data?.label);
  if (seriesByKey[label]) return label;

  if (['ok', 'call', 'log.info', 'log.warn', 'start', 'done', 'tick', 'counts', 'write', 'replace', 'skip_overlap'].includes(eventName)) {
    return seriesByKey[ch] ? ch : 'other';
  }
  if (eventName === 'openconectado') return 'open';
  if (eventName === 'message') return 'other';
  return seriesByKey[eventName] ? eventName : 'other';
}

// janela e agregadores
const WINDOW_SECONDS = 60;

function emptyBucket(t) {
  const b = { t };
  for (const { key } of SERIES) b[key] = 0;
  return b;
}

export default function EventLog({
  ssePath = '/events/tap',
  intervalMs = 15000,
  listen = ['sync','reconcile','events','healthz','isp','ixc'],
}) {
  const [connected, setConnected] = useState(false);

  const [items, setItems] = useState([]);
  const feedRef = useRef(null);

  const [buckets, setBuckets] = useState([]);

  const [lastHb, setLastHb] = useState(null);
  const [serverNow, setServerNow] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);

  // ---- AGGREGADOR EM LOTE ----
  const pendingRef = useRef(Object.create(null)); // { sec: { key: count } }
  const lastFlushedSecRef = useRef(null);
  const flushTimerRef = useRef(null);

  const flushBuckets = useCallback(() => {
    flushTimerRef.current = null;
    const entries = Object.entries(pendingRef.current);
    if (!entries.length) return;

    setBuckets(prev => {
      let next = [...prev];
      let last = next[next.length - 1]?.t;

      for (const [secStr, counts] of entries.sort((a, b) => Number(a[0]) - Number(b[0]))) {
        const sec = Number(secStr);

        if (last == null) {
          next.push(emptyBucket(sec));
        } else if (sec > last) {
          for (let s = last + 1; s <= sec; s++) next.push(emptyBucket(s));
        }

        const i = next.length - 1;
        const updated = { ...next[i] };
        for (const k in counts) {
          const key = seriesByKey[k] ? k : 'other';
          updated[key] = (updated[key] || 0) + counts[k];
        }
        next[i] = updated;
        last = sec;
      }

      const lastSec = next[next.length - 1]?.t ?? lastFlushedSecRef.current;
      const cutoff = lastSec - WINDOW_SECONDS + 1;
      next = next.filter(b => b.t >= cutoff);
      return next;
    });

    pendingRef.current = Object.create(null);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(flushBuckets, 250); // ~4 fps
  }, [flushBuckets]);

  const recordActivity = useCallback((originKey, tsMs = Date.now()) => {
    const key = seriesByKey[originKey] ? originKey : 'other';
    const sec = Math.floor(tsMs / 1000);
    const slot = (pendingRef.current[sec] ||= Object.create(null));
    slot[key] = (slot[key] || 0) + 1;
    lastFlushedSecRef.current = sec;
    scheduleFlush();
  }, [scheduleFlush]);

  useEffect(() => () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  }, []);

  // ---- helpers UI ----
 const safeJson = (v) => {
   if (v == null || typeof v === 'object') return v ?? null;
   try { return JSON.parse(v); } catch { return null; }
 };

  const updateLatency = useCallback((sampleMs) => {
    if (typeof sampleMs !== 'number' || !isFinite(sampleMs)) return;
    setLatencyMs(prev => (prev == null ? sampleMs : Math.round(prev * 0.7 + sampleMs * 0.3)));
  }, []);

  const pushFeed = useCallback((e) => {
    setItems(prev => {
      const next = [...prev, { ...e, time: new Date().toLocaleTimeString() }].slice(-200);
      setTimeout(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }); }, 0);
      return next;
    });
  }, []);

  const handleGeneric = useCallback((name, raw) => {
    if (name === 'event.catalog') return; // ruído
    const data = safeJson(raw);
    const source = classifySource(name, data);
    pushFeed({ name, data, source });
    recordActivity(source, data?.ts || Date.now());
  }, [pushFeed, recordActivity]);

  useEffect(() => {
    const qs = new URLSearchParams({
      interval: String(intervalMs),
      listen: listen.join(','),
    }).toString();
    const url = `${ssePath}?${qs}`;

    const es = connectSSE(url, {
      onOpen: () => {
        setConnected(true);
        pushFeed({ name: 'openConectado', source: 'open' });
        recordActivity('open');
      },
      onError: () => setConnected(false),
      onMessage: (evt) => {
        if (evt?.data) handleGeneric('message', evt.data);
      },
    });

  es.on('heartbeat', (raw) => {
    const data = safeJson(raw) || {};
    // aceita number ou string
    const nowMs =
      typeof data.now === 'number'
        ? data.now
        : (data.now != null ? Number(data.now) : null);

    // Fallbacks para heartbeats “mínimos”
    const lastTickAt =
      data.lastTickAt != null
        ? (typeof data.lastTickAt === 'number'
            ? data.lastTickAt
            : new Date(data.lastTickAt).getTime())
        : (nowMs ?? Date.now()); // se não vier, considera o próprio now

    const lastOkAt =
      data.lastOkAt != null
        ? data.lastOkAt
        : lastTickAt;

   // intervalMinutes: do backend, OU de data.intervalMs, OU DO PROP intervalMs
   const intervalMinutes =
     data.intervalMinutes ??
     (typeof data.intervalMs === 'number'
       ? { sync: Math.max(1, Math.round(data.intervalMs / 60000)), reconcile: null }
       : { sync: Math.max(1, Math.round(Number(intervalMs) / 60000) || 1), reconcile: null });

   const upForSeconds =
     data.upForSeconds != null
       ? data.upForSeconds
       : (data.startedAt
           ? Math.max(0, Math.floor(((nowMs ?? Date.now()) - new Date(data.startedAt).getTime()) / 1000))
           : 0);

    const enhanced = {
      service: data.service ?? 'engine',
      startedAt: data.startedAt ?? null,
      lastTickAt,
      lastOkAt,
      lastError: data.lastError ?? null,
      consecutiveErrors: data.consecutiveErrors ?? null,
      ticksTotal: (data.ticksTotal ?? data.ticks ?? data.totalTicks ?? data.total ?? 0),
      lastSummary: data.lastSummary ?? null,
      upForSeconds,
      staleForSeconds: data.staleForSeconds ?? null,
      status: data.status ?? null,
      intervalMinutes,
      // preserva tudo que veio
      ...data,
    };

    if (nowMs != null) {
      setServerNow(nowMs);
      // se o relógio do servidor estiver adiantado, evita latência negativa
      const diff = Math.abs(Date.now() - nowMs);
      updateLatency(diff);
    }
    setLastHb(enhanced);
    recordActivity('heartbeat', (nowMs ?? Date.now()));
  });

    const names = [
      'ok','call','log.info','log.warn','start','done','tick','counts','write','replace','skip_overlap',
      'sync','reconcile','event.log','isp:call','isp:ok','ixc:call','ixc:ok','cache:counts','DB:counts','reconcile:done'
    ];
    for (const n of names) es.on(n, (raw) => handleGeneric(n, raw));

    ['api','db','engine','cache','healthz','rule','sse','ixc','isp','events'].forEach((n) => {
      es.on(n, (raw) => handleGeneric(n, raw));
    });

    return () => es.close();
  }, [ssePath, intervalMs, listen, handleGeneric, recordActivity, updateLatency]);

  const sseMetrics = useMemo(() => ({ connected, latencyMs, serverNow }), [connected, latencyMs, serverNow]);

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <h2 className="font-medium">Eventos (SSE)</h2>
        </div>
        <div className="text-xs text-neutral-500 flex items-center gap-3">
          <span>{ssePath}</span>
          <span className="opacity-70">latência: {latencyMs != null ? `${latencyMs}ms` : '—'}</span>
        </div>
      </div>

      <EventActivityTreemap
        data={buckets}
        series={SERIES}
        topN={6}
        showLegends
        className="mt-3"
        height={250}
      />

      {lastHb && (
        <HeartbeatSummary
          hb={lastHb}
          sse={sseMetrics}
          showLegends
          setShowLegends={() => {}}
        />
      )}

    </div>
  );
}
