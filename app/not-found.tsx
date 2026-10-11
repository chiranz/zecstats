import Link from 'next/link';

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
