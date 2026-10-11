import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, More, StackBar, Tiles } from '@/components/ui/blocks';
import { Gate } from '@/components/ironwood/Gate';
import { DailyCrossings } from '@/components/ironwood/DailyCrossings';
import { SizeCdf } from '@/components/ironwood/SizeCdf';
import { getIronwood, IRONWOOD_ACTIVATION_HEIGHT } from '@/lib/data/ironwood';
import { getTurnstileIndex } from '@/lib/data/privacy';
import { POOL_COLOR, POOL_LABEL } from '@/lib/data/snapshot';
import { compact, dateShort, dateLong, delta, num, pct, usd, usdCompact } from '@/lib/format';
import s from './page.module.css';
import { SectionLd } from '@/components/seo/SectionLd';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const iw = await getIronwood();
  return pageMetadata('/ironwood', { description: `Ironwood, Zcash's newest shielded pool, has taken in ${num(iw.pct, 2)}% of Orchard's coins in ${iw.liveDays} days; ${num(iw.orchardNow)} ZEC are yet to cross. Daily crossings and sources.` });
}


export default async function IronwoodPage() {
  const [iw, ti] = await Promise.all([getIronwood(), getTurnstileIndex()]);
  const pct2 = (v: number) => num(v, 2);
  const zc = (v: number) => `${compact(v)} ZEC`;
  const { pools } = iw;
  const shareOf = (v: number) => (v / pools.supply) * 100;
  const C = 2 * Math.PI * 60;
  const vArc = (iw.verifiedPct / 100) * C;
  const orders = Math.round(Math.log10(iw.sizes.max / iw.sizes.min));
  const srcRows = [
    { key: 'transparent', label: 'Transparent', zec: iw.fromTransparent },
    { key: 'sapling', label: 'Sapling', zec: iw.fromSapling },
    { key: 'orchard', label: 'Orchard', zec: iw.fromOrchard },
  ] as const;
  const poolRows = (['transparent', 'sprout', 'sapling', 'orchard', 'ironwood', 'lockbox'] as const).map((k) => ({ k, v: pools[k] }));
  const orchardShare = (iw.fromOrchard / iw.fromAll) * 100;
  const daysRev = [...iw.days].reverse();
  const lastDay = iw.days.at(-1)!;

  return (
    <div className={`stack ${s.page}`} style={{ gap: 32 }}>
      <SectionLd path="/ironwood" />
      <Masthead
        title="Zcash Ironwood Pool"
        cadence="balances refresh every block"
        lede={<>Ironwood, Zcash&apos;s newest shielded pool, has taken in {pct2(iw.pct)}% of Orchard&apos;s coins in {iw.liveDays} days. {num(iw.orchardNow)} ZEC are still in Orchard, yet to cross.</>}
      />

      <section className="hero" id="progress" aria-labelledby="hero-lede">
        <div className={s.heroTop}>
          <div>
            <span className={s.eyebrow}><i aria-hidden="true" />Live since block {num(IRONWOOD_ACTIVATION_HEIGHT)}</span>
            <div className={`figure num ${s.xl}`}>{pct2(iw.pct)}<small>%</small></div>
            <p className={s.heroLede} id="hero-lede">of Orchard coins have crossed the turnstile into Ironwood</p>
          </div>
          <dl className={s.facts}>
            <dt>Live for</dt><dd>{iw.liveDays}d {iw.liveHours}h</dd>
            <dt>Activated</dt><dd>{dateLong(iw.activationTime * 1000)}</dd>
            <dt>Activation block</dt><dd>{num(IRONWOOD_ACTIVATION_HEIGHT)}</dd>
            <dt>Blocks since</dt><dd>{num(iw.blocksSince)}</dd>
          </dl>
        </div>
        <Gate pct={iw.pct} pinLabel={`${pct2(iw.pct)}% crossed`} label={`${pct2(iw.pct)} percent of Orchard's activation balance has crossed into Ironwood`}>
          <p className={s.gateCap}>
            <span><b>{num(iw.fromOrchard, 2)} ZEC</b> crossed from Orchard</span>
            <span>of <b>{num(iw.base, 2)} ZEC</b> in Orchard at activation</span>
          </p>
        </Gate>
      </section>

      <KpiBand label="Key figures">
        <Kpi k="Migrated from Orchard" v={compact(iw.fromOrchard)} unit="ZEC" s={<>{num(iw.fromOrchard)} ZEC: the coins behind the {pct2(iw.pct)}% headline</>} />
        <Kpi k="Orchard still to cross" v={num(iw.orchardNow)} unit="ZEC" s={<>Still in Orchard today. Another {num(iw.gapOrchard)} ZEC left Orchard for transparent addresses instead of crossing</>} />
        <Kpi k="Migrated from all pools" v={compact(iw.fromAll)} unit="ZEC" s={<>{num(iw.fromAll)} ZEC since activation, from Orchard, Sapling and transparent; what later left is not subtracted</>} />
        <Kpi k="Ironwood balance today" v={compact(iw.ironwoodNow)} unit="ZEC" s={<>{num(iw.ironwoodNow)} ZEC — {num(iw.leftIronwood)} ZEC have since left the pool</>} />
        <Kpi k="Ironwood balance value" v={usdCompact(iw.ironwoodNow * iw.price)} s={<>Balance today × {usd(iw.price)} a ZEC</>} />
        <Kpi k="Value migrated, all pools" v={usdCompact(iw.fromAll * iw.price)} s={<>{compact(iw.fromAll)} ZEC of cumulative inflow at today&apos;s price</>} />
        <Kpi k="Net Ironwood change, 24h" v={<span className={delta(iw.usdPerDay, 0, '').cls}>{iw.usdPerDay >= 0 ? '+' : '−'}{usdCompact(Math.abs(iw.usdPerDay), 1)}</span>} s={<>≈ {iw.usdPerDay >= 0 ? '+' : '−'}{num(Math.abs(iw.usdPerDay / iw.price), 0)} ZEC: every source in, minus what left. A daily rate, not a total</>} />
        <Kpi k="Blocks since activation" v={num(iw.blocksSince)} unit="blocks" s={<>Block {num(IRONWOOD_ACTIVATION_HEIGHT)} → {num(iw.height)}, about one every 75 s</>} />
      </KpiBand>

      <section className="card" id="verified">
        <div className="split" style={{ alignItems: 'center' }}>
          <div className={s.lead}>
            <h2 className="h2">How much supply is verified?</h2>
            <p className="takeaway"><b>{pct(iw.verifiedPct)}</b> of all {num(iw.supply)} ZEC now sits outside Orchard, where the 2026 soundness bug cannot have hidden counterfeit coins.</p>
            <p className="note">Every pool except the un-migrated Orchard balance counts as verified supply: coins leaving Orchard must cross the turnstile, where consensus checks the pool never pays out more than it holds. The remaining <b>{num(iw.orchardNow)} ZEC</b> still in Orchard is what has yet to cross. <a href="/orchard-turnstile">See the Turnstile watch</a>.</p>
          </div>
          <div className={s.ringrow}>
            <svg className={s.ring} viewBox="0 0 160 160" role="img" aria-label={`${pct(iw.verifiedPct)} of supply is verified; ${pct(100 - iw.verifiedPct)}, Orchard's remaining ${num(iw.orchardNow)} ZEC, is not yet verified`}>
              <g transform="rotate(-90 80 80)" fill="none" strokeWidth="18">
                <circle cx="80" cy="80" r="60" stroke="var(--inset)" />
                <circle cx="80" cy="80" r="60" stroke="var(--s1)" strokeDasharray={`${vArc - 2} ${C}`} />
                <circle cx="80" cy="80" r="60" stroke="var(--p-orchard)" strokeDasharray={`${Math.max(1, C - vArc - 2)} ${C}`} strokeDashoffset={-vArc} />
              </g>
              <text x="80" y="84" textAnchor="middle" fontSize="27" fontWeight="700" className={s.rv}>{pct(iw.verifiedPct)}</text>
              <text x="80" y="104" textAnchor="middle" className={s.rc}>VERIFIED</text>
            </svg>
            <ul className={s.key}>
              <li><i style={{ background: 'var(--s1)' }} /><span>Verified — every pool except Orchard</span><span className={s.pct}>{pct(iw.verifiedPct)}</span><span className={s.amt}>{num(iw.verified)} ZEC</span></li>
              <li><i style={{ background: 'var(--p-orchard)' }} /><span>Not yet verified — Orchard remaining</span><span className={s.pct}>{pct(100 - iw.verifiedPct)}</span><span className={s.amt}>{num(iw.orchardNow)} ZEC</span></li>
            </ul>
          </div>
        </div>
      </section>

      <details className={s.explain} id="reading">
        <summary>
          <h2 className="h2">What that percentage counts, and what it leaves out</h2>
          <span className={s.exTags}><span>Crossings, not holdings</span><span>Orchard only</span><span>A fixed denominator</span></span>
          <span className={s.exCtl} aria-hidden="true"><span className={s.exShow}>Show</span><span className={s.exHide}>Hide</span><i><svg width="11" height="11" viewBox="0 0 10 10"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></i></span>
        </summary>
        <div className={`${s.exBody} split`}>
          <div className={s.lead}>
            <p className="note">Ironwood is the newest official Zcash shielded pool, live since block {num(IRONWOOD_ACTIVATION_HEIGHT)}. This page tracks the turnstile migration: value leaving the older Orchard pool and re-shielding into Ironwood. The headline is Orchard coins that have crossed into Ironwood, divided by Orchard&apos;s balance at the activation block.</p>
          </div>
          <ul className={s.caveats}>
            <li><b>Crossings, not holdings</b><span>Coins that crossed and later left Ironwood still count.</span></li>
            <li><b>Orchard only</b><span>Transparent and Sapling coins have flowed into Ironwood too. They show up in &ldquo;Migrated from all pools&rdquo;, the Ironwood balance and the source breakdown below.</span></li>
            <li><b>A fixed denominator</b><span>Orchard&apos;s balance at the activation block, never today&apos;s. An ordinary Orchard→transparent spend moves neither half of the fraction, so the percentage cannot climb on days when nothing migrated.</span></li>
          </ul>
        </div>
      </details>

      <section className="card" id="daily">
        <div className="card-head">
          <div className={s.chHead}>
            <h2 className="h3">How many coins cross per day?</h2>
            <p className="takeaway">Most of Orchard moved in the first weeks: the busiest day for Orchard crossings, <b>{dateShort(iw.busiest.date)}, carried {zc(iw.busiest.orchard)}</b>. Since then crossings have slowed to a trickle.</p>
          </div>
          <ChartActions api="ironwood-daily" name="Daily Ironwood crossings" />
        </div>
        <DailyCrossings days={iw.days} />
        <p className={s.summary}>
          <span><b>{iw.days.length} days</b></span>
          <span><b>{compact(iw.fromOrchard)} ZEC</b> from Orchard</span>
          <span>busiest Orchard day <b>{dateShort(iw.busiest.date)} · {zc(iw.busiest.orchard)}</b></span>
          <span><b>{zc(iw.avgPerDay)}/day</b> from Orchard, completed days</span>
        </p>
        <div className={s.notes}>
          <p className="note">Ironwood inflow attributed to Orchard as its source, bucketed by the UTC day the block landed. These are <b>crossings, not net holdings</b>, and they sum to the Orchard row of the source breakdown below.</p>
          <p className="note">They will not match &ldquo;Net Ironwood change, 24h&rdquo;, which is the change in the whole Ironwood balance (every source, minus what left) in dollars. Today&apos;s column is hatched until the day closes.</p>
        </div>
        <details className={s.tbl}>
          <summary>View daily figures as a table</summary>
          <div className="tbl-wrap" style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
            <table className="t">
              <caption className="sr-only">Daily ZEC crossing into Ironwood</caption>
              <thead><tr><th scope="col">Day (UTC)</th><th scope="col">From Orchard, ZEC</th><th scope="col">Sapling + transparent, ZEC</th><th scope="col">Orchard crossed</th></tr></thead>
              <tbody>
                {daysRev.map((d) => (
                  <tr key={d.date}><td>{dateShort(d.date)}{d.complete ? '' : ' (so far)'}</td><td>{num(d.orchard)}</td><td>{num(d.other)}</td><td>{pct2(d.cumPct)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="small">Source: per-block scan of a Zebra full node · data through block {num(iw.height)}, {dateLong(lastDay.date)}</p>
      </section>

      <section className="card" id="size">
        <div className="card-head">
          <div className={s.chHead}>
            <h2 className="h3">How big is a typical migration?</h2>
            <p className="takeaway">Half of all migrations moved <b>{num(iw.sizes.median, 2)} ZEC or less</b>, but the value sits in the tail: the biggest single transaction moved <b>{num(iw.sizes.max)} ZEC</b>.</p>
          </div>
          <ChartActions api="ironwood-tx-sizes" name="Ironwood migration sizes" />
        </div>
        <dl className={s.stats}>
          <div><dt>Transactions</dt><dd>{num(iw.sizes.count)}<span>txs</span></dd></div>
          <div><dt>Median</dt><dd>{num(iw.sizes.median, 2)}<span>ZEC</span></dd></div>
          <div><dt>P90</dt><dd>{num(iw.sizes.p90)}<span>ZEC</span></dd></div>
          <div><dt>Largest</dt><dd>{num(iw.sizes.max)}<span>ZEC</span></dd></div>
          <div><dt>Total moved</dt><dd>{num(iw.sizes.total)}<span>ZEC</span></dd></div>
        </dl>
        <div className="legend"><span><i className="ln" style={{ background: 'var(--p-ironwood)' }} />Share of migrations at or below this size</span><span className="muted">x-axis: ZEC per transaction, log scale</span></div>
        <SizeCdf points={iw.sizes.points} median={iw.sizes.median} p90={iw.sizes.p90} max={iw.sizes.max}
          ariaLabel={`Cumulative distribution of Ironwood migration sizes on a log scale: median ${num(iw.sizes.median, 2)} ZEC, 90th percentile ${num(iw.sizes.p90)} ZEC, largest ${num(iw.sizes.max)} ZEC`} />
        <div className={s.notes}>
          <p className="note">Every transaction that has moved value into Ironwood since activation, from all source pools — one point per transaction. Read it as: <b>y% of migrations were this size or smaller</b>. The axis is logarithmic because sizes run from {num(iw.sizes.min, 8)} ZEC (one zatoshi) to {num(iw.sizes.max)} ZEC, about {orders} orders of magnitude; it starts at 0.0001 ZEC, and the few smaller migrations sit at its left edge.</p>
          <p className="note">The average migration is {num(iw.sizes.mean, 1)} ZEC, more than {num(Math.floor(iw.sizes.mean / iw.sizes.median / 100) * 100)}× the median. The smallest 25% are under {num(iw.sizes.p25, 4)} ZEC, while the largest 1% are over {num(iw.sizes.p99, 1)} ZEC. So a median migration is not a typical migrated coin: most coins crossed in a few very large transactions.</p>
        </div>
        <p className="small">Source: Ironwood inflow transactions, blocks {num(IRONWOOD_ACTIVATION_HEIGHT)}–{num(iw.height)}</p>
      </section>

      <div className={`grid2 ${s.grid2}`}>
        <Card id="sources" title="Where did the migrated value come from?"
          takeaway={<><b>{pct(orchardShare)}</b> came from Orchard; almost a third, <b>{compact(iw.fromTransparent)} ZEC</b>, was transparent ZEC shielding straight into Ironwood.</>}
          actions={<ChartActions api="ironwood-sources" name="Ironwood sources" />}>
          <StackBar height={18} legend={false} label="Ironwood inflow by source pool (key: the table below)" fmt={zc} parts={srcRows.map((r) => ({ key: r.key, label: r.label, value: r.zec, color: POOL_COLOR[r.key] }))} />
          <div className="tbl-wrap">
            <table className={`t ${s.tblPools}`}>
              <caption className="sr-only">Ironwood inflow by source pool</caption>
              <thead><tr><th scope="col">Source</th><th scope="col">Inflow, ZEC</th><th scope="col">Share</th></tr></thead>
              <tbody>
                {srcRows.map((r) => (
                  <tr key={r.key}><td className="l"><span className="sw" style={{ background: POOL_COLOR[r.key] }} />{r.label}</td><td>{num(r.zec, 2)}<small>{usd(r.zec * iw.price, 0)}</small></td><td>{pct((r.zec / iw.fromAll) * 100)}</td></tr>
                ))}
                <tr className={s.total}><td className="l">Migrated from all pools</td><td>{num(iw.fromAll, 2)}<small>{usd(iw.fromAll * iw.price, 0)}</small></td><td>100%</td></tr>
              </tbody>
            </table>
          </div>
          <p className="note">Each Ironwood inflow is traced to the pool (or transparent funds) that supplied the value in the same transaction. These are <b>cumulative inflows</b>, not a balance: the total sits above today&apos;s Ironwood balance by the {num(iw.leftIronwood)} ZEC that has since left.</p>
        </Card>
        <Card id="pools" title="What is in each pool today?"
          takeaway={<>Ironwood already holds <b>{pct(shareOf(pools.ironwood))}</b> of all ZEC — <b>{num((pools.ironwood / pools.shielded) * 100)}%</b> of everything shielded.</>}
          actions={<ChartActions api="daily-stats" name="Pool balances" />}>
          <StackBar height={18} legend={false} label="ZEC supply by pool (key: the table below)" fmt={zc} parts={poolRows.map((r) => ({ key: r.k, label: POOL_LABEL[r.k], value: r.v, color: POOL_COLOR[r.k] }))} />
          <div className="tbl-wrap">
            <table className={`t ${s.tblPools}`}>
              <caption className="sr-only">Balance of each pool</caption>
              <thead><tr><th scope="col">Pool</th><th scope="col">Balance, ZEC</th><th scope="col">Share of supply</th></tr></thead>
              <tbody>
                {poolRows.map((r) => (
                  <tr key={r.k} className={r.k === 'ironwood' ? s.hl : undefined}><td className="l"><span className="sw" style={{ background: POOL_COLOR[r.k] }} />{r.k === 'lockbox' ? 'Lockbox (Dev Fund)' : POOL_LABEL[r.k]}</td><td>{num(r.v)}</td><td>{pct(shareOf(r.v))}</td></tr>
                ))}
                <tr className={s.total}><td className="l">Shielded total</td><td>{num(pools.shielded)}</td><td>{pct(pools.shieldedPct)}</td></tr>
                <tr className={s.total}><td className="l">Total supply</td><td>{num(pools.supply)}</td><td>100%</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small">Shielded = Sprout + Sapling + Orchard + Ironwood. Lockbox is the protocol-held Dev Fund.</p>
        </Card>
      </div>

      <More summary="How these numbers are computed">
        <p className="note">Pool balances come from consensus-enforced per-block pool totals on our Zebra node, so they are exact. Source attribution is per transaction: the value entering Ironwood is assigned to the pool(s) that funded the same transaction. Dollar figures use today&apos;s price of {usd(iw.price)} for every row, so they show what the ZEC is worth now, not what it was worth when it moved.</p>
        <p className="note">The headline divides Orchard-sourced Ironwood inflow ({num(iw.fromOrchard, 2)} ZEC) by Orchard&apos;s balance at the activation block ({num(iw.base, 2)} ZEC). Daily crossings are bucketed by the UTC day of the block; the last day is still in progress.</p>
      </More>

      <div className={s.readNext}><Tiles items={[
        { href: '/privacy', title: 'Privacy hub', desc: 'Every privacy number on one page', value: <>{pct(pools.shieldedPct)} <span className={s.unit}>shielded</span></> },
        { href: '/orchard-turnstile', title: 'Turnstile watch', desc: 'Was the Orchard bug ever exploited?', value: <>{Math.round(ti.isi)}/100 <span className={s.unit}>{ti.band.name.toLowerCase()}</span></> },
        { href: '/chart/pools', title: 'Shielded pool balances', desc: 'Five years of pool generations', value: <>{compact(pools.shielded)} <span className={s.unit}>ZEC</span></> },
        { href: '/chart/flow-ironwood', title: 'Ironwood flows + balance', desc: 'Daily in and out of the pool', value: <>{compact(pools.ironwood)} <span className={s.unit}>ZEC</span></> },
      ]} /></div>
    </div>
  );
}
