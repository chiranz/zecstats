// Pure helpers for registry-b (usage, holders, supply, markets). No data access here — loaders pass rows in.
import type { Series, ChartEvent } from '@/components/charts/TimeSeriesChart';
import type { TimeSeriesPanel } from '../types';

// ─── colours (CSS variables only; tints via color-mix so both themes work) ───────────────────────────────
export const C = {
  zec: 'var(--zec)', btc: 'var(--btc)', text: 'var(--text)', text2: 'var(--text-2)', muted: 'var(--muted)',
  s1: 'var(--s1)', s2: 'var(--s2)', s3: 'var(--s3)', s4: 'var(--s4)', s5: 'var(--s5)', s6: 'var(--s6)',
  transparent: 'var(--p-transparent)', sprout: 'var(--p-sprout)', sapling: 'var(--p-sapling)', orchard: 'var(--p-orchard)', ironwood: 'var(--p-ironwood)', lockbox: 'var(--p-lockbox)',
  gold: 'var(--gold)', info: 'var(--info)',
};
/** Same hue, lighter weight: used for daily columns under a rolling-average line. */
export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
/** Sequential one-hue ramp for ordinal buckets (age, depth): step 0 = strongest. Mixes toward the card colour. */
export const ramp = (color: string, steps: number) =>
  Array.from({ length: steps }, (_, i) => `color-mix(in srgb, ${color} ${Math.round(100 - (i * 84) / Math.max(1, steps - 1))}%, var(--card))`);

// ─── series builders ─────────────────────────────────────────────────────────────────────────────────────
type V = (number | null)[];
/** Daily columns. agg 'mean' so bucketed long ranges stay a per-day figure next to the average line. */
export const bars = (key: string, label: string, color: string, values: V, extra: Partial<Series> = {}): Series => ({ key, label, color, values, type: 'bar', agg: 'mean', ...extra });
export const line = (key: string, label: string, color: string, values: V, extra: Partial<Series> = {}): Series => ({ key, label, color, values, type: 'line', ...extra });
export const area = (key: string, label: string, color: string, values: V, extra: Partial<Series> = {}): Series => ({ key, label, color, values, type: 'area', ...extra });

export const panel = (p: Omit<TimeSeriesPanel, 'kind'>): TimeSeriesPanel => ({ kind: 'timeseries', ...p });

// ─── maths ───────────────────────────────────────────────────────────────────────────────────────────────
/** Trailing mean over n values (null until n values are available; nulls are skipped inside the window). */
export function rolling(values: V, n: number, minCount = n): V {
  const out: V = [];
  let sum = 0, cnt = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v != null && Number.isFinite(v)) { sum += v; cnt++; }
    if (i >= n) { const o = values[i - n]; if (o != null && Number.isFinite(o)) { sum -= o; cnt--; } }
    out.push(cnt >= minCount ? sum / cnt : null);
  }
  return out;
}
/** Linearly weighted moving average (the live site's wma()): newest weight = period. */
export function wma(values: number[], period: number): V {
  const out: V = [];
  const div = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let s = 0;
    for (let j = 0; j < period; j++) s += values[i - j] * (period - j);
    out.push(s / div);
  }
  return out;
}
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const lastIndex = (values: V): number => { for (let i = values.length - 1; i >= 0; i--) { const v = values[i]; if (v != null && Number.isFinite(v)) return i; } return -1; };

/** % change of the last valid value against the value `days` calendar days earlier (nearest earlier date). */
export function changeOver(dates: string[], values: V, days: number): { pct: number; days: number } | null {
  const i = lastIndex(values);
  if (i < 0) return null;
  const target = Date.parse(dates[i]) - days * 86400000;
  let j = i;
  while (j > 0 && Date.parse(dates[j]) > target) j--;
  const a = values[j], b = values[i];
  if (a == null || b == null || !a || Date.parse(dates[j]) > target) return null;
  return { pct: ((b - a) / Math.abs(a)) * 100, days };
}
/** ≤90-point sparkline (thinned evenly from the last `span` valid values). */
export function spark(values: V, span = 365, n = 90): number[] {
  const xs = values.filter((v): v is number => v != null && Number.isFinite(v)).slice(-span);
  if (xs.length <= n) return xs;
  const k = xs.length / n;
  return Array.from({ length: n }, (_, i) => xs[Math.min(xs.length - 1, Math.round((i + 1) * k) - 1)]);
}

/** Monday of the ISO week of YYYY-MM-DD. */
export function weekStart(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// ─── copy helpers ────────────────────────────────────────────────────────────────────────────────────────
/** "up 4.2% on 28 days earlier" / "down …" / "flat …" — words, so the sentence never relies on colour. */
export function changeWords(ch: { pct: number; days: number } | null | undefined): string {
  if (!ch) return '';
  const a = Math.abs(ch.pct);
  if (a < 0.05) return `flat on ${ch.days} days earlier`;
  return `${ch.pct > 0 ? 'up' : 'down'} ${a.toFixed(1)}% on ${ch.days} days earlier`;
}

// ─── shared events (network upgrades and halvings) ───────────────────────────────────────────────────────
export const UPGRADES: ChartEvent[] = [
  { date: '2018-10-28', label: 'Sapling' },
  { date: '2019-12-11', label: 'Blossom' },
  { date: '2020-11-18', label: 'Canopy · 1st halving' },
  { date: '2022-05-31', label: 'NU5 · Orchard' },
  { date: '2024-11-23', label: 'NU6 · 2nd halving' },
  { date: '2026-07-28', label: 'Ironwood' },
];
export const HALVINGS: ChartEvent[] = [
  { date: '2020-11-18', label: '1st halving' },
  { date: '2024-11-23', label: '2nd halving · NU6' },
];
export const IRONWOOD: ChartEvent = { date: '2026-07-28', label: 'Ironwood' };
