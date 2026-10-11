import type { Metadata } from 'next';
import Link from 'next/link';
import { DirSwitcher } from '@/components/navlab/DirectionView';
import { CRITERIA, DIRECTIONS } from '@/components/navlab/meta';
import s from './page.module.css';

export const metadata: Metadata = { title: 'Navigation lab', robots: { index: false } };

// Where the page's first heading and its answer (hero / chart) start, in px from the top of the window.
// Measured with puppeteer on this branch (today's chrome: the live pages; A–E: the prototype frames, ticker slot off).
const MEASURED: Record<string, { label: string; priv: [number, number]; chart: [number, number] }> = {
  now: { label: 'Today', priv: [352, 465], chart: [237, 300] },
  a: { label: 'A', priv: [239, 264], chart: [213, 212] },
  b: { label: 'B', priv: [280, 355], chart: [254, 303] },
  c: { label: 'C', priv: [314, 332], chart: [198, 221] },
  d: { label: 'D', priv: [235, 260], chart: [209, 208] },
  e: { label: 'E', priv: [197, 256], chart: [171, 204] },
};

const PROBLEMS: { t: string; d: string }[] = [
  { t: 'The same freshness note on every page', d: 'All 32 page headers end in the same three mono lines: node status and block, “data through … · updates daily”, and the “Redesign concept” note. It is the same on every page, so people stop reading it, and it pushes the answer down.' },
  { t: 'The location is said three times', d: 'On Privacy: the breadcrumb “ZEC Stats › Privacy”, the kicker “ZCASH PRIVACY”, then the H1. On chart pages: the breadcrumb, then the H1, then the same group again in the prev/next bar at the bottom.' },
  { t: 'The menu doesn’t match the site', d: 'The site is 58 charts plus about 25 tools, but the bar gives five equal links and a 23-item Tools menu. Charts are reached only through /charts or search, and no menu shows a single live number.' },
  { t: 'No sense of place inside a section', d: 'On /ironwood you can’t see Turnstile or Wall of Shame. On /chart/price, the other 10 charts in the group are listed only at the bottom of the page.' },
  { t: 'Ironwood is buried', d: 'The biggest privacy story isn’t in the top bar. On the hub, the “Ironwood” jump link goes to a section of the hub, not to the Ironwood page, so the site has two “Ironwoods” that go to different places.' },
  { t: 'On a phone, search disappears', d: 'At 560px and narrower the search button is hidden (.kbd-search is display:none), so search is only inside the burger sheet, which is a flat list of about 30 links.' },
];

export default function Page() {
  return (
    <div className={s.page}>
      <DirSwitcher />
      <header className={s.head}>
        <span className="kicker">Design preview · not linked from the site</span>
        <h1 className="h1">Navigation lab</h1>
        <p className="lede">Five ways to redesign the top bar and the page header under it. Each one is a working prototype: menus open, links go to the real pages, and search uses the site’s real index. Each is shown on the top of the Privacy hub and of a chart page, on desktop and at 390px.</p>
      </header>

      <section className={s.sec} aria-labelledby="wrong">
        <h2 id="wrong" className="h2">What’s wrong today</h2>
        <ol className={s.problems}>
          {PROBLEMS.map((p) => <li key={p.t}><b>{p.t}</b><span>{p.d}</span></li>)}
        </ol>
      </section>

      <section className={s.sec} aria-labelledby="dirs">
        <h2 id="dirs" className="h2">Five directions</h2>
        <ul className={s.cards}>
          {DIRECTIONS.map((d) => (
            <li key={d.id}>
              <Link href={`/design/nav/${d.id}`} className={s.card}>
                <span className={s.letter}>{d.id.toUpperCase()}</span>
                <b>{d.name}</b>
                <span className={s.idea}>{d.idea}</span>
                <span className={s.for}>Best for: {d.bestFor}</span>
                <span className={s.open}>Open the prototype →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.sec} aria-labelledby="cmp">
        <h2 id="cmp" className="h2">How they compare</h2>
        <p className="note">Scores out of 5; higher is better (for build cost, 5 = cheapest). The “answer starts” rows are measured, not estimated: the distance from the top of the window to the hero or chart.</p>
        <div className="tbl-wrap">
          <table className={`t ${s.tbl}`}>
            <thead>
              <tr><th scope="col">Criterion</th>{DIRECTIONS.map((d) => <th scope="col" key={d.id}>{d.id.toUpperCase()} · {d.name}</th>)}</tr>
            </thead>
            <tbody>
              {CRITERIA.map((c) => (
                <tr key={c.key}>
                  <th scope="row"><b>{c.label}</b><small>{c.hint}</small></th>
                  {DIRECTIONS.map((d) => { const v = d.score[c.key]; const best = Math.max(...DIRECTIONS.map((x) => x.score[c.key])) === v; return <td key={d.id} className={best ? s.best : undefined}><span className={s.dots} aria-hidden="true">{'●'.repeat(v)}<span>{'●'.repeat(5 - v)}</span></span> {v}</td>; })}
                </tr>
              ))}
              <tr className={s.total}><th scope="row"><b>Total</b><small>out of 25</small></th>{DIRECTIONS.map((d) => <td key={d.id}>{Object.values(d.score).reduce((a, b) => a + b, 0)}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <div className="tbl-wrap">
          <table className={`t ${s.tbl}`}>
            <caption className={s.cap}>Where the answer starts (px from the top of the window). Today’s figures include the site’s real 56px bar; A–E include their own bars, with the ticker slot off.</caption>
            <thead><tr><th scope="col">Page · width</th>{Object.values(MEASURED).map((m) => <th scope="col" key={m.label}>{m.label}</th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">Privacy hub · desktop</th>{Object.entries(MEASURED).map(([k, m]) => <td key={k}>{m.priv[0]}</td>)}</tr>
              <tr><th scope="row">Privacy hub · phone</th>{Object.entries(MEASURED).map(([k, m]) => <td key={k}>{m.priv[1]}</td>)}</tr>
              <tr><th scope="row">Chart page · desktop</th>{Object.entries(MEASURED).map(([k, m]) => <td key={k}>{m.chart[0]}</td>)}</tr>
              <tr><th scope="row">Chart page · phone</th>{Object.entries(MEASURED).map(([k, m]) => <td key={k}>{m.chart[1]}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.sec} aria-labelledby="pick-h" id="pick">
        <h2 id="pick-h" className="h2">Recommendation: D as the frame, with A’s tabs and B’s search</h2>
        <div className={s.pick}>
          <div className={s.pickMain}>
            <p className="note"><b>Adopt D (Answer first).</b> It already contains the parts of A and B that matter most: the section tabs, with Ironwood second and marked, and B’s search dropdown, which shows Recent and Popular pages with values before you type. It brings the Privacy hero up from 352px to 235px on desktop and from 465px to 260px on a phone, and keeps every menu in the top bar. Only E gets higher, by giving up the top bar. Leave out C’s live values in every menu (too much data on every page) and E’s bottom tab bar (it fights Safari’s toolbar) for now. Revisit both once there are visitor numbers.</p>
            <ol className={s.steps}>
              <li><b>Global bar:</b> brand · Dashboard · Privacy · Charts · Tools ▾ · News · search field (combobox, Recent + Popular with values) · status pill (“data through 10 Oct”; the popover has the block, cadence and the concept note) · theme · Donate.</li>
              <li><b>Ticker slot:</b> directly under the global bar, not sticky, optional per page.</li>
              <li><b>Context bar:</b> section crumb + the section’s pages (Privacy: Overview · Ironwood ● 89.24% · Turnstile · Wall of Shame · Shield hops · Tips · Amount lookup). On chart pages: the group crumb opens a switcher with values, plus ‹ › for the previous and next chart. Hubs get “On this page” here instead of a second sticky jump bar.</li>
              <li><b>Page header:</b> H1 + one-sentence answer. A key figure only on single-number pages. No crumbs, kicker or freshness block.</li>
              <li><b>Phone:</b> brand · status dot · search · menu, then the context bar as a swipeable row. The menu sheet puts Privacy first, with Ironwood on top.</li>
            </ol>
          </div>
          <aside className={s.files} aria-labelledby="files-h">
            <h3 id="files-h" className="h3">Shared files that would change</h3>
            <ul>
              <li><code>components/chrome/TopBar.tsx</code>: status pill; inline search combobox; the mobile bar</li>
              <li><code>components/chrome/ContextBar.tsx</code> + <code>.module.css</code>: new (crumb + tabs, group switcher, prev/next, on this page)</li>
              <li><code>components/chrome/Masthead.tsx</code>: drop freshness, kicker and crumbs; add optional <code>figure</code></li>
              <li><code>app/layout.tsx</code>: render the ticker slot + ContextBar under TopBar; pass freshness</li>
              <li><code>app/globals.css</code>, <code>app/chrome.css</code>: .mast grid, .fresh and .crumbs rules go; pill/context styles</li>
              <li><code>lib/site.ts</code>: privacy order (Overview, Ironwood first); <code>sectionFor(pathname)</code> for the tabs</li>
              <li><code>lib/search.ts</code>, <code>lib/data/search-index.ts</code>: optional <code>value</code> on search items</li>
              <li><code>app/privacy/page.tsx</code>, <code>app/ironwood/page.tsx</code>: Subnav → “On this page”</li>
              <li><code>components/chart-page/ChartPage.tsx</code>: prev/next moves up into the context bar</li>
              <li>3 pages that pass <code>kicker</code>: remove the prop</li>
            </ul>
          </aside>
        </div>
      </section>
    </div>
  );
}
