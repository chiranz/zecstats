'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { TickerItem } from '@/lib/data/ticker';
import { useMotion } from './useMotion';
import { DeltaText, EventList, Mini, PauseButton, StepButton, Tag } from './parts';
import w from './SwipeDeck.module.css';

const DWELL_MS = 6000;

/**
 * Sample 5 — mobile-first snap carousel. Native horizontal scroll with scroll-snap (thumb swipe on phones), mouse drag
 * and ← → / Home / End on desktop, prev/next buttons, and a slow auto-advance that stops on touch, hover or focus.
 */
export function SwipeDeck({ items, label = 'Zcash event cards' }: { items: TickerItem[]; label?: string }) {
  const mo = useMotion();
  const vp = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [touch, setTouch] = useState(false);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const N = items.length;

  const cards = () => Array.from(vp.current?.querySelectorAll<HTMLElement>('[data-card]') ?? []);
  const lastStart = () => {
    const el = vp.current;
    if (!el) return N - 1;
    const max = el.scrollWidth - el.clientWidth;
    const cs = cards();
    const base = cs[0]?.offsetLeft ?? 0;
    const k = cs.findIndex((c) => c.offsetLeft - base >= max - 2);
    return k < 0 ? N - 1 : k;
  };
  const go = useCallback((k: number, smooth = true) => {
    const el = vp.current;
    const cs = Array.from(el?.querySelectorAll<HTMLElement>('[data-card]') ?? []);
    if (!el || !cs.length) return;
    const t = Math.max(0, Math.min(cs.length - 1, k));
    el.scrollTo({ left: cs[t].offsetLeft - cs[0].offsetLeft, behavior: smooth && !mo.reduced ? 'smooth' : 'auto' });
  }, [mo.reduced]);

  // which card is at the left edge
  useEffect(() => {
    const el = vp.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cs = cards();
        const base = cs[0]?.offsetLeft ?? 0;
        let best = 0, bd = Infinity;
        cs.forEach((c, k) => { const dd = Math.abs(c.offsetLeft - base - el.scrollLeft); if (dd < bd) { bd = dd; best = k; } });
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) best = Math.max(best, lastStart());
        setIdx(best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const advance = () => go(idx >= lastStart() ? 0 : idx + 1);
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: idx + 1, ArrowLeft: idx - 1, Home: 0, End: N - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    go(map[e.key]);
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') { setTouch(true); return; }
    drag.current = { x: e.clientX, left: vp.current?.scrollLeft ?? 0, moved: false };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !vp.current) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) { d.moved = true; setDragging(true); vp.current.setPointerCapture(e.pointerId); }
    if (d.moved) vp.current.scrollLeft = d.left - dx;
  };
  const onUp = () => {
    const d = drag.current;
    if (d?.moved) { setDragging(false); requestAnimationFrame(() => go(idx)); }
    window.setTimeout(() => { drag.current = null; }, 0);
  };

  return (
    <section className={w.wrap} aria-label={label}>
      <div className={w.head}>
        <span className={w.kicker}>What to look at</span>
        <span className={w.count}><b>{idx + 1}</b> / {N}</span>
        <span className={w.ptrack} aria-hidden="true">
          {mo.mounted && !mo.reduced && (
            <span key={idx} className={w.prog} style={{ animationDuration: `${DWELL_MS}ms`, animationPlayState: mo.running && !touch && !dragging ? 'running' : 'paused' }} onAnimationEnd={advance} />
          )}
        </span>
        <span className={w.ctls}>
          <StepButton dir="prev" onClick={() => go(idx - 1)} label="Previous card" />
          <PauseButton paused={mo.userPaused} onToggle={mo.toggle} held={mo.held} reduced={mo.reduced} compact />
          <StepButton dir="next" onClick={() => go(idx + 1)} label="Next card" />
          <EventList items={items} label="All" />
        </span>
      </div>
      <div
        ref={vp}
        className={`${w.vp} ${dragging ? w.dragging : ''}`}
        tabIndex={0}
        role="group"
        aria-label={`${label}: use the left and right arrow keys to move`}
        onKeyDown={onKey}
        {...mo.hold}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } }}
        onTouchEnd={() => window.setTimeout(() => setTouch(false), 4000)}
      >
        <ol className={w.row}>
          {items.map((it) => (
            <li key={it.id} data-card className={`${w.card} ${it.hot ? w.hotCard : ''}`}>
              <div className={w.meta}><Tag item={it} /><time className={w.when} dateTime={it.date}>{it.when === 'Now' ? 'Right now' : it.when}</time></div>
              <Link href={it.href} className={w.title} draggable={false}>{it.label}</Link>
              <div className={w.vals}>
                {it.value && <b className={w.value}>{it.value}</b>}
                <DeltaText d={it.delta} />
              </div>
              {it.progress != null && <Mini value={it.progress} wide />}
              <p className={w.text}>{it.text}</p>
              <span className={w.go} aria-hidden="true">{it.hrefLabel} →</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
