/** Which loading skeleton a path gets (components/skeleton/RouteSkeleton.tsx). Plain module: the client skeleton and the
 *  server preview page (/design/loading) both read it. */
export const SHAPES = ['dashboard', 'chart', 'news', 'charts', 'report', 'activity', 'metrics', 'bullrun', 'compare', 'default'] as const;
export type Shape = (typeof SHAPES)[number];

/** Pages whose header is followed by a filter bar and an answer hero (components/reports/report.module.css). */
const REPORTS = ['/tx-sizes', '/swaps', '/wallet-apps', '/world-usage', '/btc-migration', '/shield-hops'];

const BY_PATH: Record<string, Shape> = {
  '/': 'dashboard', '/news': 'news', '/charts': 'charts', '/activity': 'activity', '/metrics': 'metrics',
  '/btc-bull-run': 'bullrun', '/compare': 'compare', ...Object.fromEntries(REPORTS.map((p) => [p, 'report'])),
};

export const shapeFor = (path: string): Shape => (path.startsWith('/chart/') ? 'chart' : BY_PATH[path] ?? 'default');
