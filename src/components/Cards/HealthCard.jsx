import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function HealthCard() {
  const [status, setStatus] = useState('…');

  const load = async () => {
    try {
      const r = await api.healthz();
      setStatus(r?.ok ? 'OK' : 'ERRO');
    } catch {
      setStatus('ERRO');
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const color =
    status === 'OK'
      ? 'bg-green-500'
      : status === 'ERRO'
      ? 'bg-red-500'
      : 'bg-yellow-500';

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/30 p-4 flex flex-col gap-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full shadow-sm ${color}`}
          />
          <h2 className="font-medium tracking-tight">Saúde</h2>
        </div>
        <span className="text-xs text-neutral-500 font-mono">/healthz</span>
      </div>

      {/* status box */}
      <div
        className={`
          flex items-center justify-center
          rounded-lg border px-3 py-2 text-sm font-semibold
          ${
            status === 'OK'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
              : status === 'ERRO'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
              : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
          }
        `}
      >
        {status}
      </div>
    </div>
  );
}
