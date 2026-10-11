// Chart registry contract (shared by /charts, /chart/[slug], the dashboard index and search).
// FROZEN: additive changes only — two agents implement registry-a.ts and registry-b.ts against it.
import type { Series, RangeKey, ChartEvent } from '@/components/charts/TimeSeriesChart';
import type { ValueFormat } from '@/components/charts/valueFormat';

export type ChartGroupId = 'price' | 'costbasis' | 'privacy' | 'usage' | 'holders' | 'supply' | 'markets';

export const CHART_GROUPS: { id: ChartGroupId; title: string; question: string; desc: string }[] = [
  { id: 'price', title: 'Price & valuation', question: 'What is ZEC worth, and how does it compare with Bitcoin?', desc: 'Price, market cap, the ZEC/BTC ratio and issuance-aligned comparisons with Bitcoin.' },
  { id: 'costbasis', title: 'Cost basis', question: 'Are holders in profit?', desc: 'What coins last moved at, against today’s price — overall and by pool.' },
  { id: 'privacy', title: 'Privacy', question: 'How much ZEC is shielded, and where is it moving?', desc: 'Shielded pools, flows across the turnstile, and fully shielded activity.' },
  { id: 'usage', title: 'Usage', question: 'How much is the chain actually used?', desc: 'Transactions, types, fees, block size and activity per coin.' },
  { id: 'holders', title: 'Transparent holders', question: 'Who holds transparent ZEC, and for how long?', desc: 'Coin age, dormancy, survival and the UTXO set — the side of the chain where age is readable.' },
  { id: 'supply', title: 'Supply & security', question: 'How many ZEC exist, and what secures the chain?', desc: 'Issuance, inflation, the dev fund lockbox and hashrate.' },
  { id: 'markets', title: 'Markets & cross-chain', question: 'Where does ZEC trade and move between chains?', desc: 'NEAR Intents swaps and bridge, exchange volume and Hyperliquid derivatives.' },
];

/** Group membership (58 charts). Order inside a group = display order; the first is the "Start here" hub. */
export const GROUP_SLUGS: Record<ChartGroupId, string[]> = {
  price: ['price', 'market-cap', 'zec-btc-ratio', 'fdv-vs-btc', 'implied-mcap', 'etf-holdings', 'volatility', 'mktcap-issuance', 'tx-issuance', 'volume-issuance', 'vol-issuance'],
  costbasis: ['realized-all', 'mvrv', 'realized', 'cost-basis', 'pool-profit', 'pool-usd'],
  privacy: ['shielding-rate', 'pools', 'anonymity', 'flow-transparent', 'flow-sprout', 'flow-sapling', 'flow-orchard', 'flow-ironwood', 'flow-compare', 'orchard-internal', 'pool-residency'],
  usage: ['tx', 'tx-types', 'new-addresses', 'velocity', 'density', 'block-size', 'total-fees', 'fees'],
  holders: ['utxo-set', 'utxo', 'utxo-age', 'utxo-depth', 'age-pct', 'mean-coin-age', 'dormant', 'survival'],
  supply: ['supply', 'inflation', 'dev-fund', 'hashrate', 'implied-gw'],
  markets: ['near-flow', 'near-bridge', 'swap-assets', 'near-vol-mcap', 'exch-vol', 'exch-vol-pct', 'hl-funding', 'hl-volume', 'hl-oi'],
};
export const VS_BTC = ['zec-btc-ratio', 'volatility', 'fdv-vs-btc', 'mktcap-issuance', 'tx-issuance', 'volume-issuance', 'vol-issuance', 'implied-gw', 'hl-funding', 'hl-volume', 'hl-oi'];

export type DataSourceKind = 'onchain' | 'price' | 'external';

/** One time-series panel (several panels share the x-axis: e.g. supply on top, daily flows below). */
export type TimeSeriesPanel = {
  kind: 'timeseries';
  title?: string;
  dates: string[];
  series: Series[];
  format: ValueFormat;
  stacked?: boolean;
  shareToggle?: boolean;
  yDomain?: [number, number];
  zeroBaseline?: boolean;
  logToggle?: boolean;
  defaultLog?: boolean;
  step?: boolean;
  height?: number;
};

/** Escape hatch for non-time-series charts (heatmaps, histograms, x = coins issued…). `component` names a client
 *  component registered in components/charts/custom/index.ts; `props` must be JSON-serialisable. */
export type CustomPanel = { kind: 'custom'; title?: string; component: string; props: Record<string, unknown> };

export type ChartPanel = TimeSeriesPanel | CustomPanel;

export type Headline = {
  label: string;     // e.g. "Shielded supply"
  value: string;     // formatted, e.g. "4.97M ZEC"
  date: string;      // YYYY-MM-DD of the value (last complete day unless noted)
  change?: { pct: number; days: number } | null; // vs N days earlier
  sentence: string;  // one-sentence takeaway, consistent with value/date
};

export type ChartData = {
  panels: ChartPanel[];
  headline: Headline;
  /** For the index/sparkline: a short series (≤90 points) and a short descriptor when there's no single number. */
  spark?: number[];
  indexValue?: string; // e.g. "$1,234" or "5 pools"
  ranges?: RangeKey[] | false;
  defaultRange?: RangeKey;
  events?: ChartEvent[];
  dataThrough: string;
  notes?: string[]; // short caveats shown under the plot
};

export type ChartDef = {
  slug: string;
  title: string;      // display title, e.g. "Zcash price (ZEC/USD)"
  short: string;      // index row label, e.g. "ZEC price"
  question: string;   // the question the chart answers
  group: ChartGroupId;
  source: DataSourceKind;
  sourceNote: string; // e.g. "Daily close · Coin Metrics + CoinGecko"
  unit: string;       // e.g. "USD", "ZEC", "tx/day"
  pools?: ('transparent' | 'sprout' | 'sapling' | 'orchard' | 'ironwood')[];
  api: string[];      // live endpoints used (for CSV links and docs), e.g. ['daily-prices']
  explainer: { heading: string; paragraphs: string[] }[]; // rewritten from the live page's copy
  related: string[];  // slugs
  load: () => Promise<ChartData>; // server-only
};
