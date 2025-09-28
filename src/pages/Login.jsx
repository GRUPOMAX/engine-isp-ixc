// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sha256Hex } from '@/lib/crypto';
import { findUserByEmailAndHash } from '@/lib/nocodb';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Se já estiver logado, manda pra rota pretendida (ou '/')
  useEffect(() => {
    const raw = localStorage.getItem('frontisp_auth');
    if (raw) navigate(from, { replace: true });
  }, [navigate, from]);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setErr('');
    setLoading(true);
    try {
      const passHash = await sha256Hex(pass);
      const user = await findUserByEmailAndHash(email.trim(), passHash);
      if (!user) {
        setErr('Credenciais inválidas.');
      } else {
        localStorage.setItem('frontisp_auth', JSON.stringify({ id: user.Id, email: user['user-email'] }));
        navigate(from, { replace: true });
      }
    } catch {
      setErr('Falha na autenticação. Verifique conexão e permissões.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100 flex items-center justify-center px-4"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
          <div className="p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-neutral-800 grid place-content-center">
                <span className="text-cyan-400 font-bold">EN</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                ENGINE <span className="text-cyan-400">Login</span>
              </h1>
              <p className="mt-1 text-xs text-neutral-400">Acesse o painel com seu e-mail e senha.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-300">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  // iOS: 16px reais para evitar zoom ao focar
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-base outline-none focus:border-cyan-500"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-300">Senha</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 pr-12 text-base outline-none focus:border-cyan-500"
                    placeholder="********"
                    autoComplete="current-password"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-xs text-neutral-400 hover:text-neutral-200"
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                    tabIndex={-1} // evita foco acidental no iOS
                  >
                    {show ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              {err && (
                <div className="rounded-lg border border-rose-800 bg-rose-900/30 px-3 py-2 text-xs text-rose-200">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-cyan-500/90 hover:bg-cyan-500 text-neutral-900 font-medium py-2 text-base transition disabled:opacity-60"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-neutral-500">
          © {new Date().getFullYear()} Engine • AppSystem
        </p>
      </div>
    </div>
  );
}
