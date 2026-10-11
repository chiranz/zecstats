'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TickerItem } from '@/lib/data/ticker';
import { dateLong } from '@/lib/format';
import { DeltaText, Mini, nudgeHash, Tag } from './parts';
import t from './ItemTip.module.css';

/*
 * Per-item tooltip for the event tape. Hovering (or focusing) one item opens a small card anchored under it; the tape
 * holds still only while a card is open, so the item and its card stay put to read or click. Self-contained: the tape
 * switches it on with TAPE_TOOLTIPS in Marquee.tsx, and turning that off restores the hold-on-hover behaviour.
 */

const OPEN_DELAY = 120;  // ms: skim across the tape without cards flashing
const CLOSE_DELAY = 160; // ms: time to move the pointer from the item into the card

type Tip = { it: TickerItem; rect: DOMRect; id: string };

function destination(href: string): string {
  if (href.startsWith('/news')) return 'Read it on News';
  if (href.startsWith('/chart/')) return 'Open the chart';
  if (href === '/ironwood') return 'Open the Ironwood tracker';
  if (href === '/privacy') return 'Open the privacy hub';
  if (href === '/orchard-turnstile') return 'Open the turnstile watch';
  return 'Open the page';
}

export function useItemTips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const clear = () => window.clearTimeout(timer.current);
  const close = useCallback(() => { clear(); setTip(null); }, []);
  const closeSoon = () => { clear(); timer.current = window.setTimeout(() => setTip(null), CLOSE_DELAY); };
  const openFor = (it: TickerItem, el: HTMLElement, delay: number) => {
    clear();
    timer.current = window.setTimeout(() => setTip({ it, rect: el.getBoundingClientRect(), id: `tip-${it.id}` }), delay);
  };

  // the card is placed from the item's rect at open time: scrolling or resizing would detach it, so close instead
  useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', close); window.removeEventListener('resize', close); };
  }, [tip, close]);
  useEffect(() => clear, []);

  /** Props for one item's link. Touch skips the card: a tap opens the page, as before. */
  const bind = (it: TickerItem) => ({
    'aria-describedby': tip?.it.id === it.id ? tip.id : undefined,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => { if (e.pointerType === 'mouse') openFor(it, e.currentTarget, OPEN_DELAY); },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => { if (e.pointerType === 'mouse') closeSoon(); },
    onFocus: (e: React.FocusEvent<HTMLElement>) => { if (e.currentTarget.matches(':focus-visible')) openFor(it, e.currentTarget, 0); },
    onBlur: closeSoon,
    onClick: close,
  });

  const card = tip && typeof document !== 'undefined'
    ? createPortal(<TipCard tip={tip} onEnter={clear} onLeave={closeSoon} onNavigate={close} />, document.body)
    : null;

  return { open: tip !== null, bind, card };
}

function TipCard({ tip, onEnter, onLeave, onNavigate }: { tip: Tip; onEnter: () => void; onLeave: () => void; onNavigate: () => void }) {
  const { it, rect } = tip;
  const W = 288;
  const vw = document.documentElement.clientWidth;
  const cx = rect.left + rect.width / 2;
  const left = Math.max(12, Math.min(vw - W - 12, cx - W / 2));
  return (
    <div
      id={tip.id}
      role="tooltip"
      className={t.card}
      style={{ left, top: rect.bottom + 8, width: W, ['--arrow-x' as string]: `${Math.round(cx - left)}px` }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <div className={t.head}>
        <Tag item={it} />
        <time className={t.when} dateTime={it.date}>{it.when === 'Now' ? 'Now' : `${dateLong(it.date)} · ${it.when}`}</time>
      </div>
      <p className={t.title}>{it.label}</p>
      {(it.value || it.delta) && (
        <dl className={t.rows}>
          {it.value && <div><dt>{it.progress != null ? 'Crossed' : 'Value'}</dt><dd className={t.v}>{it.value}</dd></div>}
          {it.progress != null && <div className={t.bar}><Mini value={it.progress} wide /></div>}
          {it.delta && <div><dt>Change</dt><dd><DeltaText d={it.delta} /></dd></div>}
        </dl>
      )}
      <Link href={it.href} className={t.go} onClick={() => { onNavigate(); nudgeHash(it.href); }} tabIndex={-1}>{destination(it.href)} <span aria-hidden="true">→</span></Link>
    </div>
  );
}
