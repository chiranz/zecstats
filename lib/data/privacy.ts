import 'server-only';
import { shieldingWindows } from './flows';
import { cache } from 'react';
import { api } from './core';
import { getCompleteDailyStats, getDailyStats, getLive, poolsFromRow, type DailyStat } from './snapshot';
import { zat } from '../format';
import { isiBand } from './turnstile';
import { getPrivacySuggestions, getWallOfShame } from './privacy-tools';

// Privacy hub: shielded supply, pools, flows, integrity and hygiene. Every figure comes from the snapshot.

type BucketKey = 'exchanges' | 'shielded_savings' | 'transient_transparent';
type Activity = {
  as_of: string;
  buckets: Record<BucketKey, { last_7d: { count: number; value_zat: number }; prior_7d: { count: number; value_zat: number }; trend_pct_7d: number }>;
  direction: { deshield_zat_7d: number; deshield_zat_prior_7d: number; net_shield_zat_7d: number; net_shield_zat_prior_7d: number; shield_zat_7d: number; shield_zat_prior_7d: number };
  /** One row per week (Monday start); the last row is the week in progress. */
  daily_series: ({ date: string } & Record<`${BucketKey}_zat`, number>)[];
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

/** Turnstile watch composite index (0–100), banded by ISI_BANDS (lib/data/turnstile.ts). */
export const getTurnstileIndex = cache(async () => {
  const inf = await getInflationWatch();
  const isi = inf.index.isi;
  const band = isiBand(isi);
  return { isi, band, verdict: band.verdict, components: inf.index.components, turnstile: inf.turnstile, disclosure: inf.disclosure };
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

/** Net shielding over the last 7 complete days and the 7 before (same rule as /chart/flow-compare). */
export const getNet7 = cache(async () => {
  const { now, prior } = await shieldingWindows(7);
  return { in: now.shield, out: now.deshield, net: now.net, prior: prior.net };
});

const everyNth = <T,>(xs: T[], n: number) => xs.filter((_, i) => i % n === (xs.length - 1) % n);

export const getPrivacy = cache(async () => {
  const [all, complete, live, act, net7] = await Promise.all([getDailyStats(), getCompleteDailyStats(), getLive(), getActivity(), getNet7()]);
  const price = live.zec_usd;
  const now = poolsFromRow(complete.at(-1)!);
  const at = (daysAgo: number) => poolsFromRow(complete[Math.max(0, complete.length - 1 - daysAgo)]);
  const yearAgo = at(365);
  const fiveAgo = at(365 * 5 + 1);
  const last = complete.at(-1)!;
  // share of user transactions (coinbase excluded, as tx/day and the tx-types chart count them)
  const txShare = (r: DailyStat) => (r.tx_count > r.block_count ? (r.shielded_tx_count / (r.tx_count - r.block_count)) * 100 : null);
  const fourWeeks = complete[complete.length - 1 - 28];
  // 7-day average of the daily share ending on row i: the figure /chart/tx-types and /metrics headline
  const share7 = (i: number) => { const xs = complete.slice(i - 6, i + 1).map(txShare).filter((v): v is number => v != null); return xs.reduce((a, v) => a + v, 0) / xs.length; };

  // 5-year shielded share (daily) for the hero chart.
  const five = complete.slice(-(365 * 5 + 1));
  const shareSeries = { dates: five.map((r) => r.date), values: five.map((r) => poolsFromRow(r).shieldedPct) };

  // Pool generations, last 5 years, weekly.
  const weekly = everyNth(five, 7).map(poolsFromRow);
  // Per-pool 1-year sparklines (weekly).
  const year = everyNth(complete.slice(-366), 7).map(poolsFromRow);

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

  // transparent-activity buckets: the last complete week against the one before (the newest row is the week so far)
  const wk = act.daily_series.slice(-3, -1);
  return {
    price,
    now,
    yearAgo,
    fiveAgo,
    shieldedUsd: now.shielded * price,
    marketCap: now.supply * price,
    last,
    txShareLast: share7(complete.length - 1),
    txShareFourWeeks: share7(complete.length - 1 - 28),
    fourWeeksDate: fourWeeks.date,
    shareSeries,
    weekly,
    year,
    flows,
    usage,
    orchardZzPct: (lastOrchardDay.orchard_actions_shielded / lastOrchardDay.orchard_actions) * 100,
    orchardZzDate: lastOrchardDay.date,
    orchardZzPerDay: lastOrchardDay.orchard_actions_shielded,
    net7,
    bucketWeek: wk[1].date,
    buckets: (['exchanges', 'shielded_savings', 'transient_transparent'] as const).map((k) => {
      const now = zat(wk[1][`${k}_zat`]), prev = zat(wk[0][`${k}_zat`]);
      return { key: k, now, prev, trend: prev ? (now / prev - 1) * 100 : null };
    }),
    dataThrough: last.date,
  };
});

/** Most-used shielding amount per size band, its runner-up and the most-used deshield amount (Privacy tips data). */
export const getRoundAmounts = cache(async () => {
  const ps = await getPrivacySuggestions();
  const [sh, de] = (['shield', 'deshield'] as const).map((d) => ps.cols.find((c) => c.dir === d)!);
  return {
    generated: ps.generated,
    shieldTx: ps.shieldTx,
    deshieldTx: ps.deshieldTx,
    bands: sh.buckets.map((b, i) => ({ band: b.range.replace(/ ZEC$/, ''), shield: b.items[0], runner: b.items[1], deshield: de.buckets[i]?.items[0] })),
  };
});

/** Matched round trips on the Wall of Shame, by match type. */
export const getRoundTrips = cache(async () => {
  const rows = await getWallOfShame();
  const n = (m: string) => rows.filter((r) => r.match === m).length;
  return { total: rows.length, zec: n('zec'), usd: n('usd'), both: n('both') };
});

