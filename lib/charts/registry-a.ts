import type { ChartDef } from './types';
import { price, marketCap, zecBtc, fdvVsBtc, impliedMcap, etfHoldings, volatility, mktcapIssuance, txIssuance, volumeIssuance, volIssuance } from './a/price';
import { realizedAll, mvrv, realized, costBasis, poolProfit, poolUsd } from './a/costbasis';
import { shieldingRate, pools, anonymity, flowTransparent, flowSprout, flowSapling, flowOrchard, flowIronwood, flowCompare, orchardInternal, poolResidency } from './a/privacy';

// Implemented by agent B1: groups price, costbasis, privacy (28 charts, in GROUP_SLUGS order).
export const chartsA: ChartDef[] = [
  price, marketCap, zecBtc, fdvVsBtc, impliedMcap, etfHoldings, volatility, mktcapIssuance, txIssuance, volumeIssuance, volIssuance,
  realizedAll, mvrv, realized, costBasis, poolProfit, poolUsd,
  shieldingRate, pools, anonymity, flowTransparent, flowSprout, flowSapling, flowOrchard, flowIronwood, flowCompare, orchardInternal, poolResidency,
];
