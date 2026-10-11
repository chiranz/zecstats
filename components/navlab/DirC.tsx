'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Body, Brand, ItemLink, Lede, SearchButton, StatusPill, TickerSlot, Title, useDisclosure } from './ui';
import { Donate, MenuButton, ThemeToggle } from './parts';
import { ctxSection, type Ctx, type NavData } from './types';
import s from './c.module.css';

/**
 * C · Questions. Menus are organised by the question a visitor brings, and every item shows its live value, so the
 * menu itself answers. Privacy stays a top-level menu (Ironwood is its feature card); "Explore" holds the other four
 * questions, mixing charts and tools. The masthead eyebrow names the question the page belongs to.
 */
export function DirC({ ctx, data }: { ctx: Ctx; data: NavData }) {
  const current = ctxSection(ctx);
  const cadence = ctx === 'privacy' ? 'balances every block · flows daily' : data.chart.cadence;
  return (
    <div className={s.root}>
      <header className={`${s.bar} nl-sticky`}>
        <Brand />
        <nav aria-label="Main" className={s.nav}>
          <ul className={s.list}>
            <li><Link className="nl" href="/">Dashboard</Link></li>
            <li><PrivacyMenu data={data} current={current === 'privacy'} /></li>
            <li><ExploreMenu data={data} current={current === 'charts'} /></li>
            <li><Link className="nl" href="/news">News</Link></li>
          </ul>
        </nav>
        <div className={s.right}>
          <SearchButton data={data} label="Search charts, tools and pages" />
          <StatusPill data={data} cadence={cadence} variant="dot" />
          <span className={s.wide}><ThemeToggle /></span>
          <Donate className={s.wide} />
          <span className={s.burger}><MenuButton data={data} ctx={ctx} search={false} full={false} lead={<QuestionAccordion data={data} />} /></span>
        </div>
      </header>
      <TickerSlot />
      <div className={s.flow}>
        <header className={s.mast}>
          <div className={s.mastMain}>
            {ctx === 'privacy' ? (
              <Link className={s.eyebrow} href="/privacy">Privacy <span aria-hidden="true">·</span> 7 pages, 11 charts</Link>
            ) : (
              <Link className={s.eyebrow} href={`/charts#g-${data.chart.groupId}`}>{data.chart.groupQuestion.split(',')[0]}? <span aria-hidden="true">›</span> {data.chart.groupTitle}</Link>
            )}
            <Title ctx={ctx} data={data} />
            <Lede ctx={ctx} data={data} />
          </div>
          <p className={s.fresh}><i aria-hidden="true" /> Data through {data.fresh.through} · {cadence}</p>
        </header>
        {ctx === 'privacy' && (
          <nav aria-label="On this page" className={s.chips}>
            <ul>{data.jumps.map((j, i) => <li key={j.href}><Link href={j.href} aria-current={i === 0 ? 'true' : undefined}>{j.label}</Link></li>)}</ul>
          </nav>
        )}
        <Body data={data} ctx={ctx} />
      </div>
    </div>
  );
}

function PrivacyMenu({ data, current }: { data: NavData; current: boolean }) {
  const d = useDisclosure();
  const iw = data.ironwood;
  const [feat, ...rest] = [data.privacy[1], data.privacy[0], ...data.privacy.slice(2)];
  return (
    <div className={s.dd} {...d.wrap}>
      <button {...d.button} className="nl" aria-current={current ? 'page' : undefined} data-shot="privacy">Privacy <Icon name={d.open ? 'chevron-up' : 'chevron-down'} size={10} /></button>
      {d.open && (
        <div id={d.id} className={`${s.panel} ${s.privPanel}`}>
          <Link href={feat.href} className={s.feature} onClick={() => d.setOpen(false)}>
            <span className={s.fk}><i aria-hidden="true" /> Ironwood · live {iw.days} days</span>
            <span className={s.fv}>{iw.pctText}</span>
            <span className={s.fd}>of Orchard’s coins have crossed into Ironwood, the newest shielded pool. It now holds {iw.balance} — {iw.shareOfShielded} of all shielded ZEC.</span>
            <span className={s.bar2} aria-hidden="true"><span style={{ width: `${iw.pct}%` }} /></span>
            <span className={s.fl}>Open the Ironwood tracker <Icon name="arrow-right" size={12} /></span>
          </Link>
          <div className={s.privList}>
            <p className={s.q}>How private is Zcash?</p>
            <ul>{rest.map((it) => <li key={it.href}><ItemLink it={{ ...it, featured: false }} onClick={() => d.setOpen(false)} /></li>)}</ul>
            <Link className={s.more} href="/charts#g-privacy" onClick={() => d.setOpen(false)}>11 privacy charts <Icon name="arrow-right" size={12} /></Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ExploreMenu({ data, current }: { data: NavData; current: boolean }) {
  const d = useDisclosure();
  return (
    <div className={s.dd} {...d.wrap}>
      <button {...d.button} className="nl" aria-current={current ? 'page' : undefined} data-shot="explore">Explore <Icon name={d.open ? 'chevron-up' : 'chevron-down'} size={10} /></button>
      {d.open && (
        <div id={d.id} className={`${s.panel} ${s.explore}`}>
          <div className={s.cols}>
            {data.questions.map((g) => (
              <section key={g.id} aria-labelledby={`${d.id}-${g.id}`} className={s.col}>
                <h2 className={s.q} id={`${d.id}-${g.id}`}>{g.title}</h2>
                <ul>{g.items.map((it) => <li key={it.href}><ItemLink it={it} onClick={() => d.setOpen(false)} current={it.href === '/chart/price' && current} /></li>)}</ul>
              </section>
            ))}
          </div>
          <div className={s.deeper}>
            <span className={s.dk}>Dig deeper</span>
            <ul>{data.deeper.map((it) => <li key={it.href}><Link href={it.href} onClick={() => d.setOpen(false)} className={it.href === '/charts' ? s.all : undefined}>{it.label}{it.tag && <span className="tag">{it.tag}</span>}</Link></li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

/** Phone: the same questions as an accordion (one open at a time), Privacy first and open. */
function QuestionAccordion({ data }: { data: NavData }) {
  const groups = [{ id: 'private', title: 'How private is it?', items: [data.privacy[1], data.privacy[0], ...data.privacy.slice(2)] }, ...data.questions];
  const [open, setOpen] = useState('private');
  return (
    <div className={s.acc}>
      {groups.map((g) => (
        <section key={g.id} className={s.accSec}>
          <h2 className={s.accH}>
            <button type="button" aria-expanded={open === g.id} aria-controls={`acc-${g.id}`} onClick={() => setOpen(open === g.id ? '' : g.id)}>
              {g.title}<Icon name={open === g.id ? 'chevron-up' : 'chevron-down'} size={12} />
            </button>
          </h2>
          {open === g.id && <ul id={`acc-${g.id}`}>{g.items.map((it) => <li key={it.href}><ItemLink it={it} /></li>)}</ul>}
        </section>
      ))}
    </div>
  );
}
