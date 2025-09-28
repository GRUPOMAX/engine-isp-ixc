export function fmtSec(n = 0) {
  const s = Math.floor(n);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export function fmtMs(ms = 0) {
  if (ms < 1000) return `${ms}ms`;
  return fmtSec(ms / 1000);
}

export function timeAgo(iso) {
  try {
    const t = new Date(iso).getTime();
    const d = Date.now() - t;
    if (Number.isNaN(t)) return "—";
    if (d < 60_000) return `${Math.round(d / 1000)}s atrás`;
    if (d < 3_600_000) return `${Math.round(d / 60_000)}m atrás`;
    return `${Math.round(d / 3_600_000)}h atrás`;
  } catch {
    return "—";
  }
}
