// Merges both halves of the registry. registry-a: price, costbasis, privacy · registry-b: usage, holders, supply, markets.
import type { ChartDef } from './types';
import { GROUP_SLUGS } from './types';
import { chartsA } from './registry-a';
import { chartsB } from './registry-b';

export const CHARTS: ChartDef[] = [...chartsA, ...chartsB];
export const chartBySlug = (slug: string) => CHARTS.find((c) => c.slug === slug);
export const ALL_SLUGS = Object.values(GROUP_SLUGS).flat();
