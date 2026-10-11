import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono, Orbitron } from 'next/font/google';
import { TopBar } from '@/components/chrome/TopBar';
import { Footer } from '@/components/chrome/Footer';
import { Marquee } from '@/components/ticker/Marquee';
import { getTicker } from '@/lib/data/ticker';
import { getSearchIndex } from '@/lib/data/search-index';
import './globals.css';
import './chrome.css';

const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-orbitron', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jetbrains', display: 'swap' });
// variable font: the static-weight request returns gstatic "l/font?kit=…&skey=…" URLs that Turbopack's font loader can't parse
const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: 'variable', variable: '--font-plex', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'ZEC Stats — Zcash network statistics', template: '%s — ZEC Stats' },
  description: 'Every Zcash number, computed from a Zebra full node: price, shielded supply, pools, Ironwood migration, network and more.',
};

export const viewport: Viewport = { themeColor: '#050a06', width: 'device-width', initialScale: 1 };

// Apply the saved theme before paint (same localStorage key the live site uses).
const themeScript = `try{var t=localStorage.getItem('zec-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${orbitron.variable} ${jetbrains.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <TopBar searchIndex={await getSearchIndex()} />
        {/* event tape: hot topic + on-chain events, under the top bar on every page (not sticky) */}
        <Marquee items={(await getTicker()).items} />
        <main id="main" className="shell page">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
