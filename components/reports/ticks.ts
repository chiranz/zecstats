// Tick builders for XYChart (server side, so labels are exact and serialisable).
import type { Tick } from './XYChart';
import { compact, monthYear, year } from '@/lib/format';

export const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** Month (or year) ticks between two ISO dates; first tick dated. */
export function dateTicks(from: string, to: string, every: 'month' | 'quarter' | 'year' = 'month'): Tick[] {
  const a = new Date(dayMs(from)), b = dayMs(to);
  const out: Tick[] = [];
  const step = every === 'year' ? 12 : every === 'quarter' ? 3 : 1;
  let y = a.getUTCFullYear(), m = a.getUTCMonth() + 1;
  if (every === 'year') { y += 1; m = 0; }
  while (true) {
    const t = Date.UTC(y, m, 1);
    if (t > b) break;
    out.push({ v: t, label: every === 'year' ? year(t) : monthYear(t) });
    m += step; if (m >= 12) { y += Math.floor(m / 12); m %= 12; }
  }
  return out;
}
/** Decade ticks for a log dollar axis: $0.01, $1, $100, $10K … */
export function usdDecades(lo: number, hi: number): Tick[] {
  const out: Tick[] = [];
  for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) out.push({ v: 10 ** e, label: usdTick(10 ** e) });
  return out;
}
export const usdTick = (v: number) => (v < 1 ? `$${v.toFixed(Math.max(0, -Math.floor(Math.log10(v))))}` : `$${compact(v, 0)}`);
