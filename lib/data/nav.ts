import 'server-only';
import { cache } from 'react';
import { DATA_SOURCE } from './core';
import { getChartIndex } from './home';
import { getIronwoodSources } from './ironwood';
import { getFreshness, getPools } from './snapshot';
import { chartBySlug } from '@/lib/charts';
import { privacyLinks } from '@/lib/site';
import { dateLong, num, pct } from '@/lib/format';

export type NavItem = { href: string; label: string; value?: string; featured?: boolean };
export type NavChartGroup = { id: string; title: string; items: NavItem[] };
export type NavData = {
  fresh: { height: string; through: string; throughShort: string; synced: boolean };
  privacy: NavItem[];
  chartGroups: NavChartGroup[];
  /** Latest value per href, for search results and menus. */
  values: Record<string, string>;
};

async function load(): Promise<NavData> {
  const [f, index, src, pools] = await Promise.all([getFreshness(), getChartIndex(), getIronwoodSources(), getPools()]);
  const values: Record<string, string> = {};
  const chartGroups = index.map((g) => ({
    id: g.id,
    title: g.title,
    items: g.rows.map((r) => {
      const href = `/chart/${r.slug}`;
      if (r.value) values[href] = r.value;
      return { href, label: chartBySlug(r.slug)?.short ?? r.title, value: r.value };
    }),
  }));
  values['/privacy'] = `${pct(pools.shieldedPct)} shielded`;
  values['/ironwood'] = `${num(src.orchard_migration_pct, 2)}%`;
  const privacy = privacyLinks.map((l) => ({ href: l.href, label: l.short, featured: l.featured, value: values[l.href] }));
  const d = new Date(`${f.dataThrough}T00:00:00Z`);
  return {
    fresh: { height: num(f.height), through: dateLong(f.dataThrough), throughShort: `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`, synced: f.synced },
    privacy,
    chartGroups,
    values,
  };
}

// The layout renders this on every page. A snapshot never changes, so it is computed once per server process;
// live mode recomputes per request (React cache) so menu values follow the upstream.
let memo: Promise<NavData> | null = null;
const perRequest = cache(load);
export const getNavData = (): Promise<NavData> => {
  if (DATA_SOURCE !== 'snapshot') return perRequest();
  memo ??= load().catch((e) => { memo = null; throw e; });
  return memo;
};
