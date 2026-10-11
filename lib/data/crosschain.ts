import 'server-only';
import { cache } from 'react';
import { api } from './core';

// /swaps, /btc-migration, /wallet-apps, /exchange-support — ZEC across chains and venues.

// ─── NEAR Intents swap network (PageRank over swap volume) ─────────────────────
export type NearNode = { id: string; rank: number; pagerank: number; weight: number; total_usd: number; in_usd: number; out_usd: number; net_usd: number; market_cap: number | null; mcap_share: number | null; swaps: number };
export type NearNetwork = {
  from: string; to: string; days_covered: number; node_count: number; priced_mcap: number;
  nodes: NearNode[]; edges: { from: string; to: string; usd: number }[];
  zec: { rank: number; of: number; pagerank: number; weight: number; market_cap: number };
  sync: { total_rows: number; total_pairs: number; total_volume_usd: number; synced_days: number; target_days: number };
};
export const getNearNetwork = () => api<NearNetwork>('near-network');

export type NearSwapRow = { date: string; from_chain: string; to_chain: string; from_asset: string; to_asset: string; volume_usd: number; swap_count: number };

/** Daily ZEC flow on NEAR Intents, derived exactly as the live "near-flow" chart does: inbound = anything swapped to the
 *  ZEC chain, outbound = anything swapped from it, each split into BTC / ETH / other by the counter-asset. */
export const getZecFlows = cache(async () => {
  const rows = await api<NearSwapRow[]>('near-swaps');
  const side = (asset: string, chain: string) => { const a = asset || chain; return a === 'btc' || a === 'eth' ? a : 'other'; };
  const by = new Map<string, { date: string; btc_in: number; eth_in: number; other_in: number; btc_out: number; eth_out: number; other_out: number; swaps: number }>();
  for (const r of rows) {
    let d = by.get(r.date);
    if (!d) by.set(r.date, (d = { date: r.date, btc_in: 0, eth_in: 0, other_in: 0, btc_out: 0, eth_out: 0, other_out: 0, swaps: 0 }));
    d.swaps += r.swap_count;
    if (r.to_chain === 'zec') d[`${side(r.from_asset, r.from_chain)}_in` as 'btc_in'] += r.volume_usd;
    if (r.from_chain === 'zec') d[`${side(r.to_asset, r.to_chain)}_out` as 'btc_out'] += r.volume_usd;
  }
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date));
});

export type NearStat = { date: string; wrapped_supply: number; daily_mint: number; daily_burn: number; tx_count: number };
export const getNearStats = () => api<NearStat[]>('near-stats');

// ─── Bitcoin → Zcash ───────────────────────────────────────────────────────────
export type BtcSwap = {
  date: string; ts: number; btc: number; usd: number; zec: number; zec_price_paid: number; value_now: number; gain_usd: number; return_pct: number;
  vs_btc_pct: number; cagr_pct: number | null; age_days: number; held_years: number; trace_status: string; consolidation_inputs: number; hops: number;
  btc_txid: string; sender_btc: string; deposit_address: string; btc_value_now: number;
};
export type BtcMigration = {
  days: number; min_btc: number;
  prices: { btc_usd: number; zec_usd: number; close_date: string; live: boolean };
  network_share: { all_time_pct: number; all_time_zec: number; since: string; supply_zec: number; window_pct: number };
  summary: { btc: number; btc_traced: number; btc_over_1y: number; btc_over_5y: number; btc_consolidated: number; btc_weighted_age_days: number; held_years: number; cagr_pct: number; return_pct: number; vs_btc_pct: number; swaps: number; traced: number; pending: number; usd: number; value_now: number; btc_value_now: number; btc_value_then: number; zec: number };
  series: { date: string; invested_usd: number; value_usd: number; zec: number; zec_price: number }[];
  swaps: BtcSwap[];
  backfill: { swaps_first: string; swaps_last: string; swaps_stored: number; traceable: number; pages_done: number; pages_total: number; traces: { ok: number; unresolved: number; no_txid: number } };
};
export const getBtcMigration = () => api<BtcMigration>('btc-migration');

// ─── Exchanges by country ──────────────────────────────────────────────────────
export type ExchangeCountry = { name: string; geo: string; status: 'open' | 'partial' | 'banned' | 'unknown'; count: number; exchanges: string[]; pop_m: number; note: string };
export type ExchangeCoverage = { access_pop_pct: number; countries: ExchangeCountry[]; exchange_count: number; listing_zec: number; pct_listing_zec: number; global_zec: string[]; last_updated: string; days_since_update: number; stale: boolean; world_pop_m: number };
export const getExchangeCoverage = () => api<ExchangeCoverage>('exchange-coverage');

// ─── Wallet apps on NEAR Intents ───────────────────────────────────────────────
// No /api route on the live site: scripts/extract-snapshot.mjs parses the server-rendered leaderboard and the page's
// inlined per-app daily volume into data/api/wallet-apps.json.
export type WalletApp = { rank: number; app: string; usd: number; share_pct: number; swaps: number; into_usd: number; out_usd: number; code: string };
export type WalletApps = { window_days: number; summary: { usd: number; swaps: number }; history: { swaps: number; since: string }; leaderboard: WalletApp[]; apps: string[]; dates: string[]; usd: number[][] };
export const getWalletApps = () => api<WalletApps>('wallet-apps');
