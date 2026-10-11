'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { TickerDelta, TickerItem } from '@/lib/data/ticker';
import s from './ticker.module.css';

/* Small building blocks of the event tape. */

/** Client-side navigation to a hash on the page you are already on fires no hashchange; send one so /news opens the card. */
const nudgeHash = (href: string) => { if (href.includes('#')) window.setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 60); };

export function Tag({ item }: { item: Pick<TickerItem, 'tag' | 'hot'> }) {
  return <span className={`${s.tag} ${item.hot ? s.hot : ''}`}>{item.tag}</span>;
}

export function DeltaText({ d, className }: { d?: TickerDelta; className?: string }) {
  if (!d) return null;
  return <span className={`${s.delta} ${d.dir === 'up' ? s.up : d.dir === 'dn' ? s.dn : ''} ${className ?? ''}`}>{d.text}</span>;
}

/** Visible Pause/Play (WCAG 2.2.2). Hidden when the visitor prefers reduced motion: nothing moves by itself then. */
export function PauseButton({ paused, onToggle, held, reduced, compact = false }: { paused: boolean; onToggle: () => void; held?: boolean; reduced: boolean; compact?: boolean }) {
  if (reduced) return null;
  const label = paused ? 'Play' : 'Pause';
  return (
    <button type="button" className={`${s.ctl} ${compact ? s.compact : ''}`} onClick={onToggle} aria-label={`${label} the event ticker`} title={held && !paused ? 'Paused while you point at or focus it' : undefined}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {paused ? <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /> : <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" />}
      </svg>
      <span className={s.ctlTxt}>{label}</span>
    </button>
  );
}

export function StepButton({ dir, onClick, label }: { dir: 'prev' | 'next'; onClick: () => void; label: string }) {
  return (
    <button type="button" className={s.ctl} onClick={onClick} aria-label={label}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  );
}

/** The accessible static list: every event as a plain link. Collapsed by default; never aria-live. */
export function EventList({ items, label = 'All events' }: { items: TickerItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  // the tape lives in the layout and survives navigation: close on Escape, outside click, or after following a link
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);
  return (
    <div className={s.listWrap} ref={wrap}>
      <button type="button" className={`${s.ctl} ${s.listBtn}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <span className={s.ctlTxt}>{label}</span><span className={s.count}>{items.length}</span>
      </button>
      {open && (
        <div className={s.list} id={id}>
          <ol>
            {items.map((it) => (
              <li key={it.id}>
                <Link href={it.href} className={s.listLink} onClick={() => { setOpen(false); nudgeHash(it.href); }}>
                  <Tag item={it} />
                  <span className={s.listLabel}>{it.label}</span>
                  {it.value && <b className={s.value}>{it.value}</b>}
                  <DeltaText d={it.delta} />
                  <time className={s.when} dateTime={it.date}>{it.when}</time>
                </Link>
              </li>
            ))}
          </ol>
          <p className={s.listNote}>Feed events open their card on <Link href="/news">News</Link>; figures open the page that explains them.</p>
        </div>
      )}
    </div>
  );
}

/** One-line item used by the strip tickers. */
export function InlineItem({ it, tabIndex }: { it: TickerItem; tabIndex?: number }) {
  return (
    <Link href={it.href} className={s.inline} tabIndex={tabIndex} onClick={() => nudgeHash(it.href)}>
      <Tag item={it} />
      <span className={s.label}>{it.label}</span>
      {it.value && <b className={s.value}>{it.value}</b>}
      {it.progress != null && <Mini value={it.progress} />}
      <DeltaText d={it.delta} />
      {it.when !== 'Now' && <time className={s.when} dateTime={it.date}>{it.when}</time>}
    </Link>
  );
}

/** Tiny progress bar (the Ironwood migration). Decorative: the percentage is printed next to it. */
export function Mini({ value, wide = false }: { value: number; wide?: boolean }) {
  return <span className={`${s.mini} ${wide ? s.miniWide : ''}`} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>;
}
