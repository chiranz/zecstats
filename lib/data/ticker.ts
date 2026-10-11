import 'server-only';
import { cache } from 'react';
import { DATA_SOURCE, api, manifest } from './core';
import { getHome } from './home';
import { getIronwood } from './ironwood';
import { getPoolsDaysAgo } from './snapshot';
import { dateShort, delta, num, pct, usd, zecCompact } from '../format';

// Event ticker: the hot topics and on-chain events a visitor should look at, newest and most important first.
// Two sources, both from the snapshot: the node's own event feed (/api/news) and "state" facts that are news while they
// last (the Ironwood migration, price now, the shielded share …). Nothing here is invented; every value is parsed from
// a feed headline or computed the same way the dashboard computes it (lib/data/home.ts).

export type TickerKind = 'ironwood' | 'price' | 'ratio' | 'hashrate' | 'shielded' | 'flows' | 'tx' | 'digest' | 'turnstile' | 'network' | 'markets';
export type TickerDelta = { text: string; dir: 'up' | 'dn' | 'flat' };
export type TickerItem = {
  id: string;
  kind: TickerKind;
  tag: string;             // short category chip ("IRONWOOD", "PRICE" …)
  label: string;           // compact one-line headline
  value?: string;
  delta?: TickerDelta;     // always carries ▲/▼ in its text
  href: string;            // feed events: their card on /news (#ev-<ts>-<k>); metrics: the page that explains them
  date: string;            // YYYY-MM-DD (UTC)
  ts: number;              // unix seconds
  when: string;            // "Now", "14 h ago", "Oct 9"
  importance: number;      // 0–100 as given by the feed (or assigned for state facts)
  hot?: boolean;           // the ONE thing that gets the neon treatment
  progress?: number;       // 0–100, for a mini bar (Ironwood)
};
export type TickerData = { refTs: number; items: TickerItem[] };

type RawNewsItem = { body: string; chart_id: string; date: string; headline: string; importance: number; live?: boolean; severity: 'notable' | 'major'; theme: string; ts: number; z: number };

// same-day events in one group read once in the tape (e.g. a ZEC and a ZEC/BTC move on the same close)
const GROUP: Record<TickerKind, string> = { ironwood: 'ironwood', price: 'price', ratio: 'price', digest: 'price', shielded: 'privacy', flows: 'privacy', turnstile: 'privacy', tx: 'privacy', hashrate: 'network', network: 'network', markets: 'markets' };

const MAX_ITEMS = 12;
const FEED_DAYS = 30;
const HALF_LIFE_DAYS = 7;

const arrow = (dir: 'up' | 'dn') => (dir === 'up' ? '▲' : '▼');
const n = (s: string) => Number(s.replace(/[$,]/g, ''));

function ago(refTs: number, ts: number, date: string): string {
  const h = Math.round((refTs - ts) / 3600);
  if (h < 1) return 'Now';
  if (h < 36) return `${h} h ago`;
  return dateShort(date);
}

/** Turn one feed headline into ticker fields. Unknown shapes keep the headline as the label. */
function parseFeed(it: RawNewsItem): Pick<TickerItem, 'kind' | 'tag' | 'label' | 'value' | 'delta'> {
  const h = it.headline.replace(/\.$/, '');
  let m: RegExpExecArray | null;
  if ((m = /^(ZEC\/BTC|ZEC) ([▲▼]) ([\d.,]+%) today to (.+?) \(from (.+?)\)$/.exec(h))) {
    const ratio = m[1] === 'ZEC/BTC';
    return { kind: ratio ? 'ratio' : 'price', tag: ratio ? 'ZEC/BTC' : 'Price', label: `${m[1]} daily close`, value: m[4], delta: { text: `${m[2]} ${m[3]}`, dir: m[2] === '▲' ? 'up' : 'dn' } };
  }
  if ((m = /^ZEC is (up|down) ([\d.]+%) over the past week, now (\$[\d,]+(?:\.\d+)?)/.exec(h))) {
    const dir = m[1] === 'up' ? 'up' : 'dn';
    return { kind: 'price', tag: 'Price', label: 'ZEC over the past week', value: m[3], delta: { text: `${arrow(dir)} ${m[2]}`, dir } };
  }
  if ((m = /^All-time high: ([\d.]+) GH\/s network hashrate — previous record ([\d.]+) GH\/s/.exec(h))) {
    const up = ((n(m[1]) - n(m[2])) / n(m[2])) * 100;
    return { kind: 'hashrate', tag: 'Hashrate', label: 'Hashrate all-time high', value: `${m[1]} GH/s`, delta: { text: `${delta(up).text} vs record`, dir: 'up' } };
  }
  if ((m = /^Zcash hashrate jumps to ([\d.]+) GH\/s \(([+−-][\d.]+σ)/.exec(h))) {
    return { kind: 'hashrate', tag: 'Hashrate', label: 'Hashrate jump', value: `${m[1]} GH/s`, delta: { text: `▲ ${m[2].replace(/^[+]/, '')} vs norm`, dir: 'up' } };
  }
  if ((m = /^Zcash hashrate is (up|down) ([\d.]+%) this week to ([\d.]+) GH\/s/.exec(h))) {
    const dir = m[1] === 'up' ? 'up' : 'dn';
    return { kind: 'hashrate', tag: 'Hashrate', label: 'Hashrate this week', value: `${m[3]} GH/s`, delta: { text: `${arrow(dir)} ${m[2]}`, dir } };
  }
  if ((m = /^([\d,]+) ZEC migrated (\w+) → Ironwood today/.exec(h))) {
    return { kind: 'ironwood', tag: 'Ironwood', label: `${m[2]} → Ironwood in a day`, value: `${m[1]} ZEC` };
  }
  if ((m = /^([\d,]+) ZEC (deshielded|shielded) today \(\+([\d.]+)σ\) — vs a 30-day average of ([\d,]+) ZEC\/day/.exec(h))) {
    const out = m[2] === 'deshielded';
    return { kind: 'flows', tag: out ? 'Deshield' : 'Shield', label: `${out ? 'Deshielded' : 'Shielded'} in one day`, value: `${m[1]} ZEC`, delta: { text: `▲ ${m[3]}σ vs 30-day avg`, dir: out ? 'dn' : 'up' } };
  }
  if ((m = /^Shielded pool (grew|shrank) ([\d,]+) ZEC this week to ([\d.]+[KMB]?) ZEC \(([\d.]+%) of supply\)/.exec(h))) {
    const dir = m[1] === 'grew' ? 'up' : 'dn';
    return { kind: 'shielded', tag: 'Shielded', label: 'Shielded pool this week', value: `${m[3]} ZEC`, delta: { text: `${arrow(dir)} ${m[2]} ZEC`, dir } };
  }
  if ((m = /^Fully-shielded transactions surge to ([\d,]+) today \(\+([\d.]+)σ/.exec(h))) {
    return { kind: 'tx', tag: 'Activity', label: 'Fully-shielded txs in a day', value: m[1], delta: { text: `▲ ${m[2]}σ vs norm`, dir: 'up' } };
  }
  if ((m = /^Transaction spike — ([\d,]+) txs on-chain, \+([\d.]+)σ/.exec(h))) {
    return { kind: 'tx', tag: 'Activity', label: 'Transactions in a day', value: m[1], delta: { text: `▲ ${m[2]}σ vs norm`, dir: 'up' } };
  }
  if ((m = /^This week in ZEC: price ([▲▼]) ([\d.]+%) to (\$[\d,]+(?:\.\d+)?)/.exec(h))) {
    return { kind: 'digest', tag: 'Weekly', label: 'Week in ZEC: price', value: m[3], delta: { text: `${m[1]} ${m[2]}`, dir: m[1] === '▲' ? 'up' : 'dn' } };
  }
  const kind: TickerKind = it.theme === 'ratio' ? 'ratio' : it.theme === 'hashrate' ? 'hashrate' : it.theme === 'price' ? 'price' : it.theme === 'network' ? 'network' : 'shielded';
  return { kind, tag: it.theme === 'ratio' ? 'ZEC/BTC' : it.theme.charAt(0).toUpperCase() + it.theme.slice(1), label: h };
}

/** Recency-weighted rank: the feed's own importance, halved every week of age. */
const rank = (it: TickerItem, refTs: number) => (it.hot ? Infinity : it.importance * 0.5 ** (Math.max(0, refTs - it.ts) / 86400 / HALF_LIFE_DAYS));

export const getTicker = cache(async (): Promise<TickerData> => {
  const [raw, h, iw, pools30, man] = await Promise.all([api<{ items: RawNewsItem[] }>('news'), getHome(), getIronwood(), getPoolsDaysAgo(30), manifest()]);
  // "now": the snapshot's capture time, or the real clock when reading the live site
  const refTs = DATA_SOURCE === 'live' ? Math.floor(Date.now() / 1000) : Math.floor(Date.parse(man.capturedAt) / 1000);
  const today = new Date(refTs * 1000).toISOString().slice(0, 10);

  // ── state facts: news while they last (they link to the page that explains them) ──
  const week = iw.days.filter((d) => d.complete).slice(-7);
  const migr7 = (week.reduce((a, d) => a + d.orchard, 0) / iw.base) * 100;
  const shPts = h.pools.shieldedPct - pools30.shieldedPct;
  const netChg = h.net7.prior ? ((h.net7.net - h.net7.prior) / Math.abs(h.net7.prior)) * 100 : NaN;
  const state = (x: Omit<TickerItem, 'date' | 'ts' | 'when'>): TickerItem => ({ date: today, ts: refTs, when: 'Now', ...x });

  const facts: TickerItem[] = [
    state({ id: 'ironwood-migration', kind: 'ironwood', tag: 'Ironwood', hot: true, importance: 100, label: 'Ironwood migration', value: `${num(iw.pct, 2)}%`, progress: iw.pct, delta: { text: `▲ ${num(migr7, 2)} pts in 7 days`, dir: 'up' }, href: '/ironwood' }),
    state({ id: 'price-now', kind: 'price', tag: 'Price', importance: 80, label: 'ZEC price', value: usd(h.live.zec_usd), delta: delta(h.live.zec_usd_change_24h_pct), href: '/chart/price' }),
    state({ id: 'ratio-now', kind: 'ratio', tag: 'ZEC/BTC', importance: 60, label: 'ZEC/BTC', value: `${h.live.zec_btc.toFixed(5)} BTC`, delta: delta(h.live.zec_btc_change_24h_pct), href: '/chart/zec-btc-ratio' }),
    state({ id: 'shielded-share', kind: 'shielded', tag: 'Shielded', importance: 70, label: 'Shielded share of supply', value: pct(h.pools.shieldedPct), delta: { text: `${delta(shPts, 1, ' pts').text} in 30 days`, dir: delta(shPts).dir }, href: '/chart/pools' }),
    state({ id: 'net-shield-7d', kind: 'flows', tag: 'Shielding', importance: 62, label: 'Net shielded, last 7 days', value: `${h.net7.net >= 0 ? '+' : '−'}${num(Math.abs(h.net7.net))} ZEC`, delta: Number.isFinite(netChg) ? { text: `${delta(netChg).text} vs prior week`, dir: delta(netChg).dir } : undefined, href: '/privacy' }),
    state({ id: 'turnstile', kind: 'turnstile', tag: 'Turnstile', importance: 48, label: 'Orchard turnstile index', value: `${Math.round(h.turnstile.isi)}/100`, href: '/orchard-turnstile' }),
    state({ id: 'mvrv', kind: 'price', tag: 'MVRV', importance: 34, label: 'MVRV (price ÷ realized)', value: `${h.mvrv.toFixed(2)}×`, href: '/chart/mvrv' }),
    state({ id: 'near-bridge', kind: 'markets', tag: 'NEAR', importance: 32, label: 'ZEC bridged to NEAR', value: zecCompact(h.near.bridge), href: '/chart/near-bridge' }),
  ];

  // ── feed events, last 30 days: each links to its own card on /news. k = index among non-live items, the same
  // key lib/data/news.ts gives the card (ev-<ts>-<k>) ──
  const cutoff = refTs - FEED_DAYS * 86400;
  const feed: TickerItem[] = raw.items
    .filter((i) => !i.live)
    .map((i, k) => ({ ...parseFeed(i), id: `${i.ts}-${k}`, href: `/news#ev-${i.ts}-${k}`, date: i.date, ts: i.ts, when: ago(refTs, i.ts, i.date), importance: Math.round(i.importance) }))
    .filter((i) => i.ts >= cutoff);

  // one per (group, day) so a same-day ZEC + ZEC/BTC move reads once (the feed merges them the same way)
  const seen = new Set<string>();
  const items: TickerItem[] = [];
  for (const it of [...facts, ...feed].sort((a, b) => rank(b, refTs) - rank(a, refTs))) {
    const key = it.date === today && it.when === 'Now' ? it.id : `${GROUP[it.kind]}-${it.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(it);
    if (items.length >= MAX_ITEMS) break;
  }
  return { refTs, items };
});
