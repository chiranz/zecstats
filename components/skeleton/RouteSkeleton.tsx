'use client';

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import home from '@/app/page.module.css';
import search from '@/components/home/HomeSearch.module.css';
import chart from '@/components/chart-page/chart-page.module.css';
import idx from '@/components/chart-page/charts-index.module.css';
import news from '@/components/news/news.module.css';
import report from '@/components/reports/report.module.css';
import act from '@/app/activity/page.module.css';
import ui from '@/components/privacy-tools/ui.module.css';
import mt from '@/components/tools/metrics.module.css';
import k from './skeleton.module.css';
import type { Shape } from './shape';

/**
 * The route loading state (option E, "answer skeleton"): the destination page's own layout — its real classes, so it
 * changes at the same breakpoints — with each line of text painted as a shimmer bar. RouteFrame shows it inside <main>
 * while a navigation is on its way (the shape comes from the destination path); layout chrome (top bar, tape, context
 * bar) stays. Text inside the bars is invisible filler sized like the real copy.
 */

export function RouteSkeleton({ shape }: { shape: Shape }) {
  const Body = SHAPE[shape];
  return (
    <div className={k.root}>
      <p role="status" className="sr-only">Loading</p>
      <span className={k.prog} aria-hidden="true" />
      <div className={k.root} aria-hidden="true">
        <Body />
      </div>
    </div>
  );
}

const SHAPE: Record<Shape, () => ReactNode> = {
  dashboard: Dashboard, chart: Chart, news: News, charts: ChartsIndex, report: Report,
  activity: Activity, metrics: Metrics, bullrun: BullRun, compare: Compare, default: Default,
};

/* ---------- primitives ---------- */

/** A line of text as a bar: real font and wrapping, invisible filler. As a flex item it is blockified into one box (a
 *  single bar over every line), so text that can wrap inside a flex row goes in a plain <span> first. */
function T({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={className ? `${k.t} ${className}` : k.t}>{children}</span>;
}
/** A solid block (icon, swatch, sparkline). */
function B({ w, h, r, className, style }: { w?: number | string; h: number | string; r?: number | string; className?: string; style?: CSSProperties }) {
  return <span className={className ? `${k.b} ${className}` : k.b} style={{ width: w, height: h, borderRadius: r, flex: 'none', ...style }} />;
}
/** The signal-bars mark that sits beside the page title. It is two mono characters wide, so a title drops two. */
function Mark() {
  return (
    <svg className={k.mark} viewBox="0 0 48 48" aria-hidden="true">
      <rect className={k.tile} width="48" height="48" rx="10" />
      <rect className={k.edge} x=".75" y=".75" width="46.5" height="46.5" rx="9.25" />
      <rect className={k.bar} x="9" y="27" width="8" height="12" rx="1.5" />
      <rect className={k.bar} x="20" y="19" width="8" height="20" rx="1.5" />
      <rect className={k.bar} x="31" y="9" width="8" height="30" rx="1.5" />
    </svg>
  );
}
/** A segmented control with its buttons' real padding (`.seg a` shares the `.seg button` rule). */
function Seg({ items }: { items: string[] }) {
  return <div className="seg">{items.map((x, i) => <a key={i}><T>{x}</T></a>)}</div>;
}
/** The plot area of a TimeSeriesChart of the given height (shrinks like the real one on narrow cards: to 70% of its
 *  width; DayChart uses 72%, passed as `k`). */
function Plot({ h, k: ratio }: { h: number; k?: number }) {
  return <div className="chart-box"><div className={`${k.b} ${k.plot} chart-h`} style={{ '--h': `${h}px`, '--hk': ratio } as CSSProperties} /></div>;
}
function Kpis({ n = 4, six }: { n?: number; six?: boolean }) {
  const ks = ['ZEC/BTC', 'Market cap', 'Inflation', 'Supply issued', 'Hashrate', 'Monthly fees'];
  return (
    <div className={`kpis${six ? ' six' : ''}`}>
      {Array.from({ length: n }, (_, i) => (
        <div className="kpi" key={i}>
          <span className="k"><T>{ks[i % ks.length]}</T></span>
          <span className="v"><T>{['0.01487', '$20.95B', '3.26%', '80.9%', '31.26', '$134.3k'][i % 6]}</T></span>
          <span className="s"><T>{['24h ▲ 1.5% · 30d ▲ 4.2%', '16,950,123 ZEC in circulation', '1,800 new ZEC per day, 30-day average', '16.95M of 21M ZEC'][i % 4]}</T></span>
        </div>
      ))}
    </div>
  );
}
function Mast({ title, lede, figure, children }: { title: string; lede: string; figure?: boolean; children?: ReactNode }) {
  return (
    <header className={`mast${figure ? ' with-fig' : ''}`}>
      <div className="mast-t">
        <div className="h1"><Mark /><T>{title.slice(2)}</T></div>
        <p className="lede"><T>{lede}</T></p>
        {children}
      </div>
      {figure && (
        <div className="mast-fig">
          <span className="mast-fv"><T>4.97M ZEC</T></span>
          <span className="delta" style={{ background: 'none', padding: '3px 0' }}><T>▲ 1.4% vs 28 days earlier</T></span>
        </div>
      )}
    </header>
  );
}

/* ---------- shapes ---------- */

function Dashboard() {
  const pools = ['Transparent', 'Sprout', 'Sapling', 'Orchard', 'Ironwood'];
  return (
    <>
      <div className={home.landTop}>
        <header className={home.slim}>
          <div className={home.slimHead}>
            <div className={`h1 ${home.h1}`}><Mark /><T>ery Zcash number, from our own node</T></div>
            <p className={home.fresh}>
              <span><T>● Node synced</T></span><span><T>block 3,513,588</T></span><span><T>data through 10 Oct 2026</T></span><span><T>updates daily</T></span>
            </p>
          </div>
          <p className={home.lede}><T>Computed from a Zebra full node — not copied from an exchange API. 58 charts, updated daily.</T></p>
        </header>
        <div className={search.find}>
          <div className={search.wrap}>
            <div className={`field ${search.lg}`}><B w={18} h={18} r={9} /><span style={{ flex: 1 }}><T>Search charts, tools, pages…</T></span><span className={`kbd ${search.kbd}`}><T>⌘K</T></span></div>
          </div>
          <div className={search.try}>
            <span className={search.lbl}><T>Try</T></span>
            {['price', 'shielded', 'fees', 'gold', 'calculator', 'hashrate'].map((x) => <span key={x} className="chip"><T>{x}</T></span>)}
          </div>
        </div>
      </div>

      <div className={home.heroPair}>
        <section className="hero">
          <div className={home.phHead}>
            <div>
              <p className="kicker"><T>ZEC price · USD</T></p>
              <div className={home.figRow}><span className="figure md num"><T>$1,234.10</T></span><span className="delta" style={{ background: 'none' }}><T>▲ 1.7% 24h</T></span></div>
              <p className={`${home.subline} num`}><T>0.01487 BTC ▲ 1.5% 24h</T></p>
            </div>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <div className="toolbar"><Seg items={['1M', '3M', '6M', '1Y', '5Y', 'ALL']} /><Seg items={['Linear', 'Log']} /></div>
            <Plot h={300} />
          </div>
          <div className={home.cap}><p className="small"><T>5-year range $19 – $1,591 · weekly close, 12 Oct 2021 – 11 Oct 2026</T></p><span className={home.go}><T>Open price chart →</T></span></div>
        </section>

        <section className="hero">
          <div className={home.phHead}>
            <div>
              <p className="kicker"><T>Shielded supply</T></p>
              <div className={home.figRow}><span className="figure md num"><T>29.2%</T></span><span className="delta" style={{ background: 'none' }}><T>▲ 3.8 pts 1y</T></span></div>
              <p className={`${home.subline} num`}><T>4.97M ZEC · $6.13B · 25.5% a year ago</T></p>
            </div>
          </div>
          <div className={home.pb}>
            <div className={home.pbLbl} style={{ gridTemplateColumns: 'minmax(0,70.8fr) minmax(0,29.2fr)' }}><span><T>Transparent · not private</T></span><span style={{ textAlign: 'center' }}><T>Shielded 29.2%</T></span></div>
            <B h={22} />
          </div>
          <ul className={home.poolkey}>
            <li className={home.hd}><span /><span><T>Pool</T></span><span><T>ZEC</T></span><span><T>Share</T></span></li>
            {pools.map((p) => <li key={p}><B w={10} h={10} r={3} /><span className={home.n}><T>{p}</T></span><span className={home.z}><T>476,140</T></span><span className={home.p}><T>70.3%</T></span></li>)}
          </ul>
          <div className={home.mini2}>
            <div><span className={home.k}><T>Shielded · 1y</T></span><B h={34} /><span className={home.s}><T>25.5% → 29.2%</T></span></div>
            <div><span className={home.k}><T>Net shielded · 7d</T></span><span className={home.v}><T>▲ +91,551 ZEC</T></span><span className={home.s}><T>99,759 in · 8,208 out</T></span><span className={home.s}><T>Prior 7 days +111,040</T></span></div>
          </div>
          <div className={home.mig}>
            <div className={home.migTop}><span><T>Ironwood migration</T></span><b><T>89.24%</T></b></div>
            <B h={6} r={99} style={{ marginTop: 4 }} />
            <div className={home.cap}><span className="small"><T>3.27M of 3.66M Orchard ZEC crossed · live 74 days</T></span><span className={home.go}><T>Open the privacy hub →</T></span></div>
          </div>
        </section>
      </div>

      <Kpis n={8} />

      <section className="sec">
        <div className="sec-h"><div className="h2"><T>Today in Zcash</T></div><span className="small"><T>Updated 11 Oct 2026</T></span></div>
        <div className={home.today}>
          {[0, 1, 2].map((i) => (
            <article className="card" key={i}>
              <p className="kicker"><T>{['Five-year outlook · ZEC vs Bitcoin', 'Daily changes · market', 'Notable on-chain events'][i]}</T></p>
              <p className={home.say}><T>As of 11 Oct 2026, one ZEC buys 0.01487 BTC — up 7.4× over five years, up 2.1× on the year and up 18% over three months.</T></p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Chart() {
  return (
    <div className={chart.page}>
      <Mast figure title="Zcash shielded pool balances" lede="4.97M ZEC sits in shielded pools on 10 Oct 2026; Ironwood holds 83% of it — the total is 1.4% above 28 days earlier." />
      <section className={chart.ccard}>
        <div className={chart.head}>
          <div className={chart.q}><T>How much ZEC sits in each shielded pool?</T></div>
          <div className={chart.btnGroup}>{[0, 1, 2, 3].map((i) => <span key={i} className="btn"><B w={16} h={16} r={4} /></span>)}</div>
        </div>
        <div className={chart.ctl}>
          <Seg items={['1M', '3M', '6M', '9M', '1Y', '5Y', 'YTD', 'ALL', 'Custom']} />
          <span className={chart.vsep} />
          <Seg items={['Annotations']} />
        </div>
        <div className={chart.panel}>
          <div className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 6 }}>
              {['Sapling 476,049 ZEC', 'Orchard 361,823 ZEC', 'Ironwood 4,106,865 ZEC'].map((x) => <span key={x} className="chip"><T>{x}</T></span>)}
            </div>
            <Plot h={360} />
          </div>
        </div>
        <div className={chart.cap}><span><T>Data through 10 Oct 2026 · Daily balance at end of UTC day · our Zebra node</T></span><span><T>9 Oct 2021 – 10 Oct 2026</T></span></div>
      </section>
      <section className={chart.band}>
        <div className={chart.bandH}><div className="kicker"><T>Selected range · 5Y</T></div><span className="small mono"><T>9 Oct 2021 – 10 Oct 2026</T></span></div>
        <Kpis />
      </section>
      <section className={chart.split}>
        <div className="sec">
          <div className="sec-h"><div className="h2"><T>How do you read the shielded pools?</T></div></div>
          <div className={chart.prose}>
            <p><T>Zcash has had four shielded pools, and they are generations, not alternatives. Sprout (2016) was the original and is deprecated. Sapling (2018) made shielded transactions practical, Orchard (NU5, 2022) replaced it, Ironwood is the newest.</T></p>
            <p><T>Every crossing is visible even though the contents are not. A shielded pool&apos;s total is enforced by consensus: value entering or leaving crosses the transparent boundary and is counted.</T></p>
          </div>
        </div>
        <div className={chart.facts}>
          <div className="card" style={{ gap: 12 }}>
            <div className="h3"><T>About this chart</T></div>
            <dl>{['Unit', 'Source', 'Data', 'History', 'Data through'].map((x) => <Fragment key={x}><dt><T>{x}</T></dt><dd><T>Daily balance at end of UTC day</T></dd></Fragment>)}</dl>
          </div>
        </div>
      </section>
    </div>
  );
}

function NewsEvent({ open }: { open?: boolean }) {
  return (
    <article className={news.ev}>
      <div className={news.evBtn}>
        <span className={news.evIc} style={{ background: 'none' }}><B w={15} h={15} r={4} /></span>
        <span className={news.evMain}>
          <span className={news.evMeta}><span className={news.tag}><T>Pool flows</T></span><span className={news.sev}><T>Notable</T></span></span>
          <span className={news.evTitle}><T>14,117 ZEC migrated Orchard → Ironwood today (pool-to-pool, no deshield).</T></span>
        </span>
        <span className={news.evSide}><time><T>1 day ago</T></time><B w={44} h={18} /></span>
        <span className={news.chev}><B w={16} h={16} r={4} /></span>
      </div>
      {open && (
        <div className={news.evBody}>
          <p><T>A new record versus every prior day on the Zcash chain.</T></p>
          <div className={news.evChart}><B h={150} /></div>
          <div className={news.evFoot}><span className="small"><T>daily values, Sep 10 – 10 Oct 2026</T></span><span className="mono" style={{ fontSize: 13 }}><T>Open hashrate chart →</T></span></div>
        </div>
      )}
    </article>
  );
}

function News() {
  return (
    <>
      <Mast title="What just happened on Zcash" lede="A feed our node writes by itself: all-time highs, big daily moves and anything far from its 30-day norm, measured in σ. Newest first; the latest event was 15 h ago." />
      <div className={news.news}>
        <div className={news.feed}>
          <div className={news.bucket}><T>Last 24 hours</T><span className={news.c}><T>1 event</T></span></div>
          <NewsEvent open />
          <div className={news.bucket}><T>This week</T><span className={news.c}><T>4 events</T></span></div>
          <NewsEvent /><NewsEvent /><NewsEvent /><NewsEvent />
        </div>
        <aside className={news.rail}>
          <section className={`card ${news.nowCard}`}>
            <div className={news.nowTop}><div className={news.railH}><T>● Right now</T></div><span className="small mono"><T>02:31 UTC</T></span></div>
            <div className={news.nowPrice}><span className={news.big}><T>$1,234.10</T></span><span className="delta" style={{ background: 'none' }}><T>▲ 1.7% 24h</T></span></div>
            <B w={300} h={40} style={{ maxWidth: '100%' }} />
            <dl className={news.kv}>
              <div><dt><T>Shielded</T></dt><dd><T>29.2% of supply</T></dd></div>
              <div><dt><T>Latest block</T></dt><dd><T>3,513,588</T></dd></div>
            </dl>
            <p className={news.hrH}><T>Hashrate · three windows</T></p>
            <dl className={news.kv}>
              {['last 120 blocks, about 2.5 h', 'daily estimate · the all-time high', 'through Oct 10'].map((x, i) => (
                <div key={x}><dt><T>{['Now', 'Oct 10, one day', '7-day average'][i]}</T><span><T>{x}</T></span></dt><dd><T>30.59 GSol/s</T></dd></div>
              ))}
            </dl>
            <p className="small"><T>Each figure averages over a different window, which is why they differ.</T></p>
            <span className="mono" style={{ fontSize: 13 }}><T>Open price chart →</T></span>
          </section>
          <section className={`card ${news.filters}`}>
            <div className={news.railH}><T>Show · last 30 days</T></div>
            <ul className={news.flist}>
              {['All', 'Price', 'ZEC/BTC', 'Hashrate', 'Shielded pool', 'Pool flows', 'Activity'].map((x) => (
                <li key={x}><span className={news.fbtn}><span className={news.fi} style={{ background: 'none', border: 0 }}><B w={22} h={22} r={6} /></span><T>{x}</T><span className={news.fn}><T>26</T></span></span></li>
              ))}
            </ul>
            <div className={news.fFoot}><Seg items={['All', 'Major only 9']} /><p className="small"><T>Filters are kept in the link.</T></p></div>
          </section>
        </aside>
      </div>
    </>
  );
}

function ChartsIndex() {
  const groups = ['Price & valuation', 'Cost basis', 'Privacy', 'Usage', 'Transparent holders', 'Supply & security', 'Markets & cross-chain'];
  return (
    <>
      <Mast title="All 58 Zcash charts" lede="Grouped by the question they answer. Every chart has a permalink, CSV and PNG." />
      <div className={idx.wrap}>
        <div className={idx.fbar}>
          <div className={idx.frow}>
            <div className={`field ${idx.search}`}><B w={16} h={16} r={8} /><span style={{ flex: 1 }}><T>Search charts, e.g. “z-to-z”</T></span></div>
            <span className={idx.syn}><T>Synonyms work: z-to-z → Orchard internal activity · cost basis → Realized price</T></span>
            <span className={idx.count}><T>58 charts</T></span>
          </div>
          <div className={idx.mfil}><span className={`btn ${idx.fbtn}`}><B w={14} h={14} r={3} /><T>Filters</T></span></div>
          <div className={`${idx.frow} ${idx.facets}`}>
            <div className={idx.facet}><span className={idx.lbl}><T>Pool</T></span><div className={idx.chipset}>{['Transparent', 'Sprout', 'Sapling', 'Orchard', 'Ironwood'].map((x) => <span key={x} className="chip"><B w={8} h={8} r={4} /><T>{x}</T></span>)}</div></div>
            <div className={idx.facet}><span className={idx.lbl}><T>Unit</T></span><Seg items={['Any', 'ZEC', 'USD', 'Count', '%', 'Ratio']} /></div>
            <div className={idx.facet}><span className={idx.lbl}><T>Source</T></span><Seg items={['Any', 'On-chain exact', 'Price-derived', 'External']} /></div>
            <span className={idx.switch}><B w={34} h={20} r={999} /><T>Compare with Bitcoin</T></span>
          </div>
        </div>
        <div className={idx.dir}>
          <nav className={idx.rail}>
            <span className={idx.rlab}><T>Groups</T></span>
            {groups.map((g) => <span key={g} className={idx.cat}><T>{g}</T><span><T>11</T></span></span>)}
            <span className={idx.rsep} />
            <span className={idx.rlab}><T>Collection</T></span>
            <span className={idx.cat}><T>ZEC vs BTC</T><span><T>11</T></span></span>
            <div className={idx.rnote}><p><T>ext External data: exchanges, NEAR, Hyperliquid, SEC filings or the Bitcoin chain. Everything else comes from our Zebra node.</T></p></div>
          </nav>
          <div className={idx.groups}>
            <section className={idx.grp}>
              <div className={idx.grpH}>
                <div className="sec-h"><div className="h2"><T>What is ZEC worth, and how does it compare with Bitcoin?</T></div></div>
                <span className={idx.gmeta}><T>Price & valuation · 11 charts</T></span>
                <p><T>Price, market cap, the ZEC/BTC ratio and issuance-aligned comparisons with Bitcoin.</T></p>
              </div>
              <div className={idx.grpBody}>
                <div className={idx.feat}>
                  <span className={idx.fk}><T>● Start here</T></span>
                  <span className={idx.ft}><T>ZEC price (USD)</T></span>
                  <span className={idx.fv}><span className="num"><T>$1,222</T></span><span className="delta" style={{ background: 'none' }}><T>▲ 8.7% 28d</T></span></span>
                  <B h={96} style={{ marginTop: 4 }} />
                  <span className={idx.fc}><T>ZEC close · 10 Oct 2026</T></span>
                  <span className={idx.fo}><T>Open chart →</T></span>
                </div>
                <div className={idx.rows}>
                  {['Market cap (USD)', 'ZEC/BTC ratio', 'Fully diluted value — ZEC as % of BTC', 'Activity-implied market cap', 'Zcash ETF holdings', 'ZEC vs BTC volatility', 'Market cap by coins issued — ZEC vs BTC', 'Daily transactions by coins issued — ZEC vs BTC', '30-day volatility by coins issued'].map((x) => (
                    <div key={x} className={idx.row}><span className={idx.n}><span><T>{x}</T></span></span><B h={20} className={idx.spark} /><span className={idx.v}><T>$20.7B</T></span><span className={idx.go}><T>→</T></span></div>
                  ))}
                </div>
              </div>
            </section>
            <section className={idx.grp}>
              <div className={idx.grpH}>
                <div className="sec-h"><div className="h2"><T>Are holders in profit?</T></div></div>
                <span className={idx.gmeta}><T>Cost basis · 6 charts</T></span>
                <p><T>What coins cost when they last moved, and how far price sits above it.</T></p>
              </div>
              <div className={idx.grpBody}>
                <div className={idx.feat}>
                  <span className={idx.fk}><T>● Start here</T></span>
                  <span className={idx.ft}><T>Realized price — all pools combined</T></span>
                  <span className={idx.fv}><span className="num"><T>$353.79</T></span><span className="delta" style={{ background: 'none' }}><T>▲ 12.7% 28d</T></span></span>
                  <B h={96} style={{ marginTop: 4 }} />
                </div>
                <div className={idx.rows}>
                  {['MVRV ratio vs cost basis', 'Realized price & realized cap', 'Pool acquisition price', 'Cost basis & % in profit by pool', 'Pool values (USD)'].map((x) => (
                    <div key={x} className={idx.row}><span className={idx.n}><span><T>{x}</T></span></span><B h={20} className={idx.spark} /><span className={idx.v}><T>3.49×</T></span><span className={idx.go}><T>→</T></span></div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function ReportHero() {
  return (
    <section className="hero">
      <div className={report.heroTop}>
        <div>
          <p className="kicker"><T>Median · transparent → transparent · 11 Oct 2025 – 10 Oct 2026</T></p>
          <p className={report.lead}><T>A typical transparent transaction moves</T></p>
          <p className="figure"><T>$184<small>median</small></T></p>
        </div>
        <div className={report.heroNote}>
          <p><T>Half of the 1,618,975 transactions in this range moved less than $184; half moved more. Nine in ten moved $66.8K or less.</T></p>
          <p><T>The mean is $113K — 612× the median — because the top 0.26% of transactions (over $6.31M each) carry half of all the dollars. The median is the number that describes an ordinary transaction.</T></p>
        </div>
      </div>
      <div className={`${report.stripH} only-desk`}><span className="kicker"><T>Where each percentile falls · log scale</T></span><span className="legend"><T>Middle 80% (P10–P90) · Mean</T></span></div>
      <div className="only-desk"><B h={110} /></div>
    </section>
  );
}

/** A section with a question title and a chart card: what follows the answer on most pages. */
function ChartSection() {
  return (
    <section className="sec">
      <div className="sec-h"><div className="h2"><T>Across the selected range</T></div><span className="small"><T>12 Oct 2025 – 10 Oct 2026</T></span></div>
      <article className="card">
        <div className="card-head"><div className="h3"><T>What share of transactions — and of dollars — sits below each size?</T></div><B w={100} h={32} r={8} /></div>
        <p className="takeaway"><T>Half of all transactions moved $184 or less, but they carry 0.3% of the dollars.</T></p>
        <Plot h={300} />
      </article>
    </section>
  );
}

function Report() {
  return (
    <>
      <Mast title="How big is a transparent Zcash transaction?" lede="Half of the 1,618,975 transparent transactions between 11 Oct 2025 and 10 Oct 2026 moved $184 or less. The average is far higher because a few giant transfers carry most of the money." />
      <div className={report.fbar}>
        <div className={report.grp}>
          <span className={report.glbl}><T>Range</T></span>
          <div className={report.grpRow}><Seg items={['1M', '3M', '6M', '9M', '1Y', '5Y', 'YTD', 'ALL', 'Custom']} /><span className={report.count}><T>11 Oct 2025 – 10 Oct 2026 · 365 days</T></span></div>
        </div>
        <div className={report.grp}>
          <span className={report.glbl}><T>View</T></span>
          <Seg items={['Transparent → transparent', 'Leaving a shielded pool', 'Everything']} />
        </div>
        <div className={report.end}><span className="btn"><B w={14} h={14} r={3} /><T>Download CSV</T></span></div>
      </div>
      <ReportHero />
      <Kpis />
      <ChartSection />
    </>
  );
}

function Default() {
  return (
    <>
      <Mast title="How private is Zcash right now?" lede="29.2% of all ZEC is shielded, up from 25.5% a year ago. Most of it now lives in Ironwood: 4.11M ZEC — 83% of all shielded ZEC." />
      <ReportHero />
      <Kpis />
      <ChartSection />
    </>
  );
}

/* ---------- shared pieces for the tool and report pages below ---------- */

/** A KPI band from [label, value, unit, sub] rows (KpiBand + Kpi in components/ui/blocks.tsx). */
function KpiBand({ items }: { items: [string, string, string, string][] }) {
  return (
    <div className="kpis">
      {items.map(([kk, v, u, sub]) => (
        <div className="kpi" key={kk}>
          <span className="k"><T>{kk}</T></span>
          <span className="v"><T>{v}{u && <span>{u}</span>}</T></span>
          <span className="s"><T>{sub}</T></span>
        </div>
      ))}
    </div>
  );
}
/** The Link · PNG · CSV icon group of a chart card (ChartActionsClient). */
function Acts() {
  return <div className="row" style={{ gap: 4 }}>{[0, 1, 2].map((i) => <span key={i} className="btn icon ghost"><B w={15} h={15} r={4} /></span>)}</div>;
}
/** Card's head: question title and takeaway, with the icon group when the card has one. */
function CardHead({ q, say, acts }: { q: string; say: string; acts?: boolean }) {
  return (
    <div className="card-head">
      <div className="stack" style={{ gap: 6, minWidth: 0, flex: '1 1 320px' }}>
        <div className="h3"><T>{q}</T></div>
        <p className="takeaway"><T>{say}</T></p>
      </div>
      {acts && <Acts />}
    </div>
  );
}
/** TimeSeriesChart's series chips: swatch (or line), label, last value. */
function Chips({ items, line }: { items: [string, string][]; line?: boolean }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      {items.map(([l, v]) => <span key={l} className="chip"><B w={line ? 14 : 10} h={line ? 3 : 10} r={line ? 2 : 3} /><T>{l}</T><span style={{ marginLeft: 2 }}><T>{v}</T></span></span>)}
    </div>
  );
}
/** A plain table.t with header and body cells as bars. */
function Tbl({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="tbl-wrap">
      <table className="t">
        <thead><tr>{head.map((h, i) => <th key={i}><T>{h}</T></th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><T>{c}</T></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ---------- /activity ---------- */

function Activity() {
  const flows = [
    ['Transient transparent', '4.81M', '▼ 34% vs prior 7d', '50,007 coins · 95.0% of volume · ordinary transparent movement — not parked anywhere'],
    ['In exchanges (sweep-shaped)', '208K', '▼ 39% vs prior 7d', '30,277 coins · 4.1% of volume · flowed through a sweep-shaped consolidation'],
    ['Shielded savings', '43.3K', '▲ 203% vs prior 7d', '2,584 coins · 0.9% of volume · dwelled 7+ days, then voluntarily shielded'],
  ];
  return (
    <>
      <Mast title="Where does transparent ZEC go?" lede="Most of it just keeps moving. In the last 7 days 4.81M ZEC changed hands transparently, 208K went through exchange-shaped sweeps and 43.3K was parked in shielded savings.">
        <span className={act.status}><B w={8} h={8} r={4} /><span><T>Full chain history classified · 28 Oct 2016 – 11 Oct 2026</T></span></span>
      </Mast>

      <section className="hero">
        <div className="spread">
          <div className="stack" style={{ gap: 6 }}>
            <span className="kicker"><T>Last 7 days vs the 7 before</T></span>
            <div className="h2" style={{ fontSize: 'clamp(18px,2.1vw,22px)' }}><T>What happens to a new transparent coin?</T></div>
          </div>
          <p className="takeaway" style={{ maxWidth: 560 }}><T>Exchange-shaped flow is down 39% on the prior week; shielded-savings flow is up 203%. Not a signal by itself — read it with the storage and direction panels below.</T></p>
        </div>
        <B h={26} r={6} />
        <div className={act.flows}>
          {flows.map(([l, v, d, sub]) => (
            <div key={l} className={act.flow}>
              <span className={act.fk}><B w={10} h={10} r={3} /><span><T>{l}</T></span></span>
              <span className={act.fv}><T>{v}<small>ZEC</small></T></span>
              <span><span className="delta" style={{ background: 'none' }}><T>{d}</T></span></span>
              <span className={act.fs}><T>{sub}</T></span>
            </div>
          ))}
        </div>
      </section>

      <KpiBand items={[
        ['Net shielding · 7d', '+91,551', 'ZEC', '▼ 18% vs +111,040 prior'],
        ['Shielded · 7d', '99,759', 'ZEC', '▼ 20% vs prior 7d'],
        ['Deshielded · 7d', '8,208', 'ZEC', '▼ 43% vs prior 7d'],
        ['Long-term storage', '2.13M', 'ZEC', 'transparent coins unmoved for 1 year +'],
      ]} />

      <article className="card">
        <CardHead acts q="What happens to transparent coins over time?" say="Transient movement dwarfs the other two buckets every week; the latest full week moved 4.52M ZEC transparently, against 41.2K into shielded savings." />
        <div className="toolbar">
          <span className="lbl"><T>Columns</T></span>
          <Seg items={['Daily', 'Weekly', 'Monthly']} />
          <span className="lbl"><T>Range</T></span>
          <Seg items={['30D', '90D', '1Y', 'ALL']} />
          <span style={{ marginLeft: 'auto' }}><span className="btn"><B w={14} h={14} r={3} /><T>Download CSV</T></span></span>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <div className="toolbar"><Seg items={['ZEC', 'Share %']} /></div>
          <Chips items={[['Transient transparent', '3.12M'], ['In exchanges (sweep-shaped)', '141K'], ['Shielded savings', '28.6K']]} />
          <Plot h={320} />
        </div>
        <p className="small"><T>Classified volume by the week each coin was spent · the last column (week of 6 Oct 2026) is still in progress · data through 11 Oct 2026</T></p>
      </article>

      <div className="grid2">
        <article className="card">
          <CardHead q="What sits in long-term storage?" say="2.13M ZEC of transparent coins haven’t moved in a year or more — 18% of the 11.6M transparent ZEC counted." />
          <div className={`${ui.bars} ${ui.stacked}`}>
            {['under 30 days · 1.2M UTXOs', '30–180 days · 2.4M UTXOs', '180 days–1 year · 3.1M UTXOs', '1–3 years · 9.8M UTXOs', '3 years + · 11.0M UTXOs'].map((l, i) => (
              <div key={l} className={ui.barRow}>
                <span><T>{l}</T></span>
                <span className={ui.track}><B w={`${[70, 45, 25, 12, 8][i]}%`} h="100%" r={0} /></span>
                <span className={ui.n}><T>4,812,301 ZEC</T></span>
              </div>
            ))}
          </div>
          <p className="small"><T>Unspent transparent coins by age, as of 10 Oct 2026 · same data as Transparent ZEC by Age</T></p>
        </article>
        <article className="card">
          <CardHead q="Which way is value moving?" say="Net into the shielded pools: +91,551 ZEC in the last 7 days, less than the 111,040 the week before." />
          <Tbl head={['Flow', 'Last 7d', 'Prior 7d', 'Change']} rows={[['Shielded', '99,759', '125,316', '▼ 20%'], ['Deshielded', '8,208', '14,276', '▼ 43%'], ['Net shielding', '+91,551', '+111,040', '▼ 18%']]} />
          <p className="small"><T>Shield and deshield legs into and out of Sprout + Sapling + Orchard only · ZEC</T></p>
        </article>
      </div>
    </>
  );
}

/* ---------- /metrics ---------- */

function Metrics() {
  const r = (name: string, desc: string, now: string) => [name, desc, now, '▲ 12.7%', 'from $314.06', '▲ 618%', 'from $49.25'];
  const groups: [string, string, string[][]][] = [
    ['Market', '9 metrics · Price, valuation and ZEC compared with Bitcoin', [
      r('Realized price', 'Average price each coin last moved at · all pools', '$353.79'),
      r('Market cap', 'Price × total supply', '$20.74B'),
      r('ZEC price', 'USD · end-of-day close', '$1,222'),
      r('ZEC/BTC', 'Bitcoin per ZEC', '0.01473'),
      r('ZEC FDV % of BTC', 'Zcash fully diluted value ÷ Bitcoin market cap', '1.47%'),
      r('MVRV', 'Spot price ÷ realized price', '3.45×'),
      r('Price vs BTC @ issuance', 'ZEC ÷ BTC at the same point in their issuance', '0.133×'),
      r('Market cap vs BTC @ issuance', 'Same comparison, as market cap', '0.127×'),
      r('Realized cap', 'Sum of each coin’s value when it last moved', '$5.99B'),
    ]],
    ['Supply & privacy', '6 metrics · Issuance and where the coins sit', [
      r('Total supply', 'ZEC issued so far', '16.95M'),
      r('Shielded supply', 'ZEC in all shielded pools', '4.97M'),
      r('Shielded % of supply', 'Shielded ÷ total supply', '29.2%'),
      r('Ironwood balance', 'ZEC in the Ironwood pool', '4.11M'),
      r('Orchard balance', 'ZEC in the Orchard pool', '361,823'),
      r('Inflation', 'Annualised new issuance', '3.26%'),
    ]],
  ];
  return (
    <>
      <Mast title="Every headline number, and how it moved" lede="27 Zcash numbers in one table, each set against 28 days and 12 months ago. Over 28 days the price-linked numbers rose (ZEC ▲ 8.7%) while on-chain activity fell (transactions ▼ 36.1%)." />
      <div className={mt.tbCard}>
        <div className={mt.tg}>
          <span className={mt.lbl}><T>As of</T></span>
          <span className={mt.date} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><T>10/10/2026</T><B w={14} h={14} r={3} /></span>
        </div>
        <span className={mt.sep} />
        <div className={mt.tg}>
          <span className={mt.lbl}><T>Compare against</T></span>
          <Seg items={['7D', '28D', '3M', '6M', '12M']} />
          <span className={mt.hint}><T>pick up to 2</T></span>
        </div>
        <span className={mt.sep} />
        <div className={mt.tg}>
          <span className={mt.lbl}><T>View</T></span>
          <span className="check"><B w={16} h={16} r={4} /><T>Sparklines</T></span>
        </div>
        <span className={mt.sep} />
        <span className={`btn ${mt.sm}`}><B w={14} h={14} r={3} /><T>Customize metrics</T><span className="small mono"><T>27 of 43</T></span></span>
        <div className={`${mt.tg} ${mt.push}`}>
          <span className={`btn ${mt.sm}`}><B w={14} h={14} r={3} /><T>Copy link</T></span>
          <span className={`btn ${mt.sm}`}><B w={14} h={14} r={3} /><T>CSV</T></span>
        </div>
      </div>

      <section className="sec">
        <div className={mt.sumline}>
          <p className="takeaway"><T>Over 28 days 14 rose and 13 fell. Rows are grouped by subject and sorted by 28D change (biggest rise first) inside each group.</T></p>
          <p className="small mono"><T>Click a name for its chart · 27 rows · 6 groups</T></p>
        </div>
        <div className={`tbl-wrap ${mt.wrap}`}>
          <table className={`t ${mt.mt}`}>
            <colgroup><col className={mt.cName} /><col className={mt.cNow} /><col /><col /></colgroup>
            <thead>
              <tr>
                <th className={mt.lft}><T>Metric</T></th>
                <th><T>Now</T><span className={mt.sub}><T>10 Oct 2026</T></span></th>
                {[['28D', '12 Sep 2026'], ['12M', '10 Oct 2025']].map(([p, d]) => (
                  <th key={p}><span className={mt.sort}><T>{p} change</T><B w={12} h={12} r={3} /></span><span className={mt.sub}><T>vs {d}</T></span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([g, gs, rows]) => [
                <tr key={g} className={mt.grp}><th colSpan={4}><span className={mt.g}><T>{g}</T></span><span className={mt.gs}><T>{gs}</T></span></th></tr>,
                ...rows.map(([name, desc, now, c1, f1, c2, f2], i) => (
                <tr key={name}>
                  <th className={mt.mname}>
                    <a><T>{name}</T></a>
                    {g === 'Market' && i === 1 && <span className={mt.added}><T>default now</T></span>}
                    <span className={mt.u}><T>{desc}</T></span>
                  </th>
                  <td><span className={mt.nowv}><T>{now}</T></span></td>
                  {[[c1, f1], [c2, f2]].map(([c, f], j) => (
                    <td key={j}>
                      <span className={mt.chg}>
                        <svg className={k.b} width={88} height={26} aria-hidden="true" style={{ flex: 'none' }} />
                        <span className={mt.cv}><b><T>{c}</T></b><small><T>{f}</T></small></span>
                      </span>
                    </td>
                  ))}
                </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ---------- /btc-bull-run ---------- */

function BullRun() {
  return (
    <>
      <Mast title="ZEC 2026 vs BTC 2017, day for day" lede="On day 45 of its run Zcash is at 1.50× its $800 anchor; Bitcoin was at 1.45× on its own day 45, and went on to peak at 24× on day 338 before falling 83%." />
      <div className="callout warn">
        <span className="ic"><B w={18} h={18} r={4} /></span>
        <b style={{ font: '600 13px var(--mono)' }}><T>A sample of one, not a forecast.</T></b>
        <div className="note"><T>Built because people asked for it, not because the comparison means anything. Nothing here is a projection, a target or a number this site stands behind. The caveats are at the bottom of the page.</T></div>
      </div>

      <section className="hero">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 10 }}>
            <span className="kicker"><T>Day 45 of Zcash’s run</T></span>
            <p className="figure md"><T>$1,222 <small>· 1.50× its $817</small></T></p>
            <p className="lede"><T>On its own day 45, Bitcoin was at $1,172 — 1.45×. Zcash is running ▲ 3% hotter.</T></p>
          </div>
          <div className="stack" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div className="toolbar"><span className="lbl"><T>Aligned at</T></span><Seg items={['$500', '$800', '$1,000']} /></div>
            <p className="small mono"><T>ZEC day 0 = 26 Aug 2026 ($817)<br />BTC day 0 = 12 Jan 2017 ($810)</T></p>
          </div>
        </div>
      </section>

      <KpiBand items={[
        ['Days into the run', '45', '', 'since 26 Aug 2026 · Bitcoin’s line runs 718 days'],
        ['Relative pace', '1.03×', '', 'Zcash multiple ÷ Bitcoin multiple, same day'],
        ['Bitcoin’s peak', '$19,345', '', 'day 338, 16 Dec 2017 · 24× anchor'],
        ['And then', '$3,233', '', 'day 702, 15 Dec 2018 · ▼ 83% from the peak'],
      ]} />

      <div className="card">
        <div className="card-head">
          <div className="stack" style={{ gap: 6, minWidth: 0, flex: '1 1 320px' }}>
            <div className="h3"><T>How do the two runs line up day for day?</T></div>
            <p className="takeaway"><T>Zcash is 45 days into its run; Bitcoin’s peaked on day 338 at 24× and then fell 83%.</T></p>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {['Zcash 2026', 'Bitcoin 2017'].map((l) => <span key={l} className="chip"><B w={14} h={3} r={2} /><T>{l}</T></span>)}
          <div className="legend"><span><B w={16} h={3} r={2} /><T>$800 anchor</T></span></div>
        </div>
        <div className="toolbar">
          <span className="lbl"><T>Days</T></span>
          <Seg items={['60', '90', '180', '365', 'Full cycle']} />
          <Seg items={['Linear', 'Log']} />
        </div>
        <Plot h={360} k={72} />
        <p className="small"><T>Daily USD closes · Bitcoin searched inside its 2015–2018 cycle · data through 10 Oct 2026. Day 0 is the day after each last closed below the anchor.</T></p>
      </div>

      <div className="card">
        <div className="stack" style={{ gap: 6 }}>
          <div className="h3"><T>Is Zcash running hotter or cooler than Bitcoin did?</T></div>
          <p className="takeaway"><T>On day 45, Zcash’s multiple is 1.03× Bitcoin’s: ahead of the 2017 pace. 1.0 is the same point on the same day.</T></p>
        </div>
        <Plot h={240} k={72} />
        <p className="small"><T>Multiples rather than prices, because the two anchors sit a few dollars apart. The x axis stops where Zcash’s run does.</T></p>
      </div>
    </>
  );
}

/* ---------- /compare ---------- */

function Compare() {
  return (
    <>
      <Mast title="Compare charts on one time range" lede="2 charts stacked on the same 1Y window, 9 Oct 2025 to 10 Oct 2026. Add, reorder or remove charts; the set and the range are kept in the link." />
      <div className="card" style={{ gap: 14 }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div className="field"><B w={16} h={16} r={8} /><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}><T>Add a chart: price, shielded, fees…</T></span></div>
          </div>
          <Seg items={['1M', '3M', '6M', '9M', '1Y', '2Y', '5Y', 'YTD', 'ALL', 'Custom']} />
          <Seg items={['Annotations']} />
          <span className="btn"><B w={15} h={15} r={4} /><T>Copy link</T></span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {['1 ZEC price (USD)', '2 Shielded pool balances'].map((c) => (
            <span key={c} className="chip" style={{ paddingRight: 4, gap: 4 }}>
              <T>{c}</T>
              {[0, 1, 2].map((i) => <span key={i} className="btn icon ghost" style={{ width: 24, height: 24 }}><B w={13} h={13} r={3} /></span>)}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <CardHead acts q="What is one ZEC worth in US dollars?" say="ZEC closed at $1,222 on 10 Oct 2026 — 8.7% above 28 days earlier." />
        <div className="stack" style={{ gap: 6 }}>
          <div className="stack" style={{ gap: 12 }}>
            <div className="toolbar"><Seg items={['Linear', 'Log']} /></div>
            <Chips line items={[['ZEC/USD close', '$1,222'], ['50-week MA', '$635.32'], ['200-week MA', '$262.76']]} />
            <Plot h={280} />
          </div>
        </div>
        <p className="small"><T>ZEC price (USD) · 9 Oct 2025 – 10 Oct 2026 · Open the full chart →</T></p>
      </div>

      <div className="card">
        <CardHead acts q="How much ZEC sits in each shielded pool?" say="4.97M ZEC sits in shielded pools on 10 Oct 2026; Ironwood holds 83% of it — the total is 1.4% above 28 days earlier." />
        <div className="stack" style={{ gap: 6 }}>
          <div className="stack" style={{ gap: 12 }}>
            <div className="toolbar"><Seg items={['ZEC', 'Share %']} /></div>
            <Chips items={[['Transparent', '11.6M'], ['Sprout', '25.4K'], ['Sapling', '476K'], ['Orchard', '362K'], ['Ironwood', '4.11M']]} />
            <Plot h={280} />
          </div>
        </div>
        <p className="small"><T>Shielded pool balances · 9 Oct 2025 – 10 Oct 2026 · Open the full chart →</T></p>
      </div>
    </>
  );
}
