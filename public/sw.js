/* v1 */
const CACHE_STATIC = "static-v1";
const CACHE_PAGES  = "pages-v1";
const OFFLINE_URL  = "/offline.html";

// arquivos estáticos essenciais (adapte se quiser)
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => ![CACHE_STATIC, CACHE_PAGES].includes(k))
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Navegação: network-first com fallback offline
async function handleNavigate(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_PAGES);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cache = await caches.open(CACHE_PAGES);
    const cached = await cache.match(req);
    return cached || caches.match(OFFLINE_URL);
  }
}

// Estáticos: cache-first
async function handleStatic(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  const cache = await caches.open(CACHE_STATIC);
  cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", event => {
  const req = event.request;

  // somente GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // navegações (document)
  if (req.mode === "navigate") {
    event.respondWith(handleNavigate(req));
    return;
  }

  // arquivos do mesmo host => cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(handleStatic(req));
  }
});
