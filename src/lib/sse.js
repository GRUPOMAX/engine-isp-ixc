// src/lib/sse.js
export function connectSSE(arg1, arg2 = {}) {
  // --- Normaliza assinatura ---
  // Suporta:
  //  1) connectSSE('/events', { query, onOpen, onError, onMessage, withCredentials })
  //  2) connectSSE({ url:'/events/heartbeat', params:{ interval:1000 }, onOpen, ... })
  const cfg = typeof arg1 === 'string'
    ? { path: arg1, ...arg2 }
    : (arg1 && typeof arg1 === 'object' ? arg1 : {});

  const {
    path, url,            // um dos dois
    query, params,        // sinônimos
    withCredentials = false,
    onOpen, onError, onMessage,
  } = cfg;

  const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').toString().trim();
  const base = /^https?:\/\//i.test(rawBase) && rawBase !== 'undefined'
    ? rawBase
    : window.location.origin;

  // escolhe origem do caminho
  const p = (typeof url === 'string' && url.trim())
    ? url.trim()
    : (typeof path === 'string' ? path.trim() : '');

  if (!p) {
    console.error('[SSE] path/url inválido:', arg1);
    throw new TypeError("connectSSE: primeiro argumento precisa ser string ('/events') ou { url:'/events', ... }");
  }

  // monta URL de forma segura (sem concat maluca)
  let urlObj;
  try {
    urlObj = new URL(p, base);
  } catch (e) {
    console.error('[SSE] base =', base, 'path/url =', p);
    throw e;
  }

  const qp = query ?? params; // aceita ambos nomes
  if (qp && typeof qp === 'object') {
    for (const [k, v] of Object.entries(qp)) {
      if (v !== undefined && v !== null) urlObj.searchParams.set(k, String(v));
    }
  }

  const finalUrl = urlObj.toString();

  // --- Reconexão + rebind de handlers nomeados ---
  let es;
  const namedHandlers = new Map(); // eventName -> Set<fn>

  const bindAll = () => {
    for (const [name, fns] of namedHandlers.entries()) {
      for (const fn of fns) {
        es.addEventListener(name, (evt) => {
          let data = evt.data;
          try { data = JSON.parse(evt.data); } catch {}
          fn(data, evt);
        });
      }
    }
  };

  const start = () => {
    es = new EventSource(finalUrl, { withCredentials });

    es.onopen = () => {
      onOpen && onOpen();
      // Reanexa handlers nomeados após abrir
      bindAll();
    };

    es.onerror = (e) => {
      onError && onError(e);
      try { es.close(); } catch {}
      setTimeout(start, 1500); // auto-retry
    };

    es.onmessage = (evt) => {
      let data = evt.data;
      try { data = JSON.parse(evt.data); } catch {}
      onMessage && onMessage({ type: 'message', data });
    };
  };

  start();

  const api = {
    on(eventName, handler) {
      if (!namedHandlers.has(eventName)) namedHandlers.set(eventName, new Set());
      namedHandlers.get(eventName).add(handler);
      // Se já existe uma conexão ativa, liga agora também
      if (es) {
        es.addEventListener(eventName, (evt) => {
          let data = evt.data;
          try { data = JSON.parse(evt.data); } catch {}
          handler(data, evt);
        });
      }
      return api;
    },
    close() { try { es && es.close(); } catch {} },
    url: finalUrl, // útil pra debugar
  };

  return api;
}
