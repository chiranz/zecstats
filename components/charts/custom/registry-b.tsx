'use client';

import type { CustomComponent } from './index';
import { SurvivalTriangle } from './b/SurvivalTriangle';
import { IssuanceChart } from './b/IssuanceChart';
import { RankedBars } from './b/RankedBars';
import { SwapAssets } from './b/SwapAssets';

// Owned by agent B2. Key = CustomPanel.component name; keep names prefixed per group to avoid clashes.
export const customB: Record<string, CustomComponent> = {
  'b-survival': SurvivalTriangle,
  'b-issuance': IssuanceChart,
  'b-ranked': RankedBars,
  'b-swap-assets': SwapAssets,
};
