/* v3 - gh-pages */
const BASE = new URL(self.registration.scope).pathname.replace(/\/+$/, '/') || '/';
const OFFLINE_URL = BASE + 'offline.html';
const CACHE_STATIC = 'static-v3';
const CACHE_PAGES  = 'pages-v3';

const APP_SHELL = [
  BASE, BASE + 'index.html', OFFLINE_URL,
  BASE + 'site.webmanifest', BASE + 'favicon.ico',
  BASE + 'favicon-16x16.png', BASE + 'favicon-32x32.png',
  BASE + 'apple-touch-icon.png', BASE + 'android-chrome-192x192.png',
  BASE + 'android-chrome-512x512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![CACHE_STATIC, CACHE_PAGES].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function nav(req){try{const f=await fetch(req);(await caches.open(CACHE_PAGES)).put(req,f.clone());return f}catch{const c=await caches.open(CACHE_PAGES);return (await c.match(req))||caches.match(OFFLINE_URL)}}
async function stat(req){const c=await caches.match(req);if(c) return c;const r=await fetch(req);(await caches.open(CACHE_STATIC)).put(req,r.clone());return r}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(nav(req)); return; }
  const url = new URL(req.url);
  if (url.pathname.startsWith(BASE)) e.respondWith(stat(req));
});
