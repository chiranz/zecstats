import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Tiles } from '@/components/ui/blocks';
import { Sparkline } from '@/components/charts/Sparkline';
import { NewsFeed } from '@/components/news/NewsFeed';
import s from '@/components/news/news.module.css';
import { getNews } from '@/lib/data/news';
import { getLive, getPools } from '@/lib/data/snapshot';
import { dateLong, dateShort, delta, num, pct, zecCompact } from '@/lib/format';

export const metadata: Metadata = { title: 'News — what just happened on Zcash', description: 'A feed the node writes by itself: all-time highs, big daily moves and anything far from its 30-day norm.' };

function SigmaScale({ z }: { z: number }) {
  // standard normal curve from −3σ to +3σ; the marker is clamped to the scale edge with its real value printed
  const W = 300, H = 70, x = (v: number) => 12 + ((v + 3.4) / 6.8) * (W - 24), base = 48;
  const pts = Array.from({ length: 61 }, (_, i) => { const v = -3.4 + (i / 60) * 6.8; return [x(v), base - Math.exp(-(v * v) / 2) * 36] as const; });
  const d = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
  const band = pts.filter(([a]) => a >= x(-1) && a <= x(1));
  const bd = `M${x(-1)},${base}` + band.map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join('') + `L${x(1)},${base}Z`;
  const zc = Math.max(-3.3, Math.min(3.3, z));
  return (
    <svg className={s.sigscale} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Normal curve from −3σ to +3σ; the latest unusual event sits at ${z > 0 ? '+' : '−'}${Math.abs(z).toFixed(1)}σ`}>
      <path d={bd} fill="var(--accent-wash)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
      <line x1={x(-3.4)} x2={x(3.4)} y1={base} y2={base} stroke="var(--axis)" />
      {[-3, -2, -1, 0, 1, 2, 3].map((v) => <text key={v} x={x(v)} y={64} textAnchor="middle">{v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}σ`}</text>)}
      <line x1={x(zc)} x2={x(zc)} y1={base} y2={8} stroke="var(--info)" strokeWidth={2} />
      <circle cx={x(zc)} cy={8} r={3.5} fill="var(--info)" />
    </svg>
  );
}

export default async function NewsPage() {
  const [news, live, pools] = await Promise.all([getNews(), getLive(), getPools()]);
  const { now, items, refTs } = news;
  const ch = delta(now.change24h);
  const lastZ = items.find((i) => i.z);
  const lastAgo = Math.max(1, Math.round((refTs - (items[0]?.ts ?? refTs)) / 3600));

  const nowCard = (
    <section className={`card ${s.nowCard}`} aria-labelledby="now-h">
      <div className={s.nowTop}>
        <h2 className={s.railH} id="now-h"><span className="live"><i aria-hidden="true" />Right now</span></h2>
        <span className="small mono">{new Date(now.ts * 1000).toISOString().slice(11, 16)} UTC</span>
      </div>
      <div className={s.nowPrice}>
        <span className={s.big}>${num(now.price, 2)}</span>
        <span className={`delta${ch.dir === 'dn' ? ' dn' : ''}`}>{ch.text} 24h</span>
      </div>
      <Sparkline values={now.spark} width={300} height={40} color="var(--zec)" label="ZEC price, last 30 days" />
      <dl className={s.kv}>
        <div><dt>Shielded</dt><dd>{pct(now.shieldedPct)} <small>of supply</small></dd></div>
        <div><dt>Latest block</dt><dd>{num(now.height)}</dd></div>
      </dl>
      <p className={s.hrH}>Hashrate · three windows</p>
      <dl className={s.kv}>
        <div><dt>Now<span>last 120 blocks, about 2.5 h</span></dt><dd>{now.hashNow != null ? num(now.hashNow, 2) : '—'} <small>GH/s</small></dd></div>
        <div><dt>{dateShort(now.hashDaily.date)}, one day<span>daily estimate · the all-time high</span></dt><dd>{num(now.hashDaily.value, 2)} <small>GH/s</small></dd></div>
        <div><dt>7-day average<span>through {dateShort(now.hash7d.date)}</span></dt><dd>{num(now.hash7d.value, 2)} <small>GH/s</small></dd></div>
      </dl>
      <p className="small">Each figure averages over a different window, which is why they differ.</p>
      <Link href="/chart/price" className="mono" style={{ fontSize: 13 }}>Open price chart →</Link>
    </section>
  );

  const sigmaCard = (
    <section className={`card ${s.sigma}`} aria-labelledby="sig-h">
      <h2 className={s.railH} id="sig-h">What&apos;s a σ?</h2>
      <p>σ (sigma) says how unusual a value is next to its own last 30 days.{lastZ ? <> On {dateLong(lastZ.date)}, {lastZ.headline.split(' (')[0].replace(/ today$/, '')}: <b className="mono">{lastZ.z > 0 ? '+' : '−'}{Math.abs(lastZ.z).toFixed(1)}σ</b>, or {Math.abs(lastZ.z).toFixed(1)} times the usual spread {lastZ.z > 0 ? 'above' : 'below'} the 30-day average.</> : null}</p>
      <SigmaScale z={lastZ?.z ?? 2} />
      <p>If moves were normally distributed, beyond ±2σ would happen about 1 day in 20, and beyond ±3σ about 1 day in 370. Crypto often isn&apos;t normal, so read σ as a ranking, not a probability.</p>
    </section>
  );

  return (
    <>
      <Masthead
        crumbs={[{ label: 'News' }]}
        title="What just happened on Zcash"
        lede={<>A feed our node writes by itself: all-time highs, big daily moves and anything far from its 30-day norm, measured in σ. Newest first; the latest event was {lastAgo} h before this snapshot.</>}
      />
      <NewsFeed items={items} refTs={refTs} nextBefore={news.nextBefore} nowCard={nowCard} sigmaCard={sigmaCard} />
      <Tiles
        items={[
          { href: '/chart/price', title: 'ZEC price', desc: 'Every price move in the feed, on one chart with moving averages.', value: <>${num(live.zec_usd, 2)} <span className={live.zec_usd_change_24h_pct >= 0 ? 'up' : 'dn'} style={{ fontSize: 13 }}>{delta(live.zec_usd_change_24h_pct).text}</span></> },
          { href: '/chart/pools', title: 'Shielded pools', desc: `How the ${pct(pools.shieldedPct)} shielded share splits across Sapling, Orchard and Ironwood.`, value: `${zecCompact(pools.shielded)} shielded` },
          { href: '/ironwood', title: 'Ironwood migration', desc: 'The Orchard to Ironwood moves showing up in the feed, tracked to completion.', value: `${zecCompact(pools.ironwood)} in Ironwood` },
          { href: '/chart/hashrate', title: 'Hashrate', desc: "The full hashrate and difficulty history behind the feed's records.", value: `${now.hashNow != null ? num(now.hashNow, 2) : '—'} GH/s now` },
        ]}
      />
    </>
  );
}
