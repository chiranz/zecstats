import Link from 'next/link';
import { footerGroups, SITE } from '@/lib/site';
import { getFreshness } from '@/lib/data/snapshot';
import { dateLong, num } from '@/lib/format';
import { NODE_STATE, nodeState } from '@/lib/data/nav';

export async function Footer() {
  const f = await getFreshness();
  const st = NODE_STATE[nodeState(f)];
  return (
    <footer className="foot">
      <div className="shell">
        <div className="about stack">
          <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true" />ZEC STATS</Link>
          <p className="note" style={{ fontSize: 13.5 }}>Every Zcash number, computed from a Zebra full node — not copied from an exchange API. Price is the one external input.</p>
          <p className="small mono"><span className={`live${st.cls ? ` ${st.cls}` : ''}`}><i aria-hidden="true" />{st.text}</span> · block {num(f.height)} · data through {dateLong(f.dataThrough)}</p>
          <div className="row"><Link className="btn primary" href="/donate">Donate</Link><a className="btn" href={SITE.x} rel="noreferrer">Follow @zecstats_</a></div>
        </div>
        {footerGroups.map((g) => (
          <div key={g.title}>
            <h4>{g.title}</h4>
            <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
        ))}
        <div className="base"><span>by <a href={SITE.authorUrl} rel="noreferrer">{SITE.author}</a> · Zcash data you can verify</span></div>
      </div>
    </footer>
  );
}
