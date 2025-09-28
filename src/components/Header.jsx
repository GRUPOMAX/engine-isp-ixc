// src/components/Header.jsx
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

function DrawerPortal({ open, onClose, children }) {
  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[999] bg-black/50 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 z-[1000] w-[80%] max-w-xs border-l border-neutral-800 
        bg-neutral-950 text-neutral-200 shadow-xl transition-transform duration-300 
        ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        // empurra o conteúdo para baixo do notch/status bar e corrige a altura
        style={{
          top: 0,
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          height: 'calc(100% - env(safe-area-inset-top, 0px))',
        }}
      >
        {children}
      </aside>
    </>,
    document.body
  );
}


export default function Header({ onToggleTheme, isAuthed, onLogout }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prevOverflow || "";
    return () => (document.body.style.overflow = prevOverflow || "");
  }, [open]);

  const onKey = useCallback((e) => {
    if (e.key === "Escape") setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  const ThemeBtn = (
    <button
      onClick={onToggleTheme}
      className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      Tema
    </button>
  );

  const LogoutOrLogin = isAuthed ? (
    <button
      onClick={onLogout}
      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-800 transition-colors"
    >
      Sair
    </button>
  ) : (
    <a
      href="/#/login"
      className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      Login
    </a>
  );

  return (
    <>
      {/* Header com padding-top respeitando o notch (iOS/Android) */}
      <header
        className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur bg-neutral-50/70 dark:bg-neutral-950/70"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between min-h-[56px]">
          <a href="/#/" className="text-lg font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">
            Engine <span className="text-cyan-500">Dashboard</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3">
            {isAuthed && (
              <>
                <a
                  href="/#/"
                  className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                >
                  Home
                </a>
                <a
                  href="/#/vision"
                  className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                >
                  Neural
                </a>
                <a
                  href="/#/cache"
                  className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                >
                  Cache
                </a>
              </>
            )}
            {ThemeBtn}
            {LogoutOrLogin}
          </nav>

          {/* Mobile: botão hamburguer (continua no topo) */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="fill-none stroke-current">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <DrawerPortal open={open} onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <div className="text-sm font-semibold">
              Menu <span className="text-cyan-400">ENGINE</span>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-neutral-800 px-2.5 py-1.5"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="fill-none stroke-current">
                <path d="M6 6l12 12M6 18L18 6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className="px-3 py-2">
            {isAuthed && (
              <div className="grid gap-1.5">
                <a
                  href="/#/"
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-neutral-900 hover:text-cyan-300"
                  onClick={() => setOpen(false)}
                >
                  Home
                </a>
                <a
                  href="/#/vision"
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-neutral-900 hover:text-cyan-300"
                  onClick={() => setOpen(false)}
                >
                  Neural
                </a>
                <a
                  href="/#/cache"
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-neutral-900 hover:text-cyan-300"
                  onClick={() => setOpen(false)}
                >
                  Cache
                </a>
              </div>
            )}

            <div className="mt-3 grid gap-2 border-t border-neutral-900 pt-3">
              <div className="flex gap-2">
                {ThemeBtn}
                {LogoutOrLogin}
              </div>
            </div>

            <div className="mt-6 text-[11px] text-neutral-500 px-3">
              © {new Date().getFullYear()} Appsystem
            </div>
          </nav>
        </DrawerPortal>
      </header>

      {/* FAB: aparece só em telas < md; some quando o drawer abre */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className={`md:hidden fixed right-4 bottom-4 z-[1100] rounded-full shadow-lg border border-neutral-700/60 
                    backdrop-blur bg-neutral-900/70 text-neutral-100 px-4 py-3
                    ${open ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" className="fill-none stroke-current">
            <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-medium">Menu</span>
        </div>
      </button>
    </>
  );
}
