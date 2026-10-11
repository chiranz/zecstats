'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Body, Brand, Glyph, Lede, SearchBox, Sheet, StatusPill, TickerSlot, Title } from './ui';
import { MenuContent, SectionTabs, ThemeToggle } from './parts';
import type { Ctx, NavData } from './types';
import s from './e.module.css';
import n from './navlab.module.css';

type Panel = 'search' | 'menu' | null;

/**
 * E · Thumb. On phones the five things people reach for sit in a bottom tab bar (Dashboard · Privacy · Charts ·
 * Search · Menu) — in thumb reach, always visible. On desktop the same five become a slim left rail with flyouts.
 * The current section's pages are a chip row at the top; the masthead is H1 + answer.
 */
export function DirE({ ctx, data }: { ctx: Ctx; data: NavData }) {
  const [panel, setPanel] = useState<Panel>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setPanel(null), []);
  const toggle = (p: Panel) => setPanel((x) => (x === p ? null : p));
  const g = data.chartGroups.find((x) => x.id === data.chart.groupId)!;
  const tabs = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: 'grid' },
    { id: 'privacy', href: '/privacy', label: 'Privacy', icon: 'shield' },
    { id: 'charts', href: '/charts', label: 'Charts', icon: 'chart' },
  ];
  const current = ctx === 'privacy' ? 'privacy' : 'charts';

  return (
    <div className={s.root}>
      <nav className={s.rail} aria-label="Main">
        <Link href="/" className={s.railBrand} aria-label="ZEC Stats home"><span className="brand-mark" aria-hidden="true" /></Link>
        <ul className={s.items}>
          {tabs.map((t) => (
            <li key={t.id}>
              <Link href={t.href} className={s.item} aria-current={current === t.id && !panel ? 'page' : undefined}>
                <Glyph name={t.icon} size={20} /><span>{t.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button ref={searchRef} type="button" className={s.item} aria-haspopup="dialog" aria-expanded={panel === 'search'} onClick={() => toggle('search')} data-shot="search">
              <Icon name="search" size={20} /><span>Search</span>
            </button>
          </li>
          <li>
            <button ref={menuRef} type="button" className={s.item} aria-haspopup="dialog" aria-expanded={panel === 'menu'} onClick={() => toggle('menu')} data-shot="menu">
              <Icon name="menu" size={20} /><span>Menu</span>
            </button>
          </li>
        </ul>
        <Link href="/donate" className={`${s.item} ${s.railDonate}`}><Glyph name="heart" size={18} /><span>Donate</span></Link>
      </nav>

      <div className={s.main}>
        <header className={`${s.top} nl-sticky`}>
          <span className={s.brandM}><Brand /></span>
          <span className={s.sectionName} aria-hidden="true">{ctx === 'privacy' ? 'Privacy' : g.title}</span>
          <div className={s.chips}>
            {ctx === 'privacy'
              ? <SectionTabs items={data.privacy} current="/privacy" label="Privacy pages" className={s.tabs} />
              : <SectionTabs items={g.items} current="/chart/price" label={`Charts in ${g.title}`} className={s.tabs} showValues="none" />}
          </div>
          <div className={s.util}>
            <StatusPill data={data} cadence={ctx === 'privacy' ? 'balances every block · flows daily' : data.chart.cadence} />
            <span className={s.wide}><ThemeToggle /></span>
          </div>
        </header>
        <TickerSlot />
        <div className={s.flow}>
          <header className={s.mast}>
            <Title ctx={ctx} data={data} />
            <Lede ctx={ctx} data={data} />
          </header>
          <Body data={data} ctx={ctx} />
        </div>
      </div>

      <Sheet open={panel === 'search'} onClose={close} label="Search" returnRef={searchRef} className={s.fly}>
        <div className={s.flyHead}><span className="kicker">Search</span><button type="button" className="btn icon ghost" aria-label="Close search" onClick={close}><Icon name="x" size={16} /></button></div>
        <SearchBox data={data} size="lg" autoFocus alwaysOpen onNavigate={close} popClass={n.popInline} />
      </Sheet>
      <Sheet open={panel === 'menu'} onClose={close} label="Menu" returnRef={menuRef} className={s.fly}>
        <MenuContent data={data} ctx={ctx} onClose={close} search={false} />
      </Sheet>
    </div>
  );
}
