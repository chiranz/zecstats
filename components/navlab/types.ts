// Navigation lab: the serialisable data every prototype direction renders from (built on the server by data.ts).
import type { SearchItem } from '@/lib/search';

export type Ctx = 'privacy' | 'chart';
export type Item = { href: string; label: string; value?: string; desc?: string; tag?: string; featured?: boolean };
export type Group = { id: string; title: string; short?: string; href?: string; items: Item[] };

export type NavData = {
  fresh: { height: string; through: string; throughShort: string; captured: string; synced: boolean; node: string };
  /** Privacy section pages, in nav order: Overview (the hub) first, then Ironwood (the dominant story). */
  privacy: Item[];
  ironwood: { pct: number; pctText: string; days: number; balance: string; shareOfShielded: string };
  /** In-page sections of the Privacy hub. */
  jumps: Item[];
  chartGroups: Group[];
  /** The chart-page context: /chart/price inside "Price & valuation". */
  chart: {
    groupId: string; groupTitle: string; groupQuestion: string; slug: string; pos: number; count: number;
    prev: Item; next: Item; title: string; lede: string; value: string; change: string | null; changeDir: 'up' | 'dn' | 'flat';
    date: string; series: number[]; caption: string; cadence: string;
  };
  privacyPage: {
    title: string; lede: string; shieldedPct: string; shieldedZec: string; shieldedUsd: string; date: string;
    pools: { key: string; label: string; pct: number; text: string; color: string }[];
  };
  kpis: Record<Ctx, { k: string; v: string; s: string }[]>;
  tools: Group[];
  questions: Group[];
  deeper: Item[];
  popular: Item[];
  search: SearchItem[];
  /** Latest reading per href, so search rows and menus can show a value. */
  values: Record<string, string>;
  counts: { charts: number; tools: number; pages: number };
};

export const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'privacy', label: 'Privacy', href: '/privacy' },
  { id: 'charts', label: 'Charts', href: '/charts' },
  { id: 'tools', label: 'Tools', href: '/tools' },
  { id: 'news', label: 'News', href: '/news' },
] as const;

export const ctxSection = (ctx: Ctx) => (ctx === 'privacy' ? 'privacy' : 'charts');
export const ctxPath = (ctx: Ctx) => (ctx === 'privacy' ? '/privacy' : '/chart/price');
