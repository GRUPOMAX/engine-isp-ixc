// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { registerSW } from "./sw-register.js";

// normaliza rota sem hash
if (location.pathname !== "/" && !location.hash) {
  location.replace("/#" + location.pathname);
}

/** Util: serializa QUALQUER motivo/erro de forma estável */
function serializeErr(x) {
  // Error padrão
  if (x && typeof x === "object" && ("message" in x || "stack" in x)) {
    return {
      type: x.constructor?.name || "Error",
      message: String(x.message || ""),
      stack: String(x.stack || ""),
      ...("code" in x ? { code: x.code } : {}),
      ...("name" in x ? { name: x.name } : {}),
    };
  }
  // EventSource/ProgressEvent/ErrorEvent
  if (x && typeof x === "object" && ("type" in x || "target" in x)) {
    return {
      type: x.constructor?.name || "Event",
      eventType: x.type,
      targetReadyState: x?.target?.readyState,
      message: String(x?.message ?? ""),
    };
  }
  // null, undefined, string, number, boolean, etc.
  try {
    return { type: typeof x, message: String(x), json: JSON.stringify(x) };
  } catch {
    return { type: typeof x, message: String(x) };
  }
}

// Evita console.error(null) virar spam indecifrável no iOS
{
  const origError = console.error;
  console.error = (...args) => {
    const safe = args.map(a => (a == null ? "[null]" : a));
    origError(...safe);
  };
}

// Erros de script
window.addEventListener("error", (e) => {
  const err = e?.error ?? e;
  const info = serializeErr(err);
  console.error("[window.error]", {
    ...info,
    filename: e?.filename,
    lineno: e?.lineno,
    colno: e?.colno,
  });
});

// Promises rejeitadas sem catch (fetch/SSE/reconexões)
window.addEventListener("unhandledrejection", (e) => {
  const info = serializeErr(e?.reason);
  console.error("[unhandledrejection]", info);
});

// (Opcional) Hook global de SSE para log amigável no iOS
// Chame isso onde você cria seu EventSource
export function wireSSE(es) {
  if (!es) return es;
  es.addEventListener("open", () => {
    console.log("[SSE open]");
  });
  es.addEventListener("error", (ev) => {
    // iOS costuma mandar ProgressEvent sem detalhe
    console.error("[SSE error]", {
      type: ev?.type,
      readyState: es?.readyState, // 0 CONNECTING, 1 OPEN, 2 CLOSED
    });
  });
  return es;
}

createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);

registerSW();
