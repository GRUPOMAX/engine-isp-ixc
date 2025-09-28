/* v2 - GitHub Pages aware */
const BASE = new URL(self.registration.scope).pathname.replace(/\/+$/, '/') || '/';
const OFFLINE_URL = BASE + 'offline.html';
const CACHE_STATIC = 'static-v2';
const CACHE_PAGES  = 'pages-v2';

const APP_SHELL = [
  BASE,
  BASE + 'index.html',
  OFFLINE_URL,
  BASE + 'site.webmanifest',
  BASE + 'favicon.ico',
  BASE + 'favicon-16x16.png',
  BASE + 'favicon-32x32.png',
  BASE + 'apple-touch-icon.png',
  BASE + 'android-chrome-192x192.png',
  BASE + 'android-chrome-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![CACHE_STATIC, CACHE_PAGES].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

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

async function handleStatic(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  const cache = await caches.open(CACHE_STATIC);
  cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigate(req));
    return;
  }

  const url = new URL(req.url);
  if (url.pathname.startsWith(BASE)) {
    event.respondWith(handleStatic(req));
  }
});
