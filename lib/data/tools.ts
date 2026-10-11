import 'server-only';
import { cache } from 'react';
import { api } from './core';
import { getDailyPrices, getLatestBlock } from './snapshot';
import { zat } from '../format';

// Data for the Tools pages: /metrics, /correlate, /compare, /btc-bull-run, /signals, /what-if, /donate, /savings.
// Everything is read through api() (the snapshot/live seam). Where the live site only server-renders a figure (the
// signals call log, the what-if reference sizes, the donation address) it is transcribed below with its source.

/* ───────────────────────── metric-series (/api/metric-series) ───────────────────────── */

export type MetricSeries = { dates: string[]; metrics: { category: string; chart: string; name: string; unit: string; series: (number | null)[] }[] };
export const getMetricSeries = () => api<MetricSeries>('metric-series');

export const metricId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** How a metric's value is written. Every kind is formatted the same way in the table, the CSV and the picker. */
export type MetricKind = 'usd' | 'usdC' | 'usdSigned' | 'ratio' | 'pct' | 'x2' | 'x3' | 'zecC' | 'zec' | 'count' | 'hash' | 'bytes' | 'big';
export type MetricGroupId = 'market' | 'privacy' | 'activity' | 'network' | 'derivatives' | 'crosschain';

export const METRIC_GROUPS: { id: MetricGroupId; title: string; desc: string }[] = [
  { id: 'market', title: 'Market', desc: 'Price, valuation and ZEC compared with Bitcoin' },
  { id: 'privacy', title: 'Privacy', desc: 'How much ZEC and activity is shielded' },
  { id: 'activity', title: 'Activity', desc: 'On-chain use, excluding miner-reward transactions' },
  { id: 'network', title: 'Network', desc: 'Supply and the computing power securing the chain' },
  { id: 'derivatives', title: 'Derivatives', desc: 'Hyperliquid perpetual futures, for ZEC and BTC' },
  { id: 'crosschain', title: 'Cross-chain', desc: 'Swaps through NEAR Intents · net = into ZEC minus out of ZEC' },
];

type MetricMeta = { label: string; desc: string; group: MetricGroupId; kind: MetricKind; def?: boolean; signed?: boolean };

// Keyed by the live metric name. Order inside a group is the picker order; the table sorts by change.
const META: Record<string, MetricMeta> = {
  'Realized Price (all pools)': { label: 'Realized price', desc: 'Average price each coin last moved at · all pools', group: 'market', kind: 'usd', def: true },
  'Market Cap': { label: 'Market cap', desc: 'Price × total supply', group: 'market', kind: 'usdC', def: true },
  'ZEC Price': { label: 'ZEC price', desc: 'USD · end-of-day close', group: 'market', kind: 'usd', def: true },
  'ZEC/BTC Ratio': { label: 'ZEC/BTC', desc: 'Bitcoin per ZEC', group: 'market', kind: 'ratio', def: true },
  'ZEC FDV % of BTC': { label: 'ZEC FDV % of BTC', desc: 'Zcash fully diluted value ÷ Bitcoin market cap', group: 'market', kind: 'pct', def: true },
  'MVRV (spot ÷ realized)': { label: 'MVRV', desc: 'Spot price ÷ realized price', group: 'market', kind: 'x2', def: true },
  'Price vs BTC @ issuance': { label: 'Price vs BTC @ issuance', desc: 'ZEC ÷ BTC at the same point in their issuance', group: 'market', kind: 'x3', def: true },
  'Market Cap vs BTC @ issuance': { label: 'Market cap vs BTC @ issuance', desc: 'ZEC ÷ BTC at the same point in their issuance', group: 'market', kind: 'x3', def: true },
  'Volatility vs BTC @ issuance': { label: 'Volatility vs BTC @ issuance', desc: 'ZEC ÷ BTC price volatility, same issuance point', group: 'market', kind: 'x2', def: true },
  'Exchange Trading Volume': { label: 'Exchange trading volume', desc: 'USD per day across tracked exchanges', group: 'market', kind: 'usdC' },
  'Shielded Supply': { label: 'Shielded supply', desc: 'ZEC held in shielded pools', group: 'privacy', kind: 'zecC', def: true },
  'Shielded Tx Share': { label: 'Shielded tx share', desc: 'Share of transactions that are shielded · 7-day avg', group: 'privacy', kind: 'pct', def: true },
  'Shielded Tx / Day': { label: 'Shielded tx / day', desc: '7-day average', group: 'privacy', kind: 'count', def: true },
  'Shielded % of Supply': { label: 'Shielded % of supply', desc: 'Shielded supply ÷ total supply', group: 'privacy', kind: 'pct' },
  'Shielded Actions / Day': { label: 'Shielded actions / day', desc: 'Spends + outputs + actions · 7-day average', group: 'privacy', kind: 'count' },
  'Orchard Actions / Day': { label: 'Orchard actions / day', desc: '7-day average', group: 'privacy', kind: 'count' },
  'Sapling Outputs / Day': { label: 'Sapling outputs / day', desc: '7-day average', group: 'privacy', kind: 'count' },
  'Sprout Pool': { label: 'Sprout pool', desc: 'ZEC held in Sprout', group: 'privacy', kind: 'zecC' },
  'Sapling Pool': { label: 'Sapling pool', desc: 'ZEC held in Sapling', group: 'privacy', kind: 'zecC' },
  'Orchard Pool': { label: 'Orchard pool', desc: 'ZEC held in Orchard', group: 'privacy', kind: 'zecC' },
  'Ironwood Pool': { label: 'Ironwood pool', desc: 'ZEC held in Ironwood · live since 28 Jul 2026', group: 'privacy', kind: 'zecC' },
  'Total Fees Paid / Day': { label: 'Total fees paid / day', desc: 'USD · 7-day average', group: 'activity', kind: 'usd', def: true },
  'Transactions / Day': { label: 'Transactions / day', desc: '7-day average', group: 'activity', kind: 'count', def: true },
  'New Transparent Addresses / Day': { label: 'New transparent addresses / day', desc: '7-day average', group: 'activity', kind: 'count', def: true },
  'Tx vs BTC @ issuance': { label: 'Tx vs BTC @ issuance', desc: 'ZEC ÷ BTC transactions, same issuance point', group: 'activity', kind: 'x3', def: true },
  'Transparent Volume / Day': { label: 'Transparent volume / day', desc: 'ZEC moved between transparent addresses · 7-day avg', group: 'activity', kind: 'zecC' },
  'Total Supply': { label: 'Total supply', desc: 'ZEC issued so far, of 21M', group: 'network', kind: 'zecC', def: true },
  'Network Hashrate': { label: 'Network hashrate', desc: 'Total mining power · 7-day average', group: 'network', kind: 'hash', def: true },
  'Transparent Pool': { label: 'Transparent pool', desc: 'ZEC on transparent addresses', group: 'network', kind: 'zecC' },
  'Lockbox (Dev Fund)': { label: 'Lockbox (dev fund)', desc: 'ZEC held for future development grants', group: 'network', kind: 'zecC' },
  'Emission / Day': { label: 'Emission / day', desc: 'New ZEC per day · 7-day average', group: 'network', kind: 'zec' },
  'Blocks / Day': { label: 'Blocks / day', desc: '7-day average · target 1,152', group: 'network', kind: 'count' },
  'Avg Block Size': { label: 'Average block size', desc: '7-day average', group: 'network', kind: 'bytes' },
  'Avg Difficulty': { label: 'Average difficulty', desc: '7-day average', group: 'network', kind: 'big' },
  'BTC Perp Funding (APR)': { label: 'BTC perp funding (APR)', desc: 'Annualised funding rate', group: 'derivatives', kind: 'pct', def: true, signed: true },
  'ZEC Perp Funding (APR)': { label: 'ZEC perp funding (APR)', desc: 'Annualised funding rate', group: 'derivatives', kind: 'pct', def: true, signed: true },
  'ZEC−BTC Funding Spread': { label: 'ZEC−BTC funding spread', desc: 'ZEC funding minus BTC funding', group: 'derivatives', kind: 'pct', def: true, signed: true },
  'BTC Open Interest': { label: 'BTC open interest', desc: 'USD', group: 'derivatives', kind: 'usdC', def: true },
  'ZEC Open Interest': { label: 'ZEC open interest', desc: 'USD', group: 'derivatives', kind: 'usdC', def: true },
  'BTC Perp Volume (24h)': { label: 'BTC perp volume (24h)', desc: 'USD', group: 'derivatives', kind: 'usdC', def: true },
  'ZEC Perp Volume (24h)': { label: 'ZEC perp volume (24h)', desc: 'USD', group: 'derivatives', kind: 'usdC', def: true },
  'Net ZEC Flow (NEAR)': { label: 'Net ZEC flow (NEAR)', desc: 'USD per day, all assets · 7-day average · can change sign, so change is in dollars', group: 'crosschain', kind: 'usdSigned', def: true, signed: true },
  'Net ZEC ← BTC Flow (NEAR)': { label: 'Net ZEC ← BTC flow (NEAR)', desc: 'USD per day, Bitcoin swapped into ZEC minus the reverse · 7-day average', group: 'crosschain', kind: 'usdSigned', def: true, signed: true },
};

export const COMPARE_PERIODS = [
  { key: '7D', days: 7 },
  { key: '28D', days: 28 },
  { key: '3M', days: 91 },
  { key: '6M', days: 182 },
  { key: '12M', days: 365 },
] as const;
export type PeriodKey = (typeof COMPARE_PERIODS)[number]['key'];

export type MetricPeriod = { from: number | null; spark: number[] };
export type MetricRow = {
  id: string; name: string; label: string; desc: string; group: MetricGroupId; kind: MetricKind; def: boolean; signed: boolean;
  chart: string; now: number; periods: Record<PeriodKey, MetricPeriod>;
};
export type MetricsTable = { date: string; periodDates: Record<PeriodKey, string>; rows: MetricRow[] };

const round = (v: number) => (v === 0 ? 0 : Number(v.toPrecision(6)));
function sparkOf(xs: (number | null)[], n = 36): number[] {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
  if (v.length <= n) return v.map(round);
  const out: number[] = [];
  for (let i = 0; i < n - 1; i++) out.push(round(v[Math.floor((i * v.length) / (n - 1))]));
  out.push(round(v[v.length - 1]));
  return out;
}

/** /metrics: every metric's last value and its value 7D … 12M earlier, plus a sparkline of each window. */
export const getMetricsTable = cache(async (): Promise<MetricsTable> => {
  const ms = await getMetricSeries();
  const n = ms.dates.length;
  const last = n - 1;
  const periodDates = Object.fromEntries(COMPARE_PERIODS.map((p) => [p.key, ms.dates[last - p.days]])) as Record<PeriodKey, string>;
  const rows: MetricRow[] = [];
  for (const m of ms.metrics) {
    const meta = META[m.name];
    if (!meta) continue; // the two forward-shifted price series (+30d/+90d) have no "now"
    const now = m.series[last];
    if (now == null) continue;
    const periods = {} as Record<PeriodKey, MetricPeriod>;
    for (const p of COMPARE_PERIODS) {
      const from = m.series[last - p.days];
      periods[p.key] = { from: from == null ? null : round(from), spark: sparkOf(m.series.slice(last - p.days, n)) };
    }
    rows.push({ id: metricId(m.name), name: m.name, label: meta.label, desc: meta.desc, group: meta.group, kind: meta.kind, def: !!meta.def, signed: !!meta.signed, chart: m.chart, now: round(now), periods });
  }
  return { date: ms.dates[last], periodDates, rows };
});

/* ───────────────────────── correlations ───────────────────────── */

export const CORR_WINDOWS = [
  { key: '3M', days: 92 },
  { key: '6M', days: 183 },
  { key: '1Y', days: 366 },
  { key: '2Y', days: 731 },
  { key: '5Y', days: 1827 },
  { key: 'ALL', days: Infinity },
] as const;
export type CorrWindowKey = (typeof CORR_WINDOWS)[number]['key'];

const CORR_LABEL: Record<string, string> = { 'ZEC Price (+30d)': 'ZEC price, 30 days later', 'ZEC Price (+90d)': 'ZEC price, 90 days later' };
export const CORR_DEFAULTS = ['Shielded Tx Share', 'Transactions / Day', 'ZEC Price', 'Orchard Actions / Day', 'Sapling Outputs / Day', 'Shielded % of Supply', 'Shielded Supply', 'Total Supply'].map(metricId);

export type CorrMetric = { id: string; label: string; group: string; first: string };
export type Correlations = {
  metrics: CorrMetric[];
  /** For each window: from/to dates and the upper-triangle r (index via pairIndex) with the number of shared days. */
  windows: Record<CorrWindowKey, { from: string; to: string; r: (number | null)[]; n: number[] }>;
};
export const pairIndex = (i: number, j: number, m: number) => { const a = Math.min(i, j), b = Math.max(i, j); return a * m - (a * (a + 1)) / 2 + (b - a - 1); };

function pearson(x: (number | null)[], y: (number | null)[], s: number, e: number): [number | null, number] {
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = s; i < e; i++) {
    const a = x[i], b = y[i];
    if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) continue;
    n++; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b;
  }
  if (n < 10) return [null, n];
  const cov = sxy - (sx * sy) / n, vx = sxx - (sx * sx) / n, vy = syy - (sy * sy) / n;
  if (vx <= 0 || vy <= 0) return [null, n];
  return [Math.round((cov / Math.sqrt(vx * vy)) * 1000) / 1000, n];
}

export const getCorrelations = cache(async (): Promise<Correlations> => {
  const ms = await getMetricSeries();
  const list = ms.metrics;
  const metrics: CorrMetric[] = list.map((m) => ({ id: metricId(m.name), label: META[m.name]?.label ?? CORR_LABEL[m.name] ?? m.name, group: META[m.name] ? METRIC_GROUPS.find((g) => g.id === META[m.name].group)!.title : 'Forward price', first: ms.dates[Math.max(0, m.series.findIndex((v) => v != null))] }));
  const N = ms.dates.length, M = list.length;
  const windows = {} as Correlations['windows'];
  for (const w of CORR_WINDOWS) {
    const s = Number.isFinite(w.days) ? Math.max(0, N - w.days) : 0;
    const r: (number | null)[] = [], n: number[] = [];
    for (let i = 0; i < M; i++) for (let j = i + 1; j < M; j++) { const [rv, nv] = pearson(list[i].series, list[j].series, s, N); r.push(rv); n.push(nv); }
    windows[w.key] = { from: ms.dates[s], to: ms.dates[N - 1], r, n };
  }
  return { metrics, windows };
});

/* ───────────────────────── chart catalogue (titles for /compare and /tools) ───────────────────────── */

export type LiveChart = { id: string; t: string; d: string; c: string; u: string };
export const getChartCatalogue = cache(async () => (await api<LiveChart[]>('charts')).filter((c) => c.u.startsWith('/chart/')));

/* ───────────────────────── daily prices as compact arrays (client calculators) ───────────────────────── */

export type PriceArrays = { start: string; dates: string[]; zec: number[]; btc: number[]; lastComplete: string };
/** Daily closes through the last complete UTC day (the final row of /api/daily-prices is "today, so far"). */
export const getPriceArrays = cache(async (): Promise<PriceArrays> => {
  const p = (await getDailyPrices()).slice(0, -1);
  return { start: p[0].date, dates: p.map((r) => r.date), zec: p.map((r) => r.zec_usd), btc: p.map((r) => r.btc_usd), lastComplete: p.at(-1)!.date };
});

/* ───────────────────────── /btc-bull-run ───────────────────────── */

export type BullRunSnapshot = { threshold: number; btc_cycle: { from: string; to: string }; zec: { anchor_date: string; anchor_usd: number }; btc: { anchor_date: string; anchor_usd: number; peak: { d: number; date: string; mult: number; usd: number }; trough_after_peak: { d: number; date: string; mult: number; usd: number } } };
export const getBullRunSnapshot = () => api<BullRunSnapshot>('btc-bull-run');

/* ───────────────────────── /what-if ───────────────────────── */

// Reference sizes the live page types in once a year (data/raw/pages/what-if.html, "last reviewed 2026-09-17").
// Bitcoin is computed here from the BTC close × 20.1M coins issued, as the live page does.
export const BTC_ISSUED = 20.1e6;
export const ZEC_MAX = 21e6;
export const WHAT_IF_ASSETS = [
  { id: 'gold', label: 'Gold', size: 20.0e12, source: 'World Gold Council, above-ground stocks at spot — as of 2026-06', desc: 'Every gram ever mined that still exists, valued at the spot price. Most of it is jewellery and central bank reserves, not bullion anyone is trading.' },
  { id: 'offshore', label: 'Offshore wealth', size: 12.0e12, source: 'Zucman, The Hidden Wealth of Nations, updated series — as of 2025', desc: "Household financial wealth held through accounts outside the owner's country of residence. An estimate by construction: the whole point of the money is that it is not counted." },
  { id: 'stocks', label: 'World stock market', size: 120.0e12, source: 'World Federation of Exchanges, domestic market capitalisation — as of 2026-06', desc: 'Every company listed on a member exchange, at its market price. It excludes private companies, which are most companies.' },
] as const;

export const getWhatIfInputs = cache(async () => {
  const [prices, lb] = await Promise.all([getPriceArrays(), getLatestBlock()]);
  const btc = prices.btc.at(-1)!;
  return { zecUsd: prices.zec.at(-1)!, btcUsd: btc, btcSize: btc * BTC_ISSUED, mined: zat(lb.end_supply_zat), date: prices.lastComplete };
});

/* ───────────────────────── /donate ───────────────────────── */

// From data/raw/pages/donate.html. The QR image (/donate-qr.jpg) was not captured in the snapshot.
export const DONATE = {
  monthlyCostUsd: 300,
  tiers: [{ usd: 300, label: '1 month' }, { usd: 1800, label: '6 months' }, { usd: 3600, label: '12 months' }],
  address: 'u10l3aldh5zfmjlyykj4uzmtt33z2v0y8feq9w9fgdg9y6ldg8cw0cyq4wfc0skwm034jfmgthhc0fx6w7a4qsnf3mvfu25rq0gpa7jaxf7n6jylrtu9allza35j38jem37ncltf85pdfd0y5u5zqy6vj3k6gy7xedpr5glf3v6u4az6gh',
};

/* ───────────────────────── /signals ───────────────────────── */

export type SignalCall = {
  at: string; mode: 'live' | 'replayed'; block: number; stance: string; call: string;
  from: number | null; to: number; price: number; next7: number | null; next30: number | null; effect: number | null; message: string;
};

export type SignalsReplay = {
  start: string; startUsd: number; end: string; endPrice: number;
  dates: string[]; follow: number[]; hold: number[]; share: number[];
  followEnd: number; holdEnd: number; followDd: number; holdDd: number; avgShare: number; avgShareEnd: number; fees: number;
};

/** Replays the call log on daily closes: $10,000 on the first call, re-weighted to each call's share at the price it
 *  quoted, 0.1% fee on the amount traded, cash earns nothing. Marked to market at each daily close. */
export const getSignalsReplay = cache(async (): Promise<SignalsReplay> => {
  const prices = await getPriceArrays();
  const calls = [...SIGNAL_CALLS].reverse();
  const startDate = calls[0].at.slice(0, 10);
  const i0 = prices.dates.indexOf(startDate);
  const dates = prices.dates.slice(i0);
  const px = prices.zec.slice(i0);
  let coins = 10000 / calls[0].price, cash = 0, fees = 0, ci = 1;
  const follow: number[] = [], hold: number[] = [], share: number[] = [];
  const holdCoins = 10000 / calls[0].price;
  let shareNow = calls[0].to;
  dates.forEach((d, k) => {
    while (ci < calls.length && calls[ci].at.slice(0, 10) <= d) {
      const c = calls[ci++];
      const v = cash + coins * c.price;
      const trade = Math.abs((v * c.to) / 100 - coins * c.price);
      const fee = trade * 0.001; fees += fee;
      const v2 = v - fee;
      coins = (v2 * c.to) / 100 / c.price; cash = v2 - coins * c.price; shareNow = c.to;
    }
    follow.push(cash + coins * px[k]); hold.push(holdCoins * px[k]); share.push(shareNow);
  });
  const dd = (xs: number[]) => { let peak = -Infinity, worst = 0; for (const x of xs) { peak = Math.max(peak, x); worst = Math.min(worst, x / peak - 1); } return worst * 100; };
  // Holding the average share the whole time, rebalanced daily (no fees): the "same risk, never trading" benchmark.
  const avgShare = share.reduce((a, b) => a + b, 0) / share.length;
  let avg = 10000;
  for (let k = 1; k < px.length; k++) avg *= 1 + (avgShare / 100) * (px[k] / px[k - 1] - 1);
  return { start: startDate, startUsd: 10000, end: dates.at(-1)!, endPrice: px.at(-1)!, dates, follow: follow.map((v) => Math.round(v)), hold: hold.map((v) => Math.round(v)), share, followEnd: follow.at(-1)!, holdEnd: hold.at(-1)!, followDd: dd(follow), holdDd: dd(hold), avgShare, avgShareEnd: avg, fees };
});

// Transcribed from the live /signals page (data/raw/pages/signals.html, captured 11 Oct 2026): the call log is
// server-rendered only — there is no /api route for it. Newest first.
export const SIGNAL_CALLS: SignalCall[] = [
 {
  "at": "2026-09-28T01:00Z",
  "mode": "live",
  "block": 3498608,
  "stance": "Neutral",
  "call": "CASH",
  "from": 16,
  "to": 0,
  "price": 1574.08,
  "next7": -15.2,
  "next30": null,
  "effect": 669,
  "message": "ZEC signal: PARTIAL to CASH\n\nScore 55, down from 57 when the last signal was sent (2026-09-26).\nSuggested: CASH (0% of the position), was PARTIAL (30%).\n\nZEC $1574 (CoinGecko, 01:02 UTC)\nChain data through 2026-09-27, the last full day. Our node was at block 3,498,608.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-26T23:00Z",
  "mode": "live",
  "block": 3497373,
  "stance": "Neutral",
  "call": "PARTIAL",
  "from": 3,
  "to": 16,
  "price": 1657.64,
  "next7": -21.5,
  "next30": null,
  "effect": -125,
  "message": "ZEC signal: CASH to PARTIAL\n\nScore 57, up from 55 when the last signal was sent (2026-09-26).\nSuggested: PARTIAL (16% of the position), was CASH (0%).\n\nZEC $1658 (CoinGecko, 23:03 UTC)\nChain data through 2026-09-25, the last full day. Our node was at block 3,497,373.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-26T01:00Z",
  "mode": "live",
  "block": 3496316,
  "stance": "Neutral",
  "call": "CASH",
  "from": 40,
  "to": 3,
  "price": 1540.04,
  "next7": -15.5,
  "next30": null,
  "effect": -525,
  "message": "ZEC signal: PARTIAL to CASH\n\nScore 55, down from 58 when the last signal was sent (2026-09-24).\nSuggested: CASH (3% of the position), was PARTIAL (30%).\n\nZEC $1540 (CoinGecko, 01:00 UTC)\nChain data through 2026-09-25, the last full day. Our node was at block 3,496,316.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-24T02:00Z",
  "mode": "live",
  "block": 3494069,
  "stance": "Neutral",
  "call": "PARTIAL",
  "from": 43,
  "to": 40,
  "price": 1493.37,
  "next7": -10.6,
  "next30": null,
  "effect": -17,
  "message": "ZEC signal: Bullish to Neutral\n\nScore 58, down from 61 when the last signal was sent (2026-09-22).\nSuggested: PARTIAL (40% of the position).\n\nZEC $1493 (CoinGecko, 02:00 UTC)\nChain data through 2026-09-23, the last full day. Our node was at block 3,494,069.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-22T01:00Z",
  "mode": "live",
  "block": 3491733,
  "stance": "Bullish",
  "call": "PARTIAL",
  "from": 56,
  "to": 43,
  "price": 1467.94,
  "next7": -3.5,
  "next30": null,
  "effect": -43,
  "message": "ZEC signal: SCALE IN to PARTIAL\n\nScore 61, down from 64 when the last signal was sent (2026-09-20).\nSuggested: PARTIAL (43% of the position), was SCALE IN (70%).\n\nZEC $1468 (CoinGecko, 01:00 UTC)\nChain data through 2026-09-21, the last full day. Our node was at block 3,491,733.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-20T20:00Z",
  "mode": "live",
  "block": 3490337,
  "stance": "Bullish",
  "call": "SCALE IN",
  "from": 48,
  "to": 56,
  "price": 1521.41,
  "next7": 4.6,
  "next30": null,
  "effect": -53,
  "message": "ZEC signal: PARTIAL to SCALE IN\n\nScore 64, up from 62 when the last signal was sent (2026-09-19).\nSuggested: SCALE IN (56% of the position), was PARTIAL (30%).\n\nZEC $1521 (CoinGecko, 20:03 UTC)\nChain data through 2026-09-19, the last full day. Our node was at block 3,490,337.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-19T22:00Z",
  "mode": "live",
  "block": 3489293,
  "stance": "Bullish",
  "call": "PARTIAL",
  "from": 56,
  "to": 48,
  "price": 1470.77,
  "next7": 12.1,
  "next30": null,
  "effect": -55,
  "message": "ZEC signal: SCALE IN to PARTIAL\n\nScore 62, up from 61 when the last signal was sent (2026-09-18).\nSuggested: PARTIAL (48% of the position), was SCALE IN (70%).\n\nZEC $1471 (CoinGecko, 22:03 UTC)\nChain data through 2026-09-18, the last full day. Our node was at block 3,489,293.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-18T01:00Z",
  "mode": "live",
  "block": 3487131,
  "stance": "Bullish",
  "call": "SCALE IN",
  "from": 42,
  "to": 56,
  "price": 1463.71,
  "next7": 6.2,
  "next30": null,
  "effect": 10,
  "message": "ZEC signal: PARTIAL to SCALE IN\n\nScore 61, up from 58 when the last signal was sent (2026-09-17).\nSuggested: SCALE IN (56% of the position), was PARTIAL (30%).\n\nZEC $1464 (CoinGecko, 01:02 UTC)\nChain data through 2026-09-17, the last full day. Our node was at block 3,487,131.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-17T11:00Z",
  "mode": "live",
  "block": 3486477,
  "stance": "Neutral",
  "call": "PARTIAL",
  "from": 42,
  "to": 42,
  "price": 1346.22,
  "next7": 15.1,
  "next30": null,
  "effect": -1,
  "message": "First signal: ZEC reads Neutral\n\nScore 58 out of 100.\nSuggested: PARTIAL (42% of the position).\n\nZEC $1346 (CoinGecko, 11:03 UTC)\nChain data through 2026-09-16, the last full day. Our node was at block 3,486,477.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-17T08:00Z",
  "mode": "live",
  "block": 3486318,
  "stance": "Neutral",
  "call": "PARTIAL",
  "from": 2,
  "to": 42,
  "price": 1371,
  "next7": 13,
  "next30": null,
  "effect": -134,
  "message": "First signal: ZEC reads Neutral\n\nScore 58 out of 100.\nSuggested: PARTIAL (42% of the position).\n\nZEC $1371 (CoinGecko, 08:02 UTC)\nChain data through block 3,486,318 (2026-09-16, the last full day)\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-16T02:00Z",
  "mode": "replayed",
  "block": 3484794,
  "stance": "Neutral",
  "call": "CASH",
  "from": 27,
  "to": 2,
  "price": 1110.14,
  "next7": 35,
  "next30": null,
  "effect": -1024,
  "message": "ZEC signal: PARTIAL to CASH\n\nScore 55, down from 57 when the last signal was sent (2026-09-14).\nSuggested: CASH (2% of the position), was PARTIAL (30%).\n\nZEC $1110 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-15, the last full day. Our node was at block 3,484,794.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-14T02:00Z",
  "mode": "replayed",
  "block": 3482503,
  "stance": "Neutral",
  "call": "PARTIAL",
  "from": 86,
  "to": 27,
  "price": 1063,
  "next7": 38.6,
  "next30": null,
  "effect": -450,
  "message": "ZEC signal: Bullish to Neutral\n\nScore 57, down from 64 when the last signal was sent (2026-09-12).\nSuggested: PARTIAL (27% of the position), was SCALE IN (70%).\n\nZEC $1063 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-13, the last full day. Our node was at block 3,482,503.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-12T02:00Z",
  "mode": "replayed",
  "block": 3480208,
  "stance": "Bullish",
  "call": "SCALE IN",
  "from": 48,
  "to": 86,
  "price": 1162.79,
  "next7": 26.3,
  "next30": null,
  "effect": -607,
  "message": "ZEC signal: PARTIAL to SCALE IN\n\nScore 64, up from 62 when the last signal was sent (2026-09-11).\nSuggested: SCALE IN (86% of the position), was PARTIAL (30%).\n\nZEC $1163 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-11, the last full day. Our node was at block 3,480,208.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-11T02:00Z",
  "mode": "replayed",
  "block": 3479059,
  "stance": "Bullish",
  "call": "PARTIAL",
  "from": 100,
  "to": 48,
  "price": 1076.79,
  "next7": 44.5,
  "next30": null,
  "effect": -752,
  "message": "ZEC signal: FULLY LONG to PARTIAL\n\nScore 62, down from 67 when the last signal was sent (2026-09-10).\nSuggested: PARTIAL (48% of the position), was FULLY LONG (95%).\n\nZEC $1077 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-10, the last full day. Our node was at block 3,479,059.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-10T02:00Z",
  "mode": "replayed",
  "block": 3477916,
  "stance": "Bullish",
  "call": "FULLY LONG",
  "from": 60,
  "to": 100,
  "price": 1247.34,
  "next7": 17.9,
  "next30": -2.1,
  "effect": -1138,
  "message": "ZEC signal: SCALE IN to FULLY LONG\n\nScore 67, up from 65 when the last signal was sent (2026-09-09).\nSuggested: FULLY LONG (100% of the position), was SCALE IN (70%).\n\nZEC $1247 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-09, the last full day. Our node was at block 3,477,916.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-09T02:00Z",
  "mode": "replayed",
  "block": 3476762,
  "stance": "Bullish",
  "call": "SCALE IN",
  "from": 45,
  "to": 60,
  "price": 1177.09,
  "next7": 13.2,
  "next30": 2.6,
  "effect": 177,
  "message": "ZEC signal: PARTIAL to SCALE IN\n\nScore 65, up from 64 when the last signal was sent (2026-09-08).\nSuggested: SCALE IN (60% of the position), was PARTIAL (30%).\n\nZEC $1177 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-08, the last full day. Our node was at block 3,476,762.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-08T02:00Z",
  "mode": "replayed",
  "block": 3475626,
  "stance": "Bullish",
  "call": "PARTIAL",
  "from": 53,
  "to": 45,
  "price": 1137.65,
  "next7": -2.4,
  "next30": 4.2,
  "effect": -58,
  "message": "ZEC signal: SCALE IN to PARTIAL\n\nScore 64, down from 66 when the last signal was sent (2026-09-07).\nSuggested: PARTIAL (45% of the position), was SCALE IN (70%).\n\nZEC $1138 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-07, the last full day. Our node was at block 3,475,626.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-07T02:00Z",
  "mode": "replayed",
  "block": 3474477,
  "stance": "Bullish",
  "call": "SCALE IN",
  "from": 96,
  "to": 53,
  "price": 1230.81,
  "next7": -5.4,
  "next30": 7.8,
  "effect": 652,
  "message": "ZEC signal: FULLY LONG to SCALE IN\n\nScore 66, up from 64 when the last signal was sent (2026-09-06).\nSuggested: SCALE IN (53% of the position), was FULLY LONG (95%).\n\nZEC $1231 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-06, the last full day. Our node was at block 3,474,477.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-06T02:00Z",
  "mode": "replayed",
  "block": 3473329,
  "stance": "Bullish",
  "call": "FULLY LONG",
  "from": 79,
  "to": 96,
  "price": 1025.55,
  "next7": 3.7,
  "next30": 33.4,
  "effect": 587,
  "message": "ZEC signal: SCALE IN to FULLY LONG\n\nScore 64, down from 66 when the last signal was sent (2026-09-01).\nSuggested: FULLY LONG (96% of the position), was SCALE IN (70%).\n\nZEC $1026 (CoinGecko, 02:05 UTC)\nChain data through 2026-09-05, the last full day. Our node was at block 3,473,329.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-09-01T02:00Z",
  "mode": "replayed",
  "block": 3467590,
  "stance": "Bullish",
  "call": "SCALE IN",
  "from": 96,
  "to": 79,
  "price": 848.28,
  "next7": 38.8,
  "next30": 57.3,
  "effect": -536,
  "message": "ZEC signal: FULLY LONG to SCALE IN\n\nScore 66, down from 73 when the last signal was sent (2026-07-30).\nSuggested: SCALE IN (79% of the position), was FULLY LONG (95%).\n\nZEC $848 (CoinGecko, 02:05 UTC)\nChain data through 2026-08-31, the last full day. Our node was at block 3,467,590.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-07-30T02:00Z",
  "mode": "replayed",
  "block": 3429767,
  "stance": "Bullish",
  "call": "FULLY LONG",
  "from": 86,
  "to": 96,
  "price": 467.36,
  "next7": 6.5,
  "next30": 80.4,
  "effect": 773,
  "message": "ZEC signal: SCALE IN to FULLY LONG\n\nScore 73, up from 69 when the last signal was sent (2026-07-29).\nSuggested: FULLY LONG (96% of the position), was SCALE IN (70%).\n\nZEC $467 (CoinGecko, 02:05 UTC)\nChain data through 2026-07-29, the last full day. Our node was at block 3,429,767.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-07-29T02:00Z",
  "mode": "replayed",
  "block": 3428611,
  "stance": "Bullish",
  "call": "SCALE IN",
  "from": 64,
  "to": 86,
  "price": 465.31,
  "next7": 10,
  "next30": 72.3,
  "effect": 6,
  "message": "ZEC signal: Neutral to Bullish\n\nScore 69, up from 57 when the last signal was sent (2026-07-28).\nSuggested: SCALE IN (86% of the position).\n\nZEC $465 (CoinGecko, 02:05 UTC)\nChain data through 2026-07-28, the last full day. Our node was at block 3,428,611.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-07-28T01:00Z",
  "mode": "replayed",
  "block": 3427462,
  "stance": "Neutral",
  "call": "SCALE IN",
  "from": 100,
  "to": 64,
  "price": 477.12,
  "next7": 6,
  "next30": 69.9,
  "effect": 73,
  "message": "ZEC signal: Bullish to Neutral\n\nScore 57, down from 63 when the last signal was sent (2026-07-15).\nSuggested: SCALE IN (64% of the position), was FULLY LONG (95%).\n\nZEC $477 (CoinGecko, 01:05 UTC)\nChain data through 2026-07-27, the last full day. Our node was at block 3,427,462.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 },
 {
  "at": "2026-07-15T02:00Z",
  "mode": "replayed",
  "block": 3412556,
  "stance": "Bullish",
  "call": "FULLY LONG",
  "from": null,
  "to": 100,
  "price": 565.61,
  "next7": -9.3,
  "next30": -12.9,
  "effect": null,
  "message": "ZEC signal: Neutral to Bullish\n\nScore 63, up from 54 when the last signal was sent (2026-07-08).\nSuggested: FULLY LONG (100% of the position).\n\nZEC $566 (CoinGecko, 02:05 UTC)\nChain data through 2026-07-14, the last full day. Our node was at block 3,412,556.\nModel v3 · 1-year horizon · 5-year window · mixed signals\n\nA research tool, not financial advice. zecstats.com/signals"
 }
];
