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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const path = url.pathname;

  // 1) NUNCA interceptar SSE ou qualquer stream
  const accept = req.headers.get('accept') || '';
  const isSse =
    accept.includes('text/event-stream') ||
    path.startsWith(BASE + 'sse') ||
    path.startsWith(BASE + 'events') ||
    path.endsWith('/sse') ||
    path.endsWith('/events');

  if (isSse) return; // deixa seguir direto para a rede (sem respondWith)

  // 2) Evitar cache para endpoints dinâmicos de API/heartbeat (JSON volátil)
  //    Ajuste os prefixos conforme seu backend (ex.: /api/, /heartbeat, /healthz…)
  const isDynamicJson =
    path.startsWith(BASE + 'api') ||
    path.startsWith(BASE + 'heartbeat') ||
    path.startsWith(BASE + 'healthz') ||
    accept.includes('application/json');

  if (isDynamicJson) return; // network-only, nada de cache de SW

  // 3) Navegação (SPA) -> stale-while-revalidate no cache de páginas
  if (req.mode === 'navigate') {
    e.respondWith(nav(req));
    return;
  }

  // 4) Assets estáticos do app-shell -> cache-first (js/css/img/svg/ico)
  //    Só para o mesmo host + sob o BASE atual (compatível com gh-pages)
  const sameOrigin = url.origin === self.location.origin;
  const isStaticAsset =
    sameOrigin &&
    path.startsWith(BASE) &&
    /\.(?:js|css|ico|png|svg|jpg|jpeg|webp|woff2?)$/i.test(path);

  if (isStaticAsset) {
    e.respondWith(stat(req));
    return;
  }

  // 5) Demais GETs: não intercepta (rede direta)
  // (evita capturar coisas que você não planejou)
});
