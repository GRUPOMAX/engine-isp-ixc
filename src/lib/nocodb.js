// src/lib/nocodb.js
const BASE = import.meta.env.VITE_NOCODB_BASE_URL;
const TOKEN = import.meta.env.VITE_NOCODB_TOKEN;
const TABLE = import.meta.env.VITE_TABLE_AUTH; // m60gnogqsnanzv6

function headers() {
  return {
    'xc-token': TOKEN,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

// Busca 1 usuário por email + senhaHash
export async function findUserByEmailAndHash(email, passHash) {
  // where=(user-email,eq,<email>)~and(user-password,eq,<hash>)
  const where = `(user-email,eq,${encodeURIComponent(email)})~and(user-password,eq,${passHash})`;
  const url = `${BASE}/api/v2/tables/${TABLE}/records?where=${where}&limit=1&fields=Id,user-email`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`NocoDB GET -> ${r.status}`);
  const data = await r.json();
  return data?.list?.[0] || null;
}

// (Opcional) criar usuário já com hash
export async function createUser(email, passHash) {
  const url = `${BASE}/api/v2/tables/${TABLE}/records`;
  const body = { "user-email": email, "user-password": passHash };
  const r = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`NocoDB POST -> ${r.status}`);
  return await r.json();
}
