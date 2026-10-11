import 'server-only';
import { cache } from 'react';
import { DATA_SOURCE, api, manifest } from './core';
import { getHome } from './home';
import { getIronwood } from './ironwood';
import { getPoolsDaysAgo } from './snapshot';
import { dateShort, delta, num, pct, usd, zecCompact, type Good } from '../format';

// Event ticker: the hot topics and on-chain events a visitor should look at, newest and most important first.
// Two sources, both from the snapshot: the node's own event feed (/api/news) and "state" facts that are news while they
// last (the Ironwood migration, price now, the shielded share …). Nothing here is invented; every value is parsed from
// a feed headline or computed the same way the dashboard computes it (lib/data/home.ts).

export type TickerKind = 'ironwood' | 'price' | 'ratio' | 'hashrate' | 'shielded' | 'flows' | 'tx' | 'digest' | 'turnstile' | 'network' | 'markets';
/** The change: `text` always has ▲/▼ unless flat; `tone` is the colour (good/bad), which need not follow the arrow (a deshield spike is ▲ and bad). */
export type TickerDelta = { text: string; dir: 'up' | 'dn' | 'flat'; tone: 'good' | 'bad' | 'neutral' };
export type TickerItem = {
  id: string;
  kind: TickerKind;
  tag: string;             // the symbol on the tape ("IRONWOOD", "ZEC" …)
  qual?: string;           // one-token qualifier when the tag alone is ambiguous ("ATH", "7D", "1D", "Close")
  label: string;           // full name: the hover card's title; the tape shows it only when there is no value
  value?: string;
  delta?: TickerDelta;     // the bare change, always with ▲/▼ ("▲ 1.4%"); arrow = direction, tone = good/bad
  per?: string;            // the change's period, printed after it on the tape ("24h", "30d"); omitted when `qual` already says it
  window?: string;         // what the change is measured over, in words ("in 24 h", "vs previous record"); hover card and screen readers
  note?: string;           // hover card: why the colour is what it is, when that is not obvious
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
/** A parsed change: direction from the headline, colour from which way is good. */
const chg = (dir: 'up' | 'dn', body: string, good: Good = 'up'): TickerDelta => ({ text: `${arrow(dir)} ${body}`, dir, tone: good === 'neutral' ? 'neutral' : (dir === 'up') === (good === 'up') ? 'good' : 'bad' });
const fromDelta = ({ text, dir, tone }: ReturnType<typeof delta>): TickerDelta => ({ text, dir, tone });
const DESHIELD_NOTE = 'Arrow: above the usual level. Red: ZEC leaving the shielded pools is bad for privacy.';
const n = (s: string) => Number(s.replace(/[$,]/g, ''));

function ago(refTs: number, ts: number, date: string): string {
  const h = Math.round((refTs - ts) / 3600);
  if (h < 1) return 'Now';
  if (h < 36) return `${h} h ago`;
  return dateShort(date);
}

/** Turn one feed headline into ticker fields. Unknown shapes keep the headline as the label. */
function parseFeed(it: RawNewsItem): Pick<TickerItem, 'kind' | 'tag' | 'qual' | 'label' | 'value' | 'delta' | 'per' | 'window' | 'note'> {
  const h = it.headline.replace(/\.$/, '');
  let m: RegExpExecArray | null;
  if ((m = /^(ZEC\/BTC|ZEC) ([▲▼]) ([\d.,]+%) today to (.+?) \(from (.+?)\)$/.exec(h))) {
    const ratio = m[1] === 'ZEC/BTC';
    return { kind: ratio ? 'ratio' : 'price', tag: ratio ? 'ZEC/BTC' : 'ZEC', qual: 'Close', label: `${m[1]} daily close`, value: m[4], delta: chg(m[2] === '▲' ? 'up' : 'dn', m[3]), window: 'on the day' };
  }
  if ((m = /^ZEC is (up|down) ([\d.]+%) over the past week, now (\$[\d,]+(?:\.\d+)?)/.exec(h))) {
    const dir = m[1] === 'up' ? 'up' : 'dn';
    return { kind: 'price', tag: 'ZEC', qual: '7D', label: 'ZEC over the past week', value: m[3], delta: chg(dir, m[2]), window: 'over the week' };
  }
  if ((m = /^All-time high: ([\d.]+) GH\/s network hashrate — previous record ([\d.]+) GH\/s/.exec(h))) {
    const up = ((n(m[1]) - n(m[2])) / n(m[2])) * 100;
    return { kind: 'hashrate', tag: 'Hashrate', qual: 'ATH', label: 'Hashrate all-time high', value: `${m[1]} GH/s`, delta: fromDelta(delta(up)), window: 'vs previous record' };
  }
  if ((m = /^Zcash hashrate jumps to ([\d.]+) GH\/s \(([+−-][\d.]+σ)/.exec(h))) {
    return { kind: 'hashrate', tag: 'Hashrate', qual: '1D', label: 'Hashrate jump', value: `${m[1]} GH/s`, delta: chg('up', m[2].replace(/^[+]/, '')), per: 'vs 30d', window: 'vs 30-day norm' };
  }
  if ((m = /^Zcash hashrate is (up|down) ([\d.]+%) this week to ([\d.]+) GH\/s/.exec(h))) {
    const dir = m[1] === 'up' ? 'up' : 'dn';
    return { kind: 'hashrate', tag: 'Hashrate', qual: '7D', label: 'Hashrate this week', value: `${m[3]} GH/s`, delta: chg(dir, m[2]), window: 'over the week' };
  }
  if ((m = /^([\d,]+) ZEC migrated (\w+) → Ironwood today/.exec(h))) {
    return { kind: 'ironwood', tag: 'Ironwood', qual: '1D', label: `${m[2]} → Ironwood in a day`, value: `${m[1]} ZEC` };
  }
  if ((m = /^([\d,]+) ZEC (deshielded|shielded) today \(\+([\d.]+)σ\) — vs a 30-day average of ([\d,]+) ZEC\/day/.exec(h))) {
    const out = m[2] === 'deshielded';
    return { kind: 'flows', tag: out ? 'Deshield' : 'Shield', qual: '1D', label: `${out ? 'Deshielded' : 'Shielded'} in one day`, value: `${m[1]} ZEC`, delta: chg('up', `${m[3]}σ`, out ? 'down' : 'up'), per: 'vs 30d', window: 'vs 30-day average', note: out ? DESHIELD_NOTE : undefined };
  }
  if ((m = /^Shielded pool (grew|shrank) ([\d,]+) ZEC this week to ([\d.]+[KMB]?) ZEC \(([\d.]+%) of supply\)/.exec(h))) {
    const dir = m[1] === 'grew' ? 'up' : 'dn';
    return { kind: 'shielded', tag: 'Shielded', qual: '7D', label: 'Shielded pool this week', value: `${m[3]} ZEC`, delta: chg(dir, `${m[2]} ZEC`), window: 'over the week' };
  }
  if ((m = /^Fully-shielded transactions surge to ([\d,]+) today \(\+([\d.]+)σ/.exec(h))) {
    return { kind: 'tx', tag: 'Shielded txs', qual: '1D', label: 'Fully-shielded transactions in a day', value: m[1], delta: chg('up', `${m[2]}σ`), per: 'vs 30d', window: 'vs 30-day norm' };
  }
  if ((m = /^Transaction spike — ([\d,]+) txs on-chain, \+([\d.]+)σ/.exec(h))) {
    return { kind: 'tx', tag: 'Txs', qual: '1D', label: 'Transactions in a day', value: m[1], delta: chg('up', `${m[2]}σ`, 'neutral'), per: 'vs 30d', window: 'vs 30-day norm' };
  }
  if ((m = /^This week in ZEC: price ([▲▼]) ([\d.]+%) to (\$[\d,]+(?:\.\d+)?)/.exec(h))) {
    return { kind: 'digest', tag: 'ZEC', qual: '7D', label: 'Week in ZEC: price', value: m[3], delta: chg(m[1] === '▲' ? 'up' : 'dn', m[2]), window: 'over the week' };
  }
  const kind: TickerKind = it.theme === 'ratio' ? 'ratio' : it.theme === 'hashrate' ? 'hashrate' : it.theme === 'price' ? 'price' : it.theme === 'network' ? 'network' : 'shielded';
  // unknown shape: no value, so the tape shows the headline itself
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
  // a % change of a signed net flow is meaningless (it flips across zero): say the absolute change in ZEC
  const netChg = Number.isFinite(h.net7.prior) ? h.net7.net - h.net7.prior : NaN;
  const state = (x: Omit<TickerItem, 'date' | 'ts' | 'when'>): TickerItem => ({ date: today, ts: refTs, when: 'Now', ...x });

  const facts: TickerItem[] = [
    state({ id: 'ironwood-migration', kind: 'ironwood', tag: 'Ironwood', hot: true, importance: 100, label: 'Ironwood migration', value: `${num(iw.pct, 2)}%`, progress: iw.pct, delta: fromDelta(delta(migr7, 2, ' pts')), per: '7d', window: 'in 7 days', href: '/ironwood' }),
    state({ id: 'price-now', kind: 'price', tag: 'ZEC', importance: 80, label: 'ZEC price', value: usd(h.live.zec_usd), delta: fromDelta(delta(h.live.zec_usd_change_24h_pct)), per: '24h', window: 'in 24 h', href: '/chart/price' }),
    state({ id: 'ratio-now', kind: 'ratio', tag: 'ZEC/BTC', importance: 60, label: 'ZEC/BTC', value: h.live.zec_btc.toFixed(5), delta: fromDelta(delta(h.live.zec_btc_change_24h_pct)), per: '24h', window: 'in 24 h', href: '/chart/zec-btc-ratio' }),
    state({ id: 'shielded-share', kind: 'shielded', tag: 'Shielded', importance: 70, label: 'Shielded share of supply', value: pct(h.pools.shieldedPct), delta: fromDelta(delta(shPts, 2, ' pts')), per: '30d', window: 'in 30 days', href: '/chart/pools' }),
    state({ id: 'net-shield-7d', kind: 'flows', tag: 'Net shield', qual: '7D', importance: 62, label: 'Net shielded, last 7 days', value: `${h.net7.net >= 0 ? '+' : '−'}${num(Math.abs(h.net7.net))} ZEC`, delta: Number.isFinite(netChg) ? fromDelta(delta(netChg, 0, ' ZEC')) : undefined, per: 'vs prior wk', window: 'vs the week before', href: '/privacy' }),
    state({ id: 'turnstile', kind: 'turnstile', tag: 'Turnstile', importance: 48, label: 'Orchard turnstile index', value: `${Math.round(h.turnstile.isi)}/100`, href: '/orchard-turnstile' }),
    state({ id: 'mvrv', kind: 'price', tag: 'MVRV', importance: 34, label: 'MVRV: price ÷ realized price', value: `${h.mvrv.toFixed(2)}×`, href: '/chart/mvrv' }),
    state({ id: 'near-bridge', kind: 'markets', tag: 'NEAR bridge', importance: 32, label: 'ZEC bridged to NEAR', value: zecCompact(h.near.bridge), href: '/chart/near-bridge' }),
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
