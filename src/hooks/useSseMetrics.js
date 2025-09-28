// src/hooks/useSseMetrics.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { connectSSE } from '@/lib/sse';

// mapeia evento/canal → nó da tua rede
function resolveNode({ eventName, ch }) {
  const e = String(eventName || '').toLowerCase();
  const c = String(ch || '').toLowerCase();

  if (e.includes('heartbeat') || c === 'heartbeat') return 'heartbeat';
  if (e.startsWith('sync') || c === 'sync') return 'sync';
  if (e.startsWith('reconcile') || c === 'reconcile') return 'reconcile';
  if (e.startsWith('db.') || e === 'db' || c === 'db') return 'db';
  if (e.startsWith('isp') || c === 'isp') return 'api';
  if (e.startsWith('ixc') || c === 'ixc') return 'api';
  if (e.startsWith('cache') || c === 'cache') return 'cache';
  if (e.startsWith('job') || c === 'jobs' || c === 'workers') return 'jobs';
  if (e.startsWith('event.') || c === 'events') return 'events';
  if (e.includes('health')) return 'healthz';
  return 'core';
}

export function useSseMetrics({ url = '/events/tap', event = 'heartbeat', interval = 1000, focus = 'all' } = {}) {
  const [connected, setConnected] = useState(false);
  const [latencyMs, setLatency]   = useState(null);

  // contadores por nó (o AdminNeural já espera isso)
  const countsRef = useRef(Object.create(null));
  const [tick, setTick] = useState(0);

  // janela p/ taxa média
  const historyRef = useRef([]);

  useEffect(() => {
    // abre a conexão no TAP
    const es = connectSSE({
      url,
      params: { event, interval },
      onOpen: () => setConnected(true),
      onError: () => setConnected(false),
      onMessage: () => {}, // “message” genérico
    });

    // catálogo: auto-assina nomes novos
    es.on('event.catalog', (names) => {
      if (!Array.isArray(names)) return;
      names.forEach((name) => {
        es.on(name, (data) => {
          // payload do TAP: { __ch, ts, payload }
          const ch = data && data.__ch;
          const payload = data && data.payload !== undefined ? data.payload : data;

          // latência se houver timestamp “now”
          const nowTs =
            (payload && typeof payload === 'object' && payload.now) ? Number(payload.now) :
            (data && typeof data === 'object' && data.ts)          ? Number(data.ts) :
            null;
          if (nowTs && Number.isFinite(nowTs)) {
            const l = Date.now() - nowTs;
            if (l >= 0 && l < 60_000) setLatency(l);
          }

          const node = resolveNode({ eventName: name, ch });

          // filtro visual (opcional): se quiser destacar só um domínio
          if (focus !== 'all') {
            const focusLc = String(focus).toLowerCase();
            const matchByCh = ch && ch.toLowerCase() === focusLc;
            const matchByNode = node.toLowerCase() === focusLc;
            if (!matchByCh && !matchByNode) return; // ignora
          }

          countsRef.current[node] = (countsRef.current[node] || 0) + 1;
          setTick((t) => t + 1);
        });
      });
    });

    // também assina alguns nomes conhecidos de saída (caso catálogo demore)
    [
      'heartbeat',
      'sync.run','sync.done','sync.error',
      'reconcile.match','reconcile.miss','reconcile.error',
      'db.create','db.migrate','db.error',
      'isp.check','isp.error',
      'igc.check','igc.error',
      'event.log'
    ].forEach((name) => {
      es.on(name, (data) => {
        const ch = data && data.__ch;
        const payload = data && data.payload !== undefined ? data.payload : data;

        const nowTs =
          (payload && typeof payload === 'object' && payload.now) ? Number(payload.now) :
          (data && typeof data === 'object' && data.ts)          ? Number(data.ts) :
          null;
        if (nowTs && Number.isFinite(nowTs)) {
          const l = Date.now() - nowTs;
          if (l >= 0 && l < 60_000) setLatency(l);
        }

        const node = resolveNode({ eventName: name, ch });

        if (focus !== 'all') {
          const focusLc = String(focus).toLowerCase();
          const matchByCh = ch && ch.toLowerCase() === focusLc;
          const matchByNode = node.toLowerCase() === focusLc;
          if (!matchByCh && !matchByNode) return;
        }

        countsRef.current[node] = (countsRef.current[node] || 0) + 1;
        setTick((t) => t + 1);
      });
    });

    return () => es.close();
  }, [url, event, interval, focus]);

  // taxa média nos últimos 5s
  useEffect(() => {
    const now = Date.now();
    const snap = { ...countsRef.current };
    const hist = historyRef.current;
    hist.push({ t: now, snap });
    while (hist.length && now - hist[0].t > 5000) hist.shift();
  }, [tick]);

  const counts = useMemo(() => ({ ...countsRef.current }), [tick]);

  const rates = useMemo(() => {
    const hist = historyRef.current;
    if (hist.length < 2) return {};
    const first = hist[0], last = hist[hist.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return {};
    const out = {};
    const keys = new Set([...Object.keys(last.snap), ...Object.keys(first.snap)]);
    for (const k of keys) {
      const a = last.snap[k] || 0;
      const b = first.snap[k] || 0;
      out[k] = Number(((a - b) / dt).toFixed(1));
    }
    return out;
  }, [tick]);

  return { connected, counts, rates, latencyMs };
}
