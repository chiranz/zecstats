import 'server-only';
import { cache } from 'react';
import { api } from './core';
import { getLatestBlock } from './snapshot';

// /tx-sizes, /world-usage, /founders-reward, /halving

// ─── Transaction sizes ─────────────────────────────────────────────────────────
export type TxDay = {
  date: string; count: number; price: number; total_zat: number; mean_zat: number; min_zat: number; max_zat: number;
  p10_zat: number; p25_zat: number; p50_zat: number; p75_zat: number; p90_zat: number; p95_zat: number; p99_zat: number; p999_zat: number;
  top_value_zat: number; top_value_count: number;
};
export type TxValues = {
  class: string; built_through: string; first_day: string;
  range: { from: string; to_exclusive: string; transactions: number; usd: number };
  pooled: { p10: number; p25: number; p50: number; p75: number; p90: number; p95: number; p99: number; p999: number };
  cdf: { usd: number; tx: number; value: number }[];
  hist: { lo_usd: number; hi_usd: number; count: number; usd: number }[];
  days: TxDay[];
};
/** The snapshot holds one capture: class=transparent (transparent → transparent), the trailing year. */
export const getTxValues = () => api<TxValues>('tx-values');

// ─── World usage ───────────────────────────────────────────────────────────────
export type UsageClock = { blocks: number; txs: number; from: number; to: number; days: number; by_hour: { hour: number; blocks: number; txs: number }[]; by_dow_hour: { dow: number; hour: number; blocks: number; txs: number }[] };
export type UsageWeek = { date: string; peak_hour: number; peak_txs: number; mean_hour: number; total_txs: number };
export const getUsageClock = () => api<UsageClock>('usage-clock');
export const getUsageWeekly = async () => (await api<{ weeks: UsageWeek[] }>('usage-weekly')).weeks;
/** Full Monday–Sunday weeks only: drops the stub before the first Monday, the pieces a year boundary cuts a week into,
 *  and the week still in progress (today, from the latest block, is not over). */
export const getCompleteUsageWeeks = cache(async () => {
  const [weeks, lb] = await Promise.all([getUsageWeekly(), getLatestBlock()]);
  const today = new Date(lb.time * 1000).toISOString().slice(0, 10);
  const plus7 = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  return weeks.filter((w, i) => new Date(`${w.date}T00:00:00Z`).getUTCDay() === 1 && (i + 1 < weeks.length ? weeks[i + 1].date === plus7(w.date) : plus7(w.date) <= today));
});

// ─── Founders' Reward ──────────────────────────────────────────────────────────
export type FoundersReward = {
  avg_price_usd: number; total_usd: number; value_today_usd: number; spot_usd: number; schedule_zec: number; covered_zec: number; pct_of_supply: number; supply_zec: number; unpriced_zec: number;
  by_year: { year: string; zec: number; usd: number; avg_price_usd: number }[];
  era: { first_date: string; last_date: string; first_height: number; last_height: number; blossom_height: number; halving_height: number; slow_start_interval: number; days: number };
  min_held: { date: string; date_label: string; price_usd: number; usd: number; since: string };
  points: { date: string; zec: number; usd: number; cum_zec: number; cum_usd: number; zec_usd: number }[];
  stages: { pre_blossom_subsidy_zec: number; pre_blossom_fr_zec: number; post_blossom_subsidy_zec: number; post_blossom_fr_zec: number; pre_blossom_per_day_zec: number; post_blossom_per_day_zec: number };
  unmoved: { addresses_total: number; addresses_covered: number; balance_zec: number; balance_usd: number; received_zec: number; still_holding: { address: string; balance_zec: number; received_zec: number }[]; updated_at: string };
};
export const getFoundersReward = () => api<FoundersReward>('founders-reward');

// ─── Halving (consensus constants; countdown from the snapshot's block height and time) ───
export const HALVING = {
  blossomHeight: 653_600,
  firstHalving: 1_046_400,
  interval: 1_680_000, // post-Blossom
  spacing: 75, // seconds, post-Blossom target
  initialReward: 12.5,
};

export type HalvingRow = { n: number; height: number; rewardAfter: number; done: boolean; date: string | null };

export const getHalving = cache(async () => {
  const lb = await getLatestBlock();
  const rows: HalvingRow[] = [];
  for (let n = 1; n <= 6; n++) {
    const height = HALVING.firstHalving + (n - 1) * HALVING.interval;
    const rewardAfter = HALVING.initialReward / 2 / 2 ** n; // post-Blossom base 6.25 halves each time
    const done = height <= lb.height;
    const date = done ? null : new Date((lb.time + (height - lb.height) * HALVING.spacing) * 1000).toISOString().slice(0, 10);
    rows.push({ n, height, rewardAfter, done, date });
  }
  const next = rows.find((r) => !r.done)!;
  const prev = [...rows].reverse().find((r) => r.done)!;
  const blocksLeft = next.height - lb.height;
  const secondsLeft = blocksLeft * HALVING.spacing;
  return {
    height: lb.height, time: lb.time, rows, next, prev,
    blocksLeft, daysLeft: secondsLeft / 86400,
    reward: prev.rewardAfter,
    eraProgress: (lb.height - prev.height) / HALVING.interval,
    halvingsDone: rows.filter((r) => r.done).length,
  };
});
