export default function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</div> : null}
    </div>
  );
}
