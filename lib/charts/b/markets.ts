// Markets & cross-chain group: NEAR Intents swaps and bridge, exchange spot volume, Hyperliquid perps.
import type { ChartDef } from '../types';
import type { Series } from '@/components/charts/TimeSeriesChart';
import { getCompleteDailyStats } from '@/lib/data/snapshot';
import { getNearStats, getNearSwaps, getNearVolMcap, getExchangeVolume, getHyperliquid, type NearSwap, type HlDay } from '@/lib/data/charts-b';
import { num, compact, usdCompact, dateLong, monthYear } from '@/lib/format';
import { C, tint, bars, line, panel, rolling, changeOver, changeWords, spark, sum, weekStart, addDays, lastIndex } from './util';

/** Last complete UTC day: market data is cut there too, so every chart in the group ends on the same date. */
const through = async () => (await getCompleteDailyStats()).at(-1)!.date;

const ROUTE = [
  'This is one path between Zcash and everything else, and far from the only one — centralised exchanges move more. A rise here means more value took this route, which is not the same as more value moving.',
  'It is off-chain from Zcash’s point of view: the chain sees an ordinary transfer and the swap happens elsewhere. None of it shows up in transaction counts as swapping, and none of it is shielded activity.',
];

// ─── NEAR Intents swaps ──────────────────────────────────────────────────────────────────────────────────
const STABLE = new Set(['usdt', 'usdc', 'dai', 'usd', 'usdc.e', 'usds', 'busd', 'tusd', 'pyusd', 'frax', 'usde', 'fdusd']);
const nearTok = (raw: string) => { const m = (raw || '').match(/^(?:nep141:)?([^.]+)\./); const n = m ? m[1].replace(/-\d+$/, '') : 'near'; return n === 'wrap' ? 'near' : n; };
/** The live site's "Token" grouping: stablecoins → USD, NEAR-chain tokens by contract, everything else by symbol. */
function token(sym: string, chain: string, raw: string): string {
  const s = (sym || chain || '').toLowerCase();
  if (STABLE.has(s)) return 'USD';
  const t = chain === 'near' ? nearTok(raw) : s;
  return /^[0-9a-f]{20,}$/.test(t) ? 'other' : t.toUpperCase();
}
const side = (asset: string, chain: string) => { const a = (asset || chain || '').toLowerCase(); return a === 'btc' || a === 'eth' ? a : 'other'; };
/** Swaps with ZEC on exactly one side (ZEC→ZEC routes inflate both directions and are left out). */
const crossSwaps = (rows: NearSwap[], end: string) => rows.filter((r) => r.date <= end && r.volume_usd > 0 && (r.from_chain === 'zec') !== (r.to_chain === 'zec'));

const nearFlow: ChartDef = {
  slug: 'near-flow',
  title: 'ZEC swap flow on NEAR Intents',
  short: 'NEAR swap flow',
  question: 'Is value flowing into or out of ZEC through NEAR Intents — and against which asset?',
  group: 'markets',
  source: 'external',
  sourceNote: 'Every ZEC swap on NEAR Intents, USD at swap time · NEAR Intents Explorer API',
  unit: 'USD/day',
  api: ['near-swaps'],
  explainer: [
    { heading: 'Is this the only route?', paragraphs: [
      'Inbound is other assets swapped into ZEC; outbound is ZEC swapped out, on NEAR Intents, a cross-chain swap protocol. ' + ROUTE[0],
      ROUTE[1],
      'The cumulative line is the one to watch. Daily net flow is noisy enough that any single day means little; the running total says whether this route has been a net way in or a net way out. Bitcoin is broken out because BTC↔ZEC is the pair most likely to be someone rotating between the two rather than entering or leaving crypto. BTC and ETH mean the coins themselves; stablecoins and wrapped tokens count as other.',
    ] },
  ],
  related: ['swap-assets', 'near-bridge', 'near-vol-mcap', 'exch-vol'],
  load: async () => {
    const end = await through();
    const rows = crossSwaps(await getNearSwaps(), end);
    const by = new Map<string, { in: number; out: number; btc: number; eth: number }>();
    for (const r of rows) {
      const d = by.get(r.date) ?? { in: 0, out: 0, btc: 0, eth: 0 };
      if (r.to_chain === 'zec') { d.in += r.volume_usd; const s = side(r.from_asset, r.from_chain); if (s !== 'other') d[s] += r.volume_usd; }
      else { d.out += r.volume_usd; const s = side(r.to_asset, r.to_chain); if (s !== 'other') d[s] -= r.volume_usd; }
      by.set(r.date, d);
    }
    const dates: string[] = [];
    for (let t = [...by.keys()].sort()[0]; t <= end; t = addDays(t, 1)) dates.push(t);
    const get = (t: string) => by.get(t) ?? { in: 0, out: 0, btc: 0, eth: 0 };
    const inb = dates.map((t) => get(t).in), outb = dates.map((t) => -get(t).out);
    let a = 0, b = 0, e = 0;
    const cum = dates.map((t) => (a += get(t).in - get(t).out)), cumBtc = dates.map((t) => (b += get(t).btc)), cumEth = dates.map((t) => (e += get(t).eth));
    const i = dates.length - 1;
    const in30 = sum(inb.slice(-30)), out30 = -sum(outb.slice(-30)), net30 = in30 - out30;
    return {
      panels: [
        panel({ title: 'Daily volume — into ZEC above zero, out of ZEC below', dates, format: 'usdCompact', zeroBaseline: true, height: 280, series: [
          bars('in', 'Into ZEC', C.s2, inb), bars('out', 'Out of ZEC', C.s4, outb)] }),
        panel({ title: 'Cumulative net flow into ZEC', dates, format: 'usdCompact', zeroBaseline: true, height: 220, series: [
          line('cum', 'All assets', C.zec, cum, { width: 2.2 }), line('btc', 'vs BTC', C.btc, cumBtc, { width: 1.6 }), line('eth', 'vs ETH', C.s3, cumEth, { width: 1.6 })] }),
      ],
      headline: { label: 'Net flow into ZEC, last 30 days', value: `${net30 < 0 ? '−' : '+'}${usdCompact(Math.abs(net30))}`, date: dates[i], change: null,
        sentence: `Over the 30 days to ${dateLong(dates[i])}, ${usdCompact(in30)} was swapped into ZEC on NEAR Intents and ${usdCompact(out30)} out — a net ${net30 < 0 ? 'outflow' : 'inflow'} of **${usdCompact(Math.abs(net30))}**.` },
      spark: spark(cum), indexValue: `${net30 < 0 ? '−' : '+'}${usdCompact(Math.abs(net30))} 30d`,
      ranges: ['1M', '3M', '6M', '1Y', 'ALL'], defaultRange: '3M', dataThrough: dates[i],
      notes: [`Cumulative lines start at zero on ${dateLong(dates[0])}, the first day in the data. ZEC→ZEC routes are left out because they count on both sides.`],
    };
  },
};

const nearBridge: ChartDef = {
  slug: 'near-bridge',
  title: 'ZEC bridged to NEAR (OMFT)',
  short: 'NEAR bridge',
  question: 'How much ZEC is wrapped on NEAR, and which way is it moving?',
  group: 'markets',
  source: 'external',
  sourceNote: 'zec.omft.near token supply, mints and burns per day · NEAR RPC',
  unit: 'ZEC',
  api: ['near-stats'],
  explainer: [
    { heading: 'Is wrapped ZEC still ZEC?', paragraphs: [
      'This is ZEC wrapped onto NEAR through the OMFT (omni-chain fungible token) bridge at zec.omft.near, which NEAR Intents uses for cross-chain swaps. The top panel is the wrapped supply; below, mints (ZEC entering NEAR) above zero and burns (ZEC leaving) below.',
      'Wrapped ZEC is not shielded ZEC. A bridged coin is held by the bridge and represented by a token on another chain, with that chain’s transparency and that bridge’s trust assumptions.',
      ROUTE[0],
    ] },
  ],
  related: ['near-flow', 'swap-assets', 'near-vol-mcap', 'supply'],
  load: async () => {
    const end = await through();
    const rows = (await getNearStats()).filter((r) => r.date <= end);
    const dates = rows.map((r) => r.date);
    const ws = rows.map((r) => r.wrapped_supply);
    const i = rows.length - 1;
    const change = changeOver(dates, ws, 28);
    return {
      panels: [
        panel({ title: 'Wrapped ZEC on NEAR', dates, format: 'zec', zeroBaseline: false, height: 260, series: [line('supply', 'Wrapped supply', C.zec, ws, { width: 2.2 })] }),
        panel({ title: 'Mints above zero, burns below', dates, format: 'zec', zeroBaseline: true, height: 200, series: [
          bars('mint', 'Minted (in)', C.s2, rows.map((r) => r.daily_mint)), bars('burn', 'Burned (out)', C.s4, rows.map((r) => -r.daily_burn))] }),
      ],
      headline: { label: 'ZEC wrapped on NEAR', value: `${num(ws[i])} ZEC`, date: dates[i], change,
        sentence: `${num(ws[i])} ZEC sat wrapped on NEAR on ${dateLong(dates[i])}, ${changeWords(change)}.` },
      spark: spark(ws), indexValue: `${compact(ws[i])} ZEC`,
      ranges: ['1M', '3M', 'ALL'], defaultRange: 'ALL', dataThrough: dates[i],
    };
  },
};

const ASSET_COLOR: Record<string, string> = { BTC: C.btc, USD: C.s2, ETH: C.s3, SOL: C.s5, NEAR: C.s1 };
const CHAIN_NAME: Record<string, string> = {
  btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana', tron: 'Tron', arb: 'Arbitrum', near: 'NEAR', bsc: 'BNB Chain', base: 'Base', pol: 'Polygon',
  ltc: 'Litecoin', sui: 'Sui', avax: 'Avalanche', xrp: 'XRP Ledger', hypercore: 'Hyperliquid', doge: 'Dogecoin', starknet: 'Starknet', ton: 'TON',
  aleo: 'Aleo', dash: 'Dash', bch: 'Bitcoin Cash', cardano: 'Cardano', op: 'Optimism', gnosis: 'Gnosis', aptos: 'Aptos',
};
/** The chain's native coin, so a chain grouping keeps the same colour as that coin in the token grouping. */
const CHAIN_SYM: Record<string, string> = { btc: 'BTC', eth: 'ETH', sol: 'SOL', near: 'NEAR' };

/** One way of naming the asset on the far side of a swap — the live chart's three groupings (`swap-grouping`). */
type SwapGran = 'token' | 'chain' | 'raw';
function swapKey(gran: SwapGran, asset: string, chain: string, raw: string): { key: string; label: string; sym: string } | null {
  if (gran === 'chain') return { key: chain, label: CHAIN_NAME[chain] ?? chain, sym: CHAIN_SYM[chain] ?? chain.toUpperCase() };
  if (gran === 'raw') {
    // Contracts that name the same asset on the same chain (two USDC bridges on NEAR) share a row.
    const sym = (asset || chain || '').toUpperCase();
    const label = sym.toLowerCase() !== chain ? `${sym}·${chain}` : sym;
    return { key: label, label, sym };
  }
  const t = token(asset, chain, raw);
  return t === 'other' ? null : { key: t, label: t, sym: t };
}

const swapAssets: ChartDef = {
  slug: 'swap-assets',
  title: 'What ZEC is swapped for on NEAR Intents',
  short: 'Swap assets',
  question: 'Which assets do people swap ZEC into and out of?',
  group: 'markets',
  source: 'external',
  sourceNote: 'NEAR Intents swaps grouped by token (stablecoins as USD), USD at swap time',
  unit: 'USD',
  api: ['near-swaps'],
  explainer: [
    { heading: 'What does the mix say?', paragraphs: [
      'Three switches set the view. **Direction**: ZEC swapped into an asset, an asset swapped into ZEC, or the net of the two. **Window**: columns by month, or one all-time ranking; the all-time net view shows both directions for each asset, with the marker at the net. **Group by**: token, chain, or every distinct asset — token rolls all dollar stablecoins into USD and names NEAR-chain tokens by their underlying asset, chain groups by network, and asset keeps USDT on Tron apart from USDT on Ethereum.',
      'Stablecoin volume is not the same as volume against another coin. A swap into USDC or USDT is usually someone stepping out of crypto; a swap into BTC or ETH is a rotation.',
      ROUTE[0] + ' ' + ROUTE[1],
    ] },
  ],
  related: ['near-flow', 'near-bridge', 'near-vol-mcap', 'exch-vol'],
  load: async () => {
    const end = await through();
    const rows = crossSwaps(await getNearSwaps(), end);
    // Monthly columns: complete months only (a part month reads as a collapse), starting once the route carried real
    // volume — the first months of the export are a trickle (under 2% of the busiest month).
    const mVol = new Map<string, number>();
    for (const r of rows) { const m = `${r.date.slice(0, 7)}-01`; mVol.set(m, (mVol.get(m) ?? 0) + r.volume_usd); }
    const allMonths = [...mVol.keys()].sort().filter((m) => m < `${end.slice(0, 7)}-01` || addDays(end, 1).slice(8) === '01');
    const peakM = Math.max(...allMonths.map((m) => mVol.get(m)!));
    const months = allMonths.slice(Math.max(0, allMonths.findIndex((m) => mVol.get(m)! >= peakM * 0.02)));
    const mi = new Map(months.map((m, i) => [m, i]));

    const group = (gran: SwapGran) => {
      const keys = new Map<string, { label: string; sym: string; out: number; in: number; outM: number[]; inM: number[] }>();
      for (const r of rows) {
        const out = r.from_chain === 'zec';
        const k = out ? swapKey(gran, r.to_asset, r.to_chain, r.to_raw) : swapKey(gran, r.from_asset, r.from_chain, r.from_raw);
        if (!k) continue;
        const e = keys.get(k.key) ?? { label: k.label, sym: k.sym, out: 0, in: 0, outM: months.map(() => 0), inM: months.map(() => 0) };
        const j = mi.get(`${r.date.slice(0, 7)}-01`);
        if (out) { e.out += r.volume_usd; if (j != null) e.outM[j] += r.volume_usd; }
        else { e.in += r.volume_usd; if (j != null) e.inM[j] += r.volume_usd; }
        keys.set(k.key, e);
      }
      const list = [...keys.values()].sort((a, b) => b.out + b.in - (a.out + a.in));
      const round = (v: number) => Math.round(v);
      return {
        labels: list.map((e) => e.label),
        colors: list.map((e) => ASSET_COLOR[e.sym] ?? null),
        out: list.map((e) => round(e.out)), in: list.map((e) => round(e.in)),
        outM: list.map((e) => e.outM.map(round)), inM: list.map((e) => e.inM.map(round)),
      };
    };

    const tok = group('token');
    const totOut = sum(tok.out);
    const order = tok.out.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
    const lead = tok.labels[order[0]], leadPct = ((tok.out[order[0]] / totOut) * 100).toFixed(0);
    return {
      panels: [
        { kind: 'custom', component: 'b-swap-assets', props: { months, through: end, groups: { token: tok, chain: group('chain'), raw: group('raw') } } },
      ],
      headline: { label: 'Top asset ZEC is swapped into', value: lead, date: end, change: null,
        sentence: `${lead} took ${leadPct}% of the ${usdCompact(totOut)} of ZEC swapped out on NEAR Intents through ${dateLong(end)}; ${order.slice(1, 4).map((i) => tok.labels[i]).join(', ')} follow.` },
      indexValue: `${lead} ${leadPct}%`,
      ranges: false, dataThrough: end,
      notes: [`Monthly columns run ${monthYear(months[0])} – ${monthYear(months.at(-1)!)}: earlier months carried under 2% of the busiest month's volume, and the month in progress is left out. The all-time views include everything through ${dateLong(end)}. Swaps with ZEC on both sides are left out.`],
    };
  },
};

const nearVolMcap: ChartDef = {
  slug: 'near-vol-mcap',
  title: 'NEAR Intents swap volume per dollar of market cap',
  short: 'Swap volume / market cap',
  question: 'Is ZEC swapped more heavily, for its size, than other assets?',
  group: 'markets',
  source: 'external',
  sourceNote: 'NEAR Intents swap volume ÷ CoinGecko market cap, 7-day average · stablecoins excluded',
  unit: 'USD swapped per $1M market cap',
  api: ['near-vol-mcap'],
  explainer: [
    { heading: 'How do you read a volume-to-size ratio?', paragraphs: [
      'Each asset’s daily NEAR Intents swap volume (any swap touching it) divided by its market cap, shown as dollars swapped per $1 million of market cap so the numbers are readable. It puts ZEC head to head with far larger assets: a higher line means more intensively swapped for its size.',
      'A ratio moves when either side does. It rises on more swapping and equally on a falling market cap, so check which before reading a spike as demand. The log scale is on because the assets differ by orders of magnitude.',
      ROUTE[0],
    ] },
  ],
  related: ['near-flow', 'swap-assets', 'exch-vol-pct', 'market-cap'],
  load: async () => {
    const end = await through();
    const d = await getNearVolMcap();
    const keep = d.dates.map((t, j) => [t, j] as const).filter(([t]) => t <= end);
    const dates = keep.map(([t]) => t);
    const per = (s: (typeof d.series)[number]) => rolling(keep.map(([, j]) => { const v = s.ratios[j]; return v != null && v > 0 ? v * 1e6 : null; }), 7, 1);
    const all = d.series.map((s) => ({ asset: s.asset.toUpperCase(), values: per(s) }));
    const avg30 = all.map((s) => { const xs = s.values.slice(-30).filter((v): v is number => v != null); return { label: s.asset, value: xs.length ? sum(xs) / xs.length : 0 }; }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const show: [string, string][] = [['ZEC', C.zec], ['BTC', C.btc], ['ETH', C.s3], ['SOL', C.s2]];
    const series = show.map(([a, c]) => line(a.toLowerCase(), a, c, all.find((s) => s.asset === a)?.values ?? dates.map(() => null), { width: a === 'ZEC' ? 2.4 : 1.6 }));
    const z = avg30.find((r) => r.label === 'ZEC')!;
    const next = avg30.find((r) => r.label !== 'ZEC')!;
    const zv = series[0].values, i = lastIndex(zv);
    return {
      panels: [
        { kind: 'custom', title: 'Last 30 days, average', component: 'b-ranked', props: {
          mode: 'single', format: 'usd', unit: 'per $1M of market cap', log: true,
          rows: avg30.map((r) => ({ label: r.label, value: r.value, highlight: r.label === 'ZEC' })),
          ariaLabel: `Average daily swap volume per $1M of market cap over 30 days: ZEC $${z.value.toFixed(0)}, next highest ${next.label} $${next.value.toFixed(1)}.` } },
        panel({ title: 'Daily, 7-day average', dates, format: 'usd', logToggle: true, defaultLog: true, height: 280, series }),
      ],
      headline: { label: 'ZEC swapped per $1M of market cap', value: `$${num(z.value)}`, date: dates[i], change: null,
        sentence: `Each $1M of ZEC market cap saw ${'$' + num(z.value)} a day of NEAR Intents swaps over the last 30 days — ${(z.value / next.value).toFixed(0)}× the next asset, ${next.label} (${'$' + next.value.toFixed(1)}).` },
      spark: spark(zv), indexValue: `$${num(z.value)} / $1M`,
      ranges: ['1M', '3M', '6M', '1Y', 'ALL'], defaultRange: '6M', dataThrough: dates[i],
    };
  },
};

// ─── exchange spot volume ────────────────────────────────────────────────────────────────────────────────
async function weeklyExchange() {
  const d = await getExchangeVolume();
  const rows = d.rows.filter((r) => r.date >= d.complete_from && r.date <= d.complete_to);
  const weeks = new Map<string, { days: number; zec: number; all: number; vals: Record<string, number> }>();
  for (const r of rows) {
    const w = weekStart(r.date);
    const o = weeks.get(w) ?? { days: 0, zec: 0, all: 0, vals: {} };
    o.days++; o.zec += r.zec; o.all += r.all;
    for (const [k, v] of Object.entries(r.vals)) o.vals[k] = (o.vals[k] ?? 0) + v;
    weeks.set(w, o);
  }
  const ws = [...weeks.keys()].sort().filter((w) => weeks.get(w)!.days === 7);
  return { d, rows, ws, weeks };
}
const VENUE = 'Every number here is an exchange describing its own activity. Unlike anything derived from the chain, none of it is verifiable, and the incentive to overstate is well documented — read the shape and the order of magnitude, not a twenty-percent gap between two venues. It is spot trading, not derivatives.';

const exchVol: ChartDef = {
  slug: 'exch-vol',
  title: 'Zcash spot volume by exchange',
  short: 'Volume by exchange',
  question: 'Where does ZEC trade, and how much?',
  group: 'markets',
  source: 'external',
  sourceNote: 'Each venue’s own public candles API, ZEC pairs in USD · complete weeks only',
  unit: 'USD/week',
  api: ['exchange-volume'],
  explainer: [
    { heading: 'Where do these volume numbers come from?', paragraphs: [
      VENUE,
      'The stack is the useful part. Which venues carry Zcash, and how concentrated that is, survives the reporting problem better than the total: an exchange has a reason to overstate its volume and none to invent that it lists ZEC. The four largest venues are named and the rest grouped as other; Share % shows concentration directly.',
      'Only the range where every tracked venue’s history is fully backfilled is drawn, so a venue joining the data set never looks like a jump in volume.',
    ] },
  ],
  related: ['exch-vol-pct', 'hl-volume', 'near-flow', 'price'],
  load: async () => {
    const { d, ws, weeks } = await weeklyExchange();
    const totals = d.exchanges.map((e) => [e, sum(ws.map((w) => weeks.get(w)!.vals[e] ?? 0))] as const).sort((a, b) => b[1] - a[1]);
    const top = totals.slice(0, 4).map(([e]) => e);
    const colors = [C.s2, C.s4, C.s3, C.s5];
    const series: Series[] = top.map((e, k) => bars(e.toLowerCase(), e, colors[k], ws.map((w) => weeks.get(w)!.vals[e] ?? 0), { agg: 'sum' }));
    series.push(bars('other', 'Other venues', C.s6, ws.map((w) => sum(Object.entries(weeks.get(w)!.vals).filter(([e]) => !top.includes(e)).map(([, v]) => v))), { agg: 'sum' }));
    const last = weeks.get(ws.at(-1)!)!;
    const tot = ws.map((w) => weeks.get(w)!.zec);
    const leadShare = ((last.vals[top[0]] ?? 0) / last.zec) * 100;
    return {
      panels: [panel({ dates: ws, format: 'usdCompact', stacked: true, shareToggle: true, series })],
      headline: { label: 'ZEC spot volume, last full week', value: usdCompact(last.zec), date: addDays(ws.at(-1)!, 6), change: changeOver(ws, tot, 28),
        sentence: `${usdCompact(last.zec)} of ZEC traded across ${d.exchanges.length} tracked venues in the week of ${dateLong(ws.at(-1)!)}; ${top[0]} carried ${leadShare.toFixed(0)}%.` },
      spark: spark(tot), indexValue: `${usdCompact(last.zec)}/wk`,
      ranges: ['3M', '6M', 'ALL'], defaultRange: 'ALL', dataThrough: d.complete_to,
      notes: [`Weeks start Monday; complete coverage ${dateLong(d.complete_from)} – ${dateLong(d.complete_to)}.`],
    };
  },
};

const exchVolPct: ChartDef = {
  slug: 'exch-vol-pct',
  title: 'Zcash share of exchange spot volume',
  short: 'Share of market volume',
  question: 'What share of the tracked exchanges’ trading is ZEC?',
  group: 'markets',
  source: 'external',
  sourceNote: 'ZEC volume ÷ all-coin volume on the same venues (CoinGecko) · weekly',
  unit: '% of volume',
  api: ['exchange-volume'],
  explainer: [
    { heading: 'What moves the share?', paragraphs: [
      'ZEC spot volume as a percentage of all trading on the same seven venues — how much of the market’s activity Zcash represents. The thick line is each complete week; the thin line is the daily figure.',
      'A ratio moves when either side does. Zcash’s share can rise because ZEC volume grew or because the rest of the market shrank, and on a broad risk-off day the second is more likely. Check it against volume by exchange before reading a rise as interest in Zcash.',
      VENUE,
    ] },
  ],
  related: ['exch-vol', 'near-vol-mcap', 'hl-volume', 'price'],
  load: async () => {
    const { d, rows, ws, weeks } = await weeklyExchange();
    const dates = rows.map((r) => r.date);
    const daily = rows.map((r) => r.pct);
    const lastW = ws.at(-1)!, lw = weeks.get(lastW)!;
    const share = (lw.zec / lw.all) * 100;
    const wkSeries = ws.map((w) => (weeks.get(w)!.zec / weeks.get(w)!.all) * 100);
    const peak = Math.max(...wkSeries), peakW = ws[wkSeries.indexOf(peak)];
    // weekly points are sparse on a daily axis: carry each week's value across its days so the line is continuous
    const filled = dates.map((t) => { const w = weeks.get(weekStart(t)); return w && w.days === 7 ? (w.zec / w.all) * 100 : null; });
    return {
      panels: [panel({ dates, format: 'pct2', zeroBaseline: true, step: true, series: [
        line('daily', 'Daily', tint(C.zec, 45), daily, { width: 1.1 }), line('weekly', 'Weekly', C.zec, filled, { width: 2.2 })] })],
      headline: { label: 'ZEC share of spot volume', value: `${share.toFixed(2)}%`, date: addDays(lastW, 6), change: changeOver(ws, wkSeries, 28),
        sentence: `ZEC was ${share.toFixed(2)}% of all spot trading on the tracked venues in the week of ${dateLong(lastW)}, against a peak of ${peak.toFixed(2)}% in the week of ${dateLong(peakW)}.` },
      spark: spark(wkSeries), indexValue: `${share.toFixed(2)}%`,
      ranges: ['3M', '6M', 'ALL'], defaultRange: 'ALL', dataThrough: d.complete_to,
      notes: ['The axis starts at zero but is not fixed at 100%: ZEC is a low single-digit share, which a 0–100% frame would flatten.'],
    };
  },
};

// ─── Hyperliquid perps ───────────────────────────────────────────────────────────────────────────────────
async function hl(zk: keyof HlDay) {
  const end = await through();
  const all = (await getHyperliquid()).filter((r) => r.date <= end);
  const first = all.findIndex((r) => r[zk] != null);
  return all.slice(Math.max(0, first));
}
const num7 = (rows: HlDay[], k: keyof HlDay) => rolling(rows.map((r) => (r[k] as number | null) ?? null), 7, 1);
const PERP = [
  'Nothing here happens on the Zcash chain. No coin moves and no pool balance changes; a perpetual swap is a claim about price, settled on another system entirely.',
  'One venue, not the market. Hyperliquid is used because it publishes this data; other venues are larger and are not in these lines. Read levels as “on this exchange” and trends as the part that generalises.',
];

const hlFunding: ChartDef = {
  slug: 'hl-funding',
  title: 'Perp funding rate: ZEC vs BTC on Hyperliquid',
  short: 'Perp funding rate',
  question: 'Are traders paying to be long ZEC — and how does that compare with BTC?',
  group: 'markets',
  source: 'external',
  sourceNote: 'Hourly funding × 8,760, averaged per day, 7-day average · Hyperliquid fundingHistory',
  unit: '% a year',
  api: ['hyperliquid'],
  explainer: [
    { heading: 'What does the funding rate tell you?', paragraphs: [
      'Perpetual swaps have no expiry, so nothing forces their price back to spot. Funding does it: every hour the crowded side pays the other. The figure is that payment annualised, so it compares with any other yield. Positive means longs pay shorts — the market leans long; negative means shorts pay longs, the rarer and more interesting state.',
      'The level matters as much as the sign. A few percent either way is ordinary; sustained double digits means leverage is stacked on one side, the condition a liquidation cascade needs. Funding tells you positioning, not direction.',
      'ZEC is plotted against BTC because the absolute number means little alone: Bitcoin is the market’s baseline cost of leverage, and the gap — the lower panel — is the part specific to Zcash. ZEC history starts at its Hyperliquid listing. ' + PERP[1],
    ] },
  ],
  related: ['hl-oi', 'hl-volume', 'price', 'zec-btc-ratio'],
  load: async () => {
    const rows = await hl('zec_funding_apr');
    const dates = rows.map((r) => r.date);
    const z = num7(rows, 'zec_funding_apr'), b = num7(rows, 'btc_funding_apr');
    const spread = z.map((v, j) => (v != null && b[j] != null ? v - b[j]! : null));
    const i = lastIndex(z);
    return {
      panels: [
        panel({ title: 'Funding, % a year (7-day average)', dates, format: 'pct', zeroBaseline: true, height: 280, series: [
          line('zec', 'ZEC', C.zec, z, { width: 2.2 }), line('btc', 'BTC', C.btc, b, { width: 1.7 })] }),
        panel({ title: 'ZEC minus BTC', dates, format: 'pct', zeroBaseline: true, height: 180, series: [bars('spread', 'Spread', C.s2, spread)] }),
      ],
      headline: { label: 'ZEC perp funding', value: `${z[i]!.toFixed(1)}%/yr`, date: dates[i], change: null,
        sentence: `ZEC longs paid **${z[i]!.toFixed(1)}% a year** on a 7-day average to ${dateLong(dates[i])}, against ${b[i]!.toFixed(1)}% for BTC — a spread of ${spread[i]! >= 0 ? '+' : '−'}${Math.abs(spread[i]!).toFixed(1)} points.` },
      spark: spark(z), indexValue: `${z[i]!.toFixed(1)}%/yr`,
      ranges: ['1M', '3M', '6M', 'ALL'], defaultRange: 'ALL', dataThrough: dates[i],
    };
  },
};

function perpDual(o: { slug: string; title: string; short: string; question: string; zk: keyof HlDay; bk: keyof HlDay; noun: string; sourceNote: string; related: string[]; explainer: ChartDef['explainer'] }): ChartDef {
  return {
    slug: o.slug, title: o.title, short: o.short, question: o.question, group: 'markets', source: 'external', sourceNote: o.sourceNote,
    unit: 'USD', api: ['hyperliquid'], explainer: o.explainer, related: o.related,
    load: async () => {
      const rows = await hl(o.zk);
      const dates = rows.map((r) => r.date);
      const z = num7(rows, o.zk), b = num7(rows, o.bk);
      const ratio = z.map((v, j) => (v != null && b[j] ? (v / b[j]!) * 100 : null));
      const i = lastIndex(z);
      const change = changeOver(dates, z, 28);
      return {
        panels: [
          panel({ title: `${o.noun}, USD (7-day average)`, dates, format: 'usdCompact', logToggle: true, defaultLog: true, height: 280, series: [
            line('zec', 'ZEC', C.zec, z, { width: 2.2 }), line('btc', 'BTC', C.btc, b, { width: 1.7 })] }),
          panel({ title: 'ZEC as a share of BTC', dates, format: 'pct', zeroBaseline: true, height: 180, series: [line('ratio', 'ZEC ÷ BTC', C.s2, ratio, { width: 2 })] }),
        ],
        headline: { label: `ZEC perp ${o.noun.toLowerCase()}`, value: usdCompact(z[i]!), date: dates[i], change,
          sentence: `ZEC ${o.noun.toLowerCase()} on Hyperliquid averaged ${usdCompact(z[i]!)} over the week to ${dateLong(dates[i])}, ${changeWords(change)} — ${ratio[i]!.toFixed(1)}% of BTC’s ${usdCompact(b[i]!)}.` },
        spark: spark(z), indexValue: usdCompact(z[i]!),
        ranges: ['1M', '3M', 'ALL'], defaultRange: 'ALL', dataThrough: dates[i],
        notes: [`Collected since ${dateLong(dates[0])}, when this data started being snapshotted; there is no earlier history.`],
      };
    },
  };
}

const hlVolume = perpDual({
  slug: 'hl-volume', title: 'Perp volume: ZEC vs BTC on Hyperliquid', short: 'Perp volume', question: 'How much ZEC perp trading is there next to BTC?',
  zk: 'zec_volume_usd', bk: 'btc_volume_usd', noun: 'Volume', sourceNote: 'Trailing 24-hour notional volume, daily snapshot, 7-day average · Hyperliquid metaAndAssetCtxs',
  related: ['hl-oi', 'hl-funding', 'exch-vol', 'volume-issuance'],
  explainer: [{ heading: 'Are you buying Zcash or a bet on it?', paragraphs: [
    'This is trailing 24-hour notional volume on Hyperliquid’s ZEC and BTC perpetual-swap markets. ' + PERP[0],
    'Both lines share one logarithmic axis, so a constant vertical gap is a constant ratio; the lower panel spells that ratio out. Notional is leveraged — a dollar of margin can move many dollars of notional — so compare with spot volume by exchange before treating either as interest in the asset.',
    PERP[1],
  ] }],
});

const hlOi = perpDual({
  slug: 'hl-oi', title: 'Perp open interest: ZEC vs BTC on Hyperliquid', short: 'Perp open interest', question: 'How much leverage is open on ZEC compared with BTC?',
  zk: 'zec_oi_usd', bk: 'btc_oi_usd', noun: 'Open interest', sourceNote: 'Open interest × mark price, daily snapshot, 7-day average · Hyperliquid metaAndAssetCtxs',
  related: ['hl-volume', 'hl-funding', 'market-cap', 'exch-vol'],
  explainer: [{ heading: 'What does open interest measure?', paragraphs: [
    'Open interest is the notional value of positions currently open on Hyperliquid’s ZEC and BTC perpetual-swap markets. Rising means new leverage is entering; falling means positions are closing or being liquidated. ' + PERP[0],
    'It is a stock, not a flow: it says how much is at risk now, not how much traded, and it falls when positions close whether at a profit or a loss. Both lines share one log axis, and the lower panel shows ZEC as a share of BTC.',
    PERP[1],
  ] }],
});

export const marketsCharts: ChartDef[] = [nearFlow, nearBridge, swapAssets, nearVolMcap, exchVol, exchVolPct, hlFunding, hlVolume, hlOi];
