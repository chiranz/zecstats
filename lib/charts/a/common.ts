import 'server-only';
import { cache } from 'react';
import type { ChartEvent } from '@/components/charts/TimeSeriesChart';
import { formatValue, type ValueFormat } from '@/components/charts/valueFormat';
import { getCompleteDailyStats, getDailyPrices, getFreshness, type DailyPrice } from '@/lib/data/snapshot';
import { num } from '@/lib/format';
import type { Headline } from '../types';

// Shared helpers for registry-a (price, cost basis, privacy). Series are derived the way data/raw/charts.js does.

export const NU_EVENTS: ChartEvent[] = [
  { date: '2018-06-25', label: 'Overwinter' },
  { date: '2018-10-28', label: 'Sapling' },
  { date: '2020-11-18', label: 'Canopy · halving' },
  { date: '2022-05-31', label: 'NU5 · Orchard' },
  { date: '2024-11-23', label: 'NU6 · halving' },
  { date: '2026-07-28', label: 'Ironwood' },
];

/** Complete UTC days only (the live site drops the partial current day). */
export const completeDaily = getCompleteDailyStats;
export const completePrices = cache(async (): Promise<DailyPrice[]> => {
  const [p, f] = await Promise.all([getDailyPrices(), getFreshness()]);
  return p.filter((r) => r.date <= f.dataThrough);
});
export const dataThrough = async () => (await getFreshness()).dataThrough;

/** Linearly weighted moving average (as the live site's wma()): period in rows. */
export function wma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const div = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let s = 0;
    for (let j = 0; j < period; j++) s += values[i - j] * (period - j);
    out.push(s / div);
  }
  return out;
}
/** Simple trailing mean over n rows (nulls skipped). */
export function sma(values: (number | null)[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0, cnt = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v != null) { sum += v; cnt++; }
    if (i >= n) { const o = values[i - n]; if (o != null) { sum -= o; cnt--; } }
    out.push(i >= n - 1 && cnt > 0 ? sum / cnt : null);
  }
  return out;
}

export const lastIdx = (vs: (number | null)[]) => { for (let i = vs.length - 1; i >= 0; i--) if (vs[i] != null && Number.isFinite(vs[i]!)) return i; return -1; };

/** % change of the last value vs the value `days` rows earlier. */
export function changePct(vs: (number | null)[], days = 28): number | null {
  const i = lastIdx(vs);
  if (i < days) return null;
  const a = vs[i - days], b = vs[i];
  if (a == null || b == null || a === 0) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

/** Change in percentage points of the last value vs `days` rows earlier, as a headline change (shares and rates). */
export function changePtsH(vs: (number | null)[], days = 28): Headline['change'] {
  const i = lastIdx(vs);
  const a = i >= days ? vs[i - days] : null, b = vs[i];
  return a == null || b == null ? null : { pct: b - a, days, pts: true };
}

/** ≤n points from the last `window` rows, for index sparklines. */
export function spark(vs: (number | null)[], window = 365, n = 60): number[] {
  const xs = vs.slice(-window).filter((v): v is number => v != null && Number.isFinite(v));
  if (xs.length <= n) return xs;
  const out: number[] = [];
  const step = (xs.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(xs[Math.round(i * step)]);
  return out;
}

export const fmt = (v: number | null | undefined, f: ValueFormat) => (v == null ? '—' : formatValue(v, f));

/** "**3.9% above** 28 days earlier" — words for a change. */
export function changeWords(pct: number | null, days = 28): string {
  if (pct == null) return '';
  const a = Math.abs(pct);
  const d = a >= 100 ? num(a, 0) : num(a, 1);
  return `**${d}% ${pct >= 0 ? 'above' : 'below'}** ${days} days earlier`;
}

export function headline(label: string, value: string, date: string, sentence: string, change?: number | null, days = 28): Headline {
  return { label, value, date, sentence, change: change == null ? null : { pct: change, days } };
}

/** Index rows by date for joins. */
export function byDate<T extends { date: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.date, r]));
}
