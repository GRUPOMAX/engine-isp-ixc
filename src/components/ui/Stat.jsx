import React from "react";

export default function Stat({ label, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: "bg-neutral-100/60 dark:bg-neutral-900/60",
    ok: "bg-emerald-100/60 dark:bg-emerald-900/30",
    warn: "bg-amber-100/60 dark:bg-amber-900/30",
    err: "bg-red-100/60 dark:bg-red-900/30",
  };

  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
      {hint ? <div className="text-[11px] text-neutral-500 mt-1">{hint}</div> : null}
    </div>
  );
}
