import Link from 'next/link';
import { footerGroups, SITE } from '@/lib/site';
import { getFreshness } from '@/lib/data/snapshot';
import { dateLong, num } from '@/lib/format';

export async function Footer() {
  const f = await getFreshness();
  return (
    <footer className="foot">
      <div className="shell">
        <div className="about stack">
          <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true" />ZEC STATS</Link>
          <p className="note" style={{ fontSize: 13.5 }}>Every Zcash number, computed from a Zebra full node — not copied from an exchange API. Price is the one external input.</p>
          <p className="small mono"><span className="live"><i aria-hidden="true" />{f.synced ? 'Synced' : 'Catching up'}</span> · block {num(f.height)} · data through {dateLong(f.dataThrough)}</p>
          <div className="row"><Link className="btn primary" href="/donate">Donate</Link><a className="btn" href={SITE.x} rel="noreferrer">Follow @zecstats_</a></div>
        </div>
        {footerGroups.map((g) => (
          <div key={g.title}>
            <h4>{g.title}</h4>
            <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
        ))}
        <div className="base"><span>by {SITE.author} · Zcash data you can verify</span></div>
      </div>
    </footer>
  );
}
