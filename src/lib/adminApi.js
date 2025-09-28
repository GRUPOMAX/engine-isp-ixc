// src/lib/adminApi.js
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/g, "");

// =======================
// Token só em MEMÓRIA
// =======================
let ADMIN_TOKEN_MEM = "";

/** Lê o token atual (volátil) */
export function getAdminToken() {
  return ADMIN_TOKEN_MEM || "";
}

/** Define/limpa o token em memória */
export function setAdminToken(tok) {
  ADMIN_TOKEN_MEM = String(tok || "");
}

/** Zera o token em memória (para 401/Logout/“trocar token”) */
export function clearAdminToken() {
  ADMIN_TOKEN_MEM = "";
}

// =======================

function joinUrl(base, path = "") {
  if (!path) return base || "";
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  return base + (path.startsWith("/") ? "" : "/") + path;
}

async function req(method, path, body) {
  const url = joinUrl(API_BASE, path);

  const headers = {};
  const tok = getAdminToken();
  if (tok) headers["x-admin-token"] = tok;

  const init = { method, headers }; // sem credentials

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let r;
  try {
    r = await fetch(url, init);
  } catch (e) {
    const err = new Error(`Network error: ${e?.message || e}`);
    err.status = 0;
    throw err;
  }

  const contentType = (r.headers.get("content-type") || "").toLowerCase();
  const txt = await r.text();

  let data = null;
  if (txt) {
    if (contentType.includes("application/json")) {
      try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    } else {
      data = { raw: txt };
    }
  }

  if (!r.ok) {
    const msg =
      (data && (data.message || data.error || data.reason)) ||
      txt || `HTTP ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.payload = data;
    throw err;
  }

  return data ?? {};
}

/* =========================
 *  Endpoints de CONFIG/ADMIN
 * ========================= */
export const adminApi = {
  getConfig: () => req("GET", "/admin/config"),
  patchConfig: (patch) => req("PATCH", "/admin/config", patch),
  exportEnv: () => req("POST", "/admin/config/export-env", {}),
  restart: () => req("POST", "/admin/restart", {}),
};

/* =========================
 *  Fluxo de TOKEN ADMIN
 * ========================= */

export async function checkServerTokenRegistered() {
  const data = await req("GET", "/admin/token");
  if (Object.prototype.hasOwnProperty.call(data, "exists")) return !!data.exists;
  if (Object.prototype.hasOwnProperty.call(data, "registered")) return !!data.registered;
  if (Object.prototype.hasOwnProperty.call(data, "has")) return !!data.has;
  if (Object.prototype.hasOwnProperty.call(data, "token")) return data.token != null && data.token !== "";
  return false;
}

export async function createAdminToken(email) {
  const em = String(email ?? "").trim();
  if (!em) {
    const err = new Error("email_required");
    err.status = 400;
    throw err;
  }
  const d = await req("POST", "/admin/token", { email: em });
  const token = d?.token;
  if (!token || typeof token !== "string") {
    const e = new Error("Falha ao gerar token");
    e.payload = d;
    throw e;
  }
  return token;
}

export async function confirmSavedToken() {
  await req("POST", "/admin/token/confirm", {});
}

/* =========================
 *  Helper pós-login
 * ========================= */
export async function ensureServerToken(email) {
  const exists = await checkServerTokenRegistered();
  if (exists) return { created: false, token: null };

  const em = String(email ?? "").trim();
  if (!em) return { created: false, token: null };

  try {
    const token = await createAdminToken(em);
    return { created: true, token };
  } catch (e) {
    if (e?.status === 403 || e?.status === 404 || String(e?.message) === "email_required") {
      return { created: false, token: null };
    }
    throw e;
  }
}
