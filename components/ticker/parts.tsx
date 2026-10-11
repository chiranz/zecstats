'use client';

import Link from 'next/link';
import type { TickerDelta, TickerItem } from '@/lib/data/ticker';
import s from './ticker.module.css';

/* Small building blocks of the event tape. */

/** Client-side navigation to a hash on the page you are already on fires no hashchange; send one so /news opens the card. */
export const nudgeHash = (href: string) => { if (href.includes('#')) window.setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 60); };

/** The symbol chip; a qualifier ("ATH", "7D") sits inside it after a divider. */
export function Tag({ item }: { item: Pick<TickerItem, 'tag' | 'qual' | 'hot'> }) {
  return <span className={`${s.tag} ${item.hot ? s.hot : ''}`}>{item.tag}{item.qual && <span className={s.qual}>{item.qual}</span>}</span>;
}

/** The change: arrow = direction, colour = good/bad (`tone`). `per` ("24h") follows it on the tape; the hover card adds `window` in words. */
export function DeltaText({ d, per, window, className }: { d?: TickerDelta; per?: string; window?: string; className?: string }) {
  if (!d) return null;
  return (
    <span className={`${s.delta} ${d.tone === 'good' ? s.up : d.tone === 'bad' ? s.dn : ''} ${className ?? ''}`}>
      {d.text}{per && <span className={s.per}> {per}</span>}{window && <span className={s.window}> {window}</span>}
    </span>
  );
}

/** Tape age: "15 h ago" → "15h"; dates stay as they are. */
const shortWhen = (when: string) => when.replace(/^(\d+) h ago$/, '$1h');

export function StepButton({ dir, onClick, label }: { dir: 'prev' | 'next'; onClick: () => void; label: string }) {
  return (
    <button type="button" className={s.ctl} onClick={onClick} aria-label={label}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  );
}

/** One-line item used by the strip tickers. */
export function InlineItem({ it, tabIndex, tip }: { it: TickerItem; tabIndex?: number; tip?: Partial<React.ComponentProps<'a'>> }) {
  return (
    <Link href={it.href} className={s.inline} tabIndex={tabIndex} {...tip} onClick={(e) => { tip?.onClick?.(e); nudgeHash(it.href); }}>
      <Tag item={it} />
      {it.value ? <b className={s.value}>{it.value}</b> : <span className={s.label}>{it.label}</span>}
      {it.progress != null && <Mini value={it.progress} />}
      <DeltaText d={it.delta} per={it.per} />
      {it.when !== 'Now' && <time className={s.when} dateTime={it.date}>{shortWhen(it.when)}</time>}
      {it.value && <span className="sr-only">{it.label}{it.window ? `, ${it.window}` : ''}{it.note ? `. ${it.note}` : ''}</span>}
    </Link>
  );
}

/** Tiny progress bar (the Ironwood migration). Decorative: the percentage is printed next to it. */
export function Mini({ value, wide = false }: { value: number; wide?: boolean }) {
  return <span className={`${s.mini} ${wide ? s.miniWide : ''}`} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>;
}
