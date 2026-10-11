'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SearchItem } from '@/lib/search';
import { Body, Brand, Lede, SearchBox, StatusPill, TickerSlot, Title } from './ui';
import { Donate, MenuButton, OnThisPage, PrevNext, ThemeToggle } from './parts';
import { SECTIONS, ctxSection, type Ctx, type NavData } from './types';
import s from './b.module.css';

/**
 * B · Command line. Search is the primary navigation: a wide combobox that, empty, offers Recent + Popular with live
 * values; sections shrink to tabs. "Tools" scopes the search to tools instead of opening a 23-link menu.
 * The breadcrumb becomes a terminal path; on a section hub it lists the section's pages like `ls` (Ironwood first).
 */
export function DirB({ ctx, data }: { ctx: Ctx; data: NavData }) {
  const [scope, setScope] = useState<SearchItem['kind'] | null>(null);
  const current = ctxSection(ctx);
  const path = ctx === 'privacy'
    ? [{ href: '/', label: '~' }, { href: '/privacy', label: 'privacy' }]
    : [{ href: '/', label: '~' }, { href: '/charts', label: 'charts' }, { href: `/charts#g-${data.chart.groupId}`, label: 'price-valuation' }, { href: '/chart/price', label: 'price' }];
  return (
    <div className={s.root}>
      <header className={`${s.head} nl-sticky`}>
        <div className={s.row1}>
          <Brand />
          <div className={s.cmd}>
            <SearchBox data={data} size="lg" scope={scope} onScopeClear={() => setScope(null)}
              placeholder={`Search ${data.counts.charts} charts, ${data.counts.tools} tools and every page`} label="Search ZEC Stats" />
          </div>
          <div className={s.right}>
            <span className={s.mobOnly}><StatusPill data={data} cadence={ctx === 'privacy' ? 'balances every block · flows daily' : data.chart.cadence} variant="dot" /></span>
            <span className={s.wide}><ThemeToggle /></span>
            <Donate className={s.wide} />
            <span className={s.mobOnly}><MenuButton data={data} ctx={ctx} /></span>
          </div>
        </div>
        <div className={s.row2}>
          <nav aria-label="Sections" className={s.tabsNav}>
            <ul className={s.tabs}>
              {SECTIONS.map((sec) => (
                <li key={sec.id}>
                  {sec.id === 'tools' ? (
                    <button type="button" className={s.tab} aria-haspopup="listbox" aria-expanded={scope === 'Tool'} data-shot="tools"
                      onMouseDown={(e) => e.preventDefault()} onClick={() => setScope((x) => (x === 'Tool' ? null : 'Tool'))}>Tools</button>
                  ) : (
                    <Link href={sec.href} className={s.tab} aria-current={current === sec.id ? 'page' : undefined}>{sec.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <span className={s.status}><StatusPill data={data} cadence={ctx === 'privacy' ? 'balances every block · flows daily' : data.chart.cadence} variant="line" /></span>
        </div>
      </header>
      <TickerSlot />
      <div className={s.flow}>
        <header className={s.mast}>
          <div className={s.prompt}>
            <nav aria-label="Breadcrumb" className={s.path}>
              <span className={s.sig} aria-hidden="true">›</span>
              {path.map((p, i) => (
                <span key={p.href} className={s.seg}>
                  {i > 1 && <span aria-hidden="true">/</span>}
                  {i === 1 && <span aria-hidden="true">/</span>}
                  {i === path.length - 1 ? <span aria-current="page" className={s.here}>{p.label}</span> : <Link href={p.href}>{p.label}</Link>}
                </span>
              ))}
            </nav>
            {ctx === 'privacy' ? (
              <>
                <nav aria-label="Privacy pages" className={s.ls}>
                  <ul>
                    {data.privacy.slice(1).map((it) => (
                      <li key={it.href}>
                        <Link href={it.href} className={it.featured ? s.lsHot : undefined}>
                          {it.featured && <i aria-hidden="true" />}{it.label.toLowerCase().replace(/\s+/g, '-')}/{it.featured && <span className={s.lsV}>{data.ironwood.pctText}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className={s.anchorsEnd}><OnThisPage jumps={data.jumps} /></div>
              </>
            ) : (
              <div className={s.anchorsEnd}><PrevNext data={data} /></div>
            )}
          </div>
          <Title ctx={ctx} data={data} />
          <Lede ctx={ctx} data={data} />
        </header>
        <Body data={data} ctx={ctx} />
      </div>
    </div>
  );
}
