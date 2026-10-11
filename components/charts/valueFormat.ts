import { compact, num } from '@/lib/format';

// Formats are passed as strings so server components can configure client charts (functions aren't serialisable).
export type ValueFormat = 'usd' | 'usd0' | 'usdCompact' | 'zec' | 'zecCompact' | 'pct' | 'pct0' | 'pct2' | 'count' | 'countCompact' | 'ratio' | 'ratio5' | 'x' | 'bytes' | 'days' | 'hashrate' | 'btc';

export function formatValue(v: number, f: ValueFormat, axis = false): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  switch (f) {
    case 'usd': return axis ? `${sign}$${compact(a, 1)}` : `${sign}$${a >= 1000 ? num(a, 0) : num(a, 2)}`;
    case 'usd0': return axis ? `${sign}$${compact(a, 1)}` : `${sign}$${num(a, 0)}`;
    case 'usdCompact': return `${sign}$${compact(a, axis ? 1 : 2)}`;
    case 'zec': return axis ? `${sign}${compact(a, 1)}` : `${sign}${num(a, a < 10 ? 2 : 0)} ZEC`;
    case 'zecCompact': return axis ? `${sign}${compact(a, 1)}` : `${sign}${compact(a, 2)} ZEC`;
    case 'pct': return `${sign}${num(a, axis ? (a < 10 ? 1 : 0) : 2)}%`;
    case 'pct0': return `${sign}${num(a, 0)}%`;
    case 'pct2': return `${sign}${num(a, 2)}%`;
    case 'count': return axis ? `${sign}${compact(a, 1)}` : `${sign}${num(a, 0)}`;
    case 'countCompact': return `${sign}${compact(a, axis ? 1 : 2)}`;
    case 'ratio': return `${sign}${num(a, a < 0.01 ? 5 : a < 1 ? 4 : 2)}`;
    case 'ratio5': return `${sign}${num(a, 5)}`;
    case 'x': return `${sign}${num(a, axis ? 1 : 2)}×`;
    case 'bytes': return a >= 1e6 ? `${num(a / 1e6, 1)} MB` : `${num(a / 1e3, a >= 1e4 ? 0 : 1)} KB`;
    case 'days': return `${sign}${compact(a, 1)}${axis ? 'd' : ' days'}`;
    case 'hashrate': return a >= 1e9 ? `${num(a / 1e9, 2)} GH/s` : `${num(a / 1e6, 1)} MH/s`;
    case 'btc': return `${sign}${num(a, a < 1 ? 5 : 2)}${axis ? '' : ' BTC'}`;
  }
}
