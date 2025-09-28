// src/components/EventActivityTreemap.jsx
import { useMemo } from "react";
import { ResponsiveContainer, Treemap } from "recharts";

/**
 * props:
 *  - data: [{ t, <key1>:number, <key2>:number, ... }]
 *  - series: [{ key, label, grad:[from,to], dot }]
 *  - topN:number (default 8) -> demais viram "other"
 *  - showLegends:boolean
 *  - className, height
 */
export default function EventActivityTreemap({
  data,
  series,
  topN = 8,
  showLegends = true,
  className = "",
  height = 240,
}) {
  const labelByKey = useMemo(
    () => Object.fromEntries(series.map(s => [s.key, s.label])),
    [series]
  );
  const colorByKey = useMemo(
    () => Object.fromEntries(series.map(s => [s.key, s.grad?.[1] || "#8884d8"])),
    [series]
  );

  // soma total de cada chave no período visível
  const totals = useMemo(() => {
    const acc = Object.create(null);
    if (!data?.length) return acc;
    for (const row of data) {
      for (const s of series) {
        const k = s.key;
        if (k === "t") continue;
        acc[k] = (acc[k] || 0) + (row[k] || 0);
      }
    }
    return acc;
  }, [data, series]);

  // rankeia e mantém topN; agrega resto em "other"
  const ranked = useMemo(() => {
    const rows = Object.entries(totals)
      .filter(([k]) => k !== "t")
      .map(([k, v]) => ({ key: k, total: v || 0 }))
      .sort((a, b) => b.total - a.total);

    const keep = rows.slice(0, topN);
    const rest = rows.slice(topN);
    const otherSum = rest.reduce((s, r) => s + r.total, 0);

    const base = keep.map(r => ({
      name: labelByKey[r.key] || r.key,
      key: r.key,
      size: r.total || 0,
      fill: colorByKey[r.key] || "#8884d8",
    }));

    if (otherSum > 0) {
      const otherSerie = series.find(s => s.key === "other");
      base.push({
        name: (otherSerie?.label) || "outros",
        key: "other",
        size: otherSum,
        fill: (otherSerie?.grad?.[1]) || "#a855f7",
      });
    }

    if (base.length === 0) {
      base.push({ name: "sem dados", key: "empty", size: 1, fill: "#3f3f46" });
    }

    return base;
  }, [totals, topN, labelByKey, colorByKey, series]);

  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={ranked}
            dataKey="size"
            stroke="#fff"
            fill="#8884d8"
            aspectRatio={4 / 3}
            isAnimationActive={false}
            content={<Tile />}
          />
        </ResponsiveContainer>
      </div>

      {showLegends && (
        <div className="mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-2">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
            Legenda (Top {Math.min(topN, ranked.length)})
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {ranked.map(n => (
              <span key={n.key} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: n.fill }} />
                <span className="opacity-80">
                  {n.name} <span className="opacity-60">({n.size})</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Tile customizado: rótulo e valor dentro do retângulo (com truncamento)
function Tile(props) {
  const { x, y, width, height, name, size, fill } = props;
  if (width <= 12 || height <= 12) {
    return <rect x={x} y={y} width={width} height={height} fill={fill} stroke="rgba(255,255,255,0.8)" />;
  }
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="rgba(255,255,255,0.8)" />
      <text x={x + 6} y={y + 16} fill="#ffffff" fontSize={11} style={{ pointerEvents: "none" }}>
        {name}
      </text>
      <text x={x + 6} y={y + 30} fill="#ffffff" fontSize={11} style={{ pointerEvents: "none", opacity: 0.85 }}>
        {size}
      </text>
    </g>
  );
}
