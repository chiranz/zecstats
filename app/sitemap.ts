import type { MetadataRoute } from 'next';
import { ALL_SLUGS } from '@/lib/charts';
import { GROUP_SLUGS } from '@/lib/charts/types';
import { getFreshness } from '@/lib/data/snapshot';
import { absUrl, PAGES } from '@/lib/seo';

// Every public page plus the 58 charts. Not listed: /design/* (internal), /api/* and /privacy-suggestions.json (data).
// lastModified is the last complete day of data, the date every page's numbers run through.
const GROUP_HUBS = new Set(Object.values(GROUP_SLUGS).map((g) => g[0])); // each group's "Start here" chart

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { dataThrough } = await getFreshness();
  const lastModified = new Date(`${dataThrough}T23:59:59Z`);
  const pages = Object.entries(PAGES).map(([path, p]) => ({ url: absUrl(path), lastModified, changeFrequency: p.changeFrequency, priority: p.priority }));
  const charts = ALL_SLUGS.map((slug) => ({ url: absUrl(`/chart/${slug}`), lastModified, changeFrequency: 'daily' as const, priority: GROUP_HUBS.has(slug) ? 0.8 : 0.7 }));
  return [...pages, ...charts];
}
