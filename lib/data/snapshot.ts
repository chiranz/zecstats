import 'server-only';
import { cache } from 'react';
import { api, manifest } from './core';
import { zat } from '../format';

// Typed accessors for the endpoints used across many pages. Page-specific endpoints get their own module.

export type Live = { price_age_secs: number; price_stale: boolean; zec_btc: number; zec_btc_change_24h_pct: number; zec_btc_change_30d_pct: number; zec_usd: number; zec_usd_change_24h_pct: number };
export type LatestBlock = { activation_time: number; aggregator_lag_blocks: number; end_ironwood_zat: number; end_orchard_zat: number; end_supply_zat: number; height: number; indexing_rate_per_min: number; ironwood_usd_per_day: number; node_estimated_height: number; orchard_at_activation: number; time: number; zec_usd: number };

export type DailyStat = {
  date: string; avg_difficulty: number; block_count: number; coinbase_zat: number;
  end_ironwood_zat: number; end_lockbox_zat: number; end_orchard_zat: number; end_sapling_zat: number; end_sprout_zat: number; end_supply_zat: number; end_transparent_zat: number;
  ironwood_inflow_shielded_zat: number; ironwood_inflow_zat: number; ironwood_outflow_zat: number;
  joinsplit_count: number; orchard_actions: number; orchard_actions_shielded: number; orchard_inflow_zat: number; orchard_outflow_zat: number;
  sapling_inflow_zat: number; sapling_outflow_zat: number; sapling_outputs: number; sapling_spends: number;
  shielded_tx_count: number; sprout_inflow_zat: number; sprout_outflow_zat: number; total_block_bytes: number; total_shielded_actions: number;
  transparent_inputs: number; transparent_outputs: number; transparent_volume_zat: number; tx_count: number;
  tx_deshielding: number; tx_fully_shielded: number; tx_mixed: number; tx_shielding: number; tx_transparent_only: number;
};
export type DailyPrice = { date: string; zec_usd: number; btc_usd: number };

export const getLive = () => api<Live>('live');
export const getLatestBlock = () => api<LatestBlock>('latest-block');
export const getDailyStats = () => api<DailyStat[]>('daily-stats');
export const getDailyPrices = () => api<DailyPrice[]>('daily-prices');

/** Last complete UTC day (the final row is "today, so far"). */
export const getCompleteDailyStats = async () => (await getDailyStats()).slice(0, -1);

export const POOLS = ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'] as const;
export type Pool = (typeof POOLS)[number];
export const POOL_LABEL: Record<Pool | 'lockbox', string> = { transparent: 'Transparent', sprout: 'Sprout', sapling: 'Sapling', orchard: 'Orchard', ironwood: 'Ironwood', lockbox: 'Lockbox' };
export const POOL_COLOR: Record<Pool | 'lockbox', string> = { transparent: 'var(--p-transparent)', sprout: 'var(--p-sprout)', sapling: 'var(--p-sapling)', orchard: 'var(--p-orchard)', ironwood: 'var(--p-ironwood)', lockbox: 'var(--p-lockbox)' };

export type PoolSnapshot = { date: string; supply: number; lockbox: number; shielded: number; shieldedPct: number } & Record<Pool, number>;

export function poolsFromRow(r: DailyStat): PoolSnapshot {
  const p = { transparent: zat(r.end_transparent_zat), sprout: zat(r.end_sprout_zat), sapling: zat(r.end_sapling_zat), orchard: zat(r.end_orchard_zat), ironwood: zat(r.end_ironwood_zat) };
  const supply = zat(r.end_supply_zat);
  const shielded = p.sprout + p.sapling + p.orchard + p.ironwood;
  return { date: r.date, supply, lockbox: zat(r.end_lockbox_zat), shielded, shieldedPct: (shielded / supply) * 100, ...p };
}

/** Pool balances at the end of the last complete day: the row the charts and "data through" use, so every page shows one balance. */
export const getPools = async () => poolsFromRow((await getCompleteDailyStats()).at(-1)!);

/** Pool snapshot N days before the last complete day. */
export const getPoolsDaysAgo = async (days: number) => { const s = await getCompleteDailyStats(); return poolsFromRow(s[Math.max(0, s.length - 1 - days)]); };

export type Freshness = { height: number; dataThrough: string; capturedAt: string; synced: boolean };
export const getFreshness = cache(async (): Promise<Freshness> => {
  const [lb, complete, m] = await Promise.all([getLatestBlock(), getCompleteDailyStats(), manifest()]);
  return { height: lb.height, dataThrough: complete.at(-1)!.date, capturedAt: m.capturedAt, synced: lb.node_estimated_height - lb.height <= 2 };
});

/** Simple trailing average over the last n complete days. */
export function trailingAvg(rows: DailyStat[], n: number, f: (r: DailyStat) => number): number {
  const xs = rows.slice(-n);
  return xs.reduce((a, r) => a + f(r), 0) / xs.length;
}
