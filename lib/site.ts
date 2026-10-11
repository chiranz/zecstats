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
    title: 'Calculators',
    links: [
      { href: '/savings', label: 'Investment calculator', desc: 'Dollar-cost average ZEC vs BTC, gold, stocks' },
      { href: '/what-if', label: 'What if gold', desc: "ZEC price at a share of gold's market cap" },
      { href: '/amount-suggest', label: 'Amount lookup', desc: 'How common is an amount you want to shield?' },
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
      { href: '/orchard-turnstile', label: 'Orchard turnstile watch', desc: 'Was the Orchard bug used to mint ZEC?' },
      { href: '/founders-reward', label: "Founders' Reward", desc: 'What 2016–2020 rewards were worth' },
      { href: '/shield-hops', label: 'Shield-bound hops', desc: 'How much moves when coins go shielded' },
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
      { href: '/tools', label: 'Methodology', desc: 'How every number is produced' },
      { href: '/signals', label: 'Signals', desc: 'Experimental model calls', tag: 'BETA' },
      { href: '/donate', label: 'Donate', desc: 'Keep the node running' },
    ],
  },
];

export const privacyLinks: NavLink[] = [
  { href: '/privacy', label: 'Privacy hub' },
  { href: '/ironwood', label: 'Ironwood migration' },
  { href: '/orchard-turnstile', label: 'Turnstile watch' },
  { href: '/privacy-suggestions', label: 'Privacy tips' },
  { href: '/amount-suggest', label: 'Amount lookup' },
  { href: '/wall-of-shame', label: 'Wall of Shame' },
  { href: '/shield-hops', label: 'Shield-bound hops' },
];

export const footerGroups: NavGroup[] = [
  { title: 'Explore', links: [{ href: '/', label: 'Dashboard' }, { href: '/privacy', label: 'Privacy' }, { href: '/charts', label: 'All 58 charts' }, { href: '/news', label: 'News feed' }, { href: '/metrics', label: 'Metrics table' }] },
  { title: 'Privacy', links: privacyLinks.slice(1, 6) },
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

export const SITE = {
  name: 'ZEC Stats',
  tagline: 'Every Zcash number, from our own node',
  author: '@jeremiahrogers',
  x: 'https://x.com/zecstats_',
};
