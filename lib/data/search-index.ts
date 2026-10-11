import 'server-only';
import { cache } from 'react';
import { api } from './core';
import { toolGroups } from '../site';
import type { SearchItem } from '../search';

type LiveChartEntry = { c: string; d: string; id: string; t: string; u: string };

// Synonyms so "z-to-z", "cost basis" or "anonymity" find the right chart.
const SYNONYMS: Record<string, string> = {
  'orchard-internal': 'z-to-z zto z fully shielded internal',
  'realized-all': 'cost basis realised',
  realized: 'cost basis realised',
  mvrv: 'cost basis profit',
  anonymity: 'anonymity set privacy set',
  pools: 'shielded supply sapling orchard ironwood sprout',
  'shielding-rate': 'shielded percent privacy adoption',
  hashrate: 'mining difficulty security',
  'total-fees': 'fees fee revenue',
  fees: 'fee distribution',
  price: 'usd zec price',
  'zec-btc-ratio': 'bitcoin btc ratio',
};

const POPULAR = new Set(['price', 'pools', 'shielding-rate', 'realized-all', 'hashrate', '/privacy', '/ironwood', '/savings']);

export const getSearchIndex = cache(async (): Promise<SearchItem[]> => {
  const live = await api<LiveChartEntry[]>('charts');
  const charts: SearchItem[] = live
    .filter((x) => x.u.startsWith('/chart/'))
    .map((x) => ({ kind: 'Chart', title: x.t, href: x.u, desc: x.d, group: x.c, keywords: SYNONYMS[x.id], popular: POPULAR.has(x.id) }));
  const tools: SearchItem[] = toolGroups.flatMap((g) => g.links.map((l) => ({ kind: 'Tool' as const, title: l.label, href: l.href, desc: l.desc, group: g.title, popular: POPULAR.has(l.href) })));
  const pages: SearchItem[] = [
    { kind: 'Page', title: 'Dashboard', href: '/', desc: 'Every headline Zcash number' },
    { kind: 'Page', title: 'Privacy hub', href: '/privacy', desc: 'Shielded supply, pools, flows, Ironwood', keywords: 'shielded privacy pools', popular: true },
    { kind: 'Page', title: 'All charts', href: '/charts', desc: 'All 58 charts, grouped by question' },
    { kind: 'Page', title: 'Ironwood migration', href: '/ironwood', desc: 'Orchard → Ironwood turnstile progress', keywords: 'ironwood orchard migration turnstile', popular: true },
    { kind: 'Page', title: 'Privacy tips', href: '/privacy-suggestions', desc: 'Round amounts with the biggest anonymity set', keywords: 'privacy round amounts shield' },
    { kind: 'Page', title: 'Wall of Shame', href: '/wall-of-shame', desc: 'Round trips that reused a near-identical amount', keywords: 'privacy leak linkable' },
    { kind: 'Page', title: 'News', href: '/news', desc: 'Notable on-chain events' },
  ];
  return [...pages, ...charts, ...tools.filter((t) => !pages.some((p) => p.href === t.href))];
});
