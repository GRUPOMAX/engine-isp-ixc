import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { fmtMs, fmtSec, timeAgo } from "@/lib/format";

/* UI helpers */
function Badge({ children }) {
  return (
    <span className="ml-2 rounded-full px-2 py-0.5 text-xs border border-neutral-300 dark:border-neutral-700">
      {children}
    </span>
  );
}

function Stat({ label, value, hint, tone = "neutral" }) {
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

function ProgressBar({ pct = 0, left = "Progresso", right = "" }) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

/* Linha com as logos + sync no meio (gira quando running=true) */
function ServiceLine({ running = false }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/IXC.svg"
        alt="IXC"
        className="h-6 w-6 rounded-md border border-neutral-300 dark:border-neutral-700"
      />
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 opacity-80 ${running ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        <path
          d="M21 12a9 9 0 0 1-9 9A9 9 0 0 1 5.64 18.36M3 12a9 9 0 0 1 9-9A9 9 0 0 1 18.36 5.64"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        />
        <path
          d="M7 17v3h3M17 7V4h-3"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        />
      </svg>
      <img
        src="/ISP.svg"
        alt="ISP"
        className="h-6 w-6 rounded-md border border-neutral-300 dark:border-neutral-700"
      />
      <span className="ml-2 font-semibold">ENGINE de comunicação IXC-ISP</span>
    </div>
  );
}

export default function HeartbeatCard() {
  const [hb, setHb] = useState(null);
  const [ts, setTs] = useState("");
  const [err, setErr] = useState("");

  // 🎯 novo: relógio local de 1s para animar uptime/stale
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    try {
      // evita SW/cache prender resposta antiga
      const r = await api.heartbeat({ cache: "no-store" });
      setHb(r);
      setErr("");
      setTs(new Date().toLocaleString());
    } catch (e) {
      setErr(e?.message || "erro");
      setTs(new Date().toLocaleString());
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  // ⏱️ uptime derivado (fica “vivo” entre os polls)
  const upSec = useMemo(() => {
    if (hb?.startedAt) {
      const started = typeof hb.startedAt === "number"
        ? hb.startedAt
        : new Date(hb.startedAt).getTime();
      return Math.max(0, Math.floor((now - started) / 1000));
    }
    return hb?.upForSeconds ?? 0;
  }, [hb?.startedAt, hb?.upForSeconds, now]);

  // 🟡 stale derivado (sobe por segundo até chegar tick novo)
  const staleSec = useMemo(() => {
    if (hb?.lastTickAt) {
      const last = typeof hb.lastTickAt === "number"
        ? hb.lastTickAt
        : new Date(hb.lastTickAt).getTime();
      return Math.max(0, Math.floor((now - last) / 1000));
    }
    return hb?.staleForSeconds ?? 0;
  }, [hb?.lastTickAt, hb?.staleForSeconds, now]);

  const progress = useMemo(() => {
    const sum = hb?.lastSummary || {};
    if (typeof sum.total_clientes === "number" && typeof sum.processados === "number") {
      const t = sum.total_clientes || 0;
      const p = sum.processados || 0;
      if (!t) return { pct: 0, text: "—" };
      return { pct: Math.min(100, Math.round((p / t) * 100)), text: `${p}/${t}` };
    }
    if (typeof sum.count === "number") return { pct: 100, text: `${sum.count}` };
    return { pct: 0, text: "—" };
  }, [hb]);

  const isOk = hb?.status === "ok" && !hb?.consecutiveErrors;
  const statusDot = isOk ? "bg-emerald-500" : "bg-red-500";
  const staleWarn = staleSec > 30;
  
  /* gira quando fase = sync ou reconcile */
  const running = hb?.status === "ok" &&
    ["sync", "reconcile"].includes(hb?.lastSummary?.fase ?? "");

  return (
    /* 🔴 FAZ O CARD OCUPAR TODAS AS COLUNAS DO GRID PAI E CENTRALIZA */
    <section className="col-span-full w-full">
      <div className="w-full min-h-[70vh] flex items-center justify-center">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 w-full ">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
              <h2 className="font-medium">Heartbeat</h2>
              {hb?.lastSummary?.fase ? <Badge>{hb.lastSummary.fase}</Badge> : null}
            </div>
            <span className="text-xs text-neutral-500">{ts}</span>
          </div>

          {!hb && !err && (
            <div className="mt-6 text-center text-sm text-neutral-500">Carregando…</div>
          )}

          {err && (
            <pre className="mt-6 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-200 overflow-auto">
{err}
            </pre>
          )}

          {hb && (
            <>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <Stat label="Serviço" value={<ServiceLine running={running} />} />
                <Stat
                  label="Uptime"
                  value={fmtSec(hb.upForSeconds)}
                  hint={hb.startedAt ? new Date(hb.startedAt).toLocaleString() : ""}
                />
                <Stat
                  label="Stale"
                  value={fmtSec(hb.staleForSeconds)}
                  hint={hb.lastTickAt ? `último tick ${timeAgo(hb.lastTickAt)}` : ""}
                  tone={staleWarn ? "warn" : "neutral"}
                />

                <Stat label="Ticks (total)" value={hb.ticksTotal ?? "—"} />
                <Stat
                  label="Consecutive Errors"
                  value={hb.consecutiveErrors ?? 0}
                  tone={(hb.consecutiveErrors ?? 0) > 0 ? "err" : "neutral"}
                />
                <Stat
                  label="Status"
                  value={hb.status || "—"}
                  tone={hb.status === "ok" ? "ok" : "err"}
                />
              </div>

              <div className="mt-6">
                <div className="text-xs font-medium text-neutral-500 mb-2">Último ciclo</div>

                <div className="grid gap-6 md:grid-cols-5">
                  {"total_clientes" in (hb.lastSummary || {}) && (
                    <Stat label="Total clientes" value={hb.lastSummary.total_clientes ?? "—"} />
                  )}
                  {"processados" in (hb.lastSummary || {}) && (
                    <Stat label="Processados" value={hb.lastSummary.processados ?? "—"} />
                  )}
                  {"pulados_status_c" in (hb.lastSummary || {}) && (
                    <Stat label="Pulados (status C)" value={hb.lastSummary.pulados_status_c ?? 0} />
                  )}
                  {"erros" in (hb.lastSummary || {}) && (
                    <Stat
                      label="Erros"
                      value={hb.lastSummary.erros ?? 0}
                      tone={(hb.lastSummary.erros ?? 0) > 0 ? "err" : "neutral"}
                    />
                  )}
                  {"matches_total" in (hb.lastSummary || {}) && (
                    <Stat label="Matches" value={hb.lastSummary.matches_total ?? 0} />
                  )}
                  {"count" in (hb.lastSummary || {}) && (
                    <Stat label="Itens no ciclo" value={hb.lastSummary.count ?? 0} />
                  )}
                  {"updated" in (hb.lastSummary || {}) && (
                    <Stat label="Atualizou" value={hb.lastSummary.updated ? "sim" : "não"} />
                  )}
                </div>

                <div className="mt-4">
                  <ProgressBar left="Progresso" right={progress.text} pct={progress.pct} />
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  {"duration_ms" in (hb.lastSummary || {}) && (
                    <Stat label="Duração do ciclo" value={fmtMs(hb.lastSummary.duration_ms)} />
                  )}
                  <Stat label="Intervalo sync" value={`${hb?.intervalMinutes?.sync ?? "—"} min`} />
                  <Stat label="Intervalo reconcile" value={`${hb?.intervalMinutes?.reconcile ?? "—"} min`} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
