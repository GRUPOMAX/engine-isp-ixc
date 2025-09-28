import { useState } from 'react';
import { api } from '@/lib/api';

export default function RefreshCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const onRefresh = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await api.refreshCache();
      setResult(r);
    } catch (e) {
      setResult({ erro: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/30 p-4 flex flex-col gap-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Refresh Cache</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-sm font-medium bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? 'Executando…' : 'Executar'}
        </button>
      </div>

      {/* resultado resumido */}
      {result && !result.erro && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Kpi label="Status" value={result.ok ? 'OK' : 'Erro'} color={result.ok ? 'green' : 'red'} />
          <Kpi label="Count" value={result.count} />
          <Kpi
            label="Atualizado"
            value={result.updated_at ? new Date(result.updated_at).toLocaleString() : '—'}
          />
        </div>
      )}

      {/* erro */}
      {result?.erro && (
        <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
          Erro: {result.erro}
        </div>
      )}

      {/* toggle JSON */}
      {result && (
        <button
          onClick={() => setShowRaw((s) => !s)}
          className="self-end text-xs text-neutral-500 hover:underline"
        >
          {showRaw ? 'Esconder JSON' : 'Ver JSON'}
        </button>
      )}

      {/* JSON bruto */}
      {showRaw && result && (
        <pre className="max-h-56 overflow-auto rounded-lg bg-neutral-100/70 dark:bg-neutral-900/70 p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Kpi({ label, value, color }) {
  const colorClass =
    color === 'green'
      ? 'text-green-600 dark:text-green-300'
      : color === 'red'
      ? 'text-red-600 dark:text-red-300'
      : 'text-neutral-700 dark:text-neutral-300';

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className={`text-sm font-semibold mt-0.5 ${colorClass}`}>{value}</div>
    </div>
  );
}
