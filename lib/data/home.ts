import 'server-only';
import { cache } from 'react';
import { api } from './core';
import { getCompleteDailyStats, getDailyPrices, getDailyStats, getLatestBlock, getLive, poolsFromRow } from './snapshot';
import { getActivity, getTurnstileIndex } from './privacy';
import { getIronwoodSources } from './ironwood';
import { zat } from '../format';
import { CHARTS } from '../charts';
import { CHART_GROUPS, GROUP_SLUGS, type ChartGroupId } from '../charts/types';

// Dashboard figures. Each one is derived from the snapshot the same way the live site's chart code derives it.

const MAX_SUPPLY = 21_000_000;
const NEXT_HALVING_HEIGHT = 4_406_400;
const HALVING_INTERVAL = 1_680_000; // post-Blossom blocks per era
const BLOCK_SECS = 75;
export const ZEBRA_VERSION = 'v6.3.0'; // server-rendered on the live /node page (data/raw/pages/node.html)

type Realized = { date: string; realized_price: number; mvrv: number };
type FdvRow = { date: string; zec_usd: number; btc_usd: number; zec_supply: number; btc_supply: number };
type FeeStats = { days: { complete: boolean; date: string; mean_fee_zat: number; tx_count: number; zec_usd: number }[] };
type NearStat = { date: string; wrapped_supply: number };
type HlRow = { date: string; zec_oi_usd: number; zec_funding_apr: number };
type ExchVol = { rows: { date: string; zec: number }[] };
type NearSwap = { date: string; from_chain: string; to_chain: string; volume_usd: number };
type Network = { reachable_total: number; by_country: { cc: string; nodes: number }[] };
type NewsItem = { body: string; chart_id: string; date: string; headline: string; importance: number; severity: string; theme: string; z: number; live?: boolean };

/** Every 7th row, aligned so the last row is kept. */
const weekly = <T,>(xs: T[]) => xs.filter((_, i) => i % 7 === (xs.length - 1) % 7);

const ratioOn = (prices: { date: string; zec_usd: number; btc_usd: number }[], daysAgo: number) => {
  const r = prices[Math.max(0, prices.length - 1 - daysAgo)];
  return r.zec_usd / r.btc_usd;
};

export const getHome = cache(async () => {
  const [live, lb, prices, all, complete, realized, fdv, fees, near, hl, exch, swaps, network, act, src, ti, news] = await Promise.all([
    getLive(), getLatestBlock(), getDailyPrices(), getDailyStats(), getCompleteDailyStats(),
    api<Realized[]>('realized'), api<FdvRow[]>('fdv-vs-btc'), api<FeeStats>('fee-stats'), api<NearStat[]>('near-stats'),
    api<HlRow[]>('hyperliquid'), api<ExchVol>('exchange-volume'), api<NearSwap[]>('near-swaps'), api<Network>('network'),
    getActivity(), getIronwoodSources(), getTurnstileIndex(), api<{ items: NewsItem[] }>('news'),
  ]);
  const price = live.zec_usd;
  const pools = poolsFromRow(all.at(-1)!);
  const at = (d: number) => poolsFromRow(all[Math.max(0, all.length - 1 - d)]);
  const yearAgo = at(365);
  const fiveAgo = at(365 * 5 + 1);
  const last = complete.at(-1)!;

  // 5-year price range (weekly closes, like the live hero).
  const five = prices.slice(-(365 * 5 + 1));
  const closes = weekly(five).map((p) => p.zec_usd);
  const range5y = { lo: Math.min(...closes), hi: Math.max(...closes), from: five[0].date, to: five.at(-1)!.date };

  // ZEC/BTC: now (live) against N days ago (daily closes).
  const ratio = live.zec_btc;
  const r5 = ratioOn(prices, 365 * 5), r1 = ratioOn(prices, 365), r3m = ratioOn(prices, 92);

  const rz = realized.at(-1)!;
  const f = fdv.at(-1)!;
  const btcCap = f.btc_usd * f.btc_supply;
  const fdvUsd = price * MAX_SUPPLY;

  const l30 = complete.slice(-30);
  const coinbasePerDay = l30.reduce((a, r) => a + zat(r.coinbase_zat), 0) / 30;
  const inflation = ((coinbasePerDay * 365) / pools.supply) * 100;
  const hashrate = (last.avg_difficulty * 8192) / BLOCK_SECS;

  const feeDays = fees.days.filter((d) => d.complete).slice(-30);
  const feeZec = feeDays.reduce((a, d) => a + (d.mean_fee_zat * d.tx_count) / 1e8, 0);
  const feeUsd = feeDays.reduce((a, d) => a + ((d.mean_fee_zat * d.tx_count) / 1e8) * d.zec_usd, 0);

  // Transactions: user-initiated (coinbase excluded), as the live "Transactions per Day" chart does.
  const txDay = last.tx_count - last.block_count;
  const shieldedTxShare = (last.shielded_tx_count / txDay) * 100;

  // Halving.
  const blocksLeft = NEXT_HALVING_HEIGHT - lb.height;
  const halvingDays = (blocksLeft * BLOCK_SECS) / 86400;
  const eraPct = ((lb.height - (NEXT_HALVING_HEIGHT - HALVING_INTERVAL)) / HALVING_INTERVAL) * 100;

  // Markets — last complete day of each external series.
  const nearLast = near.at(-2) ?? near.at(-1)!;
  const hlLast = hl.at(-2) ?? hl.at(-1)!;
  const exLast = exch.rows.at(-1)!;
  const swapDays = [...new Set(swaps.map((s) => s.date))].sort();
  const swapDay = swapDays.at(-2) ?? swapDays.at(-1)!;
  let nearIn = 0, nearOut = 0;
  for (const s of swaps) {
    if (s.date !== swapDay) continue;
    if (s.to_chain === 'zec' && s.from_chain !== 'zec') nearIn += s.volume_usd;
    if (s.from_chain === 'zec' && s.to_chain !== 'zec') nearOut += s.volume_usd;
  }

  // 1-year shielded share sparkline (weekly).
  const y1 = weekly(all.slice(-366)).map((r) => poolsFromRow(r).shieldedPct);

  // Shielded ZEC by pool, 5 years weekly (stacked area).
  const fiveRows = weekly(all.slice(-(365 * 5 + 1))).map(poolsFromRow);

  const events = news.items.filter((n) => !n.live).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.importance - a.importance)).slice(0, 3);

  return {
    price, live, height: lb.height, pools, yearAgo, fiveAgo, last,
    prices: { dates: prices.map((p) => p.date), values: prices.map((p) => p.zec_usd) },
    range5y,
    ratio, r5, r1, r3m,
    marketCap: pools.supply * price,
    realizedPrice: rz.realized_price,
    mvrv: price / rz.realized_price,
    fdvPct: (price / f.btc_usd) * 100,
    fdvUsd, btcCap,
    inflation, coinbasePerDay,
    issuedPct: (pools.supply / MAX_SUPPLY) * 100,
    hashrate,
    feeZec, feeUsd,
    txDay, shieldedTxShare,
    avgBlockKb: last.total_block_bytes / last.block_count / 1000,
    halving: { blocksLeft, days: halvingDays, date: new Date(lb.time * 1000 + blocksLeft * BLOCK_SECS * 1000), eraPct },
    // countries by ISO code: the API lists "The Netherlands" and "Netherlands" apart
    nodes: { reachable: network.reachable_total || network.by_country.reduce((a, c) => a + c.nodes, 0), countries: new Set(network.by_country.map((c) => c.cc)).size, synced: lb.node_estimated_height - lb.height <= 2 },
    near: { bridge: nearLast.wrapped_supply, bridgeDate: nearLast.date, net: nearIn - nearOut, netDate: swapDay },
    hl: { oi: hlLast.zec_oi_usd, funding: hlLast.zec_funding_apr, date: hlLast.date },
    exch: { zec: exLast.zec, date: exLast.date },
    net7: { in: zat(act.direction.shield_zat_7d), out: zat(act.direction.deshield_zat_7d), net: zat(act.direction.net_shield_zat_7d), prior: zat(act.direction.net_shield_zat_prior_7d) },
    migration: { pct: src.orchard_migration_pct, crossed: zat(src.sources.orchard), base: zat(src.orchard_base_zat), days: Math.floor((lb.time - lb.activation_time) / 86400) },
    turnstile: ti,
    y1,
    fiveRows,
    events,
  };
});

/* ---------- chart index (registry entries where they exist, the live site's chart list for the rest) ---------- */

type LiveChart = { c: string; d: string; id: string; t: string; u: string };
export type IndexRow = { slug: string; title: string; value?: string; descriptor?: boolean; spark?: number[] };
type IndexGroup = { id: ChartGroupId; title: string; desc: string; rows: IndexRow[] };

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** One row per chart slug: title + latest reading. Each registry load() is guarded so a failing chart never breaks the page. */
export const getChartIndex = cache(async (): Promise<IndexGroup[]> => {
  const live = await api<LiveChart[]>('charts');
  const byId = new Map(live.map((c) => [c.id, c]));
  const slugs = Object.values(GROUP_SLUGS).flat();
  const rows = new Map<string, IndexRow>();
  await Promise.all(slugs.map(async (slug) => {
    const def = CHARTS.find((c) => c.slug === slug);
    const title = byId.get(slug)?.t ?? def?.title ?? slug;
    if (!def) { rows.set(slug, { slug, title }); return; }
    try {
      const d = await withTimeout(def.load(), 8000);
      const value = d.indexValue ?? d.headline?.value;
      rows.set(slug, { slug, title, value, descriptor: !!d.indexValue && !/\d/.test(d.indexValue), spark: d.spark });
    } catch {
      rows.set(slug, { slug, title });
    }
  }));
  return CHART_GROUPS.map((g) => ({ id: g.id, title: g.title, desc: g.desc, rows: GROUP_SLUGS[g.id].map((s) => rows.get(s)!) }));
});
