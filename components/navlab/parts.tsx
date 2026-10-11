'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/chrome/TopBar';
import { Glyph, ItemLink, SearchBox, Sheet, useDisclosure } from './ui';
import { SECTIONS, type Ctx, type Item, type NavData } from './types';
import s from './parts.module.css';

/** Primary section links. Tools is a disclosure button (it has no index page). */
export function MainNav({ data, current, label, tools = 'menu', className }: { data: NavData; current: string; label: string; tools?: 'menu' | 'none'; className?: string }) {
  return (
    <nav aria-label={label} className={`${s.nav} ${className ?? ''}`}>
      <ul className={s.navList}>
        {SECTIONS.map((sec) =>
          sec.id === 'tools' ? (tools === 'menu' && <li key={sec.id}><ToolsDropdown data={data} /></li>) : (
            <li key={sec.id}><Link className="nl" href={sec.href} aria-current={current === sec.id ? 'page' : undefined}>{sec.label}</Link></li>
          ),
        )}
      </ul>
    </nav>
  );
}

export function ToolsDropdown({ data }: { data: NavData }) {
  const d = useDisclosure();
  return (
    <div className={s.dd} {...d.wrap}>
      <button {...d.button} className="nl" data-shot="tools">Tools <Icon name={d.open ? 'chevron-up' : 'chevron-down'} size={10} /></button>
      {d.open && (
        <div id={d.id} className={`${s.panel} ${s.toolsPanel}`}>
          {data.tools.map((g) => (
            <div key={g.id} className={s.grp}>
              <h2 className={s.grpH}>{g.title}</h2>
              <ul>{g.items.map((it) => <li key={it.href}><ItemLink it={it} onClick={() => d.setOpen(false)} /></li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal page tabs for the current section; the current tab is scrolled into view on narrow frames. */
export function SectionTabs({ items, current, label, className, showValues = 'featured' }: { items: Item[]; current: string; label: string; className?: string; showValues?: 'featured' | 'all' | 'none' }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = ref.current;
    const el = ul?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!ul || !el) return;
    const u = ul.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.right > u.right - 28) ul.scrollLeft += r.left - u.left - 16;
  }, [current]);
  return (
    <ul className={`${s.tabs} ${className ?? ''}`} ref={ref} aria-label={label}>
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} className={`${s.tab} ${it.featured ? s.feat : ''}`} aria-current={current === it.href ? 'page' : undefined}>
            {it.featured && <i className={s.dot} aria-hidden="true" />}
            {it.label}
            {it.value && (showValues === 'all' || (showValues === 'featured' && it.featured)) && <span className={s.tabV}>{it.value.replace(' crossed', '')}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "On this page" jump list for long hubs. */
export function OnThisPage({ jumps, className }: { jumps: Item[]; className?: string }) {
  const d = useDisclosure();
  return (
    <div className={`${s.dd} ${s.otp} ${className ?? ''}`} {...d.wrap}>
      <button {...d.button} className={s.otpBtn} data-shot="otp"><Glyph name="list" size={14} /><span className={s.otpTxt}>On this page</span><Icon name={d.open ? 'chevron-up' : 'chevron-down'} size={10} /></button>
      {d.open && (
        <div id={d.id} className={`${s.panel} ${s.otpPanel}`}>
          <ul>{jumps.map((j) => <li key={j.href}><Link className={s.jump} href={j.href} onClick={() => d.setOpen(false)}>{j.label}</Link></li>)}</ul>
        </div>
      )}
    </div>
  );
}

export function PrevNext({ data, compact = false }: { data: NavData; compact?: boolean }) {
  const c = data.chart;
  return (
    <div className={s.pn}>
      <Link className={s.pnBtn} href={c.prev.href} aria-label={`Previous chart: ${c.prev.label}`}><Glyph name="chevron-left" size={14} /></Link>
      <span className={`${s.pnPos} ${s.pnCompact}`}>{c.pos} of {c.count}{!compact && <span className={s.pnIn}> in {c.groupTitle}</span>}</span>
      <Link className={s.pnBtn} href={c.next.href} aria-label={`Next chart: ${c.next.label}`}><Icon name="chevron-right" size={14} /></Link>
    </div>
  );
}

/** Burger → full menu sheet. Same content model in every direction; `lead` lets a direction put its own block first. */
export function MenuButton({ data, ctx, lead, className, search = true, full = true }: { data: NavData; ctx: Ctx; lead?: React.ReactNode; className?: string; search?: boolean; full?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button ref={ref} type="button" className={`btn icon ${className ?? ''}`} aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} data-shot="menu"><Icon name="menu" size={18} /></button>
      <Sheet open={open} onClose={close} label="Menu" returnRef={ref}>
        <MenuContent data={data} ctx={ctx} onClose={close} lead={lead} search={search} full={full} />
      </Sheet>
    </>
  );
}

export function MenuContent({ data, ctx, onClose, lead, search = true, full = true }: { data: NavData; ctx: Ctx; onClose: () => void; lead?: React.ReactNode; search?: boolean; full?: boolean }) {
  const current = ctx === 'privacy' ? 'privacy' : 'charts';
  return (
    <div className={s.menu}>
      <div className={s.menuHead}>
        <span className="kicker">Menu</span>
        <button type="button" className="btn icon ghost" aria-label="Close menu" onClick={onClose}><Icon name="x" size={16} /></button>
      </div>
      {search && <SearchBox data={data} size="md" onNavigate={onClose} />}
      {lead}
      <nav aria-label="Sections" className={s.menuGrid}>
        {SECTIONS.filter((x) => x.id !== 'tools').map((sec) => <Link key={sec.id} href={sec.href} aria-current={current === sec.id ? 'page' : undefined} onClick={onClose}>{sec.label}</Link>)}
      </nav>
      {full && <section className={s.menuSec} aria-labelledby="mm-privacy">
        <h2 id="mm-privacy" className={s.grpH}>Privacy</h2>
        <ul className={s.menuList}>{data.privacy.map((it) => <li key={it.href}><ItemLink it={it} current={ctx === 'privacy' && it.href === '/privacy'} onClick={onClose} /></li>)}</ul>
      </section>}
      {full && data.tools.map((g) => (
        <section className={s.menuSec} key={g.id} aria-label={g.title}>
          <h2 className={s.grpH}>{g.title}</h2>
          <ul className={s.menuGrid2}>{g.items.map((it) => <li key={it.href}><Link href={it.href} onClick={onClose}>{it.label}</Link></li>)}</ul>
        </section>
      ))}
      <div className={s.menuFoot}><ThemeToggle wide /><Link className="btn primary" href="/donate" style={{ flex: 1 }}>Donate</Link></div>
    </div>
  );
}

export function Donate({ className }: { className?: string }) {
  return <Link className={`btn primary ${className ?? ''}`} href="/donate">Donate</Link>;
}
export { ThemeToggle };
