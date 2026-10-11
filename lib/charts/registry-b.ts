import type { ChartDef } from './types';
import { GROUP_SLUGS } from './types';
import { usageCharts } from './b/usage';
import { holdersCharts } from './b/holders';
import { supplyCharts } from './b/supply';
import { marketsCharts } from './b/markets';

// Implemented by agent B2: groups usage, holders, supply, markets. Definitions live in ./b/<group>.ts;
// this list is ordered exactly as GROUP_SLUGS so index pages can rely on it.
const all = [...usageCharts, ...holdersCharts, ...supplyCharts, ...marketsCharts];
const order = [...GROUP_SLUGS.usage, ...GROUP_SLUGS.holders, ...GROUP_SLUGS.supply, ...GROUP_SLUGS.markets];

export const chartsB: ChartDef[] = order.map((slug) => {
  const def = all.find((c) => c.slug === slug);
  if (!def) throw new Error(`registry-b: no ChartDef for "${slug}"`);
  return def;
});
