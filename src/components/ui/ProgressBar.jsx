import React from "react";

export default function ProgressBar({ pct = 0, labelLeft, labelRight }) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${safe}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safe}
        />
      </div>
    </div>
  );
}
