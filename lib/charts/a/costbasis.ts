import 'server-only';
import { dateLong } from '@/lib/format';
import type { ChartDef } from '../types';
import { api } from '@/lib/data/core';
import { POOL_COLOR, POOL_LABEL, POOLS, type Pool } from '@/lib/data/snapshot';
import { NU_EVENTS, byDate, changePct, changeWords, completeDaily, completePrices, dataThrough, fmt, headline, lastIdx, spark } from './common';

type Realized = { date: string; supply: number; realized_cap: number; realized_price: number; spot_price: number; market_cap: number; mvrv: number } & Record<`rp_${Pool}`, number>;

const realizedRows = async () => {
  const [all, through] = await Promise.all([api<Realized[]>('realized'), dataThrough()]);
  return all.filter((r) => r.date <= through);
};

const FLOOR = {
  heading: 'What does realized price mean on a shielded chain?',
  paragraphs: [
    'Realized price asks what the average coin last cost, rather than what it is worth now. Bitcoin can answer that exactly, because every unspent coin carries the date it last moved. **On Zcash most ZEC sits in shielded pools, and a payment inside a pool is invisible by design.**',
    'So the only movement this chain can price is a **pool crossing** — value entering or leaving a shielded pool through the transparent turnstile, which consensus counts exactly. Realized price here is the price at which the average ZEC **last crossed a pool boundary**.',
    '**That makes it a floor on turnover, never an overstatement.** Coins have changed hands more often than this metric can see, so the cost basis it reports is older — and in a bull market lower — than the truth. Read the gap between spot and realized as “at least this much unrealised gain”.',
  ],
};
const METHOD = {
  heading: 'Methodology',
  paragraphs: [
    'Each pool carries its own running cost basis: coins acquire at the close on the day they entered, and leave at the pool’s running average. The chain-wide number is **Σ cost of every pool ÷ consensus supply** — supply-weighted, not the mean of the five pools’ prices, because the pools differ in size by three orders of magnitude.',
    'A migration between pools re-prices the coins that moved, which is why the 2026 Orchard → Ironwood turnstile lifts the line: protocol activity, not holders selling.',
    'MVRV = spot ÷ realized price. 1.0× is break-even arithmetic, not a signal; thresholds quoted for Bitcoin were fitted to Bitcoin’s history.',
  ],
};
const breakEven = (n: number) => ({ key: 'be', label: '1.0× break-even', color: 'var(--text-2)', values: new Array(n).fill(1), type: 'line' as const, dashed: true, width: 1.2 });

/* ------------------------------------------------------------- realized-all */
export const realizedAll: ChartDef = {
  slug: 'realized-all',
  title: 'Realized price — all pools combined',
  short: 'Realized price — all pools combined',
  question: 'What did the average ZEC last cost, against today’s price?',
  group: 'costbasis',
  source: 'price',
  sourceNote: 'Pool-crossing cost basis (our node) × daily closes',
  unit: 'US dollars per ZEC; MVRV as a multiple',
  api: ['realized'],
  related: ['mvrv', 'realized', 'cost-basis', 'price'],
  explainer: [FLOOR, METHOD],
  async load() {
    const rows = await realizedRows();
    const dates = rows.map((r) => r.date);
    const rp = rows.map((r) => r.realized_price);
    const i = lastIdx(rp);
    const last = rows[i];
    const v = fmt(last.realized_price, 'usd');
    return {
      panels: [
        { kind: 'timeseries', title: 'Spot vs realized price', dates, format: 'usd', logToggle: true, height: 320, series: [
          { key: 'rp', label: 'Realized price', color: 'var(--s2)', values: rp, type: 'line', width: 2.2 },
          { key: 'spot', label: 'Spot', color: 'var(--zec)', values: rows.map((r) => r.spot_price), type: 'line', width: 1.5 },
        ] },
        { kind: 'timeseries', title: 'MVRV (spot ÷ realized)', dates, format: 'x', height: 200, zeroBaseline: true, series: [
          { key: 'mvrv', label: 'MVRV', color: 'var(--s3)', values: rows.map((r) => r.mvrv), type: 'line', width: 2 }, breakEven(rows.length),
        ] },
      ],
      headline: headline('Realized price', v, last.date, `The average ZEC last crossed a pool boundary at **${v}**; spot at ${fmt(last.spot_price, 'usd')} is **${last.mvrv.toFixed(2)}×** that (${dateLong(last.date)}).`, changePct(rp, 28)),
      spark: spark(rp),
      indexValue: v,
      defaultRange: '1Y',
      events: NU_EVENTS.filter((e) => e.date >= '2022-01-01'),
      dataThrough: last.date,
    };
  },
};

/* --------------------------------------------------------------------- mvrv */
export const mvrv: ChartDef = {
  slug: 'mvrv',
  title: 'MVRV: price vs cost basis',
  short: 'MVRV: price vs cost basis',
  question: 'Is the average coin in profit?',
  group: 'costbasis',
  source: 'price',
  sourceNote: 'Spot ÷ realized price · pool-crossing cost basis',
  unit: 'multiple (×)',
  api: ['realized'],
  related: ['realized-all', 'realized', 'pool-profit', 'price'],
  explainer: [
    {
      heading: 'Is the average coin in profit?',
      paragraphs: [
        '**MVRV** stands for market value to realized value. It divides today’s price by the realized price — what the average ZEC last cost when it changed hands. Above 1.0× the average coin is worth more than it cost; below it, the average holder is underwater.',
        '**It is a ratio, so it has no units.** That is why it has its own page: a multiple can sit beside a price or a count on Compare without rescaling anything.',
        '**Read it as a floor, not a reading.** On a shielded chain the only movement that can be priced is a pool crossing, so the cost basis underneath is older than the truth — which makes MVRV higher than the truth in a bull market. The direction of the error is known; the size is not.',
      ],
    },
    METHOD,
  ],
  async load() {
    const rows = await realizedRows();
    const dates = rows.map((r) => r.date);
    const m = rows.map((r) => r.mvrv);
    const i = lastIdx(m);
    const ch = changePct(m, 28);
    const v = `${m[i]!.toFixed(2)}×`;
    return {
      panels: [{ kind: 'timeseries', dates, format: 'x', logToggle: true, zeroBaseline: true, series: [{ key: 'mvrv', label: 'MVRV', color: 'var(--s3)', values: m, type: 'line', width: 2 }, breakEven(rows.length)] }],
      headline: headline('MVRV', v, dates[i], `Spot is **${v}** the average coin’s cost basis on ${dateLong(dates[i])} — the average coin is ${m[i]! >= 1 ? 'in profit' : 'underwater'}${ch == null ? '' : `; the ratio is ${changeWords(ch).replace(/\*\*/g, '')}`}.`, ch),
      spark: spark(m),
      indexValue: v,
      defaultRange: '5Y',
      dataThrough: dates[i],
    };
  },
};

/* ----------------------------------------------------------------- realized */
export const realized: ChartDef = {
  slug: 'realized',
  title: 'Realized price & realized cap',
  short: 'Realized price & realized cap',
  question: 'What did each pool pay for its coins, and how much capital sits in them?',
  group: 'costbasis',
  source: 'price',
  sourceNote: 'Pool-crossing cost basis (our node) × daily closes',
  unit: 'US dollars',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['realized'],
  related: ['realized-all', 'cost-basis', 'pool-profit', 'market-cap'],
  explainer: [
    {
      heading: 'What did each pool pay for its coins?',
      paragraphs: [
        'This is realized price decomposed: instead of one chain-wide number, each pool’s own cost basis, with the combined figure on top. Everything true of the combined figure is true here — on a shielded chain “last changed hands” can only mean **last crossed a pool boundary**, so this is a floor on turnover.',
        '**Realized cap is not market cap.** It values every coin at what it last cost instead of at today’s price, which is why it moves smoothly through a crash: nothing repriced, the coins simply did not move. The gap between the two lines is the unrealised position of the whole supply.',
        '**Only the transparent pool’s basis is exact.** The shielded pools use a deposit model, because individual notes are private; transparent→transparent moves are not re-priced, so transparent skews toward older mining-era prices.',
      ],
    },
    METHOD,
  ],
  async load() {
    const rows = await realizedRows();
    const dates = rows.map((r) => r.date);
    const last = rows[rows.length - 1];
    const pr = (k: Pool) => rows.map((r) => (r[`rp_${k}`] > 0 ? r[`rp_${k}`] : null));
    return {
      panels: [
        { kind: 'timeseries', title: 'Realized price, overall and by pool', dates, format: 'usd', logToggle: true, height: 340, series: [
          { key: 'rp', label: 'Realized (all pools)', color: 'var(--value)', values: rows.map((r) => r.realized_price), type: 'line', width: 2.4 },
          ...POOLS.map((k) => ({ key: k, label: POOL_LABEL[k], color: POOL_COLOR[k], values: pr(k), type: 'line' as const, width: 1.3, hidden: k === 'sprout' })),
          { key: 'spot', label: 'Spot', color: 'var(--text-2)', values: rows.map((r) => r.spot_price), type: 'line', dashed: true, width: 1.2 },
        ] },
        { kind: 'timeseries', title: 'Realized cap vs market cap', dates, format: 'usdCompact', height: 220, series: [
          { key: 'rc', label: 'Realized cap', color: 'var(--s2)', values: rows.map((r) => r.realized_cap), type: 'line', width: 2 },
          { key: 'mc', label: 'Market cap', color: 'var(--zec)', values: rows.map((r) => r.market_cap), type: 'line', width: 1.4 },
        ] },
      ],
      headline: headline('Realized cap', fmt(last.realized_cap, 'usdCompact'), last.date, `The supply last moved at a combined **${fmt(last.realized_cap, 'usdCompact')}** (realized cap) against a market cap of ${fmt(last.market_cap, 'usdCompact')}; Ironwood’s coins cost the most, **${fmt(last.rp_ironwood, 'usd0')}** each on average (${dateLong(last.date)}).`),
      spark: spark(rows.map((r) => r.realized_cap)),
      indexValue: '5 pools + MVRV',
      defaultRange: '1Y',
      dataThrough: last.date,
    };
  },
};

/* --------------------------------------------------------------- cost-basis */
type CB = { date: string; pool: Pool; avg_acquisition_price: number; pool_balance_zec: number };
export const costBasis: ChartDef = {
  slug: 'cost-basis',
  title: 'Pool acquisition price',
  short: 'Pool acquisition price',
  question: 'What did the coins in each pool cost to move there, against spot?',
  group: 'costbasis',
  source: 'price',
  sourceNote: 'Volume-weighted entry price per pool · our node × daily closes',
  unit: 'US dollars per ZEC',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['pool-cost-basis', 'daily-prices'],
  related: ['realized', 'pool-profit', 'realized-all', 'pools'],
  explainer: [
    {
      heading: 'What does a pool’s acquisition price say?',
      paragraphs: [
        'When ZEC crosses into a pool it is priced at that day’s close, and each pool carries the **volume-weighted average** of everything that entered it. Shield 100 ZEC into Sapling at $50 and Sapling’s basis moves toward $50. A pool below spot is, on average, held above cost.',
        '**Outflows do not reprice.** Value leaving reduces the balance and leaves the average where it was, because a shielded pool does not expose which coins left. So the basis is the average of what went in, not of what is still there.',
        '**Transparent is not a cohort.** It holds mining rewards priced on the day they were mined alongside everything ever deshielded, so its basis blends two unrelated populations and is the most easily over-read line here.',
      ],
    },
    { heading: 'Ironwood is reconstructed', paragraphs: ['Ironwood has no per-pool flow columns yet, so its basis is built from per-transaction migration attribution, each inflow priced at its migration day — a different provenance from the other pools, worth knowing before comparing them closely.'] },
  ],
  async load() {
    const [cb, prices, through] = await Promise.all([api<CB[]>('pool-cost-basis'), completePrices(), dataThrough()]);
    const dates = prices.map((p) => p.date);
    const idx = new Map(dates.map((d, i) => [d, i]));
    const per: Record<Pool, (number | null)[]> = Object.fromEntries(POOLS.map((k) => [k, new Array(dates.length).fill(null)])) as Record<Pool, (number | null)[]>;
    const latest: Partial<Record<Pool, CB>> = {};
    for (const r of cb) {
      if (r.date > through) continue;
      const i = idx.get(r.date);
      if (i != null && r.avg_acquisition_price > 0 && r.pool_balance_zec > 0) per[r.pool][i] = r.avg_acquisition_price;
      if (r.pool_balance_zec > 0 && (!latest[r.pool] || latest[r.pool]!.date <= r.date)) latest[r.pool] = r;
    }
    const spot = prices.map((p) => p.zec_usd);
    const spotNow = spot[spot.length - 1];
    const below = POOLS.filter((k) => latest[k] && latest[k]!.avg_acquisition_price < spotNow).length;
    return {
      panels: [
        { kind: 'timeseries', dates, format: 'usd', logToggle: true, series: [
          { key: 'spot', label: 'Spot', color: 'var(--text-2)', values: spot, type: 'line', dashed: true, width: 1.2 },
          ...POOLS.map((k) => ({ key: k, label: POOL_LABEL[k], color: POOL_COLOR[k], values: per[k], type: 'line' as const, width: 1.8 })),
        ] },
        { kind: 'custom', title: 'Where does each pool’s basis sit against spot today?', component: 'a-dotplot', props: {
          rows: POOLS.map((k) => ({ label: POOL_LABEL[k], color: POOL_COLOR[k], value: latest[k]?.avg_acquisition_price ?? null, note: latest[k] ? `${(spotNow / latest[k]!.avg_acquisition_price).toFixed(1)}×` : undefined })),
          reference: { label: 'spot', value: spotNow }, format: 'usd', log: true,
          caption: `Acquisition price per pool on ${dateLong(through)}; the multiple is spot ÷ basis.`,
          ariaLabel: `Average acquisition price of each pool against the spot price of ${fmt(spotNow, 'usd')}.`,
        } },
      ],
      headline: headline('Pools below spot', `${below} of 5`, through, `**${below} of 5 pools** hold coins that cost less than today’s ${fmt(spotNow, 'usd0')} to move in; Ironwood’s basis is the highest at **${fmt(latest.ironwood?.avg_acquisition_price, 'usd0')}** (${dateLong(through)}).`),
      spark: spark(per.orchard),
      indexValue: '5 pools vs spot',
      defaultRange: '1Y',
      dataThrough: through,
    };
  },
};

/* -------------------------------------------------------------- pool-profit */
type Pnl = { pools: { pool: string; exact: boolean; mvrv: number; pct_in_profit: number; realized_price: number; zec: number; histogram: { cost: number; in_profit: boolean; zec: number }[] }[]; price_now: number };
export const poolProfit: ChartDef = {
  slug: 'pool-profit',
  title: 'Cost basis & % in profit by pool',
  short: 'Cost basis & % in profit by pool',
  question: 'How much of each pool was acquired below today’s price?',
  group: 'costbasis',
  source: 'price',
  sourceNote: 'UTXO cost basis (transparent) · deposit model (shielded) · our node',
  unit: 'ZEC by cost-basis bucket (log price axis)',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['pool-pnl'],
  related: ['cost-basis', 'mvrv', 'realized', 'utxo-age'],
  explainer: [
    {
      heading: 'What does in profit mean here?',
      paragraphs: [
        'For each pool: the share of its coins whose **cost basis** — the price when they entered that pool — sits below today’s price. Blue bars left of the dashed line are in profit; orange bars right of it are under water.',
        '**Only the transparent pool is exact.** Every transparent output carries a visible creation height, so its basis is a fact. Shielded notes are private, so each day’s inflow is recorded at that day’s price and deshielding is removed proportionally: those panels report the share of **deposits** in profit, an estimate of a population, not anyone’s position.',
        '**It is not anyone’s P&L.** A coin that entered Orchard below today’s price may have been bought far higher, mined or received as payment — a pool crossing is not a purchase.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Ironwood has no per-pool flow columns, so its deposits are reconstructed from per-transaction migration attribution. The deposit model tracks its own balances, so the ZEC totals here can differ from the consensus pool balances on Shielded pool balances.'] },
  ],
  async load() {
    const [d, through] = await Promise.all([api<Pnl>('pool-pnl'), dataThrough()]);
    const order = POOLS.map((k) => d.pools.find((p) => p.pool.toLowerCase() === k)).filter((p): p is Pnl['pools'][number] => !!p);
    const pools = order.map((p) => ({ pool: p.pool, color: POOL_COLOR[p.pool.toLowerCase() as Pool], exact: p.exact, zec: p.zec, realized: p.realized_price, mvrv: p.mvrv, pctProfit: p.pct_in_profit, hist: p.histogram.map((b) => ({ cost: b.cost, zec: b.zec, profit: b.in_profit })) }));
    const t = order.find((p) => p.pool === 'Transparent');
    const iw = order.find((p) => p.pool === 'Ironwood');
    return {
      panels: [{ kind: 'custom', component: 'a-pool-profit', props: { pools, priceNow: d.price_now } }],
      headline: headline('Transparent ZEC in profit', `${t?.pct_in_profit.toFixed(0)}%`, through, `**${t?.pct_in_profit.toFixed(0)}% of transparent ZEC** was acquired below today’s ${fmt(d.price_now, 'usd0')}; in Ironwood, **${iw?.pct_in_profit.toFixed(0)}%** of deposits are in profit.`),
      indexValue: '5 histograms',
      ranges: false,
      dataThrough: through,
      notes: [`Price line: ${fmt(d.price_now, 'usd')} (latest snapshot price). Transparent is exact; shielded pools use the deposit model.`],
    };
  },
};

/* ----------------------------------------------------------------- pool-usd */
export const poolUsd: ChartDef = {
  slug: 'pool-usd',
  title: 'Pool values (USD)',
  short: 'Pool values (USD)',
  question: 'What is the ZEC in each pool worth in dollars?',
  group: 'costbasis',
  source: 'price',
  sourceNote: 'Pool balances (our node) × daily close',
  unit: 'US dollars (or share with “Share %”)',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['daily-stats', 'daily-prices'],
  related: ['pools', 'market-cap', 'shielding-rate', 'realized'],
  explainer: [
    {
      heading: 'What moves this line?',
      paragraphs: [
        'Pool balance × that day’s ZEC price. So a pool’s dollar value falls on a price drop even if not one coin left it, and rises on a rally while the pool empties. **Check the ZEC balances before concluding anything about behaviour** — that chart answers “did value move”; this one answers “what is it worth”.',
        '**Price is the one input here we do not compute ourselves.** Balances come from the node and are exact; the price is an external observation, so every dollar figure inherits it.',
        'The stack adds up to market cap, less the small dev-fund lockbox, which sits outside the five pools.',
      ],
    },
  ],
  async load() {
    const [daily, prices] = await Promise.all([completeDaily(), completePrices()]);
    const pm = byDate(prices);
    const rows = daily.filter((d) => pm.has(d.date));
    const dates = rows.map((d) => d.date);
    const z = (k: Pool, r: (typeof rows)[number]) => (r[`end_${k}_zat` as const] / 1e8) * pm.get(r.date)!.zec_usd;
    const shieldedUsd = rows.map((r) => z('sprout', r) + z('sapling', r) + z('orchard', r) + z('ironwood', r));
    const total = rows.map((r) => POOLS.reduce((a, k) => a + z(k, r), 0));
    const i = rows.length - 1;
    const v = fmt(shieldedUsd[i], 'usdCompact');
    return {
      panels: [{ kind: 'timeseries', dates, format: 'usdCompact', stacked: true, shareToggle: true, series: POOLS.map((k) => ({ key: k, label: POOL_LABEL[k], color: POOL_COLOR[k], values: rows.map((r) => { const x = z(k, r); return x > 0 ? x : null; }), type: 'area' as const })) }],
      headline: headline('Shielded value', v, dates[i], `Shielded ZEC was worth **${v}** at the ${dateLong(dates[i])} close — ${((shieldedUsd[i] / total[i]) * 100).toFixed(1)}% of the **${fmt(total[i], 'usdCompact')}** held across all pools.`, changePct(shieldedUsd, 28)),
      spark: spark(total),
      indexValue: fmt(total[i], 'usdCompact'),
      defaultRange: '1Y',
      dataThrough: dates[i],
    };
  },
};
