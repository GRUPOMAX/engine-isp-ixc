// src/components/AdminConfig.jsx
import { useCallback, useMemo, useState } from "react";
import { useAdminConfig } from "@/hooks/useAdminConfig";
import { getAdminToken, setAdminToken } from "@/lib/adminApi";

// Campos e rótulos (PORT travado)
const FIELDS = [
  { key: "PORT", label: "Porta (PORT)", type: "number", min: 1, readonly: true },
  { key: "LOG_LEVEL", label: "Nível de Log (LOG_LEVEL)", placeholder: "info | debug | warn | error" },

  { key: "IXC_CLIENTES_URL", label: "IXC Clientes URL" },
  { key: "IXC_CONTRATOS_URL", label: "IXC Contratos URL" },
  { key: "IXC_LOGINS_URL", label: "IXC Logins URL" },
  { key: "IXC_FILIAL_ID", label: "IXC Filial ID" },
  { key: "IXC_FILTRA_FILIAL", label: "IXC Filtra Filial (S/N)", placeholder: "S ou N" },

  { key: "ISP_BASE", label: "ISP Base" },
  { key: "ISP_BEARER", label: "ISP Bearer (mascarado no GET)", placeholder: "colar novo token aqui para atualizar" },

  { key: "SYNC_INTERVAL_MINUTES", label: "Sync Interval (min)", type: "number", min: 1 },
  { key: "RECONCILE_ALL_INTERVAL_MINUTES", label: "Reconcile Interval (min)", type: "number", min: 1 },
  { key: "SYNC_JITTER_MAX_SEC", label: "Sync Jitter Max (s)", type: "number", min: 0 },
  { key: "RECONCILE_JITTER_MAX_SEC", label: "Reconcile Jitter Max (s)", type: "number", min: 0 },
];

function TokenGate({ onReady }) {
  const [val, setVal] = useState(getAdminToken());
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const save = () => {
    const tok = (val || "").trim();
    if (!tok) { setErr("Informe o token administrativo."); return; }
    setAdminToken(tok);
    onReady?.();
  };

  const onKey = (e) => { if (e.key === "Enter") save(); };

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-6 max-w-2xl mx-auto text-zinc-900
                 dark:border-zinc-700/50 dark:bg-zinc-900 dark:text-zinc-100"
      style={{
        paddingTop: "calc(8px + env(safe-area-inset-top))",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      <h2 className="text-lg font-semibold mb-2">Autorização administrativa</h2>
      <p className="text-sm opacity-70 mb-3">
        Informe o token de admin para gerenciar as configurações do serviço.
      </p>

      <div className="flex gap-2 items-stretch">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={onKey}
          type={show ? "text" : "password"}
          inputMode="text"
          autoComplete="off"
          className="w-full rounded-xl bg-white border border-zinc-300 px-3 py-3 md:py-2 outline-none
                     focus:ring-2 focus:ring-sky-500
                     dark:bg-zinc-800 dark:border-zinc-700"
          placeholder="x-admin-token"
        />
        <button
          onClick={() => setShow(s => !s)}
          className="px-3 py-3 md:py-2 rounded-xl bg-zinc-100 border border-zinc-300 hover:bg-zinc-200
                     dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700"
          title={show ? "Ocultar" : "Mostrar"}
          aria-label={show ? "Ocultar token" : "Mostrar token"}
        >
          {show ? "🙈" : "👁️"}
        </button>
        <button
          onClick={save}
          className="px-4 py-3 md:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        >
          Entrar
        </button>
      </div>

      {err && <div className="mt-3 text-sm text-rose-600 dark:text-rose-400">{err}</div>}
    </div>
  );
}

export default function AdminConfig() {
  const [authOk, setAuthOk] = useState(!!getAdminToken());
  const handleUnauthorized = useCallback(() => setAuthOk(false), []);

  const {
    base, form, setField, dirty, hasDirty,
    save, restart, exportEnv, busy, err, ok, reload
  } = useAdminConfig({ onUnauthorized: handleUnauthorized });

  // validações
  const problems = useMemo(() => {
    const p = [];
    const int = (k) => {
      const v = form[k];
      if (v == null || v === "") return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };
    const pos = (k) => { const n = int(k); if (n != null && n <= 0) p.push(`${k} deve ser > 0`); };
    pos("PORT");
    pos("SYNC_INTERVAL_MINUTES");
    pos("RECONCILE_ALL_INTERVAL_MINUTES");
    const j1 = int("SYNC_JITTER_MAX_SEC"); if (j1 != null && j1 < 0) p.push("SYNC_JITTER_MAX_SEC não pode ser negativo");
    const j2 = int("RECONCILE_JITTER_MAX_SEC"); if (j2 != null && j2 < 0) p.push("RECONCILE_JITTER_MAX_SEC não pode ser negativo");

    const filtra = (form.IXC_FILTRA_FILIAL || "").toString().trim().toUpperCase();
    if (filtra && filtra !== "S" && filtra !== "N") p.push("IXC_FILTRA_FILIAL deve ser S ou N");
    return p;
  }, [form]);

  if (!authOk) {
    return (
      <div className="p-4 md:p-6">
        <TokenGate onReady={() => setAuthOk(true)} />
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-6xl p-4 md:p-6"
      // Safe areas + espaço extra para o FAB “Menu” não cobrir os inputs
      style={{
        paddingTop: "calc(10px + env(safe-area-inset-top))",
        paddingBottom: "calc(84px + env(safe-area-inset-bottom))",
      }}
    >
      {/* Header + ações (empilha no mobile) */}
      <div className="mb-5 md:mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Configurações do Engine ISP/IXC</h1>
          <p className="text-sm opacity-70">Edite parâmetros de runtime e persistência segura.</p>
        </div>

        {/* Ações: grid no mobile para ficar tocável */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            onClick={reload}
            disabled={busy}
            className="px-3 py-3 sm:py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100
                       dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Atualizar
          </button>
          <button
            onClick={exportEnv}
            disabled={busy}
            className="px-3 py-3 sm:py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100
                       dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            title="Gera .env.generated"
          >
            Exportar .env
          </button>
          <button
            onClick={restart}
            disabled={busy}
            className="col-span-2 sm:col-span-1 px-3 py-3 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-medium
                       dark:bg-amber-600 dark:hover:bg-amber-500"
            title="Reinicia o serviço (PM2 religará)"
          >
            Reiniciar agora
          </button>
        </div>
      </div>

      {(err || ok) && (
        <div
          className={`mb-4 rounded-xl p-3 border ${
            err ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/40 bg-emerald-500/10"
          }`}
        >
          <div className="text-sm">{err || ok}</div>
        </div>
      )}

      {!base && <div className="text-sm opacity-70">Carregando…</div>}

      {base && (
        // 1 coluna no mobile, 2 no md+
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {FIELDS.map(({ key, label, type, min, placeholder, readonly }) => (
            <div
              key={key}
              className="rounded-2xl border border-zinc-300 bg-white p-3 md:p-4 text-zinc-900
                         dark:border-zinc-700/50 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input
                type={type || "text"}
                min={min}
                value={form[key] ?? ""}
                onChange={(e) => { if (!readonly) setField(key, e.target.value); }}
                placeholder={placeholder}
                disabled={!!readonly}
                readOnly={!!readonly}
                title={readonly ? "Campo bloqueado" : undefined}
                inputMode={type === "number" ? "numeric" : undefined}
                className={`w-full rounded-xl px-3 py-3 md:py-2 outline-none focus:ring-2 focus:ring-sky-500
                            bg-white border border-zinc-300
                            disabled:cursor-not-allowed disabled:opacity-70
                            dark:bg-zinc-800 dark:border-zinc-700`}
              />
              <div className="mt-2 text-xs opacity-60 break-all">
                Atual: <code>{String(base[key] ?? "—")}</code>
              </div>
              {(!readonly && dirty[key] !== undefined) && (
                <div className="mt-1 text-xs text-amber-500">Alterado</div>
              )}
            </div>
          ))}
        </div>
      )}

      {problems.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
          <div className="text-sm font-medium mb-1">Corrija os seguintes campos:</div>
          <ul className="list-disc pl-5 text-sm">
            {problems.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {/* Barra de ações fixa no fim da página em telas pequenas */}
      <div
        className="mt-6 md:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
      >
        <button
          onClick={save}
          disabled={busy || !hasDirty || problems.length > 0}
          className={`px-5 py-3 md:py-2 rounded-xl font-medium ${
            busy || !hasDirty || problems.length > 0
              ? "bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-400"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          Salvar alterações
        </button>
        {hasDirty && (
          <span className="text-xs opacity-70 sm:ml-1">
            {Object.keys(dirty).length} campo(s) alterado(s)
          </span>
        )}
      </div>
    </div>
  );
}
