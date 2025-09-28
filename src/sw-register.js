// src/sw-register.js
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const BASE = import.meta.env.BASE_URL || '/';
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(
        `${BASE}sw.js`,
        { scope: BASE }                       // <- escopo correto no Pages
      );

      // auto-update suave
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              window.location.reload();
            });
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (e) {
      // opcional: console.warn('SW register failed', e);
    }
  });
}
