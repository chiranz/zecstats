import 'server-only';
import { cache } from 'react';
import { api } from './core';
import { getDailyStats, getLatestBlock, getLive, poolsFromRow } from './snapshot';
import { zat } from '../format';

// Ironwood migration tracker (Orchard → Ironwood turnstile). Every figure is derived from the snapshot.

export const IRONWOOD_ACTIVATION_HEIGHT = 3_428_143; // fixed fact: NU activation block, 28 Jul 2026 14:07 UTC

type IronwoodDaily = { days: { complete: boolean; date: string; orchard_zat: number; total_zat: number }[]; scanned_height: number; scanned_time: number; tip_time: number };
type IronwoodSources = { orchard_base_zat: number; orchard_migration_pct: number; scanned_height: number; sources: { orchard: number; sapling: number; transparent: number }; total_zat: number };
type IronwoodTxSizes = { count: number; max_zat: number; median_zat: number; min_zat: number; p10_zat: number; p25_zat: number; p75_zat: number; p90_zat: number; p99_zat: number; points: { cum: number; zat: number }[]; total_zat: number };

const getIronwoodDaily = () => api<IronwoodDaily>('ironwood-daily');
export const getIronwoodSources = () => api<IronwoodSources>('ironwood-sources');
const getIronwoodTxSizes = () => api<IronwoodTxSizes>('ironwood-tx-sizes');

export type DailyCrossing = { date: string; complete: boolean; orchard: number; other: number; cumPct: number };

export const getIronwood = cache(async () => {
  const [lb, live, src, daily, sizes, stats] = await Promise.all([getLatestBlock(), getLive(), getIronwoodSources(), getIronwoodDaily(), getIronwoodTxSizes(), getDailyStats()]);
  const price = live.zec_usd;
  const base = zat(src.orchard_base_zat);
  const fromOrchard = zat(src.sources.orchard);
  const fromSapling = zat(src.sources.sapling);
  const fromTransparent = zat(src.sources.transparent);
  const fromAll = zat(src.total_zat);
  const pct = src.orchard_migration_pct;
  // Balances: the latest daily-stats row (tracks the chain tip) so the KPIs and the pool table agree to the coin.
  const tip = poolsFromRow(stats.at(-1)!);
  const orchardNow = tip.orchard;
  const ironwoodNow = tip.ironwood;
  const supply = tip.supply;
  const liveSecs = lb.time - lb.activation_time;
  const blocksSince = lb.height - IRONWOOD_ACTIVATION_HEIGHT;

  let cum = 0;
  const days: DailyCrossing[] = daily.days.map((d) => {
    const orchard = zat(d.orchard_zat);
    const total = zat(d.total_zat);
    cum += orchard;
    return { date: d.date, complete: d.complete, orchard, other: Math.max(0, total - orchard), cumPct: (cum / base) * 100 };
  });
  const completeDays = days.filter((d) => d.complete);
  const busiest = days.reduce((a, d) => (d.orchard > a.orchard ? d : a), days[0]);
  const avgPerDay = completeDays.reduce((a, d) => a + d.orchard, 0) / completeDays.length;

  // Pool table: chain tip (latest daily-stats row tracks the tip).
  const pools = poolsFromRow(stats.at(-1)!);

  return {
    price,
    height: lb.height,
    activationTime: lb.activation_time,
    liveDays: Math.floor(liveSecs / 86400),
    liveHours: Math.floor((liveSecs % 86400) / 3600),
    blocksSince,
    pct,
    base,
    fromOrchard,
    fromSapling,
    fromTransparent,
    fromAll,
    orchardNow,
    gapOrchard: base - fromOrchard - orchardNow, // left Orchard without entering Ironwood
    ironwoodNow,
    leftIronwood: fromAll - ironwoodNow,
    usdPerDay: lb.ironwood_usd_per_day,
    supply,
    verified: supply - orchardNow,
    verifiedPct: ((supply - orchardNow) / supply) * 100,
    days,
    busiest,
    avgPerDay,
    sizes: {
      count: sizes.count,
      min: zat(sizes.min_zat),
      median: zat(sizes.median_zat),
      p25: zat(sizes.p25_zat),
      p90: zat(sizes.p90_zat),
      p99: zat(sizes.p99_zat),
      max: zat(sizes.max_zat),
      total: zat(sizes.total_zat),
      mean: zat(sizes.total_zat) / sizes.count,
      points: sizes.points.map((p) => ({ zec: zat(p.zat), cum: p.cum })),
    },
    pools,
  };
});
