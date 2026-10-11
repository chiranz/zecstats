'use client';

import type { CustomComponent } from './index';
import { PoolTable } from './a/PoolTable';
import { XYChart } from './a/XYChart';
import { Anonymity } from './a/Anonymity';
import { DotPlot } from './a/DotPlot';
import { PoolProfit } from './a/PoolProfit';

// Owned by agent B1. Key = CustomPanel.component name; keep names prefixed per group to avoid clashes.
//   a-xy          numeric-x line chart (coins issued, amounts); props = XYChartProps (JSON) — usable by registry-b too
//   a-pool-table  pool balances table          a-anonymity  anonymity-set step chart + amount field
//   a-dotplot     values vs a reference today  a-pool-profit cost-basis histograms per pool
export const customA: Record<string, CustomComponent> = {
  'a-pool-table': PoolTable,
  'a-xy': XYChart as unknown as CustomComponent,
  'a-anonymity': Anonymity,
  'a-dotplot': DotPlot,
  'a-pool-profit': PoolProfit,
};
