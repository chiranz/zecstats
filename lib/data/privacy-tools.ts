import 'server-only';
import { api } from './core';

// Data for the privacy tools and the two distribution reports:
// /wall-of-shame, /privacy-suggestions, /amount-suggest, /shield-hops, /activity.
//
// Wall of Shame and Privacy tips have no JSON route on the live site: both lists are server-rendered into the page.
// scripts/extract-snapshot.mjs parses them into data/api/{wall-of-shame,privacy-suggestions}.json (snapshot mode).

/* ───────────── Wall of Shame ───────────── */

export type MatchKind = 'zec' | 'usd' | 'both';
export type Incident = {
  id: string;
  shieldTs: number; blockIn: number; usdIn: number; zecIn: number;
  deshTs: number; blockOut: number; usdOut: number; zecOut: number;
  gapSecs: number; match: MatchKind; diffPct: number; from: string; to: string;
};
type WallJson = {
  shield_time: number; shield_block: number; usd_in: number; zec_in: number;
  deshield_time: number; deshield_block: number; usd_out: number; zec_out: number;
  gap_secs: number; match: MatchKind; diff_pct: number; from_pool: string; to_pool: string;
};

export async function getWallOfShame(): Promise<Incident[]> {
  return (await api<WallJson[]>('wall-of-shame')).map((r) => ({
    id: `${r.shield_block}-${r.deshield_block}-${r.zec_in}`,
    shieldTs: r.shield_time, blockIn: r.shield_block, usdIn: r.usd_in, zecIn: r.zec_in,
    deshTs: r.deshield_time, blockOut: r.deshield_block, usdOut: r.usd_out, zecOut: r.zec_out,
    gapSecs: r.gap_secs, match: r.match, diffPct: r.diff_pct, from: r.from_pool, to: r.to_pool,
  }));
}

/* ───────────── Privacy tips (popular round amounts) ───────────── */

export type Direction = 'shield' | 'deshield';
export type PsColumn = { dir: Direction; buckets: { range: string; items: [amount: number, count: number][] }[]; recent: [date: string, amount: number, rounded: number | null][] };
export type PrivacySuggestions = { generated: string; shieldTx: number; deshieldTx: number; cols: PsColumn[] };

type PsJson = {
  generated: string; shield_tx: number; deshield_tx: number;
  columns: { direction: Direction; buckets: { range: string; amounts: { amount: number; count: number }[] }[]; recent: { date: string; amount: number; rounded: number | null }[] }[];
};

export async function getPrivacySuggestions(): Promise<PrivacySuggestions> {
  const j = await api<PsJson>('privacy-suggestions');
  return {
    generated: j.generated, shieldTx: j.shield_tx, deshieldTx: j.deshield_tx,
    cols: j.columns.map((c) => ({
      dir: c.direction,
      buckets: c.buckets.map((b) => ({ range: b.range, items: b.amounts.map((a) => [a.amount, a.count] as [number, number]) })),
      recent: c.recent.map((r) => [r.date, r.amount, r.rounded] as [string, number, number | null]),
    })),
  };
}

/* ───────────── /api/shielding-histogram (cumulative tx count per amount bucket) ───────────── */

type HistRow = { pool: 'sprout' | 'sapling' | 'orchard' | 'ironwood'; bucket: string; direction: Direction; cumulative_tx_count: number };
const HIST_BUCKETS = ['<0.01', '0.01-0.1', '0.1-0.5', '0.5-1', '1-2', '2-5', '5-10', '10-25', '25-50', '50-100', '100-500', '500-1K', '1K-10K', '10K+'] as const;
const parseEdge = (s: string) => (s.endsWith('K') ? parseFloat(s) * 1000 : parseFloat(s));
/** [lo, hi) in ZEC for a histogram bucket label. */
function bucketRange(b: string): [number, number] {
  if (b.startsWith('<')) return [0, parseEdge(b.slice(1))];
  if (b.endsWith('+')) return [parseEdge(b.slice(0, -1)), Infinity];
  const [lo, hi] = b.split('-');
  return [parseEdge(lo), parseEdge(hi)];
}
export type HistBucket = { bucket: string; lo: number; hi: number; shield: number; deshield: number };
export async function getShieldingHistogram(): Promise<HistBucket[]> {
  const rows = await api<HistRow[]>('shielding-histogram');
  return HIST_BUCKETS.map((b) => {
    const [lo, hi] = bucketRange(b);
    const sum = (d: Direction) => rows.filter((r) => r.bucket === b && r.direction === d).reduce((a, r) => a + r.cumulative_tx_count, 0);
    return { bucket: b, lo, hi, shield: sum('shield'), deshield: sum('deshield') };
  });
}

/* ───────────── /api/shield-hops ───────────── */

export type HopDay = {
  class: string; date: string; count: number; dwell_p50_secs: number;
  min_zat: number; max_zat: number; mean_zat: number; total_zat: number;
  p10_zat: number; p25_zat: number; p50_zat: number; p75_zat: number; p90_zat: number; p99_zat: number;
  removed_count: number; removed_share: number; removed_zat: number;
  top_value_count: number; top_value_share: number; top_value_zat: number;
};
export type ShieldHops = {
  class: 'all' | 'single' | 'sweep'; repeat: 'keep' | 'drop'; latest: string; source_latest: string; days: HopDay[];
  summary: Record<string, { days: number; hop_count: number; mean_zat: number; median_of_daily_medians_zat: number; total_zat: number }>;
};
export const getShieldHops = () => api<ShieldHops>('shield-hops');

/* ───────────── /api/activity + /api/largest-wallets ───────────── */

export type BucketKey = 'exchanges' | 'shielded_savings' | 'transient_transparent';
type Window = { count: number; value_zat: number };
export type Activity = {
  as_of: string;
  backfill: { activity_backfill_enabled: boolean; activity_backfill_height: number; activity_backfill_pct: number; chain_height: number; earliest_classified_date: string; latest_classified_date: string };
  buckets: Record<BucketKey, { last_30d: Window; last_7d: Window; prior_7d: Window; trend_pct_7d: number | null }>;
  daily_series: ({ date: string } & Record<`${BucketKey}_zat`, number>)[];
  direction: { deshield_zat_7d: number; deshield_zat_prior_7d: number; net_shield_zat_7d: number; net_shield_zat_prior_7d: number; shield_zat_7d: number; shield_zat_prior_7d: number };
  storage: { buckets: { cohort: string; total_zat: number; utxo_count: number }[]; date: string; long_term_zat: number };
  window: 'daily' | 'weekly' | 'monthly';
};
export const getActivity = () => api<Activity>('activity');

export type Wallet = { address: string; balance_zat: number; category: string | null; confidence: string | null; label: string | null; script_type: string; source: string | null; utxo_count: number };
export type LargestWallets = { current_transparent_zat: number; top20_pct_of_transparent_supply: number; top20_zat: number; updated_at: string; wallets: Wallet[] };
export const getLargestWallets = () => api<LargestWallets>('largest-wallets');
