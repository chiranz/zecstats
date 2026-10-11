import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono, Orbitron } from 'next/font/google';
import { TopBar } from '@/components/chrome/TopBar';
import { Footer } from '@/components/chrome/Footer';
import { ContextBar } from '@/components/chrome/ContextBar';
import { Marquee } from '@/components/ticker/Marquee';
import { RouteFrame } from '@/components/skeleton/RouteFrame';
import { getTicker } from '@/lib/data/ticker';
import { getSearchIndex } from '@/lib/data/search-index';
import { getNavData } from '@/lib/data/nav';
import { DEFAULT_OG_IMAGE, INDEXABLE, PAGES, SITE_URL } from '@/lib/seo';
import { SITE } from '@/lib/site';
import './globals.css';
import './chrome.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-orbitron', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jetbrains', display: 'swap' });
// variable font: the static-weight request returns gstatic "l/font?kit=…&skey=…" URLs that Turbopack's font loader can't parse
const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: 'variable', variable: '--font-plex', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'ZEC Stats — Zcash network statistics', template: '%s — ZEC Stats' },
  description: PAGES['/'].description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE.authorUrl }],
  creator: SITE.author,
  publisher: SITE.name,
  keywords: ['Zcash', 'ZEC', 'Zcash statistics', 'Zcash charts', 'shielded supply', 'Ironwood', 'Orchard', 'Zcash price', 'Zebra node', 'Zcash privacy'],
  category: 'finance',
  formatDetection: { telephone: false, address: false, email: false },
  // defaults for any route that sets none of its own (every public page does: lib/seo.ts pageMetadata)
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US', title: 'ZEC Stats — Zcash network statistics', description: PAGES['/'].description, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', site: '@zecstats_', creator: SITE.author },
  robots: INDEXABLE ? { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } : { index: false, follow: false },
  // icons: app/icon.svg + app/apple-icon.png; manifest: app/manifest.ts (file conventions add the tags)
};

// The site opens dark for everyone (the light theme is an explicit toggle, not the OS setting), so the browser chrome
// colour is the dark ground; colour-scheme lists both because both themes exist.
export const viewport: Viewport = { themeColor: '#050a06', colorScheme: 'dark light', width: 'device-width', initialScale: 1 };

// Apply the saved theme before paint (same localStorage key the live site uses).
const themeScript = `try{var t=localStorage.getItem('zec-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [searchIndex, nav, ticker] = await Promise.all([getSearchIndex(), getNavData(), getTicker()]);
  return (
    <html lang="en" data-theme="dark" className={`${orbitron.variable} ${jetbrains.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <TopBar searchIndex={searchIndex} nav={nav} />
        {/* event tape: hot topic + on-chain events, under the top bar on every page (not sticky) */}
        <Marquee items={ticker.items} />
        {/* navigation D: breadcrumb + the section's pages, on pages that have siblings */}
        <ContextBar nav={nav} />
        {/* RouteFrame: the destination's loading skeleton while a click is on its way (components/skeleton) */}
        <main id="main" className="shell page"><RouteFrame>{children}</RouteFrame></main>
        <Footer />
      </body>
    </html>
  );
}
