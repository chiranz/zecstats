import 'server-only';
import { cache } from 'react';
import { api, manifest } from './core';
import { getCompleteDailyStats, getDailyPrices, getLatestBlock, getLive, getPools, poolsFromRow, type DailyStat } from './snapshot';
import { getMetricSeries } from './tools';

// /news: the live site's auto-written event feed (/api/news), plus a 30-day context series for every item so each
// card can carry a sparkline and, when expanded, a small chart with the 30-day norm. The series are derived from the
// same endpoints the linked chart uses (daily-prices, daily-stats); nothing is invented.

export type RawNewsItem = { body: string; chart_id: string; date: string; headline: string; importance: number; live?: boolean; severity: 'notable' | 'major'; spark?: number[]; theme: string; ts: number; z: number };
export type RawNews = { items: RawNewsItem[]; next_before: number };

export type NewsTheme = 'price' | 'ratio' | 'hashrate' | 'shielded' | 'flows' | 'tx' | 'network';
export type NewsCtx = { values: number[]; from: string; to: string; unit: 'usd' | 'btc' | 'ghs' | 'zec' | 'count'; norm?: { mean: number; sd: number } };
export type NewsItem = {
  id: string; ts: number; date: string; theme: NewsTheme; severity: 'notable' | 'major'; z: number;
  headline: string; body: string; chartHref: string;
  lines?: string[]; merged?: number; title?: string;
  ctx?: NewsCtx;
};
export type NewsNow = {
  ts: number; price: number; change24h: number; spark: number[]; shieldedPct: number; height: number;
  hashNow: number | null; hashDaily: { value: number; date: string }; hash7d: { value: number; date: string };
};
export type NewsData = { now: NewsNow; items: NewsItem[]; nextBefore: number; refTs: number };

const getRawNews = () => api<RawNews>('news');

const THEMES: NewsTheme[] = ['price', 'ratio', 'hashrate', 'shielded', 'flows', 'tx', 'network'];
const ghs = (r: DailyStat) => (r.avg_difficulty * 8192) / 75 / 1e9; // live site: difficulty · 2¹³ / 75 s target spacing

function ctxFor(item: RawNewsItem, prices: { date: string; zec_usd: number; btc_usd: number }[], stats: DailyStat[]): NewsCtx | undefined {
  const theme = item.theme as NewsTheme;
  let rows: { date: string; v: number }[];
  let unit: NewsCtx['unit'];
  if (theme === 'price' || theme === 'network') { rows = prices.map((p) => ({ date: p.date, v: p.zec_usd })); unit = 'usd'; }
  else if (theme === 'ratio') { rows = prices.map((p) => ({ date: p.date, v: p.zec_usd / p.btc_usd })); unit = 'btc'; }
  else if (theme === 'hashrate') { rows = stats.map((r) => ({ date: r.date, v: ghs(r) })); unit = 'ghs'; }
  else if (theme === 'tx') {
    const fully = item.chart_id === 'tx-types';
    rows = stats.map((r) => ({ date: r.date, v: fully ? r.tx_fully_shielded : r.tx_count })); unit = 'count';
  } else if (theme === 'flows' && /deshielded|shielded today/.test(item.headline)) {
    // ZEC leaving (or entering) the shielded pools that day — the sum the feed's own figure matches
    const out = /deshielded/.test(item.headline);
    rows = stats.map((r) => ({ date: r.date, v: (out ? r.sprout_outflow_zat + r.sapling_outflow_zat + r.orchard_outflow_zat + r.ironwood_outflow_zat : r.sprout_inflow_zat + r.sapling_inflow_zat + r.orchard_inflow_zat) / 1e8 }));
    unit = 'zec';
  } else if (theme === 'flows') { rows = stats.map((r) => ({ date: r.date, v: r.ironwood_inflow_shielded_zat / 1e8 })); unit = 'zec'; } // pool-to-pool into Ironwood
  else if (theme === 'shielded') { rows = stats.map((r) => ({ date: r.date, v: poolsFromRow(r).shielded })); unit = 'zec'; }
  else return undefined;
  const end = rows.findIndex((r) => r.date === item.date);
  if (end < 0) return undefined;
  const win = rows.slice(Math.max(0, end - 30), end + 1);
  const ctx: NewsCtx = { values: win.map((r) => Number(r.v.toPrecision(6))), from: win[0].date, to: win.at(-1)!.date, unit };
  if (item.z) {
    const prior = win.slice(0, -1).map((r) => r.v);
    const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
    const sd = Math.sqrt(prior.reduce((a, b) => a + (b - mean) ** 2, 0) / prior.length);
    ctx.norm = { mean: Number(mean.toPrecision(6)), sd: Number(sd.toPrecision(6)) };
  }
  return ctx;
}

const MOVE = /^(ZEC\/BTC|ZEC) ([▲▼]) ([\d.,]+%) today to (.+?) \(from (.+?)\)\.?$/;

/** Price and ZEC/BTC moves on the same day in the same direction read as one event: merge them into one card. */
function mergeSameDay(items: NewsItem[]): NewsItem[] {
  const out: NewsItem[] = [];
  for (const it of items) {
    const m = MOVE.exec(it.headline);
    const prev = out.at(-1);
    const pm = prev && !prev.merged ? MOVE.exec(prev.headline) : null;
    if (m && prev && pm && prev.date === it.date && m[1] !== pm[1] && m[2] === pm[2] && (prev.theme === 'price' || prev.theme === 'ratio')) {
      const both = [pm, m].sort((a) => (a[1] === 'ZEC' ? -1 : 1));
      const word = m[2] === '▼' ? 'drop' : 'jump';
      out[out.length - 1] = {
        ...prev,
        id: `${prev.id}+${it.id}`,
        merged: 2,
        severity: prev.severity === 'major' || it.severity === 'major' ? 'major' : 'notable',
        title: `Price ${word}: ZEC and ZEC/BTC ${m[2] === '▼' ? 'fell' : 'rose'} on the same day`,
        lines: both.map((x) => `${x[2]} ${x[3]} ${x[1]} to ${x[4]} (from ${x[5].replace(/ BTC$/, '')})`),
        body: `One event, two prices: ZEC ${m[2] === '▼' ? 'fell' : 'rose'} against both the dollar and Bitcoin on the same daily close. Daily close-to-close moves.`,
      };
      continue;
    }
    out.push(it);
  }
  return out;
}

export const getNews = cache(async (): Promise<NewsData> => {
  const [raw, prices, stats, live, pools, lb, ms, man] = await Promise.all([getRawNews(), getDailyPrices(), getCompleteDailyStats(), getLive(), getPools(), getLatestBlock(), getMetricSeries(), manifest()]);
  const liveItem = raw.items.find((i) => i.live);
  const feed: NewsItem[] = raw.items
    .filter((i) => !i.live)
    .map((i, k) => ({
      id: `${i.ts}-${k}`, ts: i.ts, date: i.date, theme: (THEMES.includes(i.theme as NewsTheme) ? i.theme : 'network') as NewsTheme,
      severity: i.severity, z: i.z, headline: i.headline, body: i.body, chartHref: `/chart/${i.chart_id}`, ctx: ctxFor(i, prices, stats),
    }));
  const hashSeries = ms.metrics.find((m) => m.name === 'Network Hashrate')!.series;
  const lastStat = stats.at(-1)!;
  const hashNow = liveItem ? Number(/hashrate ([\d.]+) GH\/s/.exec(liveItem.headline)?.[1] ?? NaN) : NaN;
  const now: NewsNow = {
    ts: liveItem?.ts ?? Math.floor(Date.parse(man.capturedAt) / 1000),
    price: live.zec_usd, change24h: live.zec_usd_change_24h_pct, spark: liveItem?.spark ?? prices.slice(-30).map((p) => p.zec_usd),
    shieldedPct: pools.shieldedPct, height: lb.height,
    hashNow: Number.isFinite(hashNow) ? hashNow : null,
    hashDaily: { value: ghs(lastStat), date: lastStat.date },
    hash7d: { value: (hashSeries.at(-1) ?? 0) / 1e9, date: ms.dates.at(-1)! },
  };
  return { now, items: mergeSameDay(feed), nextBefore: raw.next_before, refTs: Math.floor(Date.parse(man.capturedAt) / 1000) };
});
