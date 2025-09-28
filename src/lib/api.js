const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function jget(path) {
  const res = await fetch(BASE_URL + path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function jpost(path, body) {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export const api = {
  healthz: () => jget('/healthz'),
  heartbeat: () => jget('/heartbeat'),
  refreshCache: () => jpost('/cache/refresh')
};