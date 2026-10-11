'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { TickerItem } from '@/lib/data/ticker';
import { useMotion } from './useMotion';
import { EventList, InlineItem, PauseButton, StepButton } from './parts';
import m from './Marquee.module.css';

/* ───────────────────────── the tape engine ─────────────────────────
 * Every tape is a real horizontal scroller. The loop advances scrollLeft (not a CSS transform), so a keyboard-focused
 * link scrolls itself into view and touch users can swipe the tape. The second copy of the list exists only to make
 * the loop seamless: aria-hidden, its links out of the tab order, and removed under reduced motion. */

function useTape(running: boolean, speed: number) {
  const vp = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLUListElement>(null);
  const b = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!running) return;
    const el = vp.current, A = a.current, B = b.current;
    if (!el || !A || !B) return;
    let pos = el.scrollLeft;
    let t0 = performance.now();
    let raf = requestAnimationFrame(function step(t) {
      const loop = B.offsetLeft - A.offsetLeft; // one copy plus its trailing gap
      pos += (speed * Math.min(64, t - t0)) / 1000;
      t0 = t;
      if (loop > 0 && pos >= loop) pos -= loop;
      el.scrollLeft = pos;
      raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);
  return { vp, a, b };
}

/** Touch pauses the tape until 2.5 s after the finger lifts. */
function useTouchHold() {
  const [touch, setTouch] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const release = () => { timer.current = window.setTimeout(() => setTouch(false), 2500); };
  return {
    touch,
    bind: {
      onPointerDown: (e: { pointerType: string }) => { if (e.pointerType !== 'mouse') { window.clearTimeout(timer.current); setTouch(true); } },
      onPointerUp: release,
      onPointerCancel: release,
    },
  };
}

type TapeRow = ReturnType<typeof useTape>;

function TapeViewport({ tape, reduced, hold, touch, className, children }: { tape: TapeRow; reduced: boolean; hold: object; touch: object; className?: string; children: (copy: 0 | 1) => ReactNode }) {
  return (
    <div
      className={`${m.vp} ${className ?? ''}`} ref={tape.vp as RefObject<HTMLDivElement>} {...hold} {...touch}
      // a link that receives focus half-hidden behind the edge fade is brought fully into view
      onFocusCapture={(e) => (e.target as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' })}
    >
      <ul className={m.track} ref={tape.a as RefObject<HTMLUListElement>}>{children(0)}</ul>
      <ul className={m.track} ref={tape.b as RefObject<HTMLUListElement>} aria-hidden="true" hidden={reduced}>{children(1)}</ul>
    </div>
  );
}

const pageBy = (el: HTMLDivElement | null, dir: 1 | -1, reduced: boolean) => el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });

/* ───────────────────────── the site-wide tape (under the top bar on every page) ───────────────────────── */

export function Marquee({ items, label = 'Zcash events ticker', speed = 42 }: { items: TickerItem[]; label?: string; speed?: number }) {
  const mo = useMotion();
  const th = useTouchHold();
  const tape = useTape(mo.running && !th.touch, speed);
  const manual = mo.reduced || mo.userPaused;
  return (
    <section className={m.strip} aria-label={label}>
      <div className={m.inner}>
        <span className={m.lead} aria-hidden="true">Events</span>
        <TapeViewport tape={tape} reduced={mo.reduced} hold={mo.hold} touch={th.bind}>
          {(copy) => items.map((it) => <li key={it.id}><InlineItem it={it} tabIndex={copy ? -1 : undefined} /></li>)}
        </TapeViewport>
        <div className={m.ctls}>
          {manual && <StepButton dir="prev" onClick={() => pageBy(tape.vp.current, -1, mo.reduced)} label="Scroll events back" />}
          {manual && <StepButton dir="next" onClick={() => pageBy(tape.vp.current, 1, mo.reduced)} label="Scroll events forward" />}
          <PauseButton paused={mo.userPaused} onToggle={mo.toggle} held={mo.held} reduced={mo.reduced} compact />
          <EventList items={items} label="All" />
        </div>
      </div>
    </section>
  );
}
