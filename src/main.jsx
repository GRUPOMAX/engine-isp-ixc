// src/main.jsx (ou index.jsx)
import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { registerSW } from "./sw-register.js";

// 👇 normaliza: se tem pathname e não tem hash, converte para hash-route
if (location.pathname !== "/" && !location.hash) {
  location.replace("/#" + location.pathname);
}

createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);

registerSW();