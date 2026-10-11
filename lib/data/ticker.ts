import 'server-only';
import { cache } from 'react';
import { api, manifest } from './core';
import { getHome } from './home';
import { getIronwood } from './ironwood';
import { getPoolsDaysAgo } from './snapshot';
import { compact, dateShort, delta, num, pct, usd, usdCompact, zecCompact } from '../format';

// Event ticker: the hot topics and on-chain events a visitor should look at, newest and most important first.
// Two sources, both from the snapshot: the node's own event feed (/api/news) and "state" facts that are news while they
// last (the Ironwood migration, price now, the shielded share …). Nothing here is invented; every value is parsed from
// a feed headline or computed the same way the dashboard computes it (lib/data/home.ts).

export type TickerTopic = 'ironwood' | 'price' | 'privacy' | 'network' | 'markets';
export type TickerKind = 'ironwood' | 'price' | 'ratio' | 'hashrate' | 'shielded' | 'flows' | 'tx' | 'digest' | 'turnstile' | 'network' | 'markets';
export type TickerDelta = { text: string; dir: 'up' | 'dn' | 'flat' };
export type TickerItem = {
  id: string;
  kind: TickerKind;
  topic: TickerTopic;
  tag: string;             // short category label shown in the chip ("IRONWOOD", "PRICE" …)
  sym: string;             // stock-tape symbol ("ZEC", "ZEC/BTC", "HASH ATH" …)
  label: string;           // compact headline for one-line tickers
  text: string;            // one plain sentence for decks and banners
  body?: string;           // the feed's own explanation (feed events only)
  value?: string;
  delta?: TickerDelta;     // always carries ▲/▼ in its text
  href: string;            // the page that explains the event
  hrefLabel: string;       // "Open price chart"
  newsHref?: string;       // the feed the event came from (no per-event anchor exists on /news yet)
  date: string;            // YYYY-MM-DD (UTC)
  ts: number;              // unix seconds
  when: string;            // "Now", "14 h ago", "Oct 9"
  importance: number;      // 0–100 as given by the feed (or assigned for state facts)
  severity: 'major' | 'notable';
  hot?: boolean;           // the ONE thing that gets the neon treatment
  progress?: number;       // 0–100, for a mini bar (Ironwood)
};
export type TickerTopicGroup = { key: TickerTopic; label: string; items: TickerItem[] };
export type TickerData = { asOf: string; refTs: number; items: TickerItem[]; quotes: TickerItem[]; events: TickerItem[]; topics: TickerTopicGroup[]; hot: TickerItem; breaking: (TickerItem & { expiresTs: number; postedTs: number }) | null };

type RawNewsItem = { body: string; chart_id: string; date: string; headline: string; importance: number; live?: boolean; severity: 'notable' | 'major'; theme: string; ts: number; z: number };

const TOPIC_LABEL: Record<TickerTopic, string> = { ironwood: 'Ironwood', price: 'Price', privacy: 'Privacy', network: 'Network', markets: 'Markets' };
const CHART_LABEL: Record<string, string> = { price: 'price chart', 'zec-btc-ratio': 'ZEC/BTC chart', hashrate: 'hashrate chart', 'flow-ironwood': 'Ironwood flows chart', 'flow-orchard': 'Orchard flows chart', 'shielding-rate': 'shielding chart', 'tx-types': 'transaction types chart', tx: 'transactions chart' };

const MAX_ITEMS = 12;
const PER_TOPIC = 4;
const FEED_DAYS = 30;
const BREAKING_HOURS = 48;
const HALF_LIFE_DAYS = 7;

const arrow = (dir: 'up' | 'dn') => (dir === 'up' ? '▲' : '▼');
const signedNum = (v: number, unit: string, digits = 0): TickerDelta => ({ text: `${arrow(v >= 0 ? 'up' : 'dn')} ${num(Math.abs(v), digits)}${unit}`, dir: v >= 0 ? 'up' : 'dn' });
const n = (s: string) => Number(s.replace(/[$,]/g, ''));

function ago(refTs: number, ts: number, date: string): string {
  const h = Math.round((refTs - ts) / 3600);
  if (h < 1) return 'Now';
  if (h < 36) return `${h} h ago`;
  return dateShort(date);
}

/** Turn one feed headline into ticker fields. Unknown shapes keep the headline as the label. */
function parseFeed(it: RawNewsItem): Pick<TickerItem, 'kind' | 'topic' | 'tag' | 'sym' | 'label' | 'value' | 'delta' | 'href'> {
  const h = it.headline.replace(/\.$/, '');
  let m: RegExpExecArray | null;
  if ((m = /^(ZEC\/BTC|ZEC) ([▲▼]) ([\d.,]+%) today to (.+?) \(from (.+?)\)$/.exec(h))) {
    const ratio = m[1] === 'ZEC/BTC';
    return { sym: ratio ? 'ZEC/BTC 1D' : 'ZEC 1D', kind: ratio ? 'ratio' : 'price', topic: ratio ? 'markets' : 'price', tag: ratio ? 'ZEC/BTC' : 'Price', label: `${m[1]} daily close`, value: m[4], delta: { text: `${m[2]} ${m[3]}`, dir: m[2] === '▲' ? 'up' : 'dn' }, href: ratio ? '/chart/zec-btc-ratio' : '/chart/price' };
  }
  if ((m = /^ZEC is (up|down) ([\d.]+%) over the past week, now (\$[\d,]+(?:\.\d+)?)/.exec(h))) {
    const dir = m[1] === 'up' ? 'up' : 'dn';
    return { sym: 'ZEC 7D', kind: 'price', topic: 'price', tag: 'Price', label: 'ZEC over the past week', value: m[3], delta: { text: `${arrow(dir)} ${m[2]}`, dir }, href: '/chart/price' };
  }
  if ((m = /^All-time high: ([\d.]+) GH\/s network hashrate — previous record ([\d.]+) GH\/s/.exec(h))) {
    const up = ((n(m[1]) - n(m[2])) / n(m[2])) * 100;
    return { sym: 'HASH ATH', kind: 'hashrate', topic: 'network', tag: 'Hashrate', label: 'Hashrate all-time high', value: `${m[1]} GH/s`, delta: { text: `${delta(up).text} vs record`, dir: 'up' }, href: '/chart/hashrate' };
  }
  if ((m = /^Zcash hashrate jumps to ([\d.]+) GH\/s \(([+−-][\d.]+σ)/.exec(h))) {
    return { sym: 'HASH JUMP', kind: 'hashrate', topic: 'network', tag: 'Hashrate', label: 'Hashrate jump', value: `${m[1]} GH/s`, delta: { text: `▲ ${m[2].replace(/^[+]/, '')} vs norm`, dir: 'up' }, href: '/chart/hashrate' };
  }
  if ((m = /^Zcash hashrate is (up|down) ([\d.]+%) this week to ([\d.]+) GH\/s/.exec(h))) {
    const dir = m[1] === 'up' ? 'up' : 'dn';
    return { sym: 'HASH 7D', kind: 'hashrate', topic: 'network', tag: 'Hashrate', label: 'Hashrate this week', value: `${m[3]} GH/s`, delta: { text: `${arrow(dir)} ${m[2]}`, dir }, href: '/chart/hashrate' };
  }
  if ((m = /^([\d,]+) ZEC migrated (\w+) → Ironwood today/.exec(h))) {
    return { sym: 'IW INFLOW', kind: 'flows', topic: 'ironwood', tag: 'Ironwood', label: `${m[2]} → Ironwood in a day`, value: `${m[1]} ZEC`, href: `/chart/${it.chart_id}` };
  }
  if ((m = /^([\d,]+) ZEC (deshielded|shielded) today \(\+([\d.]+)σ\) — vs a 30-day average of ([\d,]+) ZEC\/day/.exec(h))) {
    const out = m[2] === 'deshielded';
    return { sym: out ? 'DESHIELD 1D' : 'SHIELD 1D', kind: 'flows', topic: 'privacy', tag: out ? 'Deshield' : 'Shield', label: `${out ? 'Deshielded' : 'Shielded'} in one day`, value: `${m[1]} ZEC`, delta: { text: `▲ ${m[3]}σ vs 30-day avg`, dir: out ? 'dn' : 'up' }, href: `/chart/${it.chart_id}` };
  }
  if ((m = /^Shielded pool (grew|shrank) ([\d,]+) ZEC this week to ([\d.]+[KMB]?) ZEC \(([\d.]+%) of supply\)/.exec(h))) {
    const dir = m[1] === 'grew' ? 'up' : 'dn';
    return { sym: 'SHIELDED 7D', kind: 'shielded', topic: 'privacy', tag: 'Shielded', label: 'Shielded pool this week', value: `${m[3]} ZEC`, delta: { text: `${arrow(dir)} ${m[2]} ZEC`, dir }, href: '/chart/shielding-rate' };
  }
  if ((m = /^Fully-shielded transactions surge to ([\d,]+) today \(\+([\d.]+)σ/.exec(h))) {
    return { sym: 'SHIELDED TX', kind: 'tx', topic: 'privacy', tag: 'Activity', label: 'Fully-shielded txs in a day', value: m[1], delta: { text: `▲ ${m[2]}σ vs norm`, dir: 'up' }, href: '/chart/tx-types' };
  }
  if ((m = /^Transaction spike — ([\d,]+) txs on-chain, \+([\d.]+)σ/.exec(h))) {
    return { sym: 'TX 1D', kind: 'tx', topic: 'network', tag: 'Activity', label: 'Transactions in a day', value: m[1], delta: { text: `▲ ${m[2]}σ vs norm`, dir: 'up' }, href: '/chart/tx' };
  }
  if ((m = /^This week in ZEC: price ([▲▼]) ([\d.]+%) to (\$[\d,]+(?:\.\d+)?)/.exec(h))) {
    return { sym: 'ZEC WEEK', kind: 'digest', topic: 'price', tag: 'Weekly', label: 'Week in ZEC: price', value: m[3], delta: { text: `${m[1]} ${m[2]}`, dir: m[1] === '▲' ? 'up' : 'dn' }, href: '/news' };
  }
  const topic: TickerTopic = it.theme === 'ratio' ? 'markets' : it.theme === 'hashrate' || it.theme === 'network' ? 'network' : it.theme === 'price' ? 'price' : 'privacy';
  return { sym: 'EVENT', kind: 'network', topic, tag: TOPIC_LABEL[topic], label: h, href: `/chart/${it.chart_id}` };
}

/** Recency-weighted rank: the feed's own importance, halved every week of age. */
const rank = (it: TickerItem, refTs: number) => (it.hot ? Infinity : it.importance * 0.5 ** (Math.max(0, refTs - it.ts) / 86400 / HALF_LIFE_DAYS));

export const getTicker = cache(async (): Promise<TickerData> => {
  const [raw, h, iw, pools30, man] = await Promise.all([api<{ items: RawNewsItem[] }>('news'), getHome(), getIronwood(), getPoolsDaysAgo(30), manifest()]);
  const refTs = Math.floor(Date.parse(man.capturedAt) / 1000);
  const today = man.capturedAt.slice(0, 10);

  // ── state facts: news while they last ──
  const week = iw.days.filter((d) => d.complete).slice(-7);
  const migr7 = (week.reduce((a, d) => a + d.orchard, 0) / iw.base) * 100;
  const shPts = h.pools.shieldedPct - pools30.shieldedPct;
  const netChg = h.net7.prior ? ((h.net7.net - h.net7.prior) / Math.abs(h.net7.prior)) * 100 : NaN;
  const state = (x: Omit<TickerItem, 'date' | 'ts' | 'when' | 'severity'> & { severity?: TickerItem['severity'] }): TickerItem => ({ severity: 'notable', date: today, ts: refTs, when: 'Now', ...x });

  const hot = state({
    id: 'ironwood-migration', sym: 'MIGRATED', kind: 'ironwood', topic: 'ironwood', tag: 'Ironwood', hot: true, severity: 'major', importance: 100,
    label: 'Ironwood migration', value: `${num(iw.pct, 2)}%`, progress: iw.pct,
    delta: { text: `▲ ${num(migr7, 2)} pts in 7 days`, dir: 'up' },
    text: `${num(iw.fromOrchard)} of ${num(iw.base)} Orchard ZEC have crossed into Ironwood, ${iw.liveDays} days after activation.`,
    href: '/ironwood', hrefLabel: 'Open the Ironwood tracker',
  });
  const facts: TickerItem[] = [
    hot,
    state({ id: 'price-now', sym: 'ZEC', kind: 'price', topic: 'price', tag: 'Price', importance: 80, label: 'ZEC price', value: usd(h.live.zec_usd), delta: delta(h.live.zec_usd_change_24h_pct), text: `ZEC trades at ${usd(h.live.zec_usd)}, ${delta(h.live.zec_usd_change_24h_pct).text} in 24 hours.`, href: '/chart/price', hrefLabel: 'Open price chart' }),
    state({ id: 'ratio-now', sym: 'ZEC/BTC', kind: 'ratio', topic: 'markets', tag: 'ZEC/BTC', importance: 60, label: 'ZEC/BTC', value: `${h.live.zec_btc.toFixed(5)} BTC`, delta: delta(h.live.zec_btc_change_24h_pct), text: `One ZEC buys ${h.live.zec_btc.toFixed(5)} BTC, ${delta(h.live.zec_btc_change_24h_pct).text} in 24 hours and ${delta(h.live.zec_btc_change_30d_pct).text} in 30 days.`, href: '/chart/zec-btc-ratio', hrefLabel: 'Open ZEC/BTC chart' }),
    state({ id: 'shielded-share', sym: 'SHIELDED', kind: 'shielded', topic: 'privacy', tag: 'Shielded', importance: 70, label: 'Shielded share of supply', value: pct(h.pools.shieldedPct), delta: { text: `${delta(shPts, 1, ' pts').text} in 30 days`, dir: delta(shPts).dir }, text: `${zecCompact(h.pools.shielded)} (${pct(h.pools.shieldedPct)} of supply) sits in the shielded pools.`, href: '/chart/pools', hrefLabel: 'Open pools chart' }),
    state({ id: 'net-shield-7d', sym: 'NET SHIELD 7D', kind: 'flows', topic: 'privacy', tag: 'Shielding', importance: 62, label: 'Net shielded, last 7 days', value: `${h.net7.net >= 0 ? '+' : '−'}${num(Math.abs(h.net7.net))} ZEC`, delta: Number.isFinite(netChg) ? { text: `${delta(netChg).text} vs prior week`, dir: delta(netChg).dir } : undefined, text: `${num(h.net7.in)} ZEC shielded and ${num(h.net7.out)} ZEC deshielded in the last 7 days.`, href: '/privacy', hrefLabel: 'Open the privacy hub' }),
    state({ id: 'turnstile', sym: 'TURNSTILE', kind: 'turnstile', topic: 'privacy', tag: 'Turnstile', importance: 48, label: 'Orchard turnstile index', value: `${Math.round(h.turnstile.isi)}/100`, text: `The inflation suspicion index reads ${Math.round(h.turnstile.isi)} of 100: ${h.turnstile.verdict.toLowerCase()}.`, href: '/orchard-turnstile', hrefLabel: 'Open turnstile watch' }),
    state({ id: 'mvrv', sym: 'MVRV', kind: 'price', topic: 'price', tag: 'MVRV', importance: 34, label: 'MVRV (price ÷ realized)', value: `${h.mvrv.toFixed(2)}×`, text: `Price is ${h.mvrv.toFixed(2)}× the average coin's cost basis (${usd(h.realizedPrice, 0)}).`, href: '/chart/mvrv', hrefLabel: 'Open MVRV chart' }),
    state({ id: 'halving', sym: 'HALVING', kind: 'network', topic: 'network', tag: 'Halving', importance: 30, label: 'Next halving', value: `~${num(h.halving.days)} days`, text: `${num(h.halving.blocksLeft)} blocks to the next block-reward halving.`, href: '/halving', hrefLabel: 'Open halving countdown' }),
    state({ id: 'nodes', sym: 'NODES', kind: 'network', topic: 'network', tag: 'Nodes', importance: 26, label: 'Reachable nodes', value: num(h.nodes.reachable), text: `${num(h.nodes.reachable)} reachable nodes in ${h.nodes.countries} countries.`, href: '/network', hrefLabel: 'Open network map' }),
    state({ id: 'near-bridge', sym: 'NEAR', kind: 'markets', topic: 'markets', tag: 'NEAR', importance: 32, label: 'ZEC bridged to NEAR', value: zecCompact(h.near.bridge), text: `${num(h.near.bridge)} ZEC is held on NEAR (wrapped), as of ${dateShort(h.near.bridgeDate)}.`, href: '/chart/near-bridge', hrefLabel: 'Open NEAR bridge chart' }),
    state({ id: 'hl-oi', sym: 'PERP OI', kind: 'markets', topic: 'markets', tag: 'Perps', importance: 24, label: 'Hyperliquid open interest', value: usdCompact(h.hl.oi), text: `${usdCompact(h.hl.oi)} of ZEC perpetuals open on Hyperliquid (funding ${compact(h.hl.funding, 2)}% APR).`, href: '/chart/hl-oi', hrefLabel: 'Open open-interest chart' }),
  ];

  // ── feed events, last 30 days ──
  const cutoff = refTs - FEED_DAYS * 86400;
  const feed: TickerItem[] = raw.items
    .filter((i) => !i.live && i.ts >= cutoff)
    .map((i, k) => {
      const p = parseFeed(i);
      return {
        ...p, id: `news-${i.ts}-${k}`, text: i.headline, body: i.body, date: i.date, ts: i.ts, when: ago(refTs, i.ts, i.date),
        importance: Math.round(i.importance), severity: i.severity,
        hrefLabel: p.href === '/news' ? 'Open the news feed' : `Open ${CHART_LABEL[p.href.replace('/chart/', '')] ?? 'chart'}`,
        newsHref: '/news',
      };
    });

  // Global list: one per (kind, date) so a same-day ZEC + ZEC/BTC move reads once (the feed merges them the same way).
  const seen = new Set<string>();
  const pool = [...facts, ...feed].sort((a, b) => rank(b, refTs) - rank(a, refTs));
  const items: TickerItem[] = [];
  for (const it of pool) {
    const key = it.date === today ? it.id : `${it.topic === 'markets' && it.kind === 'ratio' ? 'price' : it.topic}-${it.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(it);
    if (items.length >= MAX_ITEMS) break;
  }

  const topics: TickerTopicGroup[] = (Object.keys(TOPIC_LABEL) as TickerTopic[]).map((key) => ({
    key, label: TOPIC_LABEL[key],
    // one card per label (the newest record, not two "all-time high" cards)
    items: [...facts, ...feed].filter((i) => i.topic === key).sort((a, b) => rank(b, refTs) - rank(a, refTs))
      .filter((i, k, xs) => xs.findIndex((x) => x.label === i.label) === k).slice(0, PER_TOPIC),
  }));

  // Breaking: the newest MAJOR feed event, shown for 48 h after it was posted.
  const major = feed.filter((i) => i.severity === 'major').sort((a, b) => b.ts - a.ts)[0];
  const breaking = major && refTs - major.ts < BREAKING_HOURS * 3600 ? { ...major, postedTs: major.ts, expiresTs: major.ts + BREAKING_HOURS * 3600 } : null;

  // For the two-row tape: quotes (state facts, fast row) and events (the 12 newest feed events, slow row).
  const quotes = facts.slice(0, MAX_ITEMS);
  const events = feed.slice(0, MAX_ITEMS); // the feed is newest-first already

  return { asOf: man.capturedAt, refTs, items, quotes, events, topics, hot, breaking };
});
