import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Section } from '@/components/ui/blocks';
import { ExchangeTape, Marquee, TwoRowTape } from '@/components/ticker/Marquee';
import { Deck } from '@/components/ticker/Deck';
import { HotLead } from '@/components/ticker/HotLead';
import { TopicTiers } from '@/components/ticker/TopicTiers';
import { SwipeDeck } from '@/components/ticker/SwipeDeck';
import { Breaking } from '@/components/ticker/Breaking';
import { getTicker } from '@/lib/data/ticker';
import { getFreshness } from '@/lib/data/snapshot';
import { getChartIndex } from '@/lib/data/home';
import { dateLong, num } from '@/lib/format';
import p from './page.module.css';

export const metadata: Metadata = { title: 'Event ticker samples', robots: { index: false } };

/* ---------- page-context mocks (decorative: the real top bar sits above this page) ---------- */

function MockBar() {
  return (
    <div className={p.bar} aria-hidden="true">
      <span className="brand"><span className="brand-mark" />ZEC STATS</span>
      <span className={p.barNav}><span className={p.on}>Dashboard</span><span>Privacy</span><span>Charts</span><span>Tools ▾</span><span>News</span></span>
      <span className={p.barRight}><span className={p.fakeSearch}>Search 58 charts &amp; tools</span><span className={p.fakeBtn}>Donate</span></span>
    </div>
  );
}

function MockMast({ crumb = 'News', title = 'What just happened on Zcash', lede = 'A feed our node writes by itself: all-time highs, big daily moves and anything far from its 30-day norm.' }: { crumb?: string; title?: string; lede?: string }) {
  return (
    <div className={p.mast} aria-hidden="true">
      <span className={p.crumbs}>ZEC Stats › {crumb}</span>
      <span className={p.h1}>{title}</span>
      <span className={p.lede}>{lede}</span>
      <span className={p.skel}><i /><i /><i /><i /></span>
    </div>
  );
}

function MockSearch() {
  return (
    <div className={p.search} aria-hidden="true">
      <span className={p.field}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20" /></svg>
        Search charts, tools, pages…<span className="kbd">⌘K</span>
      </span>
      <span className={p.chips}><span className={p.try}>Try</span>{['price', 'shielded', 'fees', 'gold', 'calculator', 'hashrate'].map((c) => <span key={c} className="chip">{c}</span>)}</span>
    </div>
  );
}

function MockHero() {
  return <div className={p.heroSkel} aria-hidden="true"><i /><i /></div>;
}

function Sample({ n, id, name, when, pro, con, children }: { n: number | string; id: string; name: string; when: string; pro: string; con: string; children: ReactNode }) {
  return (
    <article className={p.sample} id={id} aria-labelledby={`${id}-h`}>
      <header className={p.sh}>
        <h3 className={p.sTitle} id={`${id}-h`}><span className={p.sN}>Sample {n}</span> — {name} — <span className={p.sWhen}>{when}</span></h3>
        <p className={p.pc}><span><b className="up">▲ Pro</b> {pro}</span><span><b className="dn">▼ Con</b> {con}</span></p>
      </header>
      {children}
    </article>
  );
}

export default async function TickerPreview() {
  const [t, f, index] = await Promise.all([getTicker(), getFreshness(), getChartIndex()]);
  const charts = index.reduce((a, g) => a + g.rows.length, 0);
  const fresh = <><span className="live"><i aria-hidden="true" />Node synced · block <span className="num">{num(f.height)}</span></span><span>Data through {dateLong(f.dataThrough)} · snapshot {dateLong(f.capturedAt)}</span></>;
  const lead = t.breaking ?? t.hot;

  return (
    <>
      <Masthead
        crumbs={[{ label: 'Design' }, { label: 'Event ticker' }]}
        title="Event ticker: eight ways to roll the news"
        lede={<>Every sample below is a working component fed by the same {t.items.length} events, picked from the node&apos;s feed and on-chain state, newest and most important first. Each one pauses on hover or focus, has a visible Pause button, and stops moving entirely for visitors who ask for reduced motion.</>}
        cadence="preview only, not linked from the site"
      />

      <nav className={p.jump} aria-label="Samples on this page">
        <ul>
          {[['s1', '1 Tape'], ['s2', '2 Two-row tape'], ['s3', '3 Exchange tape'], ['s4', '4 Pinned hot'], ['s5', '5 Deck'], ['s6', '6 Topics'], ['s7', '7 Swipe'], ['s8', '8 Breaking'], ['landing', 'Landing top'], ['events', 'Events & links']].map(([h, l]) => <li key={h}><a href={`#${h}`}>{l}</a></li>)}
        </ul>
      </nav>

      <Section id="samples" title="Which ticker should sit under the top bar?" aside={<span className="small">Each frame: top bar (mock) → ticker → page masthead (mock)</span>}>
        <Sample n={1} id="s1" name="Single-row tape (Nasdaq crawl)" when="site-wide, every page, directly under the top bar" pro="40 px tall, a seamless right-to-left crawl that shows three or four events at once; nothing to learn." con="Moving text is hard to read, and an important item can scroll past unread.">
          <div className={p.frame}><MockBar /><Marquee items={t.items} /><MockMast /></div>
        </Sample>

        <Sample n={2} id="s2" name="Two-row tape: fast markets over slow on-chain events" when="the dashboard, or site-wide on desktop if the extra row is worth it" pro="Separates prices (glance) from events (read): each row moves at the speed its content needs." con="Two moving rows (74 px) is a lot of motion; on phones it doubles the strip height.">
          <div className={p.frame}><MockBar /><TwoRowTape quotes={t.quotes} events={t.events} /><MockMast crumb="Dashboard" title="Every Zcash number, from our own node" lede="Computed from a Zebra full node — not copied from an exchange API." /></div>
        </Sample>

        <Sample n={3} id="s3" name="Exchange tape: LIVE badge, symbols, category separators" when="site-wide when the site wants the stock-exchange feel" pro="Reads like a real exchange tape; pointing at an item pauses it and shows its full sentence and link underneath." con="Symbols (IW INFLOW, HASH ATH) need learning, and the detail line adds 30 px.">
          <div className={p.frame}><MockBar /><ExchangeTape items={t.items} /><MockMast /></div>
        </Sample>

        <Sample n={4} id="s4" name="Pinned hot topic + rolling slot" when="site-wide while one story matters (the Ironwood migration)" pro="The one thing we want seen never moves; only a single line rolls, so motion is minimal." con="Someone (or a rule) must choose and retire the pinned story; it takes two rows on phones.">
          <div className={p.frame}><MockBar /><HotLead hot={t.hot} items={t.items} /><MockMast crumb="Privacy" title="Privacy at a glance" lede="How much ZEC is shielded, where it sits, and how private everyday use is." /></div>
        </Sample>

        <Sample n={5} id="s5" name="Event deck" when="the dashboard's “today” band, or the top of /news" pro="One event at a time with a full sentence, its number and two links; the stacked cards say “there is more”." con="About 190 px tall for one event at a time; too heavy for every page.">
          <div className={p.frame}><MockBar /><Deck items={t.items} /><MockMast crumb="Dashboard" title="Every Zcash number, from our own node" lede="Computed from a Zebra full node — not copied from an exchange API." /></div>
        </Sample>

        <Sample n={6} id="s6" name="Two-tier topic header" when="the dashboard or /news, for people who browse by subject" pro="Sorts the news into five topics anyone can jump to; it walks every topic by itself." con="The heaviest sample (two rows, about 130 px) with two sets of controls.">
          <div className={p.frame}><MockBar /><TopicTiers topics={t.topics} all={t.items} /><MockMast /></div>
        </Sample>

        <Sample n={7} id="s7" name="Swipe deck (snap carousel)" when="phones first: the home page's “what to look at” row" pro="Thumb swipe, mouse drag and arrow keys all work; every card stays a plain link." con="On desktop it reads like a carousel, and auto-advance can fight a reader mid-swipe.">
          <div className={p.frame}><MockBar /><SwipeDeck items={t.items} /><MockMast crumb="Dashboard" title="Every Zcash number, from our own node" lede="Computed from a Zebra full node — not copied from an exchange API." /></div>
        </Sample>

        <Sample n={8} id="s8" name="Breaking banner (with expiry) over the tape" when="only when a MAJOR event happened in the last 48 h; sits on top of any tape" pro="Nothing moves, the strongest signal on the page, and it expires by itself." con="Needs a strict rule for “major”, or people learn to ignore it.">
          <div className={p.frame}>
            <MockBar />
            {t.breaking ? <Breaking item={t.breaking} refTs={t.refTs} /> : <p className={p.none}>No major event in the 48 h before the snapshot, so the banner is hidden.</p>}
            <Marquee items={t.items} label="Zcash events ticker (with breaking banner)" />
            <MockMast />
          </div>
        </Sample>
      </Section>

      <Section id="landing" title="How does the dashboard open with a ticker?" aside={<span className="small">Everything above the home search field, four ways</span>}>
        <p className="note">Today the dashboard opens with a kicker, the H1, a one-line lede and a three-line freshness note, then the search field. Each composition below keeps the search field as the first thing you can act on and gives the ticker a job.</p>

        <Sample n="A" id="la" name="Ticker line + slim masthead" when="built on Sample 1" pro="The search moves up about 40 px and the page gains a news line without getting taller." con="The brand promise shrinks to one line; the kicker goes.">
          <div className={p.frame}>
            <MockBar />
            <Marquee items={t.items} label="Zcash events ticker (landing A)" />
            <div className={p.landA}>
              <div className={p.slimHead}>
                <span className={p.h1sm}>Every Zcash number, from our own node</span>
                <span className={p.oneLine}>{fresh}</span>
              </div>
              <span className={p.ledeSm}>Computed from a Zebra full node — not copied from an exchange API. {charts} charts, updated daily.</span>
              <MockSearch />
              <MockHero />
            </div>
          </div>
        </Sample>

        <Sample n="B" id="lb" name="“Happening now” card beside the promise" when="built on Sample 4 (stacked)" pro="The freshness corner becomes useful: the hot story and the latest event sit where the eye lands second." con="On phones the card adds about 110 px before the hero.">
          <div className={p.frame}>
            <MockBar />
            <div className={p.landB}>
              <div className={p.promise}>
                <span className="kicker">Zcash network statistics</span>
                <span className={p.h1}>Every Zcash number, from our own node</span>
                <span className={p.lede}>Computed from a Zebra full node — not copied from an exchange API. {charts} charts, updated daily.</span>
                <span className={p.oneLine}>{fresh}</span>
              </div>
              <div className={p.nowCol}>
                <span className={p.nowH}>Happening now</span>
                <HotLead hot={t.hot} items={t.items} stacked label="Happening now on Zcash (landing B)" />
              </div>
              <div className={p.span2}><MockSearch /><MockHero /></div>
            </div>
          </div>
        </Sample>

        <Sample n="C" id="lc" name="Headline of the day + topic ticker under the search" when="built on Sample 6" pro="The H1 says what is new today, so a returning visitor learns something before scrolling." con="An H1 that changes daily is weaker for search engines and brand; the promise moves to the lede.">
          <div className={p.frame}>
            <MockBar />
            <div className={p.landC}>
              <span className="kicker">Today on Zcash · {dateLong(t.asOf)}</span>
              <Link href={lead.href} className={p.h1Link}>{lead.label}{lead.value ? `: ${lead.value}` : ''}</Link>
              <span className={p.lede}>{lead.body ?? lead.text} Every Zcash number, from our own node — {charts} charts, updated daily.</span>
              <MockSearch />
            </div>
            <TopicTiers topics={t.topics} all={t.items} label="Zcash events by topic (landing C)" />
            <div className={p.landC}><MockHero /></div>
          </div>
        </Sample>

        <Sample n="D" id="ld" name="Deck beside the H1, search spanning below" when="built on Sample 5 (inset)" pro="A real “today” panel without a new full-width band; desktop uses the empty right half." con="The deck competes with the hero below it for the first look.">
          <div className={p.frame}>
            <MockBar />
            <div className={p.landB}>
              <div className={p.promise}>
                <span className="kicker">Zcash network statistics</span>
                <span className={p.h1}>Every Zcash number, from our own node</span>
                <span className={p.lede}>Computed from a Zebra full node — not copied from an exchange API. {charts} charts, updated daily.</span>
                <span className={p.oneLine}>{fresh}</span>
              </div>
              <div className={p.nowCol}><Deck items={t.items} inset label="Zcash event deck (landing D)" /></div>
              <div className={p.span2}><MockSearch /><MockHero /></div>
            </div>
          </div>
        </Sample>
      </Section>

      <Section id="events" title="Which events roll, and where do they link?" aside={<span className="small">Ranked by the feed&apos;s importance, halved for every week of age; at most 12</span>}>
        <div className="tbl-wrap">
          <table className="t">
            <thead><tr><th>#</th><th>Event</th><th>Value</th><th>Change</th><th>When</th><th>Links to</th></tr></thead>
            <tbody>
              {t.items.map((it, k) => (
                <tr key={it.id}>
                  <td>{k + 1}</td>
                  <td className="l">{it.tag} · {it.label}</td>
                  <td>{it.value ?? '—'}</td>
                  <td className={it.delta?.dir === 'up' ? 'up' : it.delta?.dir === 'dn' ? 'dn' : ''}>{it.delta?.text ?? '—'}</td>
                  <td>{it.when}</td>
                  <td><Link href={it.href}>{it.href}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">Topics for Sample 6: {t.topics.map((g) => `${g.label} (${g.items.length})`).join(' · ')}. Breaking: {t.breaking ? `${t.breaking.label}, until ${new Date(t.breaking.expiresTs * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'none'}.</p>
        <More summary="Data gaps and accessibility notes">
          <div className="stack">
            <p className="note"><b>No per-event link on /news.</b> The feed cards have no id and the page ignores the URL hash, so feed events link to their chart (what the feed&apos;s own “Open chart” does) and to /news as a whole. Giving each card an id (the same <span className="mono">ts-index</span> key the ticker uses) and opening the card that matches the hash would let the ticker deep-link.</p>
            <p className="note"><b>State facts carry the snapshot time.</b> The migration, price, shielded share and the rest are dated “now” (11 Oct 2026, 02:31 UTC); feed events carry their own date.</p>
            <p className="note"><b>Motion rules.</b> Nothing auto-moves until the page has loaded; motion stops on hover, on keyboard focus, on touch, with the Pause button, and entirely under “reduce motion”. Moving areas are labelled regions, never live regions, and every sample has an “All” list with every event as a plain link.</p>
          </div>
        </More>
      </Section>
    </>
  );
}
