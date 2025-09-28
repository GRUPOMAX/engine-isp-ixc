// src/components/TokenModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { confirmSavedToken } from "@/lib/adminApi";


function downloadTxt(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

export default function TokenModal({ open, token, onClose }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) { setShow(false); setCopied(false); }
  }, [open]);

  const masked = useMemo(() => {
    if (!token) return "—";
    // mostra só 4+…+4 p/ segurança
    return token.length > 12 ? `${token.slice(0, 4)}••••${token.slice(-4)}` : "••••••••";
  }, [token]);

  if (!open) return null;

  const body = (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/60" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
          <div className="px-5 py-4 border-b border-neutral-800">
            <h2 className="text-lg font-semibold">Seu token de acesso foi gerado</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Guarde este token com segurança. Ele só será exibido <span className="font-semibold">uma única vez</span>.
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div className="text-xs text-neutral-400">Token</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 overflow-x-auto">
                {show ? token : masked}
              </code>
              <button
                className="rounded-lg border border-neutral-700 px-3 py-2 hover:bg-neutral-800 transition"
                onClick={() => setShow(s => !s)}
                title={show ? "Ocultar" : "Mostrar"}
              >
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-neutral-700 px-3 py-2 hover:bg-neutral-800 transition"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(token);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {}
                }}
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>

              <button
                className="rounded-lg border border-neutral-700 px-3 py-2 hover:bg-neutral-800 transition"
                onClick={() => downloadTxt(`admin-token-${new Date().toISOString().slice(0,10)}.txt`, token)}
              >
                Baixar .txt
              </button>

              <button
                className="ml-auto rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 transition"
                onClick={async () => {
                  try { await confirmSavedToken(); } catch {}
                  onClose?.();
                }}
              >
                Já salvei com segurança
              </button>
            </div>

            <p className="text-xs text-amber-400/90">
              Não compartilhe este token. Ele dá acesso administrativo ao sistema.
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(body, document.body);
}
