import 'server-only';
import { cache } from 'react';
import { api } from './core';
import { getCompleteDailyStats, getDailyStats, getLive, poolsFromRow, type DailyStat } from './snapshot';
import { zat } from '../format';

// Privacy hub: shielded supply, pools, flows, integrity and hygiene. Every figure comes from the snapshot, except the two
// tables marked SERVER-RENDERED below, which the live site only prints into its HTML (data/raw/pages/*.html).

type Activity = {
  as_of: string;
  buckets: Record<'exchanges' | 'shielded_savings' | 'transient_transparent', { last_7d: { count: number; value_zat: number }; prior_7d: { count: number; value_zat: number }; trend_pct_7d: number }>;
  direction: { deshield_zat_7d: number; deshield_zat_prior_7d: number; net_shield_zat_7d: number; net_shield_zat_prior_7d: number; shield_zat_7d: number; shield_zat_prior_7d: number };
};
type Inflation = {
  index: { isi: number; components: { key: string; label: string; score: number; weight: number | string }[] };
  turnstile: { ever_negative: boolean; min_balance_zec: number; reconcile_gap_zec: number; total_shield_zec: number; total_deshield_zec: number };
  disclosure: { date: string; pre_deshield_rate_zec_day: number; post_deshield_rate_zec_day: number; deshield_acceleration: number };
};
type ShieldHops = { summary: { single: { days: number; hop_count: number; median_of_daily_medians_zat: number } }; latest: string };

export const getActivity = () => api<Activity>('activity');
const getInflationWatch = () => api<Inflation>('inflation');
const getShieldHops = () => api<ShieldHops>('shield-hops');

/** Turnstile watch composite index (0–100). */
export const getTurnstileIndex = cache(async () => {
  const inf = await getInflationWatch();
  const isi = inf.index.isi;
  const band = Math.min(3, Math.floor(isi / 25)); // four equal bands on the gauge
  const verdict = ['Clean', 'Inconclusive', 'Elevated', 'Suspicious'][band];
  return { isi, band, verdict, components: inf.index.components, turnstile: inf.turnstile, disclosure: inf.disclosure };
});

/** Shield-bound hop: median of daily medians, last N days. */
export const getHopMedian = cache(async () => {
  const h = await getShieldHops();
  return { median: zat(h.summary.single.median_of_daily_medians_zat), days: h.summary.single.days, latest: h.latest };
});

/** Transparent → shielded (in) and shielded → transparent (out) per day; pool-to-pool migration excluded (live chart code). */
function shieldFlows(d: DailyStat) {
  const mig = d.ironwood_inflow_shielded_zat || 0;
  const inflow = d.sprout_inflow_zat + d.sapling_inflow_zat + d.orchard_inflow_zat + (d.ironwood_inflow_zat || 0) - mig;
  const outflow = d.sprout_outflow_zat + d.sapling_outflow_zat + d.orchard_outflow_zat + (d.ironwood_outflow_zat || 0) - mig;
  return { in: zat(inflow), out: zat(outflow) };
}

const everyNth = <T,>(xs: T[], n: number) => xs.filter((_, i) => i % n === (xs.length - 1) % n);

export const getPrivacy = cache(async () => {
  const [all, complete, live, act] = await Promise.all([getDailyStats(), getCompleteDailyStats(), getLive(), getActivity()]);
  const price = live.zec_usd;
  const now = poolsFromRow(all.at(-1)!);
  const at = (daysAgo: number) => poolsFromRow(all[Math.max(0, all.length - 1 - daysAgo)]);
  const yearAgo = at(365);
  const fiveAgo = at(365 * 5 + 1);
  const last = complete.at(-1)!;
  const txShare = (r: DailyStat) => (r.tx_count ? (r.shielded_tx_count / r.tx_count) * 100 : null);
  const fourWeeks = complete[complete.length - 1 - 28];

  // 5-year shielded share (daily) for the hero chart.
  const five = all.slice(-(365 * 5 + 1));
  const shareSeries = { dates: five.map((r) => r.date), values: five.map((r) => poolsFromRow(r).shieldedPct) };

  // Pool generations, last 5 years, weekly.
  const weekly = everyNth(five, 7).map(poolsFromRow);
  // Per-pool 1-year sparklines (weekly).
  const year = everyNth(all.slice(-366), 7).map(poolsFromRow);

  // 90 days of shield/deshield flows (complete days).
  const d90 = complete.slice(-97);
  const flowRows = d90.map((r) => ({ date: r.date, ...shieldFlows(r) }));
  const avg7 = flowRows.map((_, i) => {
    if (i < 6) return null;
    const w = flowRows.slice(i - 6, i + 1);
    return w.reduce((a, x) => a + x.in - x.out, 0) / 7;
  });
  const flows = { dates: flowRows.slice(7).map((r) => r.date), in: flowRows.slice(7).map((r) => r.in), out: flowRows.slice(7).map((r) => -r.out), net7: avg7.slice(7) };

  // Usage, last ~3 months.
  const d92 = complete.slice(-92);
  const usage = {
    dates: d92.map((r) => r.date),
    txShare: d92.map(txShare),
    orchardZz: d92.map((r) => r.orchard_actions_shielded),
    orchardCross: d92.map((r) => Math.max(0, r.orchard_actions - r.orchard_actions_shielded)),
  };
  const lastOrchardDay = [...d92].reverse().find((r) => r.orchard_actions > 0)!;

  const dir = act.direction;
  const b = act.buckets;
  return {
    price,
    now,
    yearAgo,
    fiveAgo,
    shieldedUsd: now.shielded * price,
    marketCap: now.supply * price,
    last,
    txShareLast: txShare(last)!,
    txShareFourWeeks: txShare(fourWeeks)!,
    fourWeeksDate: fourWeeks.date,
    shareSeries,
    weekly,
    year,
    flows,
    usage,
    orchardZzPct: (lastOrchardDay.orchard_actions_shielded / lastOrchardDay.orchard_actions) * 100,
    orchardZzDate: lastOrchardDay.date,
    orchardZzPerDay: lastOrchardDay.orchard_actions_shielded,
    net7: { in: zat(dir.shield_zat_7d), out: zat(dir.deshield_zat_7d), net: zat(dir.net_shield_zat_7d), prior: zat(dir.net_shield_zat_prior_7d) },
    buckets: (['exchanges', 'shielded_savings', 'transient_transparent'] as const).map((k) => ({
      key: k,
      now: zat(b[k].last_7d.value_zat),
      prev: zat(b[k].prior_7d.value_zat),
      count: b[k].last_7d.count,
      trend: b[k].trend_pct_7d,
    })),
    dataThrough: last.date,
  };
});

/* ---------- SERVER-RENDERED on the live site (data/raw/pages/privacy-suggestions.html, generated 10 Oct 2026 12:35 UTC) ---------- */
export const ROUND_AMOUNTS = {
  generated: '2026-10-10',
  shieldTx: 843_651,
  deshieldTx: 760_646,
  bands: [
    { band: '0–1', shield: [0.1, 51_993], runner: [0.5, 32_393], deshield: 0.1 },
    { band: '1–10', shield: [2.5, 132_414], runner: [5, 108_551], deshield: 5 },
    { band: '10–100', shield: [10, 114_501], runner: [50, 69_913], deshield: 10 },
    { band: '100–1k', shield: [100, 52_800], runner: [200, 18_782], deshield: 100 },
    { band: '1k–10k', shield: [1000, 5_472], runner: [2000, 1_890], deshield: 1000 },
  ] as { band: string; shield: [number, number]; runner: [number, number]; deshield: number }[],
};

/* ---------- SERVER-RENDERED (data/raw/pages/wall-of-shame.html): 500 matched round trips, by match type ---------- */
export const ROUND_TRIPS = { total: 500, zec: 123, usd: 197, both: 180 };
