// View options shared by the server pages (reading the link) and the client reports (writing it). Live's names and values.

/** /shield-hops ?class= and ?days= */
export type HopClass = 'all' | 'single' | 'sweep';
export const HOP_CLASSES: [HopClass, string][] = [['all', 'All hops'], ['single', 'Sweeps removed'], ['sweep', 'Sweeps only']];
export const HOP_RANGES: [number, string][] = [[90, '90D'], [365, '1Y'], [1200, '3Y'], [4000, 'ALL']];

/** /activity ?range= (days back from the last row; 0 = all) and ?window= */
export const ACTIVITY_RANGES = [['30', '30D'], ['90', '90D'], ['365', '1Y'], ['0', 'ALL']] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number][0];
export const ACTIVITY_WINDOWS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']] as const;
