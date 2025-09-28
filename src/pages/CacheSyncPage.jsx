import { useEffect, useMemo, useRef, useState } from "react";
import Btn from "../components/ui/Btn.jsx";
import ResultCards from "../components/ResultCards.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/g, "");

// apiCall com metadados p/ casos 202/204/text
async function apiCall(path, method = "GET") {
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, { method });
  const txt = await r.text();

  let body = null;
  try { body = txt ? JSON.parse(txt) : null; } catch { /* texto simples */ }

  if (!r.ok) {
    const msg = (body && (body.message || body.error)) || txt || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  const meta = { __status: r.status, __empty: !txt, __raw: txt || null };
  return body && typeof body === "object" ? { ...meta, ...body } : meta;
}

function timeAgo(ts) {
  if (!ts) return "—";
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  const units = [["d",86400],["h",3600],["m",60],["s",1]];
  for (const [u, sec] of units) if (s >= sec) return `${Math.floor(s/sec)}${u} atrás`;
  return "agora";
}

export default function CacheSyncPage() {
  const [loading, setLoading] = useState(null);
  const [status, setStatus] = useState(null);
  const [last, setLast] = useState(null);
  const [byTag, setByTag] = useState({});

  const [auto, setAuto] = useState(true);
  const [intervalMs, setIntervalMs] = useState(10000);
  const timerRef = useRef(null);

  const call = async (tag, path, method) => {
    setLoading(tag);
    try {
      const res = await apiCall(path, method);
      console.debug("[CacheSync]", tag, { path, method, res });
      const payload = { tag, res, ts: Date.now(), ok: true, path, method };
      setByTag(prev => ({ ...prev, [tag]: payload }));
      if (tag === "status") setStatus(res);
      setLast({ tag, ok: true, ts: payload.ts });
    } catch (e) {
      console.error("[CacheSync][ERR]", tag, e);
      const payload = { tag, error: String(e.message || e), ts: Date.now(), ok: false, path, method };
      setByTag(prev => ({ ...prev, [tag]: payload }));
      setLast({ tag, ok: false, ts: payload.ts });
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => { call("status", "/cache/status", "GET"); }, []);

  useEffect(() => {
    if (!auto) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => { call("status", "/cache/status", "GET"); }, Math.max(1000, Number(intervalMs) || 5000));
    return () => clearInterval(timerRef.current);
  }, [auto, intervalMs]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "r") call("refresh", "/cache/refresh", "POST");
      if (k === "s") call("status", "/cache/status", "GET");
      if (k === "a") call("recAll", "/sync/reconcile/all", "GET");
      if (k === "o") call("runOnce", "/sync/reconcile/run-once", "POST");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resumo = useMemo(() => {
    const o = byTag.runOnce?.res;
    return o?.resumo || o?.res?.resumo || null;
  }, [byTag]);

  const apiLabel = API_BASE || "(VITE_API_BASE_URL não definido)";

  const apiHost = useMemo(() => {
    try { return new URL(apiLabel).host; }
    catch { return (apiLabel || "").replace(/^https?:\/\//, ""); }
  }, [apiLabel]);

  const copyApi = () => navigator.clipboard.writeText(apiLabel || "");

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
      <h1 className="text-lg sm:text-xl font-semibold tracking-tight mb-3 sm:mb-4">Cache &amp; Sync</h1>

      <div className="rounded-xl border p-3 sm:p-4 border-neutral-200 bg-white/70 shadow-md dark:border-neutral-800 dark:bg-neutral-900/30">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]
                             border-emerald-300/40 bg-emerald-100 text-emerald-700
                             dark:border-emerald-600/40 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              API
            </span>
            {/* url truncada no mobile */}
            <code
              onClick={copyApi}
              title={apiLabel}
              className="text-[11px] text-neutral-500 dark:text-neutral-400 select-all cursor-pointer max-w-full truncate"
            >
              {apiLabel}
            </code>
          </div>

          {last && (
            <span className={`self-start sm:self-auto text-[11px] px-2 py-0.5 rounded-full border ${
              last.ok
                ? "border-emerald-400/40 bg-emerald-100 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border-rose-400/40 bg-rose-100 text-rose-700 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-300"
            }`}>
              {last.ok ? "OK" : "Erro"} • {new Date(last.ts).toLocaleTimeString()} • {timeAgo(last.ts)}
            </span>
          )}
        </div>

        {/* Ações */}
        <div className="mt-3 space-y-3">
          {/* grid de botões no mobile; flex no desktop */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="col-span-1">
              <Btn tone="emerald" busy={loading === "refresh"} className="w-full sm:w-auto"
                   onClick={() => call("refresh", "/cache/refresh", "POST")}>
                Refresh Cache (R)
              </Btn>
            </div>
            <div className="col-span-1">
              <Btn tone="sky" busy={loading === "status"} className="w-full sm:w-auto"
                   onClick={() => call("status", "/cache/status", "GET")}>
                Status Cache (S)
              </Btn>
            </div>
            <div className="col-span-1">
              <Btn tone="indigo" busy={loading === "recAll"} className="w-full sm:w-auto"
                   onClick={() => call("recAll", "/sync/reconcile/all", "GET")}>
                Reconcile All (A)
              </Btn>
            </div>
            <div className="col-span-1">
              <Btn tone="purple" busy={loading === "runOnce"} className="w-full sm:w-auto"
                   onClick={() => call("runOnce", "/sync/reconcile/run-once", "POST")}>
                Run Once (O)
              </Btn>
            </div>
          </div>

          {/* Controles de auto/intervalo: empilha no mobile */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
              auto-status
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1000} step={500} value={intervalMs}
                onChange={e => setIntervalMs(Number(e.target.value))}
                className="w-full sm:w-24 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                title="Intervalo em ms"
                inputMode="numeric"
              />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">ms</span>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-3 sm:mt-4">
          <ResultCards byTag={byTag} resumo={resumo} loadingTag={loading} />
        </div>
      </div>
    </div>
  );
}
