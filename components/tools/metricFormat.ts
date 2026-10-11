import { compact, num } from '@/lib/format';

/** 20.74e9 -> "20.74B": two decimals at every unit, as the table reads best when rows line up. */
function compact2(v: number): string {
  const a = Math.abs(v);
  for (const [d, u] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M']] as const) if (a >= d) return `${num(v / d, 2)}${u}`;
  return num(v, 0);
}
import type { MetricKind } from '@/lib/data/tools';

// One formatter per metric kind, shared by the table, its CSV and the correlation labels.
export function fmtMetric(v: number | null | undefined, kind: MetricKind): { v: string; unit?: string } {
  if (v == null || !Number.isFinite(v)) return { v: '—' };
  const a = Math.abs(v), sign = v < 0 ? '−' : '';
  switch (kind) {
    case 'usd': return { v: `${sign}$${a >= 1000 ? num(a, 0) : num(a, 2)}` };
    case 'usdC': return { v: `${sign}$${compact2(a)}` };
    case 'usdSigned': return { v: `${v < 0 ? '−' : '+'}$${compact2(a)}` };
    case 'ratio': return { v: num(v, a < 0.01 ? 6 : 5).replace(/0+$/, '').replace(/\.$/, '') };
    case 'pct': return { v: `${sign}${num(a, 2)}%` };
    case 'x2': return { v: `${sign}${num(a, 2)}×` };
    case 'x3': return { v: `${sign}${num(a, 3)}×` };
    case 'zecC': return { v: `${sign}${compact2(a)}`, unit: 'ZEC' };
    case 'zec': return { v: `${sign}${num(a, 0)}`, unit: 'ZEC' };
    case 'count': return { v: `${sign}${num(a, a < 100 ? 1 : 0)}` };
    case 'hash': return { v: num(a / 1e9, 2), unit: 'GH/s' };
    case 'bytes': return { v: num(a / 1000, 0), unit: 'KB' };
    case 'big': return { v: compact(v, 2) };
  }
}
export const fmtMetricText = (v: number | null | undefined, kind: MetricKind) => { const f = fmtMetric(v, kind); return f.unit ? `${f.v} ${f.unit}` : f.v; };

/** Change from `from` to `now`. Relative % when both are positive; otherwise a difference in the metric's own unit
 *  (flows and funding rates change sign, so a percentage would be meaningless). */
export function change(now: number, from: number | null, kind: MetricKind, signed: boolean): { text: string; dir: 'up' | 'dn' | 'flat'; value: number } | null {
  if (from == null || !Number.isFinite(from)) return null;
  if (!signed && from <= 0) return null;
  if (signed && (from <= 0 || now <= 0 || kind === 'usdSigned')) {
    const d = now - from;
    const dir = Math.abs(d) < 1e-9 ? 'flat' : d > 0 ? 'up' : 'dn';
    const mag = kind === 'pct' ? `${num(Math.abs(d), 2)} pts` : kind === 'usdSigned' ? `$${compact2(Math.abs(d))}` : fmtMetricText(Math.abs(d), kind);
    // rank sign-crossing rows by their relative size against the old level so sorting stays meaningful
    return { text: `${dir === 'up' ? '▲' : dir === 'dn' ? '▼' : ''} ${mag}`.trim(), dir, value: (d / Math.max(Math.abs(from), 1e-9)) * 100 };
  }
  const p = (now / from - 1) * 100;
  const a = Math.abs(p);
  const digits = a >= 100 ? 0 : a < 1 ? 2 : 1;
  const dir = a < 0.005 ? 'flat' : p > 0 ? 'up' : 'dn';
  return { text: `${dir === 'up' ? '▲' : dir === 'dn' ? '▼' : ''} ${num(a, digits)}%`.trim(), dir, value: p };
}
