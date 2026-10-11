import type { Metadata } from 'next';
import Link from 'next/link';
import { ChartActions, Delta, Kpi, KpiBand, Legend, Section, StackBar } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { HomeSearch } from '@/components/home/HomeSearch';
import { CatRail } from '@/components/home/CatRail';
import { Spark } from '@/components/home/Spark';
import { AmountLookup } from '@/components/privacy/AmountLookup';
import { IsiMeter } from '@/components/turnstile/Gauge';
import { getChartIndex, getHome, ZEBRA_VERSION, type IndexRow } from '@/lib/data/home';
import { getRoundAmounts, getRoundTrips } from '@/lib/data/privacy';
import { getHalving } from '@/lib/data/reports';
import { NODE_STATE, nodeState } from '@/lib/data/nav';
import { getFreshness, POOL_COLOR, POOL_LABEL } from '@/lib/data/snapshot';
import { getSearchIndex } from '@/lib/data/search-index';
import { api } from '@/lib/data/core';
import { compact, dateLong, delta, num, pct, usd, usdCompact } from '@/lib/format';
import { getIronwood } from '@/lib/data/ironwood';
import { organizationLd, pageMetadata, websiteLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import s from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const [h, iw, f] = await Promise.all([getHome(), getIronwood(), getFreshness()]);
  return pageMetadata('/', { description: `Live Zcash statistics from our own Zebra node: ZEC at ${usd(h.live.zec_usd, 0)}, ${num(h.pools.shieldedPct, 1)}% of supply shielded, Ironwood ${num(iw.pct, 2)}% migrated. Data through ${dateLong(f.dataThrough)}.` });
}

// Popular charts, as the live dashboard lists them (a fixed pick there; there is no view data to rank by).
const POPULAR = ['pool-profit', 'pool-usd', 'pool-residency', 'swap-assets', 'price', 'realized'];

const dayMonth = (d: string | number | Date) => dateLong(d).replace(/ \d{4}$/, '');
const times = (v: number, d = 1) => `${num(v, d)}×`;
/** $20.95B · $562.33M · $134.3K — two decimals for billions/millions, one for thousands. */
const money = (v: number) => { const a = Math.abs(v), sg = v < 0 ? '−' : ''; return a >= 1e12 ? `${sg}$${num(a / 1e12, 2)}T` : a >= 1e9 ? `${sg}$${num(a / 1e9, 2)}B` : a >= 1e6 ? `${sg}$${num(a / 1e6, 2)}M` : a >= 1e3 ? `${sg}$${num(a / 1e3, 1)}K` : usd(v, 0); };
const upDown = (v: number, digits = 1) => { const d = delta(v, digits); return <span className={d.cls}>{d.text}</span>; };
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`;
/** Reward per block, as the protocol writes it (1.5625, not 1.56). */
const reward = (v: number) => v.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
const word = (v: number) => (v >= 0 ? 'up' : 'down');

export default async function Home() {
  const [h, index, f, searchIndex, liveCharts, ra, rt, hv] = await Promise.all([getHome(), getChartIndex(), getFreshness(), getSearchIndex(), api<{ id: string; t: string }[]>('charts'), getRoundAmounts(), getRoundTrips(), getHalving()]);
  const node = NODE_STATE[nodeState(f)];
  const { pools, live } = h;
  const asOf = dateLong(f.capturedAt);
  const share = (v: number) => (v / pools.supply) * 100;
  const poolList = (['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'] as const);
  const rowsBySlug = new Map(index.flatMap((g) => g.rows).map((r) => [r.slug, r]));
  const titleOf = (slug: string) => liveCharts.find((c) => c.id === slug)?.t ?? rowsBySlug.get(slug)?.title ?? slug;
  const total = index.reduce((a, g) => a + g.rows.length, 0);
  const five = h.fiveRows;
  const sigma = (z: number) => (z ? `${z > 0 ? '+' : '−'}${num(Math.abs(z), 1)}σ` : null);

  return (
    <>
      <JsonLd data={[websiteLd(), organizationLd()]} />
      {/* Landing top (composition A): the event tape is the page's first line (app/layout.tsx), so the header is
          slim — smaller H1, no kicker, freshness on one line — and the search field moves up. */}
      <div className={s.landTop}>
        <header className={s.slim}>
          <div className={s.slimHead}>
            <h1 className={`h1 ${s.h1}`}>Every Zcash number, from our own node</h1>
            <p className={s.fresh}>
              <span className={`live${node.cls ? ` ${node.cls}` : ''}`}><i aria-hidden="true" />Node {node.text.toLowerCase()}</span>
              <span>block <span className="num">{num(f.height)}</span></span>
              <span>data through {dateLong(f.dataThrough)}</span>
              <span>updates daily</span>
            </p>
          </div>
          <p className={s.lede}>Computed from a Zebra full node — not copied from an exchange API. {total} charts, updated daily.</p>
        </header>
        <HomeSearch index={searchIndex} />
      </div>

      {/* ---------- HERO: price + privacy ---------- */}
      <div className={s.heroPair}>
        <section className="hero" aria-labelledby="price-k">
          <div className={s.phHead}>
            <div>
              <p className="kicker" id="price-k">ZEC price · USD</p>
              <div className={s.figRow}>
                <span className="figure md num">{usd(h.price)}</span>
                <Delta badge v={live.zec_usd_change_24h_pct} label="24h" />
              </div>
              <p className={`${s.subline} num`}>{num(h.ratio, 5)} BTC {upDown(live.zec_btc_change_24h_pct)} <span style={{ color: 'var(--muted)' }}>24h</span></p>
            </div>
          </div>
          <TimeSeriesChart
            dates={h.prices.dates}
            series={[{ key: 'zec', label: 'ZEC price', color: 'var(--zec)', type: 'area', values: h.prices.values }]}
            format="usd"
            defaultRange="5Y"
            logToggle
            height={300}
            showLegend={false}
            ariaLabel={`ZEC price in US dollars, daily close. Five-year range ${usd(h.range5y.lo, 0)} to ${usd(h.range5y.hi, 0)}; now ${usd(h.price)}.`}
          />
          <div className={s.cap}>
            <p className="small">5-year range <b className="num">{usd(h.range5y.lo, 0)} – {usd(h.range5y.hi, 0)}</b> · weekly close, {dateLong(h.range5y.from)} – {dateLong(h.range5y.to)}</p>
            <Link className={s.go} href="/chart/price">Open price chart →</Link>
          </div>
        </section>

        <section className="hero" aria-labelledby="priv-k">
          <div className={s.phHead}>
            <div>
              <p className="kicker" id="priv-k">Shielded supply</p>
              <div className={s.figRow}>
                <span className="figure md num">{pct(pools.shieldedPct)}</span>
                <Delta badge v={Number(pools.shieldedPct.toFixed(1)) - Number(h.yearAgo.shieldedPct.toFixed(1))} suffix=" pts" label="1y" />
              </div>
              <p className={`${s.subline} num`}>{compact(pools.shielded)} ZEC · {money(pools.shielded * h.price)} · {pct(h.yearAgo.shieldedPct)} a year ago</p>
            </div>
          </div>
          <div className={s.pb}>
            <div className={s.pbLbl} aria-hidden="true" style={{ gridTemplateColumns: `minmax(0,${100 - pools.shieldedPct}fr) minmax(0,${pools.shieldedPct}fr)` }}>
              <span>Transparent · not private</span><span className={s.sh}>Shielded {pct(pools.shieldedPct)}</span>
            </div>
            <div className={s.poolbar} role="img" aria-label={`Supply by pool: ${poolList.map((p) => `${POOL_LABEL[p]} ${pct(share(pools[p]))}`).join(', ')} of total supply.`}>
              {poolList.map((p) => <i key={p} style={{ flexGrow: pools[p], minWidth: 2, background: POOL_COLOR[p] }} />)}
            </div>
          </div>
          <ul className={s.poolkey}>
            <li className={s.hd}><span /><span>Pool</span><span>ZEC</span><span>Share</span></li>
            {poolList.map((p) => (
              <li key={p} className={p === 'transparent' ? undefined : s.shd}>
                <span className="sw" style={{ background: POOL_COLOR[p] }} />
                <span className={s.n}>{POOL_LABEL[p]}</span>
                <span className={s.z}>{pools[p] >= 1e6 ? `${num(pools[p] / 1e6, 2)}M` : num(pools[p])}</span>
                <span className={s.p}>{pct(share(pools[p]))}</span>
              </li>
            ))}
          </ul>
          <div className={s.mini2}>
            <div>
              <span className={s.k}>Shielded share · 1y</span>
              <Spark values={h.y1} color="var(--s5)" window="1-year" label={`Shielded share of supply over the last year, from ${pct(h.yearAgo.shieldedPct)} to ${pct(pools.shieldedPct)}`} />
              <span className={`${s.s} num`}>{pct(h.yearAgo.shieldedPct)} → {pct(pools.shieldedPct)}</span>
            </div>
            <div>
              <span className={s.k}>Net shielded · 7d</span>
              <span className={`${s.v} num ${delta(h.net7.net, 0, '').cls}`}>{signed(h.net7.net)} <span className={s.u}>ZEC</span></span>
              <span className={s.s}>{num(h.net7.in)} in · {num(h.net7.out)} out, to {dayMonth(f.dataThrough)}</span>
              <span className={s.s}>Week before {signed(h.net7.prior)} ZEC</span>
            </div>
          </div>
          <div className={s.mig}>
            <div className={s.migTop}><span>Ironwood migration</span><b className="num">{num(h.migration.pct, 2)}%</b></div>
            <span className={s.meter} role="img" aria-label={`${num(h.migration.pct, 2)} percent of Orchard ZEC has crossed into Ironwood`}><i style={{ width: `${h.migration.pct}%` }} /></span>
            <div className={s.cap}><span className="small num">{compact(h.migration.crossed)} of {compact(h.migration.base)} Orchard ZEC crossed · live {h.migration.days} days</span><Link className={s.go} href="/privacy">Open the privacy hub →</Link></div>
          </div>
        </section>
      </div>

      {/* ---------- KPI band ---------- */}
      <KpiBand label="Key figures">
        <Kpi href="/chart/zec-btc-ratio" k="ZEC/BTC" v={num(h.ratio, 5)} unit="BTC" s={<>24h {upDown(live.zec_btc_change_24h_pct)} · 30d {upDown(live.zec_btc_change_30d_pct)}</>} />
        <Kpi href="/chart/market-cap" k="Market cap" v={money(h.marketCap)} s={`${num(pools.supply)} ZEC in circulation`} />
        <Kpi href="/chart/mvrv" k="MVRV" v={times(h.mvrv, 2)} s={`Realized price ${usd(h.realizedPrice, 0)} · average coin in profit`} />
        <Kpi href="/chart/fdv-vs-btc" k="FDV vs Bitcoin" v={pct(h.fdvPct, 2)} s={`${usdCompact(h.fdvUsd, 1)} fully diluted, of Bitcoin's ${money(h.btcCap)}`} />
        <Kpi href="/chart/inflation" k="Inflation" v={pct(h.inflation, 2)} unit="/yr" s={`${num(h.coinbasePerDay)} new ZEC per day, 30-day average`} />
        <Kpi href="/chart/supply" k="Supply issued" v={<>{pct(h.issuedPct)}<span className={s.meter + ' ' + s.n} role="img" aria-label={`${pct(h.issuedPct)} of 21 million issued`} style={{ display: 'block', marginLeft: 0 }}><i style={{ width: `${h.issuedPct}%` }} /></span></>} s={`${compact(pools.supply)} of 21M ZEC`} />
        <Kpi href="/chart/hashrate" k="Network hashrate" v={num(h.hashrate / 1e9, 2)} unit="GSol/s" s="Equihash proof of work, in solutions per second" />
        <Kpi href="/chart/total-fees" k="Monthly fees" v={money(h.feeUsd)} s={`${num(h.feeZec)} ZEC paid by users, last 30 days`} />
      </KpiBand>

      {/* ---------- Today in Zcash ---------- */}
      <Section id="today" title="Today in Zcash" aside={<span className="small">Updated {asOf}</span>}>
        <div className={s.today}>
          <article className="card">
            <p className="kicker">Five-year outlook · ZEC vs Bitcoin</p>
            <p className={s.say}>As of {asOf}, one ZEC buys {num(h.ratio, 5)} BTC — {word(h.ratio - h.r5)} {times(h.ratio / h.r5)} over five years, {word(h.ratio - h.r1)} {times(h.ratio / h.r1)} on the year and {word(h.ratio - h.r3m)} {num(Math.abs(h.ratio / h.r3m - 1) * 100)}% over three months. Five years ago it bought {num(h.r5, 6)} BTC.</p>
            <details className={s.rm}>
              <summary>Read more</summary>
              <div>
                <p className="note">In dollars that is {usd(h.price)} a coin and a market cap of {money(h.marketCap)}; fully diluted, ZEC is worth {pct(h.fdvPct, 2)} of Bitcoin. Spot sits {times(h.mvrv, 2)} above the realized price of {usd(h.realizedPrice, 0)} — the average price at which a ZEC last crossed a pool boundary — so the typical coin is held at a gain.</p>
                <p className="note">Behind it: {pct(pools.shieldedPct)} of all ZEC — {compact(pools.shielded)} ZEC, {money(pools.shielded * h.price)} — sits in shielded pools, against {pct(h.yearAgo.shieldedPct)} a year ago and {pct(h.fiveAgo.shieldedPct)} five years ago. Ironwood, the newest pool, holds {compact(pools.ironwood)} ZEC; {num(pools.orchard)} ZEC is still in Orchard, its predecessor.</p>
                <p className="note">{compact(pools.supply)} of 21M ZEC has been issued ({pct(h.issuedPct)}). Hashrate is {num(h.hashrate / 1e9, 2)} GSol/s.</p>
              </div>
            </details>
          </article>
          <article className="card">
            <p className="kicker">Daily changes · market</p>
            <p className={s.say}>Against Bitcoin, ZEC changes hands at {num(h.ratio, 5)} BTC — {word(live.zec_btc_change_24h_pct)} {pct(Math.abs(live.zec_btc_change_24h_pct))} over 24 hours and {word(live.zec_btc_change_30d_pct)} {pct(Math.abs(live.zec_btc_change_30d_pct))} over 30 days.</p>
            <details className={s.rm}>
              <summary>Read more</summary>
              <div>
                <p className="note">In dollars, ZEC is {word(live.zec_usd_change_24h_pct)} {pct(Math.abs(live.zec_usd_change_24h_pct))} over 24 hours at {usd(h.price)}, a market cap of {money(h.marketCap)}.</p>
                <p className="note">A net {num(Math.abs(h.net7.net))} ZEC moved {h.net7.net >= 0 ? 'into' : 'out of'} shielded pools in the 7 days to {dayMonth(f.dataThrough)} ({num(h.net7.in)} shielded, {num(h.net7.out)} deshielded), against {signed(h.net7.prior)} ZEC the week before.</p>
                <p className="note">The Ironwood migration stands at {num(h.migration.pct, 2)}% of Orchard&apos;s activation balance.</p>
              </div>
            </details>
          </article>
          <article className="card">
            <div className="card-head"><p className="kicker">Notable on-chain events</p><Link className={s.go} href="/news">All news →</Link></div>
            <ul className={s.ev}>
              {h.events.map((e) => (
                <li key={e.headline}>
                  <span className={s.tags}><span className={s.tag}>{e.theme}</span>{sigma(e.z) && <span className={`${s.tag} ${s.sig}`}>{sigma(e.z)}</span>}</span>
                  <time dateTime={e.date}>{dayMonth(e.date)}</time>
                  <p><Link href={e.chart_id ? `/chart/${e.chart_id}` : '/news'}>{e.headline}</Link></p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </Section>

      {/* ---------- Privacy at a glance ---------- */}
      <Section id="privacy" title="Privacy at a glance" aside={<Link className={s.go} href="/privacy">Privacy hub →</Link>}>
        <div className={s.pgrid}>
          <article className="card">
            <div className="card-head">
              <h3 className="h3">How much ZEC is shielded, and in which pool?</h3>
              <ChartActions api="daily-stats" name="Shielded ZEC by pool" />
            </div>
            <p className="takeaway"><b>{pct(pools.shieldedPct)}</b> of all ZEC is shielded — {pools.shieldedPct >= h.yearAgo.shieldedPct ? 'up' : 'down'} from {pct(h.yearAgo.shieldedPct)} a year ago and {pct(h.fiveAgo.shieldedPct)} five years ago. Since Ironwood went live on {dayMonth(h.migration.activation)}, it has absorbed {h.migration.pct >= 50 ? 'most' : 'part'} of Orchard.</p>
            <Legend items={[
              { label: 'Ironwood', color: 'var(--p-ironwood)' },
              { label: 'Orchard', color: 'var(--p-orchard)' },
              { label: 'Sapling', color: 'var(--p-sapling)' },
            ]} />
            <p className="small">Sprout ({num(pools.sprout)} ZEC) is too small to show.</p>
            <TimeSeriesChart
              dates={five.map((r) => r.date)}
              series={(['sapling', 'orchard', 'ironwood'] as const).map((p) => ({ key: p, label: POOL_LABEL[p], color: POOL_COLOR[p], values: five.map((r) => r[p]) }))}
              stacked
              ranges={false}
              showLegend={false}
              format="zecCompact"
              height={280}
              events={[{ date: '2026-07-28', label: 'Ironwood live' }]}
              ariaLabel={`Stacked area of shielded ZEC by pool over five years; total shielded now ${compact(pools.shielded)} ZEC, ${pct(pools.shieldedPct)} of supply`}
            />
            <div className={s.cap}>
              <p className="small">Shielded ZEC by pool, weekly, {dateLong(five[0].date)} – {dateLong(five.at(-1)!.date)} · consensus-exact from our node</p>
              <Link className={s.go} href="/chart/pools">Open pool chart →</Link>
            </div>
          </article>
          <div className={s.side}>
            <article className={`card ${s.cmp}`}>
              <span className={s.k}>Shielded transactions</span>
              <span className={`${s.v} num`}>{pct(h.shieldedTxShare)}<span>of tx</span></span>
              <StackBar height={10} label="User transactions by whether they touched a shielded pool" fmt={(v) => num(v)}
                parts={[{ key: 'sh', label: 'Touched a shielded pool', value: h.last.shielded_tx_count, color: 'var(--s5)' }, { key: 't', label: 'Transparent only', value: h.txDay - h.last.shielded_tx_count, color: 'var(--other)' }]} />
              <span className="small">{num(h.last.shielded_tx_count)} of {num(h.txDay)} user transactions on {dayMonth(h.last.date)} touched a shielded pool.</span>
            </article>
            <article className={`card ${s.cmp}`}>
              <span className={s.k}>Shield vs deshield · 7 days</span>
              <span className={`${s.v} num ${delta(h.net7.net, 0, '').cls}`}>{signed(h.net7.net)}<span>ZEC net {h.net7.net >= 0 ? 'in' : 'out'}</span></span>
              <div>
                <div className={s.dv} role="img" aria-label={`Last 7 days: ${num(h.net7.in)} ZEC shielded, ${num(h.net7.out)} ZEC deshielded`}>
                  <div className={s.l}><span>{num(h.net7.out)}</span><i style={{ width: `${(h.net7.out / Math.max(h.net7.in, h.net7.out)) * 68}%` }} /></div>
                  <div className={s.r}><i style={{ width: `${(h.net7.in / Math.max(h.net7.in, h.net7.out)) * 68}%` }} /><span>{num(h.net7.in)}</span></div>
                </div>
                <div className={s.dvCap}><span>deshielded out</span><span>shielded in</span></div>
                <p className="small">7 complete days to {dayMonth(f.dataThrough)}</p>
              </div>
            </article>
            <article className={`card ${s.cmp}`}>
              <span className={s.k}>Orchard turnstile watch</span>
              <span className={`${s.v} num`}>{Math.round(h.turnstile.isi)}<span>/ 100 · {h.turnstile.band.name}</span></span>
              <IsiMeter value={h.turnstile.isi} />
              <Link className={s.go} href="/orchard-turnstile">Read the turnstile watch →</Link>
            </article>
          </div>
        </div>
        <div className={s.tools3}>
          <article className={`card ${s.tool}`}>
            <div className={s.t}><Icon name="shield" size={18} /><h3 className="h3">Privacy tips</h3></div>
            <p className="note">Shield and deshield in common round amounts so your transaction blends in. Ranked from {num(ra.shieldTx)} shielding and {num(ra.deshieldTx)} deshielding transactions.</p>
            <Link className={s.go} href="/privacy-suggestions">See the best amounts →</Link>
          </article>
          <article className={`card ${s.tool}`}>
            <div className={s.t}><Icon name="search" size={18} /><h3 className="h3">Amount lookup</h3></div>
            <p className="note">How often has an amount been shielded or deshielded?</p>
            <AmountLookup id="amt" compact />
          </article>
          <article className={`card ${s.tool}`}>
            <div className={s.t}><Icon name="warn" size={18} /><h3 className="h3">Wall of Shame</h3></div>
            <p className="note"><b className="num" style={{ color: 'var(--value)' }}>{num(rt.total)}</b> shield → deshield round-trips matched by a near-identical amount — and how to avoid being one.</p>
            <Link className={s.go} href="/wall-of-shame">Browse the matches →</Link>
          </article>
        </div>
      </Section>

      {/* ---------- Network & security ---------- */}
      <Section id="network" title="Network & security" aside={<Link className={s.go} href="/network">Network nodes →</Link>}>
        <KpiBand six label="Network figures">
          <Kpi href="/chart/hashrate" k="Hashrate" v={num(h.hashrate / 1e9, 2)} unit="GSol/s" s={`Equihash · ~75 s blocks · ${num(h.last.block_count)} blocks on ${dayMonth(h.last.date)}`} />
          <Kpi href="/network" k="Reachable nodes" v={num(h.nodes.reachable)} unit="nodes" s={`in ${h.nodes.countries} countries`} />
          <Kpi href="/node" k="Our node" v={<span className={`${s.liveV}${node.cls ? ` ${s[node.cls]}` : ''}`}><i aria-hidden="true" />{node.text}</span>} s={`Zebra ${ZEBRA_VERSION} · block ${num(h.height)}`} />
          <Kpi href="/halving" k="Next halving" v={`~${num(h.halving.days)}`} unit="days" s={<><span className={`${s.meter} ${s.n}`} role="img" aria-label={`${pct(h.halving.eraPct)} of the current halving era elapsed`} style={{ display: 'block' }}><i style={{ width: `${h.halving.eraPct}%` }} /></span>~{dateLong(h.halving.date)} · {reward(hv.reward)} → {reward(hv.next.rewardAfter)} ZEC a block</>} />
          <Kpi href="/chart/tx" k="Transactions / day" v={num(h.txDay)} unit="txs" s={`user transactions on ${dayMonth(h.last.date)}, coinbase excluded`} />
          <Kpi href="/chart/block-size" k="Avg block" v={num(h.avgBlockKb)} unit="KB" s={`average block size, ${dayMonth(h.last.date)}`} />
        </KpiBand>
      </Section>

      {/* ---------- Markets & cross-chain ---------- */}
      <Section id="markets" title="Markets & cross-chain" aside={<Link className={s.go} href="/swaps">Swaps &amp; exchanges →</Link>}>
        <KpiBand label="Market figures">
          <Kpi href="/chart/near-bridge" k="NEAR bridge" v={num(h.near.bridge)} unit="ZEC" s={`ZEC wrapped on NEAR, ${dayMonth(h.near.bridgeDate)}`} />
          <Kpi href="/chart/near-flow" k="NEAR Intents net flow" v={<span className={h.near.net < 0 ? 'dn' : h.near.net > 0 ? 'up' : 'muted'}>{h.near.net < 0 ? '−' : h.near.net > 0 ? '+' : ''}{usd(Math.abs(h.near.net), 0)}</span>} s={h.near.net === 0 ? `no cross-chain ZEC swaps recorded on ${dayMonth(h.near.netDate)}` : `${h.near.net < 0 ? 'more ZEC swapped out than in' : 'more ZEC swapped in than out'}, ${dayMonth(h.near.netDate)}`} />
          <Kpi href="/chart/hl-oi" k="Perp open interest" v={money(h.hl.oi)} s={`Hyperliquid · funding ${pct(h.hl.funding, 2)} APR`} />
          <Kpi href="/chart/exch-vol" k="Exchange volume" v={money(h.exch.zec)} s={`ZEC traded across tracked exchanges, ${dayMonth(h.exch.date)}`} />
        </KpiBand>
      </Section>

      {/* ---------- Popular this week ---------- */}
      <Section id="popular" title="Popular charts" aside={<span className="small">A pick of the most-read charts</span>}>
        <ol className={s.pop}>
          {POPULAR.map((slug) => {
            const r = rowsBySlug.get(slug);
            return (
              <li key={slug}>
                <Link href={`/chart/${slug}`}>
                  <span className={s.t}><span>{titleOf(slug)}</span><span aria-hidden="true">→</span></span>
                  {r?.spark?.length ? <Spark values={r.spark} color={slug === 'price' ? 'var(--zec)' : 'var(--text-2)'} window="1-year" label={titleOf(slug)} /> : <span className={s.noSpark} aria-hidden="true" />}
                  <span className={`${s.v}${!r?.value || r.descriptor ? ` ${s.d}` : ''} num`}>{r?.value ?? 'Open chart'}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* ---------- All charts ---------- */}
      <section className="sec" aria-labelledby="idx-h" id="charts">
        <div className="sec-h">
          <div className={s.idxH}><h2 className="h2" id="idx-h">All {total} charts</h2><p className="small" style={{ fontSize: 13.5 }}>Grouped by the question they answer, each with its latest reading. Charts without one headline number say what they show.</p></div>
          <Link className={s.go} href="/charts">Filter all charts →</Link>
        </div>
        <div className={s.dir}>
          <CatRail groups={index.map((g) => ({ id: g.id, title: g.title, count: g.rows.length }))} className={s.cats} itemClass={s.cat} />
          <div className={s.cgs}>
            {index.map((g) => (
              <div className={s.cg} id={`g-${g.id}`} key={g.id}>
                <div className={s.cgH}><h3 className="h3">{g.title}</h3><span className={s.c}>{g.rows.length} charts</span><p>{g.desc}</p></div>
                <div className={s.rows}>
                  {g.rows.map((r: IndexRow, i) => (
                    <Link className={s.irow} key={r.slug} href={`/chart/${r.slug}`}>
                      <span className={s.n}>{r.title}{i === 0 && <span className={s.hub}>Start here</span>}</span>
                      {r.value ? <span className={`${s.v}${r.descriptor ? ` ${s.d}` : ''}`}>{r.value}</span> : <span className={`${s.v} ${s.d}`} aria-hidden="true">→</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className={s.idxEnd}><Link className="btn" href="/charts">Browse and filter all charts →</Link></div>
          </div>
        </div>
      </section>

      {/* ---------- Support ---------- */}
      <aside className={`card ${s.support}`} aria-label="Support ZEC Stats">
        <div className={s.t}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
          <p className="note"><b>ZEC Stats is free and reader-funded.</b> Help cover the node and server costs.</p>
        </div>
        <div className={s.b}><Link className="btn" href="/donate">Other ways to help</Link><Link className="btn primary" href="/donate">Donate</Link></div>
      </aside>
    </>
  );
}

