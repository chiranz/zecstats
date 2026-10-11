// Information architecture: one source of truth for the top nav, the Tools menu, the footer and search.
// Every page has exactly one home and one name (see the "Navigation" artboard on the design canvas).

export type NavLink = { href: string; label: string; desc?: string; tag?: string };
export type NavGroup = { title: string; links: NavLink[] };

export const primaryNav: NavLink[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/charts', label: 'Charts' },
  // "Tools" is a menu button rendered by TopBar from toolGroups
  { href: '/news', label: 'News' },
];

export const toolGroups: NavGroup[] = [
  {
    // Privacy pages live in the Privacy section (context-bar tabs); the Tools menu lists them too so every live
    // menu item stays one click from any page.
    title: 'Privacy',
    links: [
      { href: '/ironwood', label: 'Ironwood migration', desc: 'Orchard → Ironwood: how much has crossed' },
      { href: '/orchard-turnstile', label: 'Orchard turnstile watch', desc: 'Was the Orchard bug used to mint ZEC?' },
      { href: '/privacy-suggestions', label: 'Privacy tips', desc: 'Round amounts with the biggest crowd' },
      { href: '/amount-suggest', label: 'Amount lookup', desc: 'How common is an amount you want to shield?' },
      { href: '/wall-of-shame', label: 'Wall of Shame', desc: 'Round trips that reused an amount' },
      { href: '/shield-hops', label: 'Shield-bound hops', desc: 'How much moves when coins go shielded' },
    ],
  },
  {
    title: 'Calculators',
    links: [
      { href: '/savings', label: 'Investment calculator', desc: 'Dollar-cost average ZEC vs BTC, gold, stocks' },
      { href: '/what-if', label: 'What if gold', desc: "ZEC price at a share of gold's market cap" },
    ],
  },
  {
    title: 'Compare & explore',
    links: [
      { href: '/compare', label: 'Compare charts', desc: 'Stack any charts on one time range' },
      { href: '/correlate', label: 'Correlations', desc: 'Which metrics move together' },
      { href: '/metrics', label: 'Metrics table', desc: 'Every headline number and its change' },
      { href: '/btc-bull-run', label: 'ZEC 2026 vs BTC 2017', desc: 'Day-by-day run comparison' },
    ],
  },
  {
    title: 'Reports',
    links: [
      { href: '/founders-reward', label: "Founders' Reward", desc: 'What 2016–2020 rewards were worth' },
      { href: '/tx-sizes', label: 'Transaction sizes', desc: 'How big a transparent transaction is' },
      { href: '/activity', label: 'Transparent activity', desc: 'Where transparent ZEC goes, and who holds it' },
      { href: '/world-usage', label: 'When the world uses Zcash', desc: 'Activity by hour and region' },
    ],
  },
  {
    title: 'Cross-chain',
    links: [
      { href: '/swaps', label: 'Swaps', desc: 'ZEC on NEAR Intents' },
      { href: '/btc-migration', label: 'Bitcoin → Zcash', desc: 'BTC swapped into ZEC, and how old it was' },
      { href: '/wallet-apps', label: 'Wallet apps', desc: 'Which apps route swaps' },
      { href: '/exchange-support', label: 'Exchanges', desc: 'Where ZEC can be traded, by country' },
    ],
  },
  {
    title: 'Network',
    links: [
      { href: '/network', label: 'Network nodes', desc: 'Reachable nodes by country and client' },
      { href: '/node', label: 'Node status', desc: 'Our Zebra node and data freshness' },
      { href: '/halving', label: 'Halving', desc: 'Next block-reward halving' },
    ],
  },
  {
    title: 'About',
    links: [
      { href: '/tools', label: 'Methodology', desc: 'Every tool, and how every number is produced' },
      { href: '/signals', label: 'Signals', desc: 'Experimental model calls', tag: 'BETA' },
      { href: '/pro', label: 'Pro', desc: 'Signals messages and research', tag: 'BETA' },
      { href: '/donate', label: 'Donate', desc: 'Keep the node running' },
    ],
  },
];

/** The Privacy section's pages, in context-bar order (Ironwood marked). `short` is the tab label. */
export const privacyLinks: (NavLink & { short: string; featured?: boolean })[] = [
  { href: '/privacy', label: 'Privacy hub', short: 'Overview' },
  { href: '/ironwood', label: 'Ironwood migration', short: 'Ironwood', featured: true },
  { href: '/orchard-turnstile', label: 'Turnstile watch', short: 'Turnstile' },
  { href: '/wall-of-shame', label: 'Wall of Shame', short: 'Wall of Shame' },
  { href: '/shield-hops', label: 'Shield-bound hops', short: 'Shield hops' },
  { href: '/privacy-suggestions', label: 'Privacy tips', short: 'Privacy tips' },
  { href: '/amount-suggest', label: 'Amount lookup', short: 'Amount lookup' },
];

/** "On this page" jump lists for the long pages; the context bar shows them at its right end. */
export const pageJumps: Record<string, { id: string; label: string }[]> = {
  // Ironwood leads the hub, but its tab opens /ironwood, so the hub's jumps start at the shielded share.
  '/privacy': [
    { id: 'overview', label: 'Shielded share' },
    { id: 'pools', label: 'Pools' },
    { id: 'flows', label: 'Flows' },
    { id: 'integrity', label: 'Integrity' },
    { id: 'hygiene', label: 'Privacy hygiene' },
    { id: 'usage', label: 'Usage' },
  ],
  '/ironwood': [
    { id: 'progress', label: 'Progress' },
    { id: 'verified', label: 'Verified supply' },
    { id: 'reading', label: 'Reading the number' },
    { id: 'daily', label: 'Daily crossings' },
    { id: 'size', label: 'Migration size' },
    { id: 'sources', label: 'Sources' },
    { id: 'pools', label: 'Pool balances' },
  ],
};

export const footerGroups: NavGroup[] = [
  { title: 'Explore', links: [{ href: '/', label: 'Dashboard' }, { href: '/privacy', label: 'Privacy' }, { href: '/charts', label: 'All 58 charts' }, { href: '/news', label: 'News feed' }, { href: '/metrics', label: 'Metrics table' }, { href: '/chart/pool-profit', label: 'Pool P&L' }] },
  { title: 'Privacy', links: privacyLinks.slice(1, 6).map(({ href, label }) => ({ href, label })) },
  { title: 'Tools', links: [{ href: '/savings', label: 'Investment calculator' }, { href: '/what-if', label: 'What if gold' }, { href: '/compare', label: 'Compare charts' }, { href: '/correlate', label: 'Correlations' }, { href: '/btc-bull-run', label: 'ZEC 2026 vs BTC 2017' }] },
  { title: 'Network & data', links: [{ href: '/network', label: 'Network nodes' }, { href: '/node', label: 'Node status' }, { href: '/halving', label: 'Halving' }, { href: '/tools', label: 'Methodology' }, { href: '/donate', label: 'Donate' }] },
];

/** Which top-nav item is "current" for a path. */
export function navSection(pathname: string): 'Dashboard' | 'Privacy' | 'Charts' | 'Tools' | 'News' | null {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/chart')) return 'Charts';
  if (pathname.startsWith('/news')) return 'News';
  if (privacyLinks.some((l) => l.href === pathname)) return 'Privacy';
  if (pathname === '/pro' || toolGroups.some((g) => g.links.some((l) => l.href === pathname))) return 'Tools';
  return null;
}

/** Where a page sits, for the context bar. Dashboard, News and the Charts index have no siblings to show. */
export type PageContext =
  | { kind: 'privacy' }
  | { kind: 'chart'; slug: string }
  | { kind: 'tool'; group: NavGroup; index: number };

export function pageContext(pathname: string): PageContext | null {
  if (privacyLinks.some((l) => l.href === pathname)) return { kind: 'privacy' };
  const m = /^\/chart\/([^/]+)$/.exec(pathname);
  if (m) return { kind: 'chart', slug: m[1] };
  for (const group of toolGroups) {
    const index = group.links.findIndex((l) => l.href === pathname);
    if (index >= 0) return { kind: 'tool', group, index };
  }
  return null;
}

export const SITE = {
  name: 'ZEC Stats',
  tagline: 'Every Zcash number, from our own node',
  author: '@jeremiahrogers',
  authorUrl: 'https://x.com/jeremiahrogers',
  x: 'https://x.com/zecstats_',
};
