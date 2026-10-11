import 'server-only';
import { cache } from 'react';
import { getHome, getChartIndex } from '@/lib/data/home';
import { getFreshness, POOL_COLOR, POOL_LABEL, POOLS } from '@/lib/data/snapshot';
import { getHopMedian, ROUND_TRIPS } from '@/lib/data/privacy';
import { getSearchIndex } from '@/lib/data/search-index';
import { chartBySlug } from '@/lib/charts';
import { CHART_GROUPS, GROUP_SLUGS } from '@/lib/charts/types';
import { toolGroups } from '@/lib/site';
import { downsample } from '@/components/charts/Sparkline';
import { compact, dateLong, dateShort, num, pct, usd, usdCompact } from '@/lib/format';
import type { Group, Item, NavData } from './types';

const SHORT: Record<string, string> = { price: 'Price', costbasis: 'Cost basis', privacy: 'Privacy', usage: 'Usage', holders: 'Holders', supply: 'Supply', markets: 'Markets' };

// Read-only: everything here comes from the same helpers the real pages use, so menu values match the pages.
export const getNavLabData = cache(async (): Promise<NavData> => {
  const [home, index, f, hop, search] = await Promise.all([getHome(), getChartIndex(), getFreshness(), getHopMedian(), getSearchIndex()]);
  const p = home.pools;

  const values: Record<string, string> = {};
  for (const g of index) for (const r of g.rows) if (r.value) values[`/chart/${r.slug}`] = r.value;

  const ironShare = (p.ironwood / p.shielded) * 100;
  const ironwood = { pct: home.migration.pct, pctText: `${num(home.migration.pct, 2)}%`, days: home.migration.days, balance: `${compact(p.ironwood)} ZEC`, shareOfShielded: `${Math.round(ironShare)}%` };

  const privacy: Item[] = [
    { href: '/privacy', label: 'Overview', value: `${pct(p.shieldedPct)} shielded`, desc: 'Shielded supply, pools, flows' },
    { href: '/ironwood', label: 'Ironwood', value: `${ironwood.pctText} crossed`, desc: `The newest pool, live ${ironwood.days} days`, featured: true },
    { href: '/orchard-turnstile', label: 'Turnstile', value: `${Math.round(home.turnstile.isi)}/100`, desc: 'Was the Orchard bug used to mint ZEC?' },
    { href: '/wall-of-shame', label: 'Wall of Shame', value: `${ROUND_TRIPS.total} round trips`, desc: 'Round trips that reused an amount' },
    { href: '/shield-hops', label: 'Shield hops', value: `${num(hop.median, 2)} ZEC median`, desc: 'How much moves when coins go shielded' },
    { href: '/privacy-suggestions', label: 'Privacy tips', value: '0.1–1,000 ZEC', desc: 'Round amounts with the biggest crowd' },
    { href: '/amount-suggest', label: 'Amount lookup', desc: 'How common is your amount?' },
  ];
  for (const i of privacy) if (i.value) values[i.href] = i.value;

  const jumps: Item[] = [['overview', 'Overview'], ['pools', 'Pools'], ['flows', 'Flows'], ['ironwood', 'Ironwood'], ['integrity', 'Integrity'], ['hygiene', 'Privacy hygiene'], ['usage', 'Usage']].map(([id, label]) => ({ href: `/privacy#${id}`, label }));

  const chartGroups: Group[] = index.map((g) => ({
    id: g.id,
    title: g.title,
    short: SHORT[g.id] ?? g.title,
    href: `/charts#g-${g.id}`,
    items: g.rows.map((r) => ({ href: `/chart/${r.slug}`, label: chartBySlug(r.slug)?.short ?? r.title, value: r.value })),
  }));

  // Chart-page context: /chart/price.
  const priceDef = chartBySlug('price')!;
  const priceData = await priceDef.load();
  const list = GROUP_SLUGS.price;
  const pos = list.indexOf('price');
  const grp = chartGroups.find((g) => g.id === 'price')!;
  const at = (slug: string) => grp.items.find((i) => i.href === `/chart/${slug}`)!;
  const ch = priceData.headline.change;
  const chart: NavData['chart'] = {
    groupId: 'price', groupTitle: CHART_GROUPS[0].title, groupQuestion: CHART_GROUPS[0].question, slug: 'price', pos: pos + 1, count: list.length,
    prev: at(list[(pos - 1 + list.length) % list.length]), next: at(list[(pos + 1) % list.length]),
    title: priceDef.title, lede: priceData.headline.sentence, value: priceData.headline.value,
    change: ch ? `${ch.pct >= 0 ? '▲' : '▼'} ${num(Math.abs(ch.pct), 1)}% vs ${ch.days} days earlier` : null, changeDir: !ch ? 'flat' : ch.pct >= 0 ? 'up' : 'dn',
    date: dateLong(priceData.headline.date),
    series: downsample(home.prices.values.slice(-366), 140),
    caption: `Data through ${dateLong(priceData.dataThrough)} · daily close · source Coin Metrics + CoinGecko`,
    cadence: 'daily close',
  };

  const privacyPage: NavData['privacyPage'] = {
    title: 'How private is Zcash right now?',
    lede: `**${pct(p.shieldedPct)} of all ZEC is shielded.** Most of it now lives in Ironwood: **${ironwood.balance}** — ${ironwood.shareOfShielded} of all shielded ZEC — in the pool that went live ${ironwood.days} days ago.`,
    shieldedPct: num(p.shieldedPct, 1), shieldedZec: `${num(p.shielded)} ZEC`, shieldedUsd: usdCompact(p.shielded * home.price, 2), date: dateLong(p.date),
    pools: POOLS.map((k) => ({ key: k, label: POOL_LABEL[k], pct: (p[k] / p.supply) * 100, text: `${compact(p[k])}`, color: POOL_COLOR[k] })),
  };

  const kpis: NavData['kpis'] = {
    privacy: [
      { k: 'Shielded supply', v: `${compact(p.shielded)} ZEC`, s: `${usdCompact(p.shielded * home.price)} at today’s price` },
      { k: 'Ironwood migration', v: ironwood.pctText, s: 'of Orchard has crossed' },
      { k: 'Net shielding, 7 days', v: `+${num(home.net7.net)} ZEC`, s: `${num(home.net7.in)} in · ${num(home.net7.out)} out` },
      { k: 'Turnstile index', v: `${Math.round(home.turnstile.isi)}/100`, s: home.turnstile.verdict },
    ],
    chart: [
      { k: 'Latest', v: priceData.headline.value, s: `close, ${dateLong(priceData.headline.date)}` },
      { k: 'ZEC/BTC', v: num(home.ratio, 5), s: 'same price, in bitcoin' },
      { k: 'Market cap', v: usdCompact(home.marketCap, 2), s: `${num(p.supply)} ZEC mined` },
      { k: 'MVRV', v: `${num(home.mvrv, 2)}×`, s: `realized price ${usd(home.realizedPrice, 0)}` },
    ],
  };

  const v = (href: string) => values[href];
  values['/'] = usd(home.price);
  values['/network'] = `${num(home.nodes.reachable)} nodes`;
  values['/node'] = home.nodes.synced ? 'synced' : 'catching up';
  values['/halving'] = `~${num(home.halving.days)} days`;
  values['/swaps'] = usdCompact(home.near.net, 1).replace(/^\$/, home.near.net >= 0 ? '+$' : '$') + ' net';

  const tools: Group[] = toolGroups.map((g) => ({ id: g.title, title: g.title, items: g.links.map((l) => ({ href: l.href, label: l.label, desc: l.desc, tag: l.tag, value: v(l.href) })) }));

  // Direction C: the questions people arrive with. Privacy is its own top-level menu; these four fill "Explore".
  const questions: Group[] = [
    { id: 'worth', title: 'What is ZEC worth?', items: [
      { href: '/chart/price', label: 'ZEC price', value: usd(home.price) },
      { href: '/chart/zec-btc-ratio', label: 'ZEC/BTC ratio', value: num(home.ratio, 5) },
      { href: '/chart/market-cap', label: 'Market cap', value: usdCompact(home.marketCap, 2) },
      { href: '/chart/mvrv', label: 'Holders in profit (MVRV)', value: `${num(home.mvrv, 2)}×` },
      { href: '/savings', label: 'Investment calculator', value: 'calc' },
      { href: '/what-if', label: 'What if gold', value: 'calc' },
      { href: '/btc-bull-run', label: 'ZEC 2026 vs BTC 2017', value: 'compare' },
    ] },
    { id: 'used', title: 'How much is it used?', items: [
      { href: '/chart/tx', label: 'Transactions per day', value: num(home.txDay) },
      { href: '/chart/tx-types', label: 'Shielded share of tx', value: `~${Math.round(home.shieldedTxShare)}%` },
      { href: '/chart/total-fees', label: 'Fees, last 30 days', value: usdCompact(home.feeUsd, 1) },
      { href: '/world-usage', label: 'When the world uses it', value: 'by hour' },
      { href: '/tx-sizes', label: 'Transaction sizes', value: 'report' },
      { href: '/activity', label: 'Transparent activity', value: 'report' },
    ] },
    { id: 'secure', title: 'Is it secure?', items: [
      { href: '/chart/hashrate', label: 'Hashrate', value: `${num(home.hashrate / 1e9, 2)} GH/s` },
      { href: '/network', label: 'Network nodes', value: values['/network'] },
      { href: '/node', label: 'Our node', value: values['/node'] },
      { href: '/chart/supply', label: 'Supply issued', value: `${num(home.issuedPct, 1)}%` },
      { href: '/halving', label: 'Next halving', value: values['/halving'] },
      { href: '/founders-reward', label: "Founders' Reward", value: 'report' },
    ] },
    { id: 'moves', title: 'Where does it move?', items: [
      { href: '/swaps', label: 'Swaps on NEAR Intents', value: values['/swaps'] },
      { href: '/chart/near-bridge', label: 'NEAR bridge balance', value: `${compact(home.near.bridge)} ZEC` },
      { href: '/btc-migration', label: 'Bitcoin → Zcash', value: 'report' },
      { href: '/wallet-apps', label: 'Wallet apps', value: 'ranking' },
      { href: '/exchange-support', label: 'Exchanges', value: 'by country' },
    ] },
  ];
  for (const g of questions) for (const i of g.items) if (i.value && !values[i.href]) values[i.href] = i.value;

  const deeper: Item[] = [
    { href: '/charts', label: 'All 58 charts' },
    { href: '/compare', label: 'Compare charts' },
    { href: '/correlate', label: 'Correlations' },
    { href: '/metrics', label: 'Metrics table' },
    { href: '/signals', label: 'Signals', tag: 'BETA' },
    { href: '/tools', label: 'Methodology' },
  ];

  const popular: Item[] = [
    { href: '/ironwood', label: 'Ironwood migration', value: values['/ironwood'], desc: 'Privacy' },
    { href: '/chart/price', label: 'ZEC price', value: usd(home.price), desc: 'Price & valuation' },
    { href: '/privacy', label: 'Privacy hub', value: values['/privacy'], desc: 'Privacy' },
    { href: '/chart/pools', label: 'Shielded pool balances', value: v('/chart/pools'), desc: 'Privacy charts' },
    { href: '/chart/realized-all', label: 'Realized price', value: v('/chart/realized-all'), desc: 'Cost basis' },
    { href: '/savings', label: 'Investment calculator', value: 'tool', desc: 'Calculators' },
  ];

  return {
    fresh: { height: num(f.height), through: dateLong(f.dataThrough), throughShort: dateShort(f.dataThrough).replace(/^(\w+) (\d+)$/, '$2 $1'), captured: dateLong(f.capturedAt), synced: f.synced, node: 'Zebra v6.3.0' },
    privacy, ironwood, jumps, chartGroups, chart, privacyPage, kpis, tools, questions, deeper, popular, search, values,
    counts: { charts: search.filter((s) => s.kind === 'Chart').length, tools: toolGroups.reduce((a, g) => a + g.links.length, 0), pages: search.filter((s) => s.kind === 'Page').length },
  };
});
