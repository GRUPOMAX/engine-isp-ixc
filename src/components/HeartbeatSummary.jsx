// src/components/HeartbeatSummary.jsx
import { useEffect, useMemo, useState } from "react";

function fmtSecs(s) {
  if (s == null) return "-";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtEta(ms) {
  if (ms == null) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  return fmtSecs(s);
}

/**
 * Props:
 *  - hb: objeto heartbeat do backend
 *  - sse: { connected:boolean, latencyMs:number|null, serverNow:number|null }
 *  - showLegends:boolean, setShowLegends: fn
 *  - now: number (opcional) — timestamp ms vindo de fora para sincronizar relógio
 */
export default function HeartbeatSummary({
  hb,
  sse = {},
  showLegends,
  setShowLegends,
  now: nowProp, // ✅ agora o prop existe
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [nowLocal, setNowLocal] = useState(() => Date.now());

  // relógio interno de 1s quando não vier "now" por prop
  useEffect(() => {
    if (nowProp != null) return;
    const t = setInterval(() => setNowLocal(Date.now()), 1000);
    return () => clearInterval(t);
  }, [nowProp]);

  const now = nowProp ?? nowLocal;

  const {
    service,
    startedAt,
    lastTickAt,
    lastOkAt,
    lastError,
    consecutiveErrors,
    ticksTotal,
    lastSummary,
    upForSeconds,
    staleForSeconds,
    status,
    intervalMinutes,
  } = hb || {};

  const { connected: sseConnected, latencyMs: sseLatencyMs, serverNow } = sse;

  // uptime vivo
  const upDisplaySec = useMemo(() => {
    if (startedAt) {
      const started = typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime();
      return Math.max(0, Math.floor((now - started) / 1000));
    }
    return upForSeconds ?? 0;
  }, [startedAt, upForSeconds, now]);

  // stale real (preferindo relógio do servidor se presente)
  const computedStaleSec = useMemo(() => {
    if (staleForSeconds != null) return staleForSeconds;
    const base = serverNow ?? now;
    if (!base || !lastTickAt) return null;
    const last = typeof lastTickAt === "number" ? lastTickAt : new Date(lastTickAt).getTime();
    return Math.max(0, Math.floor((base - last) / 1000));
  }, [staleForSeconds, serverNow, lastTickAt, now]);

  const staleDisplaySec = computedStaleSec ?? 0;

  const nextEtaMs = useMemo(() => {
    const syncMin = intervalMinutes?.sync;
    if (!syncMin || !lastTickAt || !serverNow) return null;
    const last = typeof lastTickAt === "number" ? lastTickAt : new Date(lastTickAt).getTime();
    const intervalMs = syncMin * 60_000;
    const nextAt = last + intervalMs;
    return nextAt - serverNow;
  }, [intervalMinutes, lastTickAt, serverNow]);

  const derivedStatus = useMemo(() => {
    if (status) return status;
    const syncMin = intervalMinutes?.sync ?? 1;
    const softStale = syncMin * 60 * 1.5;
    const hardStale = syncMin * 60 * 3;
    const s = staleDisplaySec;
    if (s >= hardStale) return "degradado";
    if (s >= softStale) return "stale";
    return "ok";
  }, [status, intervalMinutes, staleDisplaySec]);

  const fase = lastSummary?.fase;
  const sumPairs = useMemo(() => {
    if (!lastSummary) return [];
    return Object.entries(lastSummary)
      .filter(([k]) => k !== "fase")
      .map(([k, v]) => ({ k, v }));
  }, [lastSummary]);

  const dotCls =
    derivedStatus === "ok"
      ? "bg-emerald-500"
      : derivedStatus === "stale"
      ? "bg-amber-500"
      : derivedStatus === "degradado"
      ? "bg-rose-500"
      : "bg-neutral-400";

  const errRate =
    typeof consecutiveErrors === "number" && typeof ticksTotal === "number" && ticksTotal > 0
      ? `${Math.round((consecutiveErrors / ticksTotal) * 100)}%`
      : "—";

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/30 p-3 md:p-4 w-full max-w-full overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full ${dotCls}`} />
          <div className="text-sm font-medium truncate max-w-[60vw] md:max-w-none">
            {service ?? "—"}
          </div>

          <Chip label="status" value={derivedStatus} />
          <Chip label="erros seguidos" value={consecutiveErrors ?? "—"} />
          <Chip label="erro %" value={errRate} />
          {fase && <Chip label="fase" value={fase} intent="info" />}

          <Chip
            label="SSE"
            value={sseConnected ? "conectado" : "reconectando"}
            intent={sseConnected ? "ok" : "warn"}
          />
          <Chip label="latência" value={sseLatencyMs != null ? `${sseLatencyMs}ms` : "—"} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLegends?.((s) => !s)}
            className="text-xs rounded-lg border border-neutral-300/60 dark:border-neutral-700 px-2 py-1 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60"
          >
            {showLegends ? "Esconder legendas" : "Exibir legendas"}
          </button>
          <button
            onClick={() => setShowRaw((s) => !s)}
            className="text-xs rounded-lg border border-neutral-300/60 dark:border-neutral-700 px-2 py-1 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60"
          >
            {showRaw ? "Esconder JSON" : "Ver JSON"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Uptime" value={fmtSecs(upDisplaySec)} />
        <Kpi label="Stale" value={fmtSecs(staleDisplaySec)} />
        <Kpi label="Ticks total" value={typeof ticksTotal === "number" ? ticksTotal : 0} />
        <Kpi label="Últ. OK" value={lastOkAt ? new Date(lastOkAt).toLocaleTimeString() : "—"} />
      </div>

      {/* DETALHES */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
        <Info label="Iniciado" value={startedAt ? new Date(startedAt).toLocaleString() : "—"} />
        <Info label="Últ. Tick" value={lastTickAt ? new Date(lastTickAt).toLocaleString() : "—"} />
        <Info
          label="Intervalos"
          value={
            intervalMinutes
              ? `sync: ${intervalMinutes.sync}m • reconcile: ${intervalMinutes.reconcile}m`
              : "—"
          }
        />
        <Info label="Próx. tick (ETA)" value={fmtEta(nextEtaMs)} />
        <Info label="Últ. erro" value={lastError ? String(lastError) : "—"} />
      </div>

      {sumPairs.length > 0 && (
        <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            Resumo da fase {fase}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sumPairs.map(({ k, v }) => (
              <Kpi key={k} label={k} value={String(v)} compact />
            ))}
          </div>
        </div>
      )}

      {showRaw && (
        <pre className="mt-3 max-h-56 md:max-h-64 w-full max-w-full overflow-x-auto overflow-y-auto rounded-lg bg-neutral-100/70 dark:bg-neutral-900/70 p-2 md:p-3 text-[11px] md:text-xs break-all">
{JSON.stringify(hb, null, 2)}
        </pre>
      )}

      {showLegends && <LegendFooter />}
    </div>
  );
}

function Chip({ label, value, intent }) {
  const base = "text-[11px] rounded-md px-2 py-0.5 whitespace-nowrap";
  const tone =
    intent === "ok"
      ? "bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
      : intent === "warn"
      ? "bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
      : intent === "info"
      ? "bg-cyan-100/60 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300";
  return (
    <span className={`${base} ${tone}`}>
      {label}: <b className="font-semibold">{value}</b>
    </span>
  );
}

function Kpi({ label, value, compact }) {
  return (
    <div className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 ${compact ? "p-2" : "p-2 md:p-3"}`}>
      <div className="text-[10px] md:text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="text-sm md:text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-2 md:p-3">
      <div className="text-[10px] md:text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 break-words">{value}</div>
    </div>
  );
}

function LegendFooter() {
  return (
    <div className="mt-3 border-t border-neutral-200 dark:border-neutral-800 pt-2">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Legenda</div>
      <div className="flex flex-wrap gap-3 text-xs">
        <LegendDot color="bg-emerald-500" label="openConectado" />
        <LegendDot color="bg-cyan-500" label="heartbeat" />
        <LegendDot color="bg-fuchsia-500" label="outros" />
      </div>
    </div>
  );
}
function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="opacity-80">{label}</span>
    </span>
  );
}
