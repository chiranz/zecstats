import 'server-only';
import { cache } from 'react';
import { api } from './core';

// Chart catalogue of the live site (/api/charts): title + one-line description per slug. Used for charts whose
// redesigned definition is not registered yet, so the index and the template never show a bare slug.
type LiveChartEntry = { id: string; t: string; d: string; c: string; u: string };

export const getLiveCharts = cache(async () => {
  const list = await api<LiveChartEntry[]>('charts');
  return new Map(list.map((c) => [c.id, c]));
});

/** "ZEC Price (USD)" → keep the live title, minus a leading "Zcash ". */
export async function liveTitle(slug: string): Promise<string> {
  const e = (await getLiveCharts()).get(slug);
  return e ? e.t.replace(/^Zcash\s+/, '') : slug;
}
