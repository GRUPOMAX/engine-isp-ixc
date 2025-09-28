import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip } from "recharts";

function formatSec(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString();
}

function CustomTooltip({ active, label, payload, orderIndex, labelByKey }) {
  if (!active || !payload?.length) return null;
  const rows = [...payload].sort((a, b) => (orderIndex[a.dataKey] ?? 999) - (orderIndex[b.dataKey] ?? 999));
  return (
    <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/90 px-3 py-2 text-xs text-neutral-200 shadow-xl">
      <div className="font-medium">{formatSec(label)}</div>
      {rows.map(p => (
        <div key={p.dataKey}>
          {labelByKey[p.dataKey] || p.dataKey}: <span style={{ opacity: 0.9 }}>{p.value ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * props:
 *  - data: [{ t, <key1>:number, <key2>:number, ... }]
 *  - series: [{ key, label, grad:[from,to], dot }]
 *  - showLegends:boolean
 *  - topN:number (default 6) -> demais viram "other"
 *  - className, height
 */
export default function EventActivityBars({
  data,
  series,
  showLegends,
  topN = 6,
  className = "",
  height = 120,
}) {
  const labelByKey = useMemo(() => Object.fromEntries(series.map(s => [s.key, s.label])), [series]);
  const orderIndex = useMemo(() => Object.fromEntries(series.map((s, i) => [s.key, i])), [series]);

  // escolhe as topN séries ativas (forçando open/heartbeat)
  const { activeKeys, hasOther } = useMemo(() => {
    if (!data?.length) return { activeKeys: series.map(s => s.key), hasOther: false };
    const totals = Object.create(null);
    for (const row of data) {
      for (const { key } of series) {
        if (key === 't') continue;
        totals[key] = (totals[key] || 0) + (row[key] || 0);
      }
    }
    const ranked = series
      .filter(s => s.key !== 't' && s.key !== 'other')
      .map(s => ({ k: s.key, v: totals[s.key] || 0 }))
      .sort((a, b) => b.v - a.v);

    const keep = ranked.slice(0, topN).map(r => r.k);
    ['open', 'heartbeat'].forEach(k => { if (!keep.includes(k)) keep.unshift(k); });
    const uniq = Array.from(new Set(keep)).slice(0, topN);
    const hasOther = ranked.slice(topN).some(r => r.v > 0);
    return { activeKeys: uniq, hasOther };
  }, [data, series, topN]);

  // agrega fora do Top-N em "other"
  const aggregated = useMemo(() => {
    if (!data?.length) return data;
    return data.map(row => {
      let otherSum = 0;
      const out = { t: row.t };
      for (const { key } of series) {
        if (key === 't') continue;
        const val = row[key] || 0;
        if (activeKeys.includes(key) || key === 'other') {
          out[key] = (out[key] || 0) + val;
        } else {
          otherSum += val;
        }
      }
      if (hasOther) out.other = (out.other || 0) + otherSum;
      return out;
    });
  }, [data, series, activeKeys, hasOther]);

  const visibleSeries = useMemo(() => {
    const base = series.filter(s => activeKeys.includes(s.key));
    const maybeOther = hasOther ? series.find(s => s.key === 'other') : null;
    return maybeOther ? [...base, maybeOther] : base;
  }, [series, activeKeys, hasOther]);

  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={aggregated} barCategoryGap={2}>
            <defs>
              {visibleSeries.map(s => (
                <linearGradient key={s.key} id={`g_${s.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.grad[0]} />
                  <stop offset="100%" stopColor={s.grad[1]} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid vertical horizontal={false} strokeOpacity={0.08} />
            <XAxis
              dataKey="t"
              interval="preserveStartEnd"
              minTickGap={20}
              tickFormatter={(t) =>
                new Date(t * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
              }
              tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
            />
            <Tooltip
              isAnimationActive={false}
              content={<CustomTooltip orderIndex={orderIndex} labelByKey={labelByKey} />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            {visibleSeries.map(s => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="a"
                fill={`url(#g_${s.key})`}
                radius={[4,4,0,0]}
                isAnimationActive={false}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {showLegends && (
        <div className="mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-2">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
            Legenda (Top {activeKeys.length}{hasOther ? ' + outros' : ''})
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {visibleSeries.map(s => (
              <span key={s.key} className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                <span className="opacity-80">{s.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
