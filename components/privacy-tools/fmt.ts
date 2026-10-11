import { num } from '@/lib/format';

/** Report-style ZEC magnitude, as the live reports print it: 20.05M · 362K · 156. */
export function fz(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v), sign = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}${Math.round(a / 1e3).toLocaleString('en-US')}K`;
  return `${sign}${num(a, a < 10 ? 2 : 0)}`;
}

/** Hop / amount size in ZEC with sensible precision: 1.25 · 0.0349 · 58.03 · 1,250. */
export function zamt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1000) return num(v, 0);
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.001) return v.toFixed(4);
  return v.toPrecision(2);
}

/** Seconds → "42m", "5d 5h", "8h 6m". */
export function gap(secs: number): string {
  const m = Math.round(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** A round amount as people write it: 0.1 · 2.5 · 10 · 1,000 (no padded zeros). */
export const ramt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 });
