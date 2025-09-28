export default function Btn({ tone = "neutral", busy = false, className = "", children, ...props }) {
  const tones = {
    neutral:
      "bg-neutral-200 hover:bg-neutral-300 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100",
    emerald: "bg-emerald-600 hover:bg-emerald-500 text-white",
    sky: "bg-sky-600 hover:bg-sky-500 text-white",
    indigo: "bg-indigo-600 hover:bg-indigo-500 text-white",
    purple: "bg-purple-600 hover:bg-purple-500 text-white",
    rose: "bg-rose-600 hover:bg-rose-500 text-white",
  };
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`px-3 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60 ${tones[tone]} ${className}`}
    >
      {busy ? "Executando…" : children}
    </button>
  );
}
