import 'server-only';
import type { ChartDef, ChartData } from '../types';
import { api } from '@/lib/data/core';
import type { ValueFormat } from '@/components/charts/valueFormat';
import type { XYChartProps, YFormat } from '@/components/charts/custom/a/XYChart';
import { NU_EVENTS, byDate, changePct, changeWords, completeDaily, completePrices, dataThrough, fmt, headline, lastIdx, sma, spark, wma } from './common';
import { dateLong, num } from '@/lib/format';

const ISSUANCE_X = {
  heading: 'What is the x-axis?',
  paragraphs: [
    'This plots the measure against **coins issued** rather than the date. At the same calendar moment Bitcoin is sixteen years into its emission schedule and Zcash ten, so a date axis would compare two different stages of maturity.',
    '**Both chains cap at 21M**, which is the only reason this alignment means anything. At any x, both had mined the same fraction of their total supply; the chart asks what each looked like at that point in its own life.',
    '**So nothing here is a statement about today.** Two points at the same x are years apart on the calendar: the right-hand end of the Zcash line is the present, while the same x on the Bitcoin line is somewhere in its past. Hover to see both dates.',
  ],
};

/* ------------------------------------------------------------------ price */
export const price: ChartDef = {
  slug: 'price',
  title: 'Zcash price (ZEC/USD)',
  short: 'ZEC price (USD)',
  question: 'What is one ZEC worth in US dollars?',
  group: 'price',
  source: 'external',
  sourceNote: 'Daily close · Coin Metrics + CoinGecko',
  unit: 'US dollars per ZEC',
  api: ['daily-prices'],
  related: ['realized-all', 'mvrv', 'zec-btc-ratio', 'market-cap'],
  explainer: [
    {
      heading: 'Where does this price come from?',
      paragraphs: [
        'This is a **daily close in US dollars** — one number per day, not a live tick. History comes from Coin Metrics. Today’s number comes from CoinGecko, or from Coinbase or Kraken when CoinGecko does not answer (it stopped answering this server for five hours on 29 Sep 2026).',
        'Coin Metrics and CoinGecko build a **volume-weighted composite** across venues rather than quoting one order book, so it will not match the last trade you saw on one exchange. A composite is the right input for a chart that spans years.',
        '**Price is the one number we do not compute ourselves.** Supply, fees, pool balances and flows come from a full node and are exact because consensus makes them exact. Every chart that multiplies by price — market cap and the valuation series — inherits an external input, which is why those are labelled estimates and supply is not.',
        '**The moving averages are weekly.** The 50- and 200-week averages are the long-cycle version of the familiar 50/200-day pair: slow on purpose, there to show where multi-year support has sat. A cross means the last four years disagreed with the last year; it does not predict tomorrow.',
      ],
    },
    {
      heading: 'Methodology',
      paragraphs: [
        'The partial current day is never plotted, so the chart, the headline and the range statistics all end on the same date.',
        'The moving averages are linearly weighted over 350 and 1,400 daily closes (50 and 200 weeks), so they start in late 2017 and mid-2020.',
        'The first print in Oct 2016 ($19,077) dwarfs everything after it on a linear axis — switch to Log for 5Y and ALL.',
        'For price against what the average coin actually cost, see realized price: the gap between the two is what most of the valuation charts are built on.',
      ],
    },
  ],
  async load() {
    const rows = await completePrices();
    const dates = rows.map((r) => r.date);
    const close = rows.map((r) => r.zec_usd);
    const i = lastIdx(close);
    const ch = changePct(close, 28);
    const v = fmt(close[i], 'usd0');
    return {
      panels: [{
        kind: 'timeseries', dates, format: 'usd', logToggle: true, height: 380,
        series: [
          { key: 'close', label: 'ZEC/USD close', color: 'var(--zec)', values: close, type: 'line', width: 2 },
          { key: 'ma50', label: '50-week MA', color: 'var(--s2)', values: wma(close, 350), type: 'line', width: 1.6 },
          { key: 'ma200', label: '200-week MA', color: 'var(--text-2)', values: wma(close, 1400), type: 'line', dashed: true, width: 1.5 },
        ],
      }],
      headline: headline('ZEC close', v, dates[i], `ZEC closed at **${v}** on ${dateLong(dates[i])}${ch == null ? '' : ` — ${changeWords(ch)}`}.`, ch),
      spark: spark(close),
      indexValue: fmt(close[i], 'usd'),
      defaultRange: '1Y',
      events: NU_EVENTS,
      dataThrough: await dataThrough(),
    };
  },
};

/* ------------------------------------------------------------- market cap */
export const marketCap: ChartDef = {
  slug: 'market-cap',
  title: 'Zcash market cap (USD)',
  short: 'Market cap (USD)',
  question: 'What are all the ZEC mined so far worth in dollars?',
  group: 'price',
  source: 'price',
  sourceNote: 'Consensus supply (our Zebra node) × daily close',
  unit: 'US dollars',
  api: ['daily-stats', 'daily-prices'],
  related: ['price', 'fdv-vs-btc', 'realized-all', 'supply'],
  explainer: [
    {
      heading: 'What does this market cap count?',
      paragraphs: [
        'Circulating supply × daily price — where **circulating supply is the node’s consensus chainSupply**, the ZEC actually mined to date, read from a full node rather than taken from a listing. Aggregators differ on this figure; consensus does not.',
        '**It is not fully diluted.** Roughly 4 million ZEC have yet to be emitted and are not in this number. For the version that prices all 21M coins, see fully diluted value.',
        '**It is a scale, not a valuation.** Market cap multiplies every coin by the marginal price, including coins whose keys are lost and coins that have not moved since 2017. For the version that prices each coin at what it last cost, see realized cap.',
        '**It moves for two reasons at once.** Supply grows every block, so the line drifts up even on a flat price. When market cap and price disagree about a period, the difference is issuance.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Each complete UTC day: end-of-day consensus supply from our node × that day’s ZEC/USD close. Days without a price are left out rather than drawn as zero.'] },
  ],
  async load() {
    const [daily, prices] = await Promise.all([completeDaily(), completePrices()]);
    const pm = byDate(prices);
    const rows = daily.filter((d) => pm.has(d.date));
    const dates = rows.map((d) => d.date);
    const mcap = rows.map((d) => (d.end_supply_zat / 1e8) * pm.get(d.date)!.zec_usd);
    const i = lastIdx(mcap);
    const ch = changePct(mcap, 28);
    const v = fmt(mcap[i], 'usdCompact');
    return {
      panels: [{ kind: 'timeseries', dates, format: 'usdCompact', logToggle: true, series: [{ key: 'mcap', label: 'Market cap', color: 'var(--zec)', values: mcap, type: 'area' }] }],
      headline: headline('Market cap', v, dates[i], `All ${num(rows[i].end_supply_zat / 1e8, 0)} ZEC mined so far were worth **${v}** at the ${dateLong(dates[i])} close${ch == null ? '' : ` — ${changeWords(ch)}`}.`, ch),
      spark: spark(mcap),
      indexValue: v,
      defaultRange: '1Y',
      events: NU_EVENTS,
      dataThrough: await dataThrough(),
    };
  },
};

/* ------------------------------------------------------------ ZEC/BTC ratio */
export const zecBtc: ChartDef = {
  slug: 'zec-btc-ratio',
  title: 'ZEC/BTC ratio',
  short: 'ZEC/BTC ratio',
  question: 'How much bitcoin does one ZEC buy?',
  group: 'price',
  source: 'external',
  sourceNote: 'Daily closes · ZEC/USD ÷ BTC/USD',
  unit: 'BTC per ZEC',
  api: ['daily-prices', 'five-year-price'],
  related: ['price', 'fdv-vs-btc', 'volatility', 'mktcap-issuance'],
  explainer: [
    {
      heading: 'What does this ratio tell you?',
      paragraphs: [
        'This is the price of one ZEC in bitcoin. It rises when ZEC gains against BTC and falls when it loses.',
        '**It takes the market out.** When every coin falls at once, a ZEC chart in dollars mostly tells you about crypto as a whole. The same weeks in bitcoin terms tell you whether anything happened to Zcash itself. A flat line through a crash means ZEC fell by the same amount as the market — that is an answer, not a missing one.',
        '**Two prices move, not one.** The line goes up when ZEC rises, and just as much when bitcoin falls. Read a change here as a fact about the pair, and check the dollar price to see which side moved.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Daily ZEC/USD close divided by the daily BTC/USD close, complete UTC days only. To measure how closely the two move together, use the correlation tool; this page does not compute a correlation.'] },
  ],
  async load() {
    const rows = (await completePrices()).filter((r) => r.btc_usd > 0 && r.zec_usd > 0);
    const dates = rows.map((r) => r.date);
    const ratio = rows.map((r) => r.zec_usd / r.btc_usd);
    const i = lastIdx(ratio);
    const ch30 = changePct(ratio, 30);
    const fiveY = i >= 1826 ? ratio[i] / ratio[i - 1826] : null;
    const v = fmt(ratio[i], 'ratio5');
    return {
      panels: [{ kind: 'timeseries', dates, format: 'ratio5', logToggle: true, series: [{ key: 'r', label: 'ZEC/BTC', color: 'var(--zec)', values: ratio, type: 'line', width: 2 }] }],
      headline: headline('ZEC/BTC', `${v} BTC`, dates[i], `One ZEC bought **${v} BTC** on ${dateLong(dates[i])}${ch30 == null ? '' : ` — ${changeWords(ch30, 30)}`}${fiveY ? `, and ${fiveY.toFixed(1)}× what it bought five years earlier` : ''}.`, ch30, 30),
      spark: spark(ratio),
      indexValue: v,
      defaultRange: '1Y',
      events: NU_EVENTS,
      dataThrough: await dataThrough(),
    };
  },
};

/* --------------------------------------------------------------- FDV vs BTC */
type FdvRow = { date: string; zec_usd: number; btc_usd: number; zec_supply: number; btc_supply: number };
export const fdvVsBtc: ChartDef = {
  slug: 'fdv-vs-btc',
  title: 'Fully diluted value — ZEC as % of BTC',
  short: 'Fully diluted value — ZEC as % of BTC',
  question: 'How big is Zcash next to Bitcoin?',
  group: 'price',
  source: 'external',
  sourceNote: 'Daily closes · ZEC consensus supply · BTC halving schedule',
  unit: '% of Bitcoin',
  api: ['fdv-vs-btc'],
  related: ['zec-btc-ratio', 'market-cap', 'mktcap-issuance', 'implied-mcap'],
  explainer: [
    {
      heading: 'How big is Zcash next to Bitcoin?',
      paragraphs: [
        '**Fully diluted value** (FDV) prices every coin that will ever exist: today’s price × the supply cap. Zcash and Bitcoin both cap at 21,000,000 coins, so ZEC’s FDV as a share of BTC’s is exactly the ZEC/BTC price ratio, read as a percentage. The shared cap is what makes the comparison fair.',
        '**The market-cap line counts only coins mined so far.** Bitcoin has issued about 95% of its cap and Zcash about 81%, because it launched seven years later. So by market cap ZEC is a smaller share of Bitcoin, and the gap between the lines is the supply Zcash still has to emit. It narrows with every block.',
        '**Neither line is a forecast.** FDV assumes today’s price holds for coins that arrive over the next century. It is a way to compare two assets on the same footing, not a valuation of either.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['ZEC supply is the node’s consensus chainSupply; BTC supply follows its deterministic halving schedule. Prices are daily closes. Use Log when the window spans 2016–2018, when the ratio moved by more than 10×.'] },
  ],
  async load() {
    const [all, through] = await Promise.all([api<FdvRow[]>('fdv-vs-btc'), dataThrough()]);
    const rows = all.filter((r) => r.date <= through && r.btc_usd > 0);
    const dates = rows.map((r) => r.date);
    const fdv = rows.map((r) => (r.zec_usd / r.btc_usd) * 100);
    const mc = rows.map((r) => (r.zec_supply > 0 && r.btc_supply > 0 ? ((r.zec_usd * r.zec_supply) / (r.btc_usd * r.btc_supply)) * 100 : null));
    const i = lastIdx(fdv);
    const ch = changePct(fdv, 28);
    const v = fmt(fdv[i], 'pct2');
    return {
      panels: [{
        kind: 'timeseries', dates, format: 'pct2', logToggle: true,
        series: [
          { key: 'fdv', label: 'Fully diluted (21M each)', color: 'var(--zec)', values: fdv, type: 'line', width: 2 },
          { key: 'mcap', label: 'Market cap (mined so far)', color: 'var(--s2)', values: mc, type: 'line' },
        ],
      }],
      headline: headline('ZEC FDV as % of BTC', v, dates[i], `Fully diluted, Zcash was worth **${v}** of Bitcoin on ${dateLong(dates[i])}; by coins mined so far, **${fmt(mc[i], 'pct2')}**.`, ch),
      spark: spark(fdv),
      indexValue: v,
      defaultRange: '1Y',
      dataThrough: through,
    };
  },
};

/* --------------------------------------------------- activity-implied mcap */
type Implied = { dates: string[]; actual: (number | null)[]; supply: number[]; methods: { key: string; name: string; series: (number | null)[] }[] };
const METHOD_STYLE: Record<string, { color: string; hidden?: boolean; label: string }> = {
  'btc-issuance': { color: 'var(--btc)', label: 'BTC market cap @ equal issuance' },
  onchain: { color: 'var(--s2)', label: 'On-chain volume @ equal issuance' },
  'onchain-tx': { color: 'var(--s3)', label: 'Transactions @ equal issuance' },
  mining: { color: 'var(--s5)', label: 'Mining energy @ equal issuance' },
  'perp-vol': { color: 'var(--s6)', label: 'Perp volume', hidden: true },
  'perp-oi': { color: 'var(--s6)', label: 'Perp open interest', hidden: true },
};
export const impliedMcap: ChartDef = {
  slug: 'implied-mcap',
  title: 'Activity-implied market cap',
  short: 'Activity-implied market cap',
  question: 'If Zcash activity were priced like Bitcoin’s, what would ZEC be worth?',
  group: 'price',
  source: 'external',
  sourceNote: '7-day mean · our node + Bitcoin chain + Hyperliquid',
  unit: 'US dollars (log scale)',
  api: ['implied-mcap'],
  related: ['market-cap', 'mktcap-issuance', 'realized-all', 'fdv-vs-btc'],
  explainer: [
    {
      heading: 'Is this a price target?',
      paragraphs: [
        'Each line asks the same question of a different market: **if this observable measure of Zcash activity were priced the way that market prices its own, what market cap would that imply?** The dashed line is the actual figure. None of them is a prediction and none is a valuation — they are the arithmetic of a comparison, only as good as the assumption that two networks should be priced alike.',
        '**The spread is the content.** A single line saying “implied cap is 4× today’s” would be a number to quote; estimates that disagree by an order of magnitude are the honest picture, because the disagreement is what the data actually supports.',
        '**The axis is logarithmic.** Each gridline is 10× the one below, so a small vertical gap is a large multiple. Read distances as ratios, never as differences.',
      ],
    },
    {
      heading: 'The methods',
      paragraphs: [
        '**BTC market cap @ equal issuance** is the baseline: what Bitcoin was worth when it had mined as many coins as Zcash has now. The other issuance-aligned methods start from the same alignment.',
        '**On-chain volume** prices ZEC’s transparent transfer volume at the market cap per dollar of volume Bitcoin had at that point. **Transactions** does the same counting transactions, closer to how many people use the chain. **Mining energy** prices implied mining power.',
        '**Perp volume and open interest** price ZEC’s Hyperliquid notional at Bitcoin’s per-dollar ratio; history only starts in Jul 2026, so they start hidden. Funding rate and NEAR swap volume are deliberately excluded: one measures crowding, the other venue concentration, not size.',
      ],
    },
  ],
  async load() {
    const [d, through] = await Promise.all([api<Implied>('implied-mcap'), dataThrough()]);
    const n = d.dates.filter((x) => x <= through).length;
    const dates = d.dates.slice(0, n);
    const smooth = (xs: (number | null)[]) => sma(xs.slice(0, n).map((v) => (v != null && v > 0 ? v : null)), 7);
    const actual = smooth(d.actual);
    const order = ['btc-issuance', 'onchain', 'onchain-tx', 'mining', 'perp-vol', 'perp-oi'];
    const methods = order.map((k) => d.methods.find((m) => m.key === k)).filter((m): m is Implied['methods'][number] => !!m);
    const series = methods.map((m) => ({ key: m.key, label: METHOD_STYLE[m.key]?.label ?? m.name, color: METHOD_STYLE[m.key]?.color ?? 'var(--s6)', values: smooth(m.series), type: 'line' as const, hidden: METHOD_STYLE[m.key]?.hidden, dashed: m.key.startsWith('perp-oi') }));
    const i = lastIdx(actual);
    const act = actual[i]!;
    const latest = series.map((s) => ({ s, v: s.values[i] ?? null }));
    const live = latest.filter((x) => x.v != null && !x.s.hidden);
    const lo = Math.min(...live.map((x) => x.v!)), hi = Math.max(...live.map((x) => x.v!));
    return {
      panels: [
        { kind: 'timeseries', dates, format: 'usdCompact', logToggle: true, defaultLog: true, series: [{ key: 'actual', label: 'Actual market cap', color: 'var(--value)', values: actual, type: 'line', dashed: true, width: 2 }, ...series] },
        {
          kind: 'custom', title: 'How far is each estimate from the actual market cap?', component: 'a-dotplot',
          props: {
            rows: latest.map(({ s, v }) => ({ label: s.label, color: s.color, value: v, note: v ? `${(v / act).toFixed(1)}×` : undefined })),
            reference: { label: 'actual', value: act }, format: 'usdCompact', log: true,
            caption: `7-day means on ${dateLong(dates[i])}. Log scale: each step is a multiple, not a difference.`,
            ariaLabel: `Implied market caps on ${dateLong(dates[i])} against the actual ${fmt(act, 'usdCompact')}.`,
          },
        },
      ],
      headline: headline('Actual market cap', fmt(act, 'usdCompact'), dates[i], `The ${live.length} long-history estimates put ZEC between **${fmt(lo, 'usdCompact')}** and **${fmt(hi, 'usdCompact')}**, against an actual **${fmt(act, 'usdCompact')}** (7-day means, ${dateLong(dates[i])}).`),
      spark: spark(actual),
      indexValue: `${methods.length} estimates`,
      defaultRange: '5Y',
      dataThrough: dates[i],
      notes: ['These are relative-activity comparisons, not valuations or price targets.'],
    };
  },
};

/* ------------------------------------------------------------ ETF holdings */
type Etf = { points: { date: string; flow: number | null; form: string; pct_supply: number; zec: number; zec_usd: number }[]; source: string };
export const etfHoldings: ChartDef = {
  slug: 'etf-holdings',
  title: 'Zcash ETF holdings',
  short: 'Zcash ETF holdings',
  question: 'How much ZEC does the Zcash ETF hold?',
  group: 'price',
  source: 'external',
  sourceNote: 'Quarterly SEC filings (XBRL, CIK 1720265)',
  unit: 'ZEC, and % of supply',
  api: ['etf-holdings'],
  related: ['market-cap', 'supply', 'price', 'pools'],
  explainer: [
    {
      heading: 'What do the fund’s holdings actually tell you?',
      paragraphs: [
        '**Every point is a filing.** The trust reports to the SEC each quarter, so the chart gains a point roughly four times a year and the newest one can be a couple of months old. That is the fund’s reporting schedule, not a stalled chart. The line is drawn as steps so you can see how little it knows between filings.',
        '**The early years are not an ETF.** The fund started in 2017 as the Grayscale Zcash Trust, a closed-end trust, and was approved for listing on NYSE Arca in August 2026. A closed-end trust cannot easily create or cancel shares, so its holdings can stay flat while its shares trade heavily.',
        '**Reported, not read off the chain.** Everywhere else this site counts coins on the Zcash blockchain. It cannot here: the issuer has declined since 2022 to publish the addresses it holds coins in. These are the numbers the trust files.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Coins held and share of supply sit on separate panels because they are different quantities. The share is measured against supply on each reporting date. The bottom panel is the change in holdings between consecutive filings — not a per-day rate, because reporting periods differ in length. Holdings can fall while the share holds steady: the sponsor fee is paid in ZEC.'] },
  ],
  async load() {
    const d = await api<Etf>('etf-holdings');
    const pts = d.points;
    const dates = pts.map((p) => p.date);
    const last = pts[pts.length - 1];
    const v = `${num(last.zec, 0)} ZEC`;
    return {
      panels: [
        { kind: 'timeseries', title: 'ZEC held by the trust', dates, format: 'zec', step: true, zeroBaseline: true, height: 260, series: [{ key: 'zec', label: 'ZEC held', color: 'var(--zec)', values: pts.map((p) => p.zec), type: 'line', width: 2 }] },
        { kind: 'timeseries', title: 'Share of circulating supply', dates, format: 'pct2', step: true, zeroBaseline: true, height: 200, series: [{ key: 'pct', label: '% of supply', color: 'var(--s2)', values: pts.map((p) => p.pct_supply), type: 'line' }] },
        { kind: 'timeseries', title: 'Net change between filings', dates, format: 'zec', height: 180, series: [{ key: 'flow', label: 'Net change', color: 'var(--s3)', values: pts.map((p) => p.flow), type: 'bar' }] },
      ],
      headline: headline('ETF holdings', v, last.date, `The trust held **${v}** — **${last.pct_supply.toFixed(2)}%** of supply — at its latest filing (${last.form}, ${dateLong(last.date)}).`),
      spark: pts.map((p) => p.zec),
      indexValue: v,
      ranges: ['5Y', 'ALL'],
      defaultRange: 'ALL',
      dataThrough: last.date,
      notes: [`${pts.length} reporting periods since ${dateLong(dates[0])}. There is no daily feed.`],
    };
  },
};

/* --------------------------------------------------------------- volatility */
function rollVol(r: number[], w: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < r.length; i++) {
    if (i < w) { out.push(null); continue; }
    let mean = 0;
    for (let j = 0; j < w; j++) mean += r[i - j];
    mean /= w;
    let v = 0;
    for (let j = 0; j < w; j++) { const e = r[i - j] - mean; v += e * e; }
    out.push(Math.sqrt(v / w) * Math.sqrt(365) * 100);
  }
  return out;
}
export const volatility: ChartDef = {
  slug: 'volatility',
  title: 'ZEC vs BTC volatility',
  short: 'ZEC vs BTC volatility',
  question: 'How much more does ZEC’s price swing than Bitcoin’s?',
  group: 'price',
  source: 'external',
  sourceNote: 'Annualised std. dev. of daily log returns · daily closes',
  unit: '% per year (annualised)',
  api: ['daily-prices'],
  related: ['vol-issuance', 'price', 'zec-btc-ratio', 'hl-oi'],
  explainer: [
    {
      heading: 'Why more than one window?',
      paragraphs: [
        'Annualised realised volatility is the standard deviation of daily log returns over a rolling window, scaled by √365. The window choice, not the market, decides what the line says: **7-day** reacts within days and spikes hard, **30-day** is the conventional gauge, **6-month** is the regime.',
        '**Realised, not implied.** This is what the price did, computed after the fact. It is not the market’s expectation, and it cannot lead anything — it lags by up to its own window.',
        '**Annualising a 7-day window is an extrapolation.** It assumes the week was typical, which is exactly what a spike says it was not. Compare assets on the same window, and be sceptical of the short one’s level.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Population standard deviation of ln(close / previous close), ×√365 ×100, over 7, 30 and 180 trailing days. The 30-day and 6-month lines are shown; 7-day lines start hidden — turn them on with their chips.'] },
  ],
  async load() {
    const rows = (await completePrices()).filter((r) => r.btc_usd > 0 && r.zec_usd > 0);
    const dates = rows.map((r) => r.date);
    const zr = rows.map((r, i) => (i ? Math.log(r.zec_usd / rows[i - 1].zec_usd) : 0));
    const br = rows.map((r, i) => (i ? Math.log(r.btc_usd / rows[i - 1].btc_usd) : 0));
    const z30 = rollVol(zr, 30), b30 = rollVol(br, 30);
    const i = lastIdx(z30);
    const mult = z30[i]! / b30[i]!;
    const v = fmt(z30[i], 'pct0');
    return {
      panels: [{
        kind: 'timeseries', dates, format: 'pct0', zeroBaseline: true,
        series: [
          { key: 'z30', label: 'ZEC 30d', color: 'var(--zec)', values: z30, type: 'line', width: 2 },
          { key: 'b30', label: 'BTC 30d', color: 'var(--btc)', values: b30, type: 'line', width: 2 },
          { key: 'z180', label: 'ZEC 6mo', color: 'var(--zec)', values: rollVol(zr, 180), type: 'line', dashed: true, width: 1.4 },
          { key: 'b180', label: 'BTC 6mo', color: 'var(--btc)', values: rollVol(br, 180), type: 'line', dashed: true, width: 1.4 },
          { key: 'z7', label: 'ZEC 7d', color: 'var(--s2)', values: rollVol(zr, 7), type: 'line', hidden: true, width: 1.2 },
          { key: 'b7', label: 'BTC 7d', color: 'var(--s5)', values: rollVol(br, 7), type: 'line', hidden: true, width: 1.2 },
        ],
      }],
      headline: headline('ZEC 30-day volatility', v, dates[i], `ZEC’s 30-day volatility was **${v} a year** on ${dateLong(dates[i])} — **${mult.toFixed(1)}×** Bitcoin’s ${fmt(b30[i], 'pct0')}.`, changePct(z30, 28)),
      spark: spark(z30),
      indexValue: `${v} / yr`,
      defaultRange: '1Y',
      dataThrough: await dataThrough(),
    };
  },
};

/* -------------------------------------------------- by coins issued (×4) */
type IssRow = { date: string; supply: number; mcap: number; tx: number; vol: number; vol30: number; gw: number };
type IssMetric = 'mcap' | 'tx' | 'vol' | 'vol30';

function interpAt(rows: IssRow[], s: number, k: IssMetric): number | null {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].supply >= s) {
      const a = rows[i - 1], b = rows[i];
      const t = (s - a.supply) / (b.supply - a.supply || 1);
      return a[k] + (b[k] - a[k]) * t;
    }
  }
  return null;
}

function issuanceDef(o: { slug: string; title: string; short: string; question: string; metric: IssMetric; yFormat: YFormat; idxFormat: ValueFormat; unit: string; noun: string; log: boolean; caveat: { heading: string; paragraphs: string[] }; related: string[]; lead: (z: string, b: string, r: string, date: string) => string }): ChartDef {
  return {
    slug: o.slug, title: o.title, short: o.short, question: o.question, group: 'price', source: 'external',
    sourceNote: 'Weekly samples · ZEC from our node · BTC from blockchain.info', unit: o.unit, api: ['mktcap-issuance'], related: o.related,
    explainer: [ISSUANCE_X, o.caveat],
    async load(): Promise<ChartData> {
      const [d, through] = await Promise.all([api<{ zec: IssRow[]; btc: IssRow[] }>('mktcap-issuance'), dataThrough()]);
      const zec = d.zec.filter((r) => r[o.metric] > 0 && r.date <= through);
      const btc = d.btc.filter((r) => r[o.metric] > 0);
      const last = zec[zec.length - 1];
      const bAt = interpAt(btc, last.supply, o.metric);
      const ratio = bAt ? last[o.metric] / bAt : null;
      // ratio history along ZEC's own issuance, for the index sparkline
      const hist = zec.slice(-52).map((r) => { const b = interpAt(btc, r.supply, o.metric); return b ? r[o.metric] / b : NaN; }).filter(Number.isFinite);
      const r = ratio == null ? '—' : `${ratio < 1 ? ratio.toFixed(3) : ratio.toFixed(2)}×`;
      const props: XYChartProps = {
        series: [
          { key: 'zec', label: 'Zcash', color: 'var(--zec)', points: zec.map((x) => [x.supply, x[o.metric]]), width: 2 },
          { key: 'btc', label: 'Bitcoin', color: 'var(--btc)', points: btc.map((x) => [x.supply, x[o.metric]]), width: 1.8 },
        ],
        xFormat: 'millions', yFormat: o.yFormat, xLabel: 'coins issued (millions) →', yLogDefault: o.log, logToggle: true,
        ratioNoun: o.noun, markX: last.supply, height: 400,
        ariaLabel: `${o.title}: Zcash and Bitcoin plotted against coins issued, 0 to 21 million. At ${(last.supply / 1e6).toFixed(2)}M coins Zcash is ${r} Bitcoin's ${o.noun} at the same point.`,
      };
      return {
        panels: [{ kind: 'custom', component: 'a-xy', props: props as unknown as Record<string, unknown> }],
        headline: headline(`ZEC vs BTC ${o.noun} at equal issuance`, r, last.date, o.lead(fmt(last[o.metric], o.idxFormat), bAt == null ? '—' : fmt(bAt, o.idxFormat), r, dateLong(last.date))),
        spark: hist,
        indexValue: r,
        ranges: false,
        dataThrough: last.date,
        notes: ['The x-axis is coins issued, so the range control does not apply. Where the lines overlap (~3–17M coins) you are comparing Zcash’s recent years with Bitcoin’s 2010–2016.'],
      };
    },
  };
}

export const mktcapIssuance = issuanceDef({
  slug: 'mktcap-issuance', title: 'Market cap by coins issued — ZEC vs BTC', short: 'Market cap by coins issued — ZEC vs BTC',
  question: 'At the same point in issuance, how does ZEC’s market cap compare with Bitcoin’s?', metric: 'mcap', yFormat: 'usdCompact', idxFormat: 'usdCompact',
  unit: 'US dollars (log scale)', noun: 'market cap', log: true, related: ['tx-issuance', 'volume-issuance', 'vol-issuance', 'fdv-vs-btc'],
  caveat: { heading: 'Market cap carries price and supply', paragraphs: ['Both lines rise as coins are issued even with a flat price, so some of the slope is arithmetic. The comparison survives because the x-axis controls for exactly that: at the same x, both chains have issued the same fraction of 21M.'] },
  lead: (z, b, r, date) => `At its current issuance, Zcash is worth **${z}** — **${r}** what Bitcoin was worth when it had mined the same number of coins (${b}; ZEC as of ${date}).`,
});
export const txIssuance = issuanceDef({
  slug: 'tx-issuance', title: 'Daily transactions by coins issued — ZEC vs BTC', short: 'Daily transactions by coins issued — ZEC vs BTC',
  question: 'At the same point in issuance, how heavily is Zcash used compared with Bitcoin?', metric: 'tx', yFormat: 'countCompact', idxFormat: 'countCompact',
  unit: 'transactions per day (log scale)', noun: 'daily tx', log: true, related: ['mktcap-issuance', 'volume-issuance', 'tx', 'tx-types'],
  caveat: { heading: 'A transaction is not the same unit on both chains', paragraphs: ['Both series exclude coinbase (miner-reward) transactions, so they reflect user activity. Bitcoin batches heavily, and Zcash’s count mixes transparent transfers with shielded ones that may carry many payments each. This is activity, not users and not payments.'] },
  lead: (z, b, r, date) => `Zcash carries **${z} transactions a day** at its current issuance — **${r}** Bitcoin’s ${b} at the same point (ZEC as of ${date}).`,
});
export const volumeIssuance = issuanceDef({
  slug: 'volume-issuance', title: 'Daily volume by coins issued — ZEC vs BTC', short: 'Daily volume by coins issued — ZEC vs BTC',
  question: 'At the same point in issuance, how much value moves on Zcash compared with Bitcoin?', metric: 'vol', yFormat: 'usdCompact', idxFormat: 'usdCompact',
  unit: 'US dollars per day (log scale)', noun: 'daily volume', log: true, related: ['mktcap-issuance', 'tx-issuance', 'velocity', 'implied-mcap'],
  caveat: { heading: 'Zcash volume here is transparent only', paragraphs: ['Shielded transfers are private and not counted, so ZEC is understated relative to BTC. Bitcoin’s figure is blockchain.info’s estimated on-chain transaction volume. Read the shape and the order of magnitude; do not read a 20% gap.'] },
  lead: (z, b, r, date) => `Transparent Zcash moves **${z} a day** at its current issuance — **${r}** Bitcoin’s ${b} at the same point (ZEC as of ${date}).`,
});
export const volIssuance = issuanceDef({
  slug: 'vol-issuance', title: '30-day volatility by coins issued — ZEC vs BTC', short: '30-day volatility by coins issued — ZEC vs BTC',
  question: 'At the same point in issuance, is ZEC more volatile than Bitcoin was?', metric: 'vol30', yFormat: 'pct0', idxFormat: 'pct0',
  unit: '% per year (annualised)', noun: '30d volatility', log: false, related: ['volatility', 'mktcap-issuance', 'zec-btc-ratio', 'price'],
  caveat: { heading: 'A 30-day window is short', paragraphs: ['Volatility is annualised from daily log returns over a trailing 30 days. One violent week dominates it for a month afterwards, so treat a single spike as one event rather than a change in character.'] },
  lead: (z, b, r, date) => `ZEC’s 30-day volatility is **${z} a year** — **${r}** Bitcoin’s ${b} at the same point in its issuance (ZEC as of ${date}).`,
});
