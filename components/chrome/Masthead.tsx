import Link from 'next/link';
import type { ReactNode } from 'react';
import { getFreshness } from '@/lib/data/snapshot';
import { dateLong, num } from '@/lib/format';

export type Crumb = { href?: string; label: string };

/** Page header: crumbs, H1, one-sentence answer, and the data-freshness note on the right. */
export async function Masthead({ kicker, crumbs, title, lede, children, freshness = true, cadence = 'updates daily' }: { kicker?: string; crumbs?: Crumb[]; title: ReactNode; lede?: ReactNode; children?: ReactNode; freshness?: boolean; cadence?: string }) {
  const f = await getFreshness();
  return (
    <header className="mast">
      <div className="stack" style={{ gap: 8, flex: '1 1 560px', minWidth: 0 }}>
        {crumbs && (
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">ZEC Stats</Link>
            {crumbs.map((c) => (
              <span key={c.label} style={{ display: 'contents' }}>
                <span aria-hidden="true">›</span>
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        {kicker && <span className="kicker">{kicker}</span>}
        <h1 className="h1">{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
      {freshness && (
        <div className="fresh">
          <span className="live"><i aria-hidden="true" />Node {f.synced ? 'synced' : 'catching up'} · block <span className="num">{num(f.height)}</span></span>
          <span>Data through {dateLong(f.dataThrough)} · {cadence}</span>
          <span>Redesign concept · figures from a zecstats.com snapshot, {dateLong(f.capturedAt)}</span>
        </div>
      )}
    </header>
  );
}
