// src/lib/sse.js
// Cliente SSE robusto (iOS-safe) com reconexão e logs decentes.

function serializeErr(x) {
  // Error/DOMException
  if (x && typeof x === "object" && ("message" in x || "stack" in x)) {
    return {
      type: x.constructor?.name || "Error",
      name: x.name,
      message: String(x.message || ""),
      stack: String(x.stack || ""),
      code: x.code,
    };
  }
  // Eventos (ProgressEvent/ErrorEvent)
  if (x && typeof x === "object" && ("type" in x || "target" in x)) {
    return {
      type: x.constructor?.name || "Event",
      eventType: x.type,
      targetReadyState: x?.target?.readyState,
      message: String(x?.message ?? ""),
    };
  }
  try {
    return { type: typeof x, message: String(x), json: JSON.stringify(x) };
  } catch {
    return { type: typeof x, message: String(x) };
  }
}

function parseJSONSafe(s) {
  if (typeof s !== "string") return s;
  try { return JSON.parse(s); } catch { return s; }
}

export function connectSSE(arg1, arg2 = {}) {
  // --- Normaliza assinatura ---
  const cfg = typeof arg1 === "string"
    ? { path: arg1, ...arg2 }
    : (arg1 && typeof arg1 === "object" ? arg1 : {});

  const {
    path, url,            // um dos dois
    query, params,        // sinônimos
    withCredentials = false,
    onOpen, onError, onMessage,
    // tuning de reconexão (opcional)
    retryBaseMs = 1200,   // base do backoff
    retryMaxMs  = 10000,  // teto
  } = cfg;

  const rawBase = (import.meta.env.VITE_API_BASE_URL ?? "").toString().trim();
  const base = /^https?:\/\//i.test(rawBase) && rawBase !== "undefined"
    ? rawBase
    : window.location.origin;

  const p = (typeof url === "string" && url.trim())
    ? url.trim()
    : (typeof path === "string" ? path.trim() : "");

  if (!p) {
    console.error("[SSE] path/url inválido:", arg1 ?? "[null]");
    throw new TypeError("connectSSE: primeiro argumento precisa ser string ('/events') ou { url:'/events', ... }");
  }

  let urlObj;
  try {
    urlObj = new URL(p, base);
  } catch (e) {
    console.error("[SSE] base =", base, "path/url =", p);
    throw e;
  }

  const qp = query ?? params;
  if (qp && typeof qp === "object") {
    for (const [k, v] of Object.entries(qp)) {
      if (v !== undefined && v !== null) urlObj.searchParams.set(k, String(v));
    }
  }

  const finalUrl = urlObj.toString();

  // --- Estado interno ---
  let es = null;
  let closedManually = false;
  let retryCount = 0;
  let retryTimer = null;

  // Handlers nomeados -> Wrappers estáveis (para não duplicar em reconexões)
  // Map<string, Map<Function, Function>>
  const wrapperMap = new Map();

  function getWrapper(eventName, handler) {
    let m = wrapperMap.get(eventName);
    if (!m) { m = new Map(); wrapperMap.set(eventName, m); }
    let w = m.get(handler);
    if (!w) {
      w = (evt) => {
        try {
          const data = parseJSONSafe(evt?.data);
          handler(data, evt);
        } catch (err) {
          console.error("[SSE handler error]", serializeErr(err));
        }
      };
      m.set(handler, w);
    }
    return w;
  }

  function bindAllCurrentES() {
    for (const [eventName, mapFn] of wrapperMap.entries()) {
      for (const [, wrapper] of mapFn.entries()) {
        es.addEventListener(eventName, wrapper);
      }
    }
  }

  function clearTimer() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  }

  function scheduleReconnect() {
    if (closedManually) return;
    clearTimer();
    // backoff exponencial com jitter
    const expo = Math.min(retryMaxMs, Math.round(retryBaseMs * Math.pow(1.7, retryCount)));
    const jitter = Math.round(Math.random() * (expo * 0.25));
    const delay = Math.min(retryMaxMs, expo + jitter);
    retryCount++;
    retryTimer = setTimeout(start, delay);
  }

  function start() {
    clearTimer();
    try { es && es.close(); } catch {}
    es = new EventSource(finalUrl, { withCredentials });

    es.addEventListener("open", () => {
      retryCount = 0;
      try { bindAllCurrentES(); } catch {}
      try { onOpen && onOpen(); } catch (err) {
        console.error("[SSE onOpen error]", serializeErr(err));
      }
      // log leve para iOS
      console.log("[SSE open]", { url: finalUrl });
    });

    es.addEventListener("error", (ev) => {
      const info = { url: finalUrl, readyState: es?.readyState, ev: serializeErr(ev) };
      console.error("[SSE error]", info);
      try { onError && onError(ev); } catch (err) {
        console.error("[SSE onError error]", serializeErr(err));
      }
      try { es.close(); } catch {}
      scheduleReconnect();
    });

    // “message” padrão (quando servidor usa 'data:' sem 'event:')
    es.addEventListener("message", (evt) => {
      const data = parseJSONSafe(evt?.data);
      try { onMessage && onMessage({ type: "message", data }); } catch (err) {
        console.error("[SSE onMessage error]", serializeErr(err));
      }
    });
  }

  start();

  const api = {
    /** Adiciona listener para um nome de evento custom (ex.: 'heartbeat', 'log.info', etc.) */
    on(eventName, handler) {
      const wrapper = getWrapper(eventName, handler);
      if (es) es.addEventListener(eventName, wrapper); // anexa no ES atual
      return api;
    },
    /** Remove listener previamente registrado */
    off(eventName, handler) {
      const m = wrapperMap.get(eventName);
      if (!m) return api;
      const wrapper = m.get(handler);
      if (wrapper) {
        try { es && es.removeEventListener(eventName, wrapper); } catch {}
        m.delete(handler);
      }
      if (m.size === 0) wrapperMap.delete(eventName);
      return api;
    },
    /** Fecha a conexão e cancela reconexões */
    close() {
      closedManually = true;
      clearTimer();
      try { es && es.close(); } catch {}
      es = null;
    },
    /** Útil pra debug */
    url: finalUrl,
  };

  return api;
}
