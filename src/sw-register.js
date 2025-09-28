// src/sw-register.js
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  // Vite garante BASE_URL, mas normalizamos por segurança
  const rawBase = import.meta.env.BASE_URL || '/';
  const BASE = (rawBase.startsWith('/') ? rawBase : '/' + rawBase).replace(/\/+$/, '/') ;

  // Monta a URL do SW sem risco de barras duplicadas
  const swUrl = new URL('sw.js', window.location.origin + BASE).toString();

  // Função que força o novo SW a assumir e recarrega com segurança
  const activateAndReload = (reg) => {
    if (reg.waiting) {
      // quando o novo SW assumir o controle, recarrega
      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        // pequena espera evita race conditions em iOS
        setTimeout(() => window.location.reload(), 50);
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  // Checa atualizações de tempos em tempos (e quando volta ao foco)
  const setupUpdateChecks = (reg) => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    // a cada 30 min
    setInterval(check, 30 * 60 * 1000);
  };

  window.addEventListener('load', async () => {
    try {
      // Desregistra SWs com escopos antigos (troca de base / migração)
      // Evita conflito quando você muda de "/" para "/engine-isp-ixc/"
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const scopePath = new URL(r.scope).pathname;
        // se o escopo não começar pela BASE atual mas pertence ao mesmo host, limpamos
        if (scopePath !== BASE && scopePath !== '/' && scopePath.startsWith('/')) {
          // não mexe em outros sites; só escopos deste host
          // ignore erros
          r.unregister().catch(() => {});
        }
      }

      const reg = await navigator.serviceWorker.register(swUrl, { scope: BASE });

      // Se já existe controlador (ou seja, não é o primeiríssimo load), aplicamos hot-swap
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            activateAndReload(reg);
          }
        });
      });

      // Se a página carregou e já há um waiting (raro, mas possível), ativa
      if (reg.waiting && navigator.serviceWorker.controller) {
        activateAndReload(reg);
      }

      setupUpdateChecks(reg);
    } catch (e) {
      // opcional: console.warn('SW register failed', e);
    }
  });
}
