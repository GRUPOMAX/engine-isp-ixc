// src/hooks/useAdminConfig.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/lib/adminApi";

const NUM_FIELDS = new Set([
  "PORT",
  "SYNC_INTERVAL_MINUTES",
  "RECONCILE_ALL_INTERVAL_MINUTES",
  "SYNC_JITTER_MAX_SEC",
  "RECONCILE_JITTER_MAX_SEC",
]);

export const ALLOWED_KEYS = [
  "PORT",
  "LOG_LEVEL",
  "IXC_CLIENTES_URL",
  "IXC_CONTRATOS_URL",
  "IXC_LOGINS_URL",
  "IXC_FILIAL_ID",
  "IXC_FILTRA_FILIAL",
  "ISP_BASE",
  "ISP_BEARER",
  "SYNC_INTERVAL_MINUTES",
  "RECONCILE_ALL_INTERVAL_MINUTES",
  "SYNC_JITTER_MAX_SEC",
  "RECONCILE_JITTER_MAX_SEC",
];

export function useAdminConfig({ onUnauthorized, enabled = true } = {}) {
  const [base, setBase] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // mantém a ref sempre atual sem forçar recriações de efeito
  const onUnauthorizedRef = useRef(onUnauthorized);
  useEffect(() => { onUnauthorizedRef.current = onUnauthorized; }, [onUnauthorized]);

  const load = useCallback(async () => {
    if (!enabled) return;                         // ⛔ não roda sem token
    setErr(""); setOk("");
    setBusy(true);
    try {
      const res = await adminApi.getConfig();
      const data = res?.data || {};
      setBase(data);
      setForm(data);
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) {
        setBase(null);
        setForm({});
        onUnauthorizedRef.current?.();
        return;
      }
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [enabled]);

  // monta somente quando enabled=true; re-carrega ao virar true
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [enabled, load]);

  const setField = useCallback((k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
  }, []);

  const dirty = useMemo(() => {
    if (!base) return {};
    const out = {};
    for (const k of ALLOWED_KEYS) {
      if (k === "PORT") continue; // PORT bloqueado
      const a = base[k];
      const b = form[k];
      if (b === undefined) continue;
      if (String(a ?? "") !== String(b ?? "")) out[k] = b;
    }
    return out;
  }, [base, form]);

  const hasDirty = Object.keys(dirty).length > 0;

  const save = useCallback(async () => {
    if (!enabled || !hasDirty) return;           // ⛔ sem token ou sem mudanças
    setErr(""); setOk("");
    setBusy(true);
    try {
      const patch = {};
      for (const [k, v] of Object.entries(dirty)) {
        patch[k] = NUM_FIELDS.has(k) ? String(parseInt(v, 10)) : String(v ?? "");
      }
      await adminApi.patchConfig(patch);
      setOk("Configurações atualizadas.");
      await load();
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) {
        onUnauthorizedRef.current?.();
        return;
      }
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [enabled, dirty, hasDirty, load]);

  const restart = useCallback(async () => {
    if (!enabled) return;                         // ⛔
    setErr(""); setOk("");
    setBusy(true);
    try {
      await adminApi.restart();
      setOk("Reinício solicitado. (PM2 vai religar o serviço)");
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) {
        onUnauthorizedRef.current?.();
        return;
      }
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [enabled]);

  const exportEnv = useCallback(async () => {
    if (!enabled) return;                         // ⛔
    setErr(""); setOk("");
    setBusy(true);
    try {
      const res = await adminApi.exportEnv();
      setOk(`Arquivo gerado: ${res.file || ".env.generated"}`);
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) {
        onUnauthorizedRef.current?.();
        return;
      }
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [enabled]);

  return {
    base, form, setField, dirty, hasDirty,
    save, restart, exportEnv, busy, err, ok,
    reload: load,
  };
}
