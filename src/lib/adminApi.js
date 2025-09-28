// rc/lib/adminApi.js
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/g, "");

// Onde guardamos o token no browser
const KEY = "ENGINE_ADMIN_TOKEN";

export function getAdminToken() {
  return localStorage.getItem(KEY) || "";
}
export function setAdminToken(tok) {
  if (tok) localStorage.setItem(KEY, tok);
  else localStorage.removeItem(KEY);
}

function joinUrl(base, path) {
  if (!path) return base;
  return base + (path.startsWith("/") ? "" : "/") + path;
}

async function req(method, path, body) {
  const url = joinUrl(API_BASE, path);

  const headers = {};
  const tok = getAdminToken();
  if (tok) headers["x-admin-token"] = tok;

  const init = { method, headers };

  // Só define Content-Type + body quando realmente houver payload
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

  const contentType = r.headers.get("content-type") || "";
  const txt = await r.text();

  // Tenta parsear JSON quando apropriado; 204/empty => null
  let data = null;
  if (txt) {
    if (contentType.includes("application/json")) {
      try { data = JSON.parse(txt); }
      catch { data = { raw: txt }; }
    } else {
      data = { raw: txt };
    }
  }

  if (!r.ok) {
    const msg =
      (data && (data.message || data.error || data.reason)) ||
      txt ||
      `HTTP ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.payload = data;
    throw err;
  }

  // Normaliza retorno vazio para objeto, facilita call sites
  return data ?? {};
}

export const adminApi = {
  getConfig: () => req("GET", "/admin/config"),
  patchConfig: (patch) => req("PATCH", "/admin/config", patch),
  // Esses endpoints precisam de JSON (mesmo que vazio)
  exportEnv: () => req("POST", "/admin/config/export-env", {}),
  restart: () => req("POST", "/admin/restart", {}),
};
