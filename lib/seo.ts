// Search and link-sharing metadata: one place for every page's title + description, the sitemap entries, and the
// JSON-LD builders. Pages call pageMetadata('/path'); app/sitemap.ts reads PAGES; chart pages build their own from the def.
import type { Metadata, MetadataRoute } from 'next';
import { GROUP_SLUGS, CHART_GROUPS } from './charts/types';
import { SITE, pageContext, privacyLinks } from './site';

/** Production origin, no trailing slash. Override per deploy with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zecstats.com').replace(/\/+$/, '');
/** Only the real site is indexed; previews and pitch deploys (any other origin) are noindex and blocked in robots.txt. */
export const INDEXABLE = SITE_URL === 'https://zecstats.com';
export const absUrl = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`;

const X_SITE = '@zecstats_';
const X_CREATOR = SITE.author;
const SUFFIX = ` — ${SITE.name}`;
const MAX_DESC = 160;

/** Default social card (app/opengraph-image.tsx). Pages with their own card file leave `images` unset instead. */
export const DEFAULT_OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: `${SITE.name} — every Zcash number, from our own node` };

type Freq = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
export type PageSeo = {
  title: string;
  description: string;
  changeFrequency: Freq;
  priority: number;
  /** The route has its own opengraph-image file, so the default card must not be pinned in its metadata. */
  ownImage?: boolean;
};

const CHART_COUNT = Object.values(GROUP_SLUGS).flat().length;

/** Every public page (not the 58 chart pages): title (the template adds " — ZEC Stats"), a ≤160-character description
 *  that reads like the page's answer, and its sitemap weight. Pages with figures in the description override it with
 *  live numbers in generateMetadata; the text here is their fallback. */
export const PAGES: Record<string, PageSeo> = {
  '/': { title: 'ZEC Stats — live Zcash network statistics', description: 'A live Zcash dashboard computed from our own Zebra full node: price, shielded supply, pools, the Ironwood migration and 58 charts.', changeFrequency: 'hourly', priority: 1 },
  '/privacy': { title: 'How private is Zcash? Shielded supply, pools and flows', description: 'How much ZEC is shielded right now, which pools hold it, what crosses the turnstile each day, and whether the shielded supply still adds up.', changeFrequency: 'daily', priority: 0.9, ownImage: true },
  '/ironwood': { title: 'Ironwood migration tracker: Orchard → Ironwood', description: "How much of Orchard's ZEC has crossed into Ironwood, Zcash's newest shielded pool: progress, daily crossings, migration sizes and sources.", changeFrequency: 'daily', priority: 0.9, ownImage: true },
  '/charts': { title: `All ${CHART_COUNT} Zcash charts`, description: `All ${CHART_COUNT} Zcash charts, grouped by the question they answer: price, cost basis, privacy, usage, holders, supply and markets. Each with a permalink and CSV.`, changeFrequency: 'daily', priority: 0.9 },
  '/news': { title: 'Zcash news: what just happened on-chain', description: 'What just happened on Zcash: all-time highs, big daily moves and anything far from its 30-day norm, written by our node as it happens.', changeFrequency: 'hourly', priority: 0.6 },

  '/orchard-turnstile': { title: 'Orchard turnstile watch: was the bug used to mint ZEC?', description: "Was the 2026 Orchard soundness bug used to mint counterfeit ZEC? Five tests on Orchard's full flow history and a composite suspicion index.", changeFrequency: 'daily', priority: 0.7 },
  '/wall-of-shame': { title: 'Wall of Shame: Zcash round trips that link addresses', description: 'Shield-and-deshield round trips that reused a near-identical amount, so anyone can link the transparent addresses on both sides of the pool.', changeFrequency: 'daily', priority: 0.7 },
  '/shield-hops': { title: 'Shield-bound hops: how much ZEC moves into the pools', description: 'How much ZEC moves when a transparent coin goes shielded: the median hop, its spread, and how much of the flow is one automated process.', changeFrequency: 'daily', priority: 0.6 },
  '/privacy-suggestions': { title: 'Privacy tips: ZEC amounts that blend in', description: 'Which round ZEC amounts have the biggest crowd to hide in when you shield or deshield, ranked from 1.6 million past transactions.', changeFrequency: 'weekly', priority: 0.6 },
  '/amount-suggest': { title: 'Amount lookup: how common is your ZEC amount?', description: 'Check how many past transactions shielded or deshielded the same ZEC amount before you send it, and find a nearby amount with a bigger crowd.', changeFrequency: 'weekly', priority: 0.6 },

  '/savings': { title: 'ZEC investment calculator: monthly buys vs Bitcoin', description: 'What if you had bought ZEC every month? Dollar-cost average from any start date on real daily closes, set against Bitcoin bought on the same days.', changeFrequency: 'daily', priority: 0.6 },
  '/what-if': { title: 'What if ZEC took a share of gold?', description: "What one ZEC would be worth if all the ZEC there will ever be added up to 1%, 2%, 5% or 10% of gold, Bitcoin or the world's stock market.", changeFrequency: 'daily', priority: 0.5 },
  '/compare': { title: 'Compare Zcash charts on one time range', description: 'Stack any Zcash charts on one shared time range, one above the other, with event annotations, and keep the whole set in a shareable link.', changeFrequency: 'daily', priority: 0.6 },
  '/correlate': { title: 'Zcash correlations: which metrics move together', description: 'Which Zcash metrics move together: every pair of metrics scored from −1 to +1 over any window, with a scatter plot for each pair.', changeFrequency: 'daily', priority: 0.5 },
  '/metrics': { title: 'Zcash metrics table: every headline number', description: 'Every headline Zcash number in one table, each set against 28 days and 12 months ago, with an as-of view for any past day.', changeFrequency: 'daily', priority: 0.6 },
  '/btc-bull-run': { title: 'ZEC 2026 vs BTC 2017, day by day', description: "Zcash's 2026 run laid over Bitcoin's 2017 run, day for day from the day each left $800 behind, with any anchor price you choose.", changeFrequency: 'daily', priority: 0.5 },
  '/founders-reward': { title: "Zcash Founders' Reward: what it was worth", description: "What the 2016–2020 Zcash Founders' Reward was worth on the days it was paid, and what the same coins are worth at today's price.", changeFrequency: 'weekly', priority: 0.5 },
  '/tx-sizes': { title: 'Zcash transaction sizes in dollars', description: 'How many dollars a transparent Zcash transaction moves: median, mean, mode and the p90–p99.9 tail, day by day, and where the money is concentrated.', changeFrequency: 'daily', priority: 0.5 },
  '/activity': { title: 'Transparent ZEC activity: where the coins go', description: 'Where transparent ZEC goes: exchange-shaped sweeps, shielded savings or ordinary movement, week by week, and which addresses hold the most.', changeFrequency: 'daily', priority: 0.5 },
  '/world-usage': { title: 'When the world uses Zcash, hour by hour', description: 'At which UTC hours Zcash is busiest and quietest, and which parts of the world are awake then, from transactions by hour of day.', changeFrequency: 'weekly', priority: 0.5 },
  '/swaps': { title: 'ZEC in NEAR Intents cross-chain swaps', description: 'How central ZEC is in NEAR Intents cross-chain swaps: its PageRank among every swapped asset, and the flows in and out by chain and asset.', changeFrequency: 'daily', priority: 0.5 },
  '/btc-migration': { title: 'Bitcoin → Zcash: BTC swapped into ZEC', description: 'How much Bitcoin is being swapped into Zcash through NEAR Intents, in how many swaps, and how long those coins had sat still before they moved.', changeFrequency: 'daily', priority: 0.5 },
  '/wallet-apps': { title: 'Wallet apps routing ZEC swaps', description: 'Which wallets and apps route ZEC swaps through NEAR Intents, how much volume each one carries, and who leads week by week.', changeFrequency: 'daily', priority: 0.5 },
  '/exchange-support': { title: 'Where to buy ZEC: regulated exchanges by country', description: "Where you can buy ZEC on a regulated exchange, country by country, and how much of the world's population that reaches.", changeFrequency: 'weekly', priority: 0.5 },
  '/network': { title: 'Zcash network nodes by country and client', description: 'How many Zcash nodes are publicly reachable, which countries they run in, and what node software they run: Zebra, zcashd and others.', changeFrequency: 'daily', priority: 0.5 },
  '/node': { title: 'Node status: is our Zebra node in sync?', description: 'Is the Zebra node behind every ZEC Stats number healthy? Its height, lag behind the network tip, recent block times and data freshness.', changeFrequency: 'hourly', priority: 0.3 },
  '/halving': { title: 'Next Zcash halving: date and reward schedule', description: 'When the next Zcash halving is due, at which block, what the block reward drops to, and the full block-reward schedule.', changeFrequency: 'weekly', priority: 0.5 },
  '/tools': { title: 'Tools & methodology', description: 'Every ZEC Stats tool, grouped by the question it answers, and how each number is produced: from our own Zebra node, except price.', changeFrequency: 'monthly', priority: 0.5 },
  '/signals': { title: 'Signals (beta): when the ZEC model changed its mind', description: 'Every call the experimental ZEC allocation model has made, word for word, and what following each one would have done against holding.', changeFrequency: 'daily', priority: 0.4 },
  '/pro': { title: 'ZEC Stats Pro: live signals and research', description: 'ZEC Stats Pro: Signals messages as they are sent, a daily summary of the model, and the research page behind them. Everything else is free.', changeFrequency: 'monthly', priority: 0.3 },
  '/donate': { title: 'Donate to ZEC Stats', description: 'ZEC Stats is free. Running the Zebra node and servers costs about $300 a month; a donation in ZEC of any size helps keep it running.', changeFrequency: 'monthly', priority: 0.3 },
};

/** Trim to ≤160 characters on a word boundary. */
export function clipDescription(s: string, max = MAX_DESC): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,;:—–-]+$/, '')}…`;
}

type MetaInput = { path: string; title: string; description: string; ownImage?: boolean; absoluteTitle?: boolean };

/** Title, description, canonical (the bare path: query-string views share it), Open Graph and X card for one page. */
export function buildMetadata({ path, title, description, ownImage, absoluteTitle }: MetaInput): Metadata {
  const desc = clipDescription(description);
  const full = absoluteTitle ? title : `${title}${SUFFIX}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      locale: 'en_US',
      url: path,
      title: full,
      description: desc,
      // a route with its own opengraph-image file must not set `images` at all, or the file is ignored
      ...(ownImage ? {} : { images: [DEFAULT_OG_IMAGE] }),
    },
    twitter: { card: 'summary_large_image', site: X_SITE, creator: X_CREATOR, title: full, description: desc },
  };
}

/** Metadata for a page listed in PAGES, optionally with a data-driven description. */
export function pageMetadata(path: string, override?: { description?: string }): Metadata {
  const p = PAGES[path];
  if (!p) throw new Error(`[seo] no PAGES entry for ${path}`);
  return buildMetadata({ path, title: p.title, description: override?.description ?? p.description, ownImage: p.ownImage, absoluteTitle: path === '/' });
}

/* ---------- JSON-LD ---------- */

type Ld = Record<string, unknown>;
const ORG_ID = `${SITE_URL}/#org`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function websiteLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absUrl('/'),
    name: SITE.name,
    alternateName: ['Zcash Stats', 'zecstats'],
    description: PAGES['/'].description,
    inLanguage: 'en',
    publisher: { '@id': ORG_ID },
  };
}

export function organizationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: absUrl('/'),
    logo: absUrl('/apple-icon.png'),
    sameAs: [SITE.x],
  };
}

export type Crumb = { name: string; path?: string };

export function breadcrumbLd(items: Crumb[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(c.path ? { item: absUrl(c.path) } : {}) })),
  };
}

/** The context bar's trail for a section page: Privacy / Page, or Tools / Group / Page. Null where the bar shows none. */
export function sectionCrumbs(path: string): Crumb[] | null {
  const ctx = pageContext(path);
  if (!ctx) return null;
  if (ctx.kind === 'privacy') {
    if (path === '/privacy') return null; // the hub is the section root: a one-step trail says nothing
    const link = privacyLinks.find((l) => l.href === path)!;
    return [{ name: 'Privacy', path: '/privacy' }, { name: link.label }];
  }
  if (ctx.kind === 'tool') return [{ name: 'Tools', path: '/tools' }, { name: ctx.group.title, path: '/tools#index' }, { name: ctx.group.links[ctx.index].label }];
  return null;
}

/** Charts / Group / Chart, as in the context bar. */
export function chartCrumbs(slug: string, short: string): Crumb[] {
  const gid = (Object.keys(GROUP_SLUGS) as (keyof typeof GROUP_SLUGS)[]).find((g) => GROUP_SLUGS[g].includes(slug));
  const group = CHART_GROUPS.find((g) => g.id === gid);
  return [{ name: 'Charts', path: '/charts' }, ...(group ? [{ name: group.title, path: `/charts#g-${group.id}` }] : []), { name: short }];
}

export type DatasetInput = {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  api: string[];
  measured: { name: string; unit?: string };
  firstDate?: string;
  lastDate?: string;
};

/** schema.org Dataset for a chart page. No licence is published for the data, so none is claimed. */
export function datasetLd(d: DatasetInput): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: d.name,
    description: d.description,
    url: absUrl(`/chart/${d.slug}`),
    keywords: d.keywords,
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', '@id': ORG_ID, name: SITE.name, url: absUrl('/') },
    variableMeasured: { '@type': 'PropertyValue', name: d.measured.name, ...(d.measured.unit ? { unitText: d.measured.unit } : {}) },
    ...(d.firstDate && d.lastDate ? { temporalCoverage: `${d.firstDate}/${d.lastDate}` } : {}),
    ...(d.lastDate ? { dateModified: d.lastDate } : {}),
    distribution: d.api.map((a) => ({ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: absUrl(`/api/${a}`) })),
  };
}
