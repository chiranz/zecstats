'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Body, Brand, ItemLink, Lede, SearchBox, SearchButton, StatusPill, TickerSlot, Title, useDisclosure } from './ui';
import { Donate, MainNav, MenuButton, OnThisPage, PrevNext, SectionTabs, ThemeToggle } from './parts';
import { ctxSection, type Ctx, type NavData } from './types';
import s from './d.module.css';

/**
 * D · Answer first. Status is said once, in the global bar. The breadcrumb and the section's pages merge into one
 * context bar ("Privacy / Overview · Ironwood · …", "Charts / Price & valuation ▾ / Zcash price"). The masthead is just
 * H1 + one-sentence answer (+ the key figure on single-number pages), so the answer starts ~100px higher.
 */
export function DirD({ ctx, data }: { ctx: Ctx; data: NavData }) {
  const c = data.chart;
  return (
    <div className={s.root}>
      <header className={`${s.bar} nl-sticky`}>
        <Brand />
        <MainNav data={data} current={ctxSection(ctx)} label="Main" className={s.main} />
        <div className={s.right}>
          <div className={s.search}><SearchBox data={data} size="sm" placeholder="Search" /></div>
          <span className={s.searchIc}><SearchButton data={data} /></span>
          <StatusPill data={data} cadence={ctx === 'privacy' ? 'balances every block · flows daily' : c.cadence} />
          <span className={s.wide}><ThemeToggle /></span>
          <Donate className={s.wide} />
          <span className={s.burger}><MenuButton data={data} ctx={ctx} /></span>
        </div>
      </header>
      <TickerSlot />
      <div className={s.ctx}>
        <nav aria-label="Breadcrumb" className={s.crumb}>
          <Link href={ctx === 'privacy' ? '/privacy' : '/charts'} className={s.root1}>{ctx === 'privacy' ? 'Privacy' : 'Charts'}</Link>
          <span className={s.sl} aria-hidden="true">/</span>
          {ctx === 'chart' && (
            <>
              <GroupSwitcher data={data} />
              <span className={`${s.sl} ${s.wideOnly}`} aria-hidden="true">/</span>
              <span className={`${s.here} ${s.wideOnly}`} aria-current="page">{c.title.replace(/ \(.*\)$/, '')}</span>
            </>
          )}
        </nav>
        {ctx === 'privacy' && <SectionTabs items={data.privacy} current="/privacy" label="Privacy pages" className={s.tabs} />}
        <div className={s.end}>{ctx === 'privacy' ? <OnThisPage jumps={data.jumps} /> : <PrevNext data={data} compact />}</div>
      </div>
      <div className={s.flow}>
        <header className={`${s.mast} ${ctx === 'chart' ? s.withFig : ''}`}>
          <div className={s.mastText}>
            <Title ctx={ctx} data={data} />
            <Lede ctx={ctx} data={data} />
          </div>
          {ctx === 'chart' && (
            <div className={s.key} aria-label={`Key figure: ${c.value}, close on ${c.date}`}>
              <span className={s.keyV}>{c.value}</span>
              {c.change && <span className={`delta ${c.changeDir === 'dn' ? 'dn' : ''}`}>{c.change}</span>}
            </div>
          )}
        </header>
        <Body data={data} ctx={ctx} />
      </div>
    </div>
  );
}

/** The group crumb doubles as a switcher: every chart in the group, with its latest value. */
function GroupSwitcher({ data }: { data: NavData }) {
  const d = useDisclosure();
  const g = data.chartGroups.find((x) => x.id === data.chart.groupId)!;
  return (
    <div className={s.dd} {...d.wrap}>
      <button {...d.button} className={s.switch} data-shot="group">{g.title} <Icon name={d.open ? 'chevron-up' : 'chevron-down'} size={10} /></button>
      {d.open && (
        <div id={d.id} className={s.panel}>
          <p className={s.ph}>{g.items.length} charts in {g.title}</p>
          <ul>{g.items.map((it) => <li key={it.href}><ItemLink it={it} current={it.href === '/chart/price'} onClick={() => d.setOpen(false)} /></li>)}</ul>
          <div className={s.pf}>
            <Link href={g.href!} onClick={() => d.setOpen(false)}>Group overview</Link>
            <Link href="/charts" onClick={() => d.setOpen(false)}>All 58 charts <Icon name="arrow-right" size={12} /></Link>
          </div>
        </div>
      )}
    </div>
  );
}
