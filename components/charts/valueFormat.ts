import { compact, num } from '@/lib/format';

// Formats are passed as strings so server components can configure client charts (functions aren't serialisable).
export type ValueFormat = 'usd' | 'usd0' | 'usdCompact' | 'zec' | 'zecCompact' | 'pct' | 'pct0' | 'pct2' | 'count' | 'countCompact' | 'ratio' | 'ratio5' | 'x' | 'bytes' | 'days' | 'hashrate' | 'btc' | 'hour';

// 14.49 → "14:29" (a fractional UTC hour as a clock time)
const hhmm = (h: number) => { const m = Math.round(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

const hashUnit = (a: number): [number, string] => (a >= 1e12 ? [1e12, 'TSol/s'] : a >= 1e9 ? [1e9, 'GSol/s'] : a >= 1e6 ? [1e6, 'MSol/s'] : a >= 1e3 ? [1e3, 'KSol/s'] : [1, 'Sol/s']);

export function formatValue(v: number, f: ValueFormat, axis = false): string {
  if (!Number.isFinite(v)) return '—';
  if (axis) return axisLabels([v], f).labels[0];
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  switch (f) {
    case 'usd': return `${sign}$${a >= 1000 ? num(a, 0) : num(a, 2)}`;
    case 'usd0': return `${sign}$${num(a, 0)}`;
    case 'usdCompact': return `${sign}$${compact(a, 2)}`;
    case 'zec': return `${sign}${num(a, a < 10 ? 2 : 0)} ZEC`;
    case 'zecCompact': return `${sign}${compact(a, 2)} ZEC`;
    case 'pct': return `${sign}${num(a, 2)}%`;
    case 'pct0': return `${sign}${num(a, 0)}%`;
    case 'pct2': return `${sign}${num(a, 2)}%`;
    case 'count': return `${sign}${num(a, 0)}`;
    case 'countCompact': return `${sign}${compact(a, 2)}`;
    case 'ratio': return `${sign}${num(a, a < 0.01 ? 5 : a < 1 ? 4 : 2)}`;
    case 'ratio5': return `${sign}${num(a, 5)}`;
    case 'x': return `${sign}${num(a, 2)}×`;
    case 'bytes': return a >= 1e6 ? `${num(a / 1e6, 1)} MB` : `${num(a / 1e3, a >= 1e4 ? 0 : 1)} KB`;
    case 'days': return a >= 730 ? `${sign}${num(a / 365.25, 1)} years` : `${sign}${num(a, a < 10 ? 1 : 0)} days`;
    case 'hashrate': { const [d, u] = hashUnit(a); return `${num(a / d, a / d < 10 ? 2 : 1)} ${u}`; }
    case 'btc': return `${sign}${num(a, a < 1 ? 5 : 2)} BTC`;
    case 'hour': return `${hhmm(a)} UTC`;
  }
}

/** The unit an axis shows once at its top (tick labels stay short), or undefined when the ticks carry it ($, %, ×). */
export function unitOf(f: ValueFormat, max = 0): string | undefined {
  if (f === 'zec' || f === 'zecCompact') return 'ZEC';
  if (f === 'btc') return 'BTC';
  if (f === 'hour') return 'UTC';
  if (f === 'bytes') return Math.abs(max) >= 1e6 ? 'MB' : 'KB';
  if (f === 'hashrate') return hashUnit(Math.abs(max))[1];
  return undefined;
}

const DIVS: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
// decimals that make a tick step visible (0.05 → 2), so neighbouring labels never read the same
// (plus one more when the step isn't round at that precision: 1.37 → 1 → "1.4 · 2.7 · 4.1")
const decFor = (step: number) => {
  if (!(step > 0)) return 0;
  const d = Math.min(6, Math.max(0, Math.ceil(-Math.log10(step) - 1e-9)));
  const k = step * 10 ** d;
  return Math.abs(Math.round(k) - k) > k * 0.01 ? Math.min(6, d + 1) : d;
};

/**
 * Axis tick labels with one precision for the whole axis, taken from the tick step: "27.20M · 27.25M", "0% · 20%",
 * "5.5y". Log axes and lone values are labelled each on its own. `unit` is what the axis title shows (ZEC, BTC…).
 */
export function axisLabels(ticks: number[], f: ValueFormat, log = false): { labels: string[]; unit?: string } {
  if (f === 'hour') return { labels: ticks.map((t) => (Number.isFinite(t) ? hhmm(t) : '—')), unit: 'UTC' };
  const fin = ticks.filter(Number.isFinite);
  const max = fin.length ? Math.max(...fin.map(Math.abs)) : 0;
  const steps = fin.slice(1).map((t, i) => Math.abs(t - fin[i])).filter((s) => s > 0);
  const per = log || !steps.length;
  const step = per ? 0 : Math.min(...steps);
    let div = 1, suf = '';
  if (!per && ['usd', 'usd0', 'usdCompact', 'zec', 'zecCompact', 'count', 'countCompact'].includes(f)) {
    // M/B/T while the step needs at most 2 decimals ("1.4M", "27.25M"); K only from 10K or K-sized steps
    for (const [d, s] of DIVS) if (max >= d && (d === 1e3 ? step >= d || max >= d * 10 : decFor(step / d) <= 2)) { div = d; suf = s; break; }
  }
  if (f === 'bytes') div = max >= 1e6 ? 1e6 : 1e3;
  if (f === 'hashrate') div = hashUnit(max)[0];
  const yrs = f === 'days' && max >= 730;
  if (yrs) div = 365.25;
  const kmb = per && div === 1 && f !== 'days';
  const body = (v: number) => {
    const a = Math.abs(v);
    if (a === 0) return '0';
    return kmb ? compact(a, 1) : per ? `${compact(a / div, 2)}${suf}` : `${num(a / div, decFor(step / div))}${suf}`;
  };
  const sgn = (v: number) => (v < 0 ? '−' : '');
  const pre = f.startsWith('usd') ? '$' : '';
  const post = f.startsWith('pct') ? '%' : f === 'x' ? '×' : f === 'days' ? (yrs ? 'y' : 'd') : '';
  return { labels: ticks.map((t) => (!Number.isFinite(t) ? '—' : t === 0 && f === 'days' ? '0' : `${sgn(t)}${pre}${body(t)}${post}`)), unit: unitOf(f, max) };
}
