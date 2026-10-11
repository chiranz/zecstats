import { compact, delta, num, type Good } from '@/lib/format';

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
    case 'hash': return { v: num(a / 1e9, 2), unit: 'GSol/s' };
    case 'bytes': return { v: num(a / 1000, 0), unit: 'KB' };
    case 'big': return { v: compact(v, 2) };
  }
}
export const fmtMetricText = (v: number | null | undefined, kind: MetricKind) => { const f = fmtMetric(v, kind); return f.unit ? `${f.v} ${f.unit}` : f.v; };

/** Change from `from` to `now`. Shares and rates (kind 'pct') always change in percentage points; otherwise a relative %
 *  when both are positive, else a difference in the metric's own unit (flows change sign, so a percentage would be
 *  meaningless). The arrow is the direction and `cls` the colour, good or bad per `good`; a change that rounds to 0 is flat. */
export function change(now: number, from: number | null, kind: MetricKind, signed: boolean, good: Good = 'up'): { text: string; dir: 'up' | 'dn' | 'flat'; cls: 'up' | 'dn' | 'muted'; value: number } | null {
  if (from == null || !Number.isFinite(from)) return null;
  if (kind === 'pct') { const d = delta(now - from, 2, ' pts', good); return { ...d, value: now - from }; }
  if (!signed && from <= 0) return null;
  if (signed && (from <= 0 || now <= 0 || kind === 'usdSigned')) {
    const df = now - from;
    const d = delta(df, 0, '', good);
    const mag = kind === 'usdSigned' ? `$${compact2(Math.abs(df))}` : fmtMetricText(Math.abs(df), kind);
    // rank sign-crossing rows by their relative size against the old level so sorting stays meaningful
    return { text: d.dir === 'flat' ? mag : `${d.dir === 'up' ? '▲' : '▼'} ${mag}`, dir: d.dir, cls: d.cls, value: (df / Math.max(Math.abs(from), 1e-9)) * 100 };
  }
  const p = (now / from - 1) * 100;
  const a = Math.abs(p);
  const d = delta(p, a >= 100 ? 0 : a < 1 ? 2 : 1, '%', good);
  return { ...d, value: p };
}
