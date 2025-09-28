// src/components/controls/SseControlBar.jsx
import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (ref.current) ref.current.value = String(interval);
  }, [interval]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 border ${connected ? "border-emerald-500 text-emerald-400" : "border-amber-500 text-amber-400"}`}>
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
        {connected ? "conectado" : "reconectando…"}
      </span>

      <div className="opacity-70">
        latência: {latencyMs != null ? `${latencyMs} ms` : '—'}
      </div>

  <label className="inline-flex items-center gap-2 ml-auto">
    <span className="opacity-70">foco</span>
    <select
      className="rounded-md bg-neutral-900/40 border border-neutral-700 px-2 py-1"
      value={focus}
      onChange={(e) => setFocus(e.target.value)}
      title="Filtra visualmente pelo canal/origem dos eventos"
    >
     <option value="all">todos</option>
      <option value="heartbeat">heartbeat</option>
      <option value="sync">sync</option>
      <option value="reconcile">reconcile</option>
      <option value="events">events</option>
      <option value="healthz">healthz</option>
      <option value="isp">isp</option>
      <option value="ixc">ixc</option>
    </select>
  </label>

      <label className="inline-flex items-center gap-2">
        <span className="opacity-70">intervalo</span>
        <input
          ref={ref}
          type="number"
          min={250}
          step={250}
          className="w-20 rounded-md bg-neutral-900/40 border border-neutral-700 px-2 py-1"
          onChange={(e) => setIntervalMs(Number(e.target.value || 1000))}
        />
        <span>ms</span>
      </label>

      <button
        onClick={onPauseToggle}
        className="rounded-md border border-neutral-700 px-2 py-1 hover:bg-neutral-800/50"
      >
        {paused ? 'Continuar' : 'Pausar'}
      </button>
    </div>
  );
}
