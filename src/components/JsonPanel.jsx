import { useMemo, useState } from "react";

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function JsonPanel({ title = "resultado", data }) {
  const [open, setOpen] = useState(true);
  const [compact, setCompact] = useState(false);

  const pretty = useMemo(() => {
    if (data == null) return "null";
    try {
      return compact ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data, compact]);

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 bg-white/70 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="text-xs text-neutral-600 dark:text-neutral-300">{title}</div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
            <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} />
            compacto
          </label>
          <button
            onClick={() => navigator.clipboard.writeText(pretty)}
            className="text-xs px-2 py-1 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Copiar
          </button>
          <button
            onClick={() => downloadText(`resultado-${Date.now()}.json`, pretty)}
            className="text-xs px-2 py-1 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Baixar
          </button>
          <button
            onClick={() => setOpen(v => !v)}
            className="text-xs px-2 py-1 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {open ? "Esconder" : "Mostrar"}
          </button>
        </div>
      </div>
      {open && (
        <pre className="p-3 text-xs text-neutral-800 dark:text-neutral-200 overflow-x-auto">{pretty}</pre>
      )}
    </div>
  );
}
