import StatCard from "./StatCard.jsx";

function Card({ title, tone = "neutral", children, footer }) {
  const ring = {
    neutral: "border-neutral-200 dark:border-neutral-800",
    emerald: "border-emerald-300/40 dark:border-emerald-700/40",
    indigo:  "border-indigo-300/40  dark:border-indigo-700/40",
    purple:  "border-purple-300/40  dark:border-purple-700/40",
    sky:     "border-sky-300/40     dark:border-sky-700/40",
    rose:    "border-rose-300/40    dark:border-rose-700/40",
  }[tone];
  return (
    <div className={`rounded-xl border ${ring} bg-white/70 p-3 dark:bg-neutral-900/40`}>
      <div className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">{title}</div>
      {children}
      {footer}
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-neutral-500 dark:text-neutral-400">{k}</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-100">{v ?? "—"}</span>
    </div>
  );
}
function Foot({ ts, note }) {
  return (
    <div className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
      {note}: {ts ? new Date(ts).toLocaleTimeString() : "—"}
    </div>
  );
}

export default function ResultCards({ byTag, resumo, loadingTag }) {
  const status   = byTag.status;
  const refresh  = byTag.refresh;
  const recAll   = byTag.recAll;
  const runOnce  = byTag.runOnce;

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {/* STATUS */}
      <Card title="Status do Cache" tone="sky" footer={<Foot ts={status?.ts} note="última leitura" />}>
        {status?.error && <div className="mb-2 text-xs text-rose-600 dark:text-rose-400">erro: {status.error}</div>}
        <Row k="ok"         v={status?.ok === false ? "false" : String(status?.res?.ok ?? "—")} />
        <Row k="count"      v={status?.res?.count} />
        <Row k="updated_at" v={status?.res?.updated_at ? new Date(status.res.updated_at).toLocaleString() : "—"} />
        <Row k="checksum"   v={status?.res?.checksum ?? "—"} />
      </Card>

      {/* REFRESH */}
      <Card title="Refresh do Cache" tone="emerald" footer={<Foot ts={refresh?.ts} note="última execução" />}>
        {refresh?.error && <div className="mb-2 text-xs text-rose-600 dark:text-rose-400">erro: {refresh.error}</div>}
        <Row k="ok"         v={refresh?.ok === false ? "false" : String(refresh?.res?.ok ?? (refresh ? "true" : "—"))} />
        <Row k="count"      v={refresh?.res?.count} />
        <Row k="updated_at" v={refresh?.res?.updated_at ? new Date(refresh.res.updated_at).toLocaleString() : (refresh?.res?.__empty ? "—" : "—")} />
      </Card>

      {/* RECONCILE ALL */}
      <Card title="Reconcile All" tone="indigo" footer={<Foot ts={recAll?.ts} note="última execução" />}>
        {recAll?.error && <div className="mb-2 text-xs text-rose-600 dark:text-rose-400">erro: {recAll.error}</div>}
        <Row
          k="status"
          v={
            recAll
              ? (recAll.ok
                  ? (recAll.res?.__empty || recAll.res == null ? "disparado" : "ok")
                  : "erro")
              : "—"
          }
        />
        {/* adicione mais Rows se sua API retornar campos */}
      </Card>

      {/* RUN ONCE */}
      <Card title="Run Once" tone="purple" footer={<Foot ts={runOnce?.ts} note="última execução" />}>
        {runOnce?.error && <div className="mb-2 text-xs text-rose-600 dark:text-rose-400">erro: {runOnce.error}</div>}
        {resumo ? (
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Clientes" value={resumo.total_clientes} />
            <StatCard label="Processados" value={resumo.processados} />
            <StatCard label="Pulados (C)" value={resumo.pulados_status_c} />
            <StatCard label="Erros" value={resumo.erros} />
            <StatCard label="Matches" value={resumo.matches_total} />
          </div>
        ) : (
          <Row k="resumo" v={loadingTag === "runOnce" ? "executando…" : (runOnce ? "—" : "—")} />
        )}
      </Card>
    </div>
  );
}
