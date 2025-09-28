// src/components/AdminNeural.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSseMetrics } from "@/hooks/useSseMetrics";
import SseControlBar from "@/components/controls/SseControlBar";

const BASE_RINGS = [0.075, 0.215, 0.345]; // frações do menor lado (responsivo)
const RING_MAP = [
  { idx: 0, nodes: ["core"] },
  { idx: 1, nodes: ["api", "jobs", "db", "cache"] },
  { idx: 2, nodes: ["heartbeat", "sync", "reconcile", "events", "healthz"] },
];

const EDGES = [
  ["core", "api"], ["core", "jobs"], ["core", "db"], ["core", "cache"],
  ["api", "events"], ["api", "healthz"],
  ["jobs", "sync"], ["jobs", "reconcile"],
  ["events", "heartbeat"], ["events", "sync"], ["events", "reconcile"],
  ["db", "sync"], ["cache", "reconcile"],
];

const NODE_LABEL = {
  core: "ENGINE",
  api: "API",
  jobs: "Workers",
  db: "DB",
  cache: "Cache",
  heartbeat: "heartbeat",
  sync: "sync",
  reconcile: "reconcile",
  events: "SSE",
  healthz: "healthz",
};

// ordem da legenda
const LEGEND_ORDER = ["core","api","jobs","db","cache","heartbeat","sync","reconcile","events","healthz"];

function polarToXY(cx, cy, r, aDeg) {
  const a = (aDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function colorClassFor(id) {
  return id === "heartbeat" ? "text-cyan-500 dark:text-cyan-400"
    : id === "sync" ? "text-emerald-500 dark:text-emerald-400"
    : id === "reconcile" ? "text-fuchsia-500 dark:text-fuchsia-400"
    : id === "events" ? "text-sky-500 dark:text-sky-400"
    : id === "healthz" ? "text-amber-500 dark:text-amber-400"
    : "text-neutral-500 dark:text-neutral-400";
}

export default function AdminNeural() {
  const [intervalMs, setIntervalMs] = useState(1000);
  const [focus, setFocus] = useState("all");
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(null);
  const [showLegend, setShowLegend] = useState(true);

  const { connected, counts, rates, latencyMs } = useSseMetrics({
    url: "/events/tap",
    event: "heartbeat",
    interval: intervalMs,
    focus,
  });

  // responsivo: mede o container e recalcula layout
  const wrapRef = useRef(null);
  const [box, setBox] = useState({ w: 760, h: 520 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(320, Math.floor(entry.contentRect.width));
      let h;
      if (w < 480)      h = Math.floor(w * 1.05); // phones pequenos
      else if (w < 768) h = Math.floor(w * 0.95); // phones grandes
      else if (w < 1024)h = Math.floor(w * 0.82); // tablet
      else if (w < 1440)h = Math.floor(w * 0.78); // desktop normal
      else              h = Math.floor(w * 0.72); // wide/ultrawide
      setBox({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // piscar nó quando chega evento
  const [active, setActive] = useState({});
  useEffect(() => {
    Object.keys(counts).forEach((nodeId) => {
      setActive((prev) => ({ ...prev, [nodeId]: Date.now() }));
      const t = setTimeout(() => {
        setActive((prev) => {
          const c = { ...prev };
          if (Date.now() - (c[nodeId] ?? 0) > 1100) delete c[nodeId];
          return c;
        });
      }, 1200);
      return () => clearTimeout(t);
    });
  }, [counts, focus]);

  const layout = useMemo(() => {
    const { w: W, h: H } = box;
    const cx = W / 2, cy = H / 2;
    const base = Math.min(W, H);
    const radii = [0.075,0.215,0.345].map((f) => Math.round(base * f));
    const nodes = {};
    RING_MAP.forEach((ring, idx) => {
      const ringR = radii[idx];
      const step = 360 / ring.nodes.length;
      ring.nodes.forEach((id, j) => {
        const a = idx === 0 ? -90 : -90 + j * step;
        const { x, y } = polarToXY(cx, cy, ringR, a);
        nodes[id] = { id, x, y, ring: idx };
      });
    });
    return { W, H, cx, cy, nodes, radii };
  }, [box]);

  const { W, H, cx, cy, nodes, radii } = layout;

  // normalizadores de atividade
  const maxRate = useMemo(() => Math.max(1, ...Object.values(rates ?? {})), [rates]);
  const rateOf = (id) => Math.max(0, (rates[id] ?? 0) / maxRate);

  const onPauseToggle = () => setPaused((p) => !p);
  const isNeighbor = (a, b) =>
    a === b || EDGES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  return (
    <div className="min-h-screen
      bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(0,0,0,0.02),transparent_60%)]
      dark:bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]
      pt-[max(env(safe-area-inset-top),theme(space.2))]">
      <style>{`
        @keyframes dashFlow { to { stroke-dashoffset: -1400; } }
        .edge-flow { stroke-dasharray: 4 8; animation: dashFlow 6s linear infinite; }
        .glass {
          backdrop-filter: blur(8px) saturate(115%);
          -webkit-backdrop-filter: blur(8px) saturate(115%);
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Neural</h1>
          <SseControlBar
            connected={connected && !paused}
            latencyMs={latencyMs}
            interval={intervalMs}
            setIntervalMs={setIntervalMs}
            focus={focus}
            setFocus={setFocus}
            paused={paused}
            onPauseToggle={onPauseToggle}
          />
        </div>

        <div
          ref={wrapRef}
          className="rounded-2xl border
            border-neutral-200/80 bg-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 glass
            dark:border-neutral-800/60 dark:bg-neutral-900/30
            dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.35)]"
        >
          {/* mini toolbar do card */}
          <div className="flex items-center justify-end pb-2">
            <label className="inline-flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
                className="peer sr-only"
              />
              <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-neutral-300/70 dark:bg-neutral-700/70 transition-colors
                               peer-checked:bg-emerald-500/70">
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white dark:bg-neutral-900 shadow
                                 transition-transform peer-checked:translate-x-4" />
              </span>
              <span>legendas</span>
            </label>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: `${H}px` }}
            className="text-neutral-300 dark:text-neutral-700"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="ringGrad" r="100%">
                <stop offset="65%" stopColor="currentColor" stopOpacity="0.35" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* anéis */}
            <g className="stroke-neutral-300/70 dark:stroke-neutral-700/40">
              {radii.map((r, i) => (
                <circle key={i} cx={cx} cy={cy} r={r + (i ? 0 : 4)} fill="none" strokeWidth="0.7" />
              ))}
            </g>

            {/* arestas */}
            <g>
              {EDGES.map(([a, b], i) => {
                const A = nodes[a], B = nodes[b];
                const activity = Math.max(rateOf(a), rateOf(b));
                const thick = 0.8 + activity * 2.4;
                const opac = 0.20 + activity * 0.55;

                // curva sutil
                const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
                const dx = B.y - A.y, dy = A.x - B.x;
                const bend = 0.06 * Math.hypot(B.x - A.x, B.y - A.y);
                const cx1 = mx + (dx * bend) / Math.hypot(dx, dy);
                const cy1 = my + (dy * bend) / Math.hypot(dx, dy);

                const highlighted =
                  !hover || hover === a || hover === b || isNeighbor(hover, a) || isNeighbor(hover, b);

                return (
                  <path
                    key={i}
                    d={`M ${A.x} ${A.y} Q ${cx1} ${cy1} ${B.x} ${B.y}`}
                    className="edge-flow"
                    stroke="currentColor"
                    strokeWidth={thick}
                    strokeOpacity={highlighted ? opac : 0.08}
                    fill="none"
                  />
                );
              })}
            </g>

            {/* nós (somente ÍCONE + NOME — sem contadores no gráfico) */}
            {Object.values(nodes).map((n) => {
              const isCore = n.id === "core";
              const isActive = active[n.id] != null;
              const colorClass = colorClassFor(n.id);
              const haloOpacity = 0.25 + rateOf(n.id) * 0.35;

              const rNode = isCore ? 12 : 8.5;
              const rOutline = isCore ? 18 : 12;
              const rPing = isCore ? 20 : 14;

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <circle r={isCore ? 24 : 18} className={`${colorClass}`} fill="url(#ringGrad)" opacity={haloOpacity} />
                  {isActive && (
                    <circle r={rPing} className={`animate-ping ${colorClass} fill-current`} style={{ opacity: 0.25 }} />
                  )}
                  <circle r={rOutline} className="fill-transparent stroke-current" strokeOpacity="0.45" strokeWidth="1.6" />
                  <circle
                    r={rNode}
                    className={`${colorClass} fill-current`}
                    style={{ filter: "url(#glow)" }}
                    title={`${n.id}\ncount=${counts[n.id] ?? 0}\nrate=${rates[n.id] ?? 0}/s`}
                  />
                  <text
                    x={0}
                    y={isCore ? -22 : -18}
                    textAnchor="middle"
                    className="text-[10px] md:text-xs fill-neutral-700 dark:fill-neutral-300"
                  >
                    {NODE_LABEL[n.id] ?? n.id}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* LEGENDA (toggleável) */}
          {showLegend && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {LEGEND_ORDER.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-xl border px-2 py-1.5
                             border-neutral-200/70 bg-white/60 text-neutral-700
                             dark:border-neutral-800/70 dark:bg-neutral-900/50 dark:text-neutral-300"
                  title={id}
                >
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClassFor(id)}`}>
                    {/* o dot usa currentColor via util abaixo */}
                  </span>
                  <span className="text-xs font-medium w-20 truncate">{NODE_LABEL[id]}</span>
                  <span className="text-[11px] tabular-nums ml-auto">
                    {(counts[id] ?? 0)} • {(rates[id] ?? 0)}s⁻¹
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
