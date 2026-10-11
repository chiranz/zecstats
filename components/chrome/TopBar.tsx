'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { navSection, primaryNav, toolGroups } from '@/lib/site';
import type { SearchItem } from '@/lib/search';
import type { NavData } from '@/lib/data/nav';
import { StatusPill } from './StatusPill';
import { Icon } from '@/components/ui/Icon';

export function TopBar({ searchIndex, nav }: { searchIndex: SearchItem[]; nav: NavData }) {
  const pathname = usePathname();
  const current = navSection(pathname);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setToolsOpen(false); setSheetOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
      if (e.key === 'Escape') { setToolsOpen(false); setSearchOpen(false); setSheetOpen(false); }
    };
    const onClick = (e: MouseEvent) => { if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  const navItem = (href: string, label: string) => (
    <Link key={href} className="nl" href={href} aria-current={current === label ? 'page' : undefined}>{label}</Link>
  );

  return (
    <header className="topbar">
      <div className="shell">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true" />ZEC STATS</Link>
        <nav className="nav" aria-label="Main">
          {primaryNav.slice(0, 3).map((l) => navItem(l.href, l.label))}
          <div className="tools-wrap" ref={toolsRef}>
            <button className="nl" type="button" aria-expanded={toolsOpen} aria-haspopup="true" aria-current={current === 'Tools' ? 'page' : undefined} onClick={() => setToolsOpen((o) => !o)}>
              Tools <Icon name={toolsOpen ? 'chevron-up' : 'chevron-down'} size={10} />
            </button>
            {toolsOpen && <ToolsMenu nav={nav} />}
          </div>
          {navItem('/news', 'News')}
        </nav>
        <div className="tb-right">
          <button className="kbd-search" type="button" aria-label="Search charts, tools and pages" aria-haspopup="dialog" onClick={() => setSearchOpen(true)}>
            <Icon name="search" size={15} />
            <span className="lbl" aria-hidden="true">Search</span>
            <span className="kbd lbl" aria-hidden="true">⌘K</span>
          </button>
          <StatusPill fresh={nav.fresh} />
          <span className="tb-wide"><ThemeToggle /></span>
          <Link className="btn primary donate" href="/donate">Donate</Link>
          <button className="btn icon burger" type="button" aria-label={sheetOpen ? 'Close menu' : 'Open menu'} aria-expanded={sheetOpen} onClick={() => setSheetOpen((o) => !o)}>
            <Icon name={sheetOpen ? 'x' : 'menu'} size={18} />
          </button>
        </div>
      </div>
      {sheetOpen && <MobileSheet current={current} nav={nav} onSearch={() => { setSheetOpen(false); setSearchOpen(true); }} />}
      {searchOpen && <SearchPalette index={searchIndex} values={nav.values} onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

/** Tools mega menu: the Privacy group on its own card (Ironwood first, with its progress), then six groups in three
 *  columns, and a footer link to every tool. */
function ToolsMenu({ nav }: { nav: NavData }) {
  const [priv, ...rest] = toolGroups;
  const iw = nav.ironwood;
  return (
    <div className="mega" role="menu" aria-label="Tools">
      <div className="grp grp-priv">
        <h4>{priv.title}</h4>
        {priv.links.map((l) => l.href === '/ironwood' ? (
          <Link className="mi mi-iw" role="menuitem" href={l.href} key={l.href}>
            <b><i className="cx-dot" aria-hidden="true" />{l.label}<span className="mi-v">{nav.values[l.href]}</span></b>
            <span className="mi-bar" aria-hidden="true"><i style={{ width: `${iw.pct}%` }} /></span>
            <span>{iw.crossed} of {iw.base} Orchard ZEC crossed · live {iw.days} days</span>
          </Link>
        ) : (
          <Link className="mi" role="menuitem" href={l.href} key={l.href}>
            <b>{l.label}{nav.values[l.href] && <span className="mi-r">{nav.values[l.href]}</span>}</b>
            {l.desc && <span>{l.desc}</span>}
          </Link>
        ))}
      </div>
      {rest.map((g) => (
        <div className="grp" key={g.title}>
          <h4>{g.title}</h4>
          {g.links.map((l) => (
            <Link className="mi" role="menuitem" href={l.href} key={l.href}>
              <b>{l.label}{l.tag && <span className="tag">{l.tag}</span>}</b>
              {l.desc && <span>{l.desc}</span>}
            </Link>
          ))}
        </div>
      ))}
      <div className="mega-foot"><Link role="menuitem" href="/tools">All tools &amp; methodology <Icon name="arrow-right" size={12} /></Link></div>
    </div>
  );
}

function MobileSheet({ current, nav, onSearch }: { current: string | null; nav: NavData; onSearch: () => void }) {
  return (
    <div className="m-sheet" role="dialog" aria-label="Menu">
      <div className="shell stack">
        <button className="field" type="button" onClick={onSearch}><Icon name="search" size={16} /> Search charts &amp; tools</button>
        <div className="m-grid">
          {[...primaryNav.slice(0, 3), primaryNav[3]].map((l) => (
            <Link key={l.href} href={l.href} className={current === l.label ? 'on' : undefined}>{l.label}</Link>
          ))}
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">Privacy</span>
          <ul className="m-list">
            {nav.privacy.map((l) => (
              <li key={l.href}><Link href={l.href}>{l.featured && <i className="cx-dot" aria-hidden="true" />}{l.href === '/privacy' ? 'Privacy hub' : l.label}{l.value && <span className="m-v">{l.value}</span>}</Link></li>
            ))}
          </ul>
        </div>
        {toolGroups.slice(1).map((g) => (
          <div key={g.title} className="stack" style={{ gap: 6 }}>
            <span className="kicker">{g.title}</span>
            <div className="m-grid">{g.links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}</div>
          </div>
        ))}
        <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <ThemeToggle wide />
          <Link className="btn primary" href="/donate" style={{ flex: 1 }}>Donate</Link>
        </div>
      </div>
    </div>
  );
}

export function ThemeToggle({ wide = false }: { wide?: boolean }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => { setTheme((document.documentElement.dataset.theme as 'dark' | 'light') || 'dark'); }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('zec-theme', next); } catch {}
    setTheme(next);
  };
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
  return wide ? (
    <button className="btn" type="button" onClick={toggle} style={{ flex: 1 }}>{theme === 'dark' ? 'Light' : 'Dark'} theme</button>
  ) : (
    <button className="btn icon" type="button" aria-label={label} title={label} onClick={toggle}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} /></button>
  );
}

function SearchPalette({ index, values, onClose }: { index: SearchItem[]; values: Record<string, string>; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return index.filter((i) => i.popular).slice(0, 8);
    const words = t.split(/\s+/);
    return index
      .map((i) => {
        const hay = `${i.title} ${i.desc ?? ''} ${i.keywords ?? ''} ${i.group ?? ''}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (i.title.toLowerCase().startsWith(t) ? 3 : 0) + (i.title.toLowerCase().includes(t) ? 2 : 0) + (i.kind === 'Page' ? 0.5 : 0);
        return { i, score };
      })
      .filter((x): x is { i: SearchItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.i);
  }, [q, index]);

  useEffect(() => setSel(0), [q]);
  const go = (href: string) => { onClose(); router.push(href); };
  const groups = (['Page', 'Chart', 'Tool'] as const).map((k) => ({ k, items: results.filter((r) => r.kind === k) })).filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-label="Search">
        <label className="p-in">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="search"
            value={q}
            placeholder="Search charts, tools and pages…"
            aria-label="Search"
            aria-controls="search-results"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(flat.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Enter' && flat[sel]) go(flat[sel].href);
            }}
          />
          <span className="kbd">Esc</span>
        </label>
        <div className="p-body" id="search-results" role="listbox">
          {!q && <p className="p-h">Popular</p>}
          {groups.map((g) => (
            <div key={g.k}>
              {q && <p className="p-h">{g.k}s</p>}
              {g.items.map((it) => {
                const idx = flat.indexOf(it);
                return (
                  <button type="button" role="option" aria-selected={idx === sel} key={it.href} className={`p-row${idx === sel ? ' sel' : ''}`} onMouseEnter={() => setSel(idx)} onClick={() => go(it.href)}>
                    <span className="ic"><Icon name={it.kind === 'Chart' ? 'chart' : it.kind === 'Tool' ? 'tool' : 'page'} size={14} /></span>
                    <span><b>{it.title}</b>{it.desc && <small>{it.desc}</small>}</span>
                    <span className={values[it.href] ? 'v val' : 'v'}>{values[it.href] ?? it.group}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {q && !flat.length && <p className="p-empty">No matches for “{q}”. Try “shielded”, “price” or “fees”.</p>}
        </div>
        <div className="p-keys"><span><span className="kbd">↑</span> <span className="kbd">↓</span> move</span><span><span className="kbd">Enter</span> open</span><span style={{ marginLeft: 'auto' }}>{flat.length} of {index.length}</span></div>
      </div>
    </div>
  );
}
