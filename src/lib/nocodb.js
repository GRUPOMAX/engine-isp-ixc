// src/lib/nocodb.js
const BASE  = (import.meta.env.VITE_NOCODB_BASE_URL || "").replace(/\/+$/g, "");
const TOKEN = (import.meta.env.VITE_NOCODB_TOKEN || "").trim();
const TABLE = (import.meta.env.VITE_TABLE_AUTH || "").trim(); // ex.: m60gnogqsnanzv6

function headers() {
  return {
    "accept": "application/json",
    "content-type": "application/json",
    "xc-token": TOKEN,
  };
}

function coerceBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
  }
  return false;
}

/**
 * Busca 1 usuário por e-mail e hash da senha.
 * - where: (user-email,eq,<email>)~and(user-password,eq,<hash>)
 * - fields: Id, user-email, user-password, is_admin, user-token-admin
 * Retorna objeto normalizado com:
 *   { Id, email, "user-email", "user-password", "user-token-admin", is_admin, __raw }
 */
export async function findUserByEmailAndHash(email, passHash) {
  // encodeURIComponent em AMBOS os valores usados no where
  const em  = encodeURIComponent(String(email ?? "").trim());
  const ph  = encodeURIComponent(String(passHash ?? "").trim());

  const where  = `(user-email,eq,${em})~and(user-password,eq,${ph})`;
  const fields = "Id,user-email,user-password,is_admin,user-token-admin";
  const url    = `${BASE}/api/v2/tables/${TABLE}/records?limit=1&offset=0&where=${where}&fields=${fields}`;

  const r = await fetch(url, { headers: headers() });
  const txt = await r.text();
  if (!r.ok) throw new Error(`NocoDB ${r.status}: ${txt.slice(0, 200)}`);

  let data;
  try { data = JSON.parse(txt); }
  catch { throw new Error("Resposta NocoDB inválida"); }

  const row = Array.isArray(data?.list) ? data.list[0] : null;
  if (!row) return null;

  // Normaliza e-mail e is_admin
  const userEmail = row["user-email"] ?? row.email ?? "";
  const isAdmin   = coerceBool(row.is_admin ?? row["is_admin"] ?? row["IsAdmin"]);

  return {
    Id: row.Id ?? row.id ?? row.ID,
    email: userEmail,
    ["user-email"]: userEmail,
    ["user-password"]: row["user-password"],
    ["user-token-admin"]: row["user-token-admin"],
    is_admin: isAdmin,
    __raw: row,
  };
}

// (Opcional) criar usuário já com hash
export async function createUser(email, passHash) {
  const url  = `${BASE}/api/v2/tables/${TABLE}/records`;
  const body = { "user-email": String(email || "").trim(), "user-password": String(passHash || "").trim() };
  const r = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const txt = await r.text();
  if (!r.ok) throw new Error(`NocoDB POST ${r.status}: ${txt.slice(0, 200)}`);
  try { return JSON.parse(txt); } catch { return { ok: true }; }
}
