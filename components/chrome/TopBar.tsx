'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { navSection, primaryNav, toolGroups } from '@/lib/site';
import type { SearchItem } from '@/lib/search';
import type { NavData } from '@/lib/data/nav';
import { StatusPill } from './StatusPill';
import { Icon } from '@/components/ui/Icon';
import { startNavigation } from '@/components/skeleton/RouteFrame';

export function TopBar({ searchIndex, nav }: { searchIndex: SearchItem[]; nav: NavData }) {
  const pathname = usePathname();
  const current = navSection(pathname);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => { setToolsOpen(false); setSheetOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
      if (e.key === 'Escape') {
        setToolsOpen((o) => { if (o && toolsRef.current?.contains(document.activeElement)) toolsBtn.current?.focus(); return false; });
        setSearchOpen(false); setSheetOpen(false);
      }
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
            <button ref={toolsBtn} className="nl" type="button" aria-expanded={toolsOpen} aria-controls="tools-menu" aria-current={current === 'Tools' ? 'page' : undefined} onClick={() => setToolsOpen((o) => !o)}>
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
 *  columns, and a footer link to every tool. A plain disclosure of links (Tab moves through them; Escape closes). */
function ToolsMenu({ nav }: { nav: NavData }) {
  const [priv, ...rest] = toolGroups;
  const iw = nav.ironwood;
  return (
    <div className="mega" id="tools-menu">
      <div className="grp grp-priv">
        <h4>{priv.title}</h4>
        {priv.links.map((l) => l.href === '/ironwood' ? (
          <Link className="mi mi-iw" href={l.href} key={l.href}>
            <b>{l.label}<span className="tag live">LIVE</span><span className="mi-v">{nav.values[l.href]}</span></b>
            <span className="mi-bar" aria-hidden="true"><i style={{ width: `${iw.pct}%` }} /></span>
            <span>{iw.crossed} of {iw.base} Orchard ZEC crossed · live {iw.days} days</span>
          </Link>
        ) : (
          <Link className="mi" href={l.href} key={l.href}>
            <b>{l.label}{nav.values[l.href] && <span className="mi-r">{nav.values[l.href]}</span>}</b>
            {l.desc && <span>{l.desc}</span>}
          </Link>
        ))}
      </div>
      {rest.map((g) => (
        <div className="grp" key={g.title}>
          <h4>{g.title}</h4>
          {g.links.map((l) => (
            <Link className="mi" href={l.href} key={l.href}>
              <b>{l.label}{l.tag && <span className="tag">{l.tag}</span>}</b>
              {l.desc && <span>{l.desc}</span>}
            </Link>
          ))}
        </div>
      ))}
      <div className="mega-foot"><Link href="/tools">All tools &amp; methodology <Icon name="arrow-right" size={12} /></Link></div>
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
              <li key={l.href}><Link href={l.href}>{l.href === '/privacy' ? 'Privacy hub' : l.label}{l.featured && <span className="tag live">LIVE</span>}{l.value && <span className="m-v">{l.value}</span>}</Link></li>
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
  // focus the input on open; give focus back to whatever opened the palette on close
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => { if (prev?.isConnected) prev.focus(); };
  }, []);

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
  const go = (href: string) => { onClose(); startNavigation(href); router.push(href); };
  const groups = (['Page', 'Chart', 'Tool'] as const).map((k) => ({ k, items: results.filter((r) => r.kind === k) })).filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  const shown: { k: string; items: SearchItem[] }[] = q ? groups.map((g) => ({ k: `${g.k}s`, items: g.items })) : [{ k: 'Popular', items: flat }];
  const optId = (i: number) => `search-opt-${i}`;
  useEffect(() => { document.getElementById(optId(sel))?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* modal: the input is the only tab stop (options are picked with the arrows), so Tab stays inside */}
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search" onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); inputRef.current?.focus(); } }}>
        <label className="p-in">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            value={q}
            placeholder="Search charts, tools and pages…"
            aria-label="Search charts, tools and pages"
            aria-autocomplete="list"
            aria-expanded={flat.length > 0}
            aria-controls="search-results"
            aria-activedescendant={flat[sel] ? optId(sel) : undefined}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(flat.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Home' && flat.length) { e.preventDefault(); setSel(0); }
              if (e.key === 'End' && flat.length) { e.preventDefault(); setSel(flat.length - 1); }
              if (e.key === 'Enter' && flat[sel]) go(flat[sel].href);
            }}
          />
          <button type="button" className="kbd" onClick={onClose} aria-label="Close search" tabIndex={-1} style={{ background: 'none', cursor: 'pointer' }}>Esc</button>
        </label>
        <div className="p-body" id="search-results" role="listbox" aria-label={q ? 'Results' : 'Popular'}>
          {shown.map((g) => (
            <div key={g.k} role="group" aria-labelledby={`search-g-${g.k}`}>
              <p className="p-h" id={`search-g-${g.k}`}>{g.k}</p>
              {g.items.map((it) => {
                const idx = flat.indexOf(it);
                return (
                  <div role="option" id={optId(idx)} aria-selected={idx === sel} key={it.href} className={`p-row${idx === sel ? ' sel' : ''}`} onMouseEnter={() => setSel(idx)} onClick={() => go(it.href)}>
                    <span className="ic"><Icon name={it.kind === 'Chart' ? 'chart' : it.kind === 'Tool' ? 'tool' : 'page'} size={14} /></span>
                    <span><b>{it.title}</b>{it.desc && <small>{it.desc}</small>}</span>
                    <span className={values[it.href] ? 'v val' : 'v'}>{values[it.href] ?? it.group}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {q && !flat.length && <p className="p-empty">No matches for “{q}”. Try “shielded”, “price” or “fees”.</p>}
        <p className="sr-only" aria-live="polite">{q ? `${flat.length} result${flat.length === 1 ? '' : 's'}` : ''}</p>
        <div className="p-keys" aria-hidden="true"><span><span className="kbd">↑</span> <span className="kbd">↓</span> move</span><span><span className="kbd">Enter</span> open</span><span style={{ marginLeft: 'auto' }}>{flat.length} of {index.length}</span></div>
      </div>
    </div>
  );
}
