// src/components/controls/SseControlBar.jsx
import { useEffect, useRef } from "react";

export default function SseControlBar({
  connected,
  latencyMs,
  interval,
  setIntervalMs,
  focus,
  setFocus,
  onPauseToggle,
  paused,
}) {
  const ref = useRef(null);

  // garante foco=all sempre
  useEffect(() => {
    if (focus !== "all") setFocus?.("all");
  }, [focus, setFocus]);

  // espelha o valor do intervalo no input
  useEffect(() => {
    if (ref.current) ref.current.value = String(interval ?? "");
  }, [interval]);

  const badgeTone = connected
    ? "border-emerald-500/70 text-emerald-400 bg-emerald-500/10"
    : "border-amber-500/70 text-amber-400 bg-amber-500/10";

  return (
    <div className="w-full rounded-xl border border-neutral-200/60 dark:border-neutral-800/70 bg-white/40 dark:bg-neutral-900/40 backdrop-blur p-2.5 md:p-3 flex flex-wrap items-center gap-2 md:gap-3">
      {/* status */}
      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs border ${badgeTone}`}>
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
        {connected ? "SSE: conectado" : "SSE: reconectando…"}
      </span>

      {/* latência */}
      <span className="text-xs opacity-80">
        latência: <b>{latencyMs != null ? `${latencyMs} ms` : "—"}</b>
      </span>

      {/* foco fixo */}
      <span
        className="ml-auto inline-flex items-center gap-2 rounded-lg border border-neutral-300/60 dark:border-neutral-700/70 bg-neutral-50/60 dark:bg-neutral-800/50 px-2.5 py-1 text-[11px]"
        title="Canal de foco"
      >
        foco: <b className="tracking-wide">todos</b>
      </span>

      {/* intervalo */}
      <label className="inline-flex items-center gap-1.5 text-xs">
        <span className="opacity-70">intervalo</span>
        <div className="relative">
          <input
            ref={ref}
            type="number"
            min={250}
            step={250}
            inputMode="numeric"
            className="w-24 rounded-md bg-neutral-900/30 dark:bg-neutral-900/40 border border-neutral-300/60 dark:border-neutral-700/70 px-2 py-1 pr-8"
            onChange={(e) => setIntervalMs(Number(e.target.value || 1000))}
            aria-label="Intervalo em milissegundos"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] opacity-70">
            ms
          </span>
        </div>
      </label>

      {/* pause/continue */}
      <button
        onClick={onPauseToggle}
        className="text-xs rounded-lg border border-neutral-300/60 dark:border-neutral-700/70 px-2.5 py-1 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 transition-colors"
      >
        {paused ? "Continuar" : "Pausar"}
      </button>
    </div>
  );
}
