import type { Metadata } from 'next';
import Link from 'next/link';

// Next adds noindex to every 404 on its own; it is stated here too so the page never inherits the site's index default.
export const metadata: Metadata = { title: 'Page not found', description: 'That page isn’t on ZEC Stats. Start from the dashboard, the Privacy hub or the full list of Zcash charts.', robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <section className="stack" style={{ gap: 16, paddingBlock: 40 }}>
      <span className="kicker">404</span>
      <h1 className="h1">That page isn&apos;t on ZEC Stats</h1>
      <p className="lede">It may have moved. Try search (⌘K), or start from one of these.</p>
      <div className="row">
        <Link className="btn" href="/">Dashboard</Link>
        <Link className="btn" href="/privacy">Privacy</Link>
        <Link className="btn" href="/charts">All charts</Link>
        <Link className="btn" href="/chart/price">ZEC price</Link>
      </div>
    </section>
  );
}
