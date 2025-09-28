#!/usr/bin/env node
/**
 * Aplica o refactor do Front ISP Dashboard (React + Vite + Tailwind 3.x)
 * Agora aceita objetos {path, content} E/OU strings markdown:
 *
 * ## src/algum/arquivo.jsx
 * ```jsx
 * // conteúdo
 * ```
 *
 * Você pode colar o documento completo (com "File tree") dentro do array `files`
 * que o parser extrai todos os arquivos e grava nos caminhos certos.
 *
 * Uso: node apply-dashboard-refactor.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = process.cwd();

// ---------- helpers de FS ----------
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileSafe(filepath, content) {
  if (fs.existsSync(filepath)) {
    const bak = filepath + '.bak';
    fs.copyFileSync(filepath, bak);
    console.log('backup ->', bak);
  }
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('ok     ->', filepath);
}

function mergePackageJson(pkgPath) {
  let pkg = { name: 'front-isp-dashboard', private: true, version: '0.0.1', type: 'module', scripts: {} };
  if (fs.existsSync(pkgPath)) {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  }
  pkg.type = 'module';
  pkg.scripts = Object.assign({
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview'
  }, pkg.scripts || {});

  pkg.dependencies = Object.assign({
    react: '^18.3.1',
    'react-dom': '^18.3.1'
  }, pkg.dependencies || {});

  pkg.devDependencies = Object.assign({
    vite: '^5.4.8',
    '@vitejs/plugin-react': '^4.3.1',
    tailwindcss: '^3.4.13',
    postcss: '^8.4.47',
    autoprefixer: '^10.4.20'
  }, pkg.devDependencies || {});

  writeFileSafe(pkgPath, JSON.stringify(pkg, null, 2));
}

// ---------- parser de Markdown -> [{path, content}] ----------
/**
 * Extrai blocos no formato:
 * ## CAMINHO/ARQUIVO.ext
 * ```linguagem (opcional)
 * CONTEUDO
 * ```
 *
 * - ignora a seção "File tree"
 * - aceita múltiplas seções
 */
function extractEntriesFromMarkdown(md) {
  if (typeof md !== 'string' || !md.trim()) return [];

  // remove o bloco "File tree"
  md = md.replace(/#\s*File\s*tree[\s\S]*?(```|~~~)[\s\S]*?\1/gi, '');

  // normaliza cercas ~~~ -> ```
  md = md.replace(/~~~/g, '```');

  const entries = [];
  const re = /^##\s+(.+?)\s*\n+```[^\n]*\n([\s\S]*?)\n```/gm;

  let m;
  while ((m = re.exec(md)) !== null) {
    const relPath = m[1].trim().replace(/\s*\(opcional\)/i, '');
    const content = m[2].replace(/\r\n?/g, '\n');
    entries.push({ path: relPath, content });
  }
  return entries;
}














// =============== COLE AQUI DENTRO: STRINGS (markdown) E/OU OBJETOS {path, content} ===============
const files = [
  String.raw`
# File tree

```
front-isp-dashboard/
├─ index.html
├─ vite.config.js
├─ package.json
├─ tailwind.config.js
├─ postcss.config.js
├─ src/
│  ├─ main.jsx
│  ├─ index.css
│  ├─ App.jsx
│  ├─ lib/
│  │  ├─ api.js
│  │  └─ sse.js
│  ├─ components/
│  │  ├─ Header.jsx
│  │  ├─ Cards/
│  │  │  ├─ HealthCard.jsx
│  │  │  ├─ HeartbeatCard.jsx
│  │  │  └─ RefreshCard.jsx
│  │  └─ EventLog.jsx
│  └─ hooks/
│     └─ useTheme.js
└─ .env (opcional)
```

---

## index.html

~~~html
<!doctype html>
<html lang="pt-br" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Front ISP Dashboard</title>
  </head>
  <body class="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
~~~

---

## vite.config.js

~~~js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
~~~

---

## package.json

~~~json
{
  "name": "front-isp-dashboard",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "vite": "^5.4.8"
  }
}
~~~

---

## tailwind.config.js

~~~js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem'
      }
    }
  },
  plugins: []
};
~~~

---

## postcss.config.js

~~~js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
~~~

---

## src/index.css

~~~css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Scroll mais discreto */
* { scrollbar-width: thin; }
::webkit-scrollbar { width: 8px; height: 8px; }
::webkit-scrollbar-thumb { background: rgb(120 120 120 / 0.4); border-radius: 8px; }
~~~

---

## src/main.jsx

~~~jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(<App />);
~~~

---

## src/lib/api.js

~~~js
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
~~~

---

## src/lib/sse.js

~~~js
export function connectSSE(path, { onOpen, onMessage, onError, withCredentials = false } = {}) {
  const url = (import.meta.env.VITE_API_BASE_URL || '') + path;
  let es;

  const start = () => {
    es = new EventSource(url, { withCredentials });
    es.onopen = () => onOpen && onOpen();
    es.onerror = (e) => { onError && onError(e); es.close(); setTimeout(start, 1500); };
    es.onmessage = (evt) => onMessage && onMessage({ type: 'message', data: evt.data });
  };

  start();

  return {
    on(eventName, handler) {
      es.addEventListener(eventName, (evt) => handler(JSON.parse(evt.data)));
      return this;
    },
    close() { es && es.close(); }
  };
}
~~~

---

## src/hooks/useTheme.js

~~~js
import { useEffect, useState } from 'react';

export default function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
~~~

---

## src/components/Header.jsx

~~~jsx
export default function Header({ onToggleTheme }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-neutral-50/60 dark:bg-neutral-950/60 border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Front ISP Dashboard</h1>
        <div className="flex items-center gap-2">
          <a href="/healthz" className="text-xs text-neutral-500 hover:underline">/healthz</a>
          <a href="/events" className="text-xs text-neutral-500 hover:underline">/events</a>
          <button onClick={onToggleTheme} className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">Tema</button>
        </div>
      </div>
    </header>
  );
}
~~~

---

## src/components/Cards/HealthCard.jsx

~~~jsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function HealthCard() {
  const [status, setStatus] = useState('…');

  const load = async () => {
    try { const r = await api.healthz(); setStatus(r?.ok ? 'OK' : 'ERRO'); }
    catch { setStatus('ERRO'); }
  };

  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);

  const color = status === 'OK' ? 'bg-green-500' : status === 'ERRO' ? 'bg-red-500' : 'bg-yellow-500';

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}></span>
          <h2 className="font-medium">Saúde</h2>
        </div>
        <span className="text-xs text-neutral-500">/healthz</span>
      </div>
      <div className="mt-2 text-sm">{status}</div>
    </div>
  );
}
~~~

---

## src/components/Cards/HeartbeatCard.jsx

~~~jsx

~~~

## src/lib/format.js

~~~js
export function fmtMs(ms = 0) {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  return fmtSec(s);
}

export function fmtSec(total = 0) {
  total = Math.floor(total);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  return `${h}h atrás`;
}
~~~

---

## src/components/Cards/RefreshCard.jsx

~~~jsx
import { useState } from 'react';
import { api } from '@/lib/api';

export default function RefreshCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onRefresh = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await api.refreshCache();
      setResult(r);
    } catch (e) {
      setResult({ erro: e.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Refresh Cache</h2>
        <button onClick={onRefresh} disabled={loading}
          className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50">
          {loading ? 'Executando…' : 'Executar'}
        </button>
      </div>
      <pre className="mt-2 min-h-[2rem] rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 p-3 text-xs">
{result ? JSON.stringify(result, null, 2) : '—'}
      </pre>
    </div>
  );
}
~~~

---

## src/components/EventLog.jsx

~~~jsx
import { useEffect, useRef, useState } from 'react';
import { connectSSE } from '@/lib/sse';

function Row({ evt }) {
  return (
    <div className="flex items-start gap-2 border-b border-neutral-200/40 dark:border-neutral-800/60 py-2">
      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
      <div className="flex-1">
        <div className="text-xs text-neutral-500">{evt.time}</div>
        <div className="text-sm font-medium">{evt.name}</div>
        {evt.data && (
          <pre className="mt-1 rounded-lg bg-neutral-100/60 dark:bg-neutral-900/60 p-2 text-xs max-h-40 w-full max-w-full overflow-x-auto overflow-y-auto">
    {JSON.stringify(evt.data, null, 2)}{JSON.stringify(evt.data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

export default function EventLog() {
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const es = connectSSE('/events', {
      onOpen: () => { setConnected(true); add({ name: 'openConectado' }); },
      onError: () => setConnected(false),
      onMessage: (evt) => add({ name: 'message', data: evt.data })
    });

    // listeners customizados do servidor: event: heartbeat, event: sync, etc.
    es.on('heartbeat', (data) => add({ name: 'heartbeat', data }));
    es.on('sync', (data) => add({ name: 'sync', data }));
    es.on('reconcile', (data) => add({ name: 'reconcile', data }));

    return () => es.close();
  }, []);

  const add = (e) => {
    setItems((prev) => {
      const next = [...prev, { ...e, time: new Date().toLocaleTimeString() }].slice(-200);
      // autoscroll
      setTimeout(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, 0);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <h2 className="font-medium">Eventos (SSE)</h2>
        </div>
        <span className="text-xs text-neutral-500">/events</span>
      </div>

      <div ref={ref} className="mt-3 max-h-80 overflow-auto">
        {items.length === 0 ? (
          <div className="text-sm text-neutral-500">Sem eventos ainda…</div>
        ) : (
          items.map((e, i) => <Row key={i} evt={e} />)
        )}
      </div>
    </div>
  );
}
~~~

---

## src/App.jsx

~~~jsx
import useTheme from '@/hooks/useTheme';
import Header from '@/components/Header';
import HealthCard from '@/components/Cards/HealthCard';
import HeartbeatCard from '@/components/Cards/HeartbeatCard';
import RefreshCard from '@/components/Cards/RefreshCard';
import EventLog from '@/components/EventLog';

export default function App() {
  const { toggle } = useTheme();

  return (
    <div className="min-h-screen">
      <Header onToggleTheme={toggle} />

      <main className="mx-auto max-w-6xl px-4 py-6 grid gap-6 md:grid-cols-2">
        <HealthCard />
        <RefreshCard />
        <HeartbeatCard />
        <div className="md:col-span-2"><EventLog /></div>
      </main>
    </div>
  );
}
~~~

---

## .env (opcional)

~~~
VITE_API_BASE_URL=https://api.engine.isp.ixc.v2.webserver.app.br
~~~

---

### Observações de integração

- O `alias` `@/` já está configurado no `vite.config.js` para evitar os erros de import que você teve.
- Tailwind 3.x elimina o erro de `rounded-2xl` desconhecido. Caso precise do v4, dá pra migrar depois, mas essa base fica estável.
- O `EventLog` já escuta `event: heartbeat`, `event: sync`, `event: reconcile` e a mensagem padrão `onmessage`. Do lado do servidor, garanta que está chamando `pushEvent('heartbeat', {...})` etc.
- Todos os `fetch` usam `no-store` e os cards têm estados de erro legíveis.

`
];


// ==================================================================================================

console.log('== Front ISP Dashboard refactor ==');
console.log('root:', root);

// 1) transformar todo item do array em [{path, content}]
const expanded = [];
for (const item of files) {
  if (!item) continue;
  if (typeof item === 'string') {
    expanded.push(...extractEntriesFromMarkdown(item));
  } else if (typeof item === 'object' && item.path && typeof item.content === 'string') {
    expanded.push(item);
  } else {
    console.warn('>> Ignorado item inválido em `files`:', item);
  }
}

if (expanded.length === 0) {
  console.warn('>> Nada para escrever. Verifique se colou o documento no array `files`.');
  process.exit(0);
}

// 2) garantir diretórios “base”
ensureDir(path.join(root, 'src'));
ensureDir(path.join(root, 'src/components'));
ensureDir(path.join(root, 'src/components/Cards'));
ensureDir(path.join(root, 'src/lib'));
ensureDir(path.join(root, 'src/hooks'));

// 3) escrever arquivos
for (const f of expanded) {
  const full = path.join(root, f.path);
  ensureDir(path.dirname(full));
  writeFileSafe(full, f.content);
}

// 4) ajustar package.json
mergePackageJson(path.join(root, 'package.json'));

// 5) .env de dica (se não existir)
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, 'VITE_API_BASE_URL=\n', 'utf8');
  console.log('ok     -> .env (adicione sua VITE_API_BASE_URL)');
}

console.log('\nPronto! Agora rode:');
console.log('  npm i');
console.log('  npm run dev');
console.log('\nSe seu backend estiver em outro host, edite .env e defina:');
console.log('  VITE_API_BASE_URL=https://seu-dominio-api');
