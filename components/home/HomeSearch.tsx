'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { SearchItem } from '@/lib/search';
import { Icon } from '@/components/ui/Icon';
import s from './HomeSearch.module.css';

const TRY = ['price', 'shielded', 'fees', 'gold', 'calculator', 'hashrate'];

function match(index: SearchItem[], q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const words = t.split(/\s+/);
  return index
    .map((i) => {
      const hay = `${i.title} ${i.desc ?? ''} ${i.keywords ?? ''} ${i.group ?? ''}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      const title = i.title.toLowerCase();
      return { i, score: (title.startsWith(t) ? 3 : 0) + (title.includes(t) ? 2 : 0) + (i.kind === 'Page' ? 0.5 : 0) };
    })
    .filter((x): x is { i: SearchItem; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.i);
}

/** The dashboard's big search field with "Try" chips; results drop down under the field. */
export function HomeSearch({ index }: { index: SearchItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => match(index, q), [index, q]);
  const show = open && q.trim().length > 0;
  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <div className={s.find} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <div className={s.wrap}>
        <label className={`field ${s.lg}`} htmlFor="home-q">
          <Icon name="search" size={18} />
          <span className="sr-only">Search charts, tools and pages</span>
          <input
            ref={inputRef}
            id="home-q"
            type="search"
            role="combobox"
            aria-expanded={show}
            aria-controls="home-q-results"
            aria-autocomplete="list"
            placeholder="Search charts, tools, pages…"
            autoComplete="off"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((v) => Math.min(results.length - 1, v + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((v) => Math.max(0, v - 1)); }
              if (e.key === 'Enter' && results[sel]) { e.preventDefault(); go(results[sel].href); }
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <span className={`kbd ${s.kbd}`} aria-hidden="true">⌘K</span>
        </label>
        {show && (
          <div className={s.results} id="home-q-results" role="listbox" aria-label="Search results">
            {results.length ? results.map((it, i) => (
              <button key={it.href} type="button" role="option" aria-selected={i === sel} className={`p-row${i === sel ? ' sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => go(it.href)}>
                <span className="ic"><Icon name={it.kind === 'Chart' ? 'chart' : it.kind === 'Tool' ? 'tool' : 'page'} size={14} /></span>
                <span><b>{it.title}</b>{it.desc && <small>{it.desc}</small>}</span>
                <span className="v">{it.kind}</span>
              </button>
            )) : <p className="p-empty">No matches for “{q}”. Try “shielded”, “price” or “fees”.</p>}
          </div>
        )}
      </div>
      <div className={s.try}>
        <span className={s.lbl}>Try</span>
        {TRY.map((t) => (
          <button key={t} className="chip" type="button" aria-pressed={q === t} onClick={() => { setQ(t); setOpen(true); setSel(0); inputRef.current?.focus(); }}>{t}</button>
        ))}
      </div>
    </div>
  );
}
