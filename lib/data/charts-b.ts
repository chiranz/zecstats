import 'server-only';
import { api } from './core';

// Typed accessors for the endpoints behind the usage, holders, supply and markets charts (registry-b).
// Shapes mirror the live site's /api/<name> JSON exactly; units are noted where they are not obvious.

export type FeeDay = {
  date: string; complete: boolean; tx_count: number; zec_usd: number;
  min_fee_zat: number; p10_fee_zat: number; p25_fee_zat: number; median_fee_zat: number; mean_fee_zat: number;
  p75_fee_zat: number; p90_fee_zat: number; p99_fee_zat: number; max_fee_zat: number;
};
export type NewAddressDay = { date: string; complete: boolean; new_coinbase: number; new_non_coinbase: number; new_p2pkh: number; new_p2sh: number; new_total: number };
export type UtxoCohortRow = { date: string; cohort: '<30d' | '30-180d' | '180d-1y' | '1-3y' | '3y+'; total_zat: number; utxo_count: number };
export type UtxoDepthRow = { date: string; depth_bucket: 'coinbase' | '1 hop' | '2-3 hops' | '4+ hops'; total_zat: number; utxo_count: number };
export type UtxoSurvivalRow = { snapshot_week: string; creation_week: string; original_zat: number; surviving_zat: number };
export type DevFund = { dates: string[]; balance: number[]; cumulative_in: number[]; cumulative_out: number[]; pct_paid: number[]; pct_paid_now: number; total_in: number; total_out: number };
export type NearStat = { date: string; wrapped_supply: number; daily_mint: number; daily_burn: number; tx_count: number };
export type NearSwap = { date: string; from_chain: string; to_chain: string; from_asset: string; to_asset: string; from_raw: string; to_raw: string; volume_usd: number; swap_count: number };
export type NearVolMcap = { dates: string[]; gran: string; series: { asset: string; mcap: number; ratios: (number | null)[] }[]; zec_mcap: number };
export type ExchangeVolume = { complete_from: string; complete_to: string; exchanges: string[]; rows: { date: string; all: number; pct: number; zec: number; vals: Record<string, number> }[]; set: string; window: string };
export type HlDay = { date: string; zec_funding_apr: number | null; btc_funding_apr: number | null; zec_volume_usd: number | null; btc_volume_usd: number | null; zec_oi_usd: number | null; btc_oi_usd: number | null };
export type IssuancePoint = { date: string; supply: number; mcap: number; tx: number; vol: number; vol30: number; gw: number };
export type MktcapIssuance = { zec: IssuancePoint[]; btc: IssuancePoint[] };

export const getFeeStats = async () => (await api<{ days: FeeDay[] }>('fee-stats')).days;
export const getNewAddresses = async () => (await api<{ days: NewAddressDay[] }>('new-addresses')).days;
export const getUtxoCohorts = () => api<UtxoCohortRow[]>('utxo-cohorts');
export const getUtxoDepth = () => api<UtxoDepthRow[]>('utxo-depth');
export const getUtxoSurvival = () => api<UtxoSurvivalRow[]>('utxo-survival');
export const getDevFund = () => api<DevFund>('dev-fund');
export const getNearStats = () => api<NearStat[]>('near-stats');
export const getNearSwaps = () => api<NearSwap[]>('near-swaps');
export const getNearVolMcap = () => api<NearVolMcap>('near-vol-mcap');
export const getExchangeVolume = () => api<ExchangeVolume>('exchange-volume');
export const getHyperliquid = () => api<HlDay[]>('hyperliquid');
export const getMktcapIssuance = () => api<MktcapIssuance>('mktcap-issuance');
