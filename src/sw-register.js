export function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      // Atualiza em segundo plano quando houver nova versão
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            // nova versão pronta; recarrega quando o SW assumir o controle
            navigator.serviceWorker.addEventListener("controllerchange", () => {
              window.location.reload();
            });
            reg.waiting?.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    } catch (err) {
      // opcional: console.warn("SW register failed", err);
    }
  });
}
