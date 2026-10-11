'use client';

import { Body, Brand, Lede, SearchBox, SearchButton, StatusPill, TickerSlot, Title } from './ui';
import { Donate, MainNav, MenuButton, OnThisPage, PrevNext, SectionTabs, ThemeToggle } from './parts';
import { ctxSection, type Ctx, type NavData } from './types';
import s from './a.module.css';

/**
 * A · Section bar. Tier 1 is global (brand, five sections, search, status, theme, Donate). Tier 2 belongs to the
 * section you are in: its pages as tabs (Privacy: Overview, Ironwood first) or the chart groups. Crumbs, kicker and the
 * freshness block are gone — the two bars already say where you are and how fresh the data is.
 */
export function DirA({ ctx, data }: { ctx: Ctx; data: NavData }) {
  const groupTabs = [{ href: '/charts', label: 'All 58' }, ...data.chartGroups.map((g) => ({ href: g.href!, label: g.short ?? g.title }))];
  return (
    <div className={s.root}>
      <header className={`${s.bar} nl-sticky`}>
        <Brand />
        <MainNav data={data} current={ctxSection(ctx)} label="Main" className={s.main} />
        <div className={s.right}>
          <div className={s.search}><SearchBox data={data} size="sm" placeholder="Search" /></div>
          <span className={s.searchIc}><SearchButton data={data} /></span>
          <span className={s.status}><StatusPill data={data} cadence={ctx === 'privacy' ? 'balances every block · flows daily' : data.chart.cadence} /></span>
          <span className={s.wide}><ThemeToggle /></span>
          <Donate className={s.wide} />
          <span className={s.burger}><MenuButton data={data} ctx={ctx} /></span>
        </div>
      </header>
      <TickerSlot />
      <nav className={s.sec} aria-label={ctx === 'privacy' ? 'Privacy pages' : 'Chart groups'}>
        <span className={s.secName} aria-hidden="true">{ctx === 'privacy' ? 'Privacy' : 'Charts'}</span>
        {ctx === 'privacy' ? (
          <SectionTabs items={data.privacy} current="/privacy" label="Privacy pages" className={s.tabs} />
        ) : (
          <SectionTabs items={groupTabs} current={`/charts#g-${data.chart.groupId}`} label="Chart groups" className={s.tabs} />
        )}
        <div className={s.secEnd}>{ctx === 'privacy' ? <OnThisPage jumps={data.jumps} /> : <PrevNext data={data} />}</div>
      </nav>
      <div className={s.flow}>
        <header className={s.mast}>
          <Title ctx={ctx} data={data} />
          <Lede ctx={ctx} data={data} />
        </header>
        <Body data={data} ctx={ctx} />
      </div>
    </div>
  );
}
