'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { TickerItem, TickerTopic } from '@/lib/data/ticker';
import { useMotion } from './useMotion';
import { DeltaText, EventList, InlineItem, PauseButton, StepButton } from './parts';
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

/* ───────────────────────── Sample 1 — single-row tape ───────────────────────── */

export function Marquee({ items, label = 'Zcash events ticker', speed = 42 }: { items: TickerItem[]; label?: string; speed?: number }) {
  const mo = useMotion();
  const th = useTouchHold();
  const tape = useTape(mo.running && !th.touch, speed);
  const manual = mo.reduced || mo.userPaused;
  return (
    <section className={m.strip} aria-label={label}>
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
    </section>
  );
}

/* ───────────────────────── Sample 2 — two-row tape ─────────────────────────
 * Top row: market quotes, faster (a stock tape). Bottom row: on-chain events, slower, with dates. One Pause for both. */

function QuoteItem({ it, tabIndex }: { it: TickerItem; tabIndex?: number }) {
  return (
    <Link href={it.href} className={`${m.quote} ${it.hot ? m.quoteHot : ''}`} tabIndex={tabIndex}>
      <span className={m.sym}>{it.sym}</span>
      {it.value && <b className={m.qv}>{it.value}</b>}
      <DeltaText d={it.delta} />
    </Link>
  );
}

export function TwoRowTape({ quotes, events, label = 'Zcash markets and on-chain events tape' }: { quotes: TickerItem[]; events: TickerItem[]; label?: string }) {
  const mo = useMotion();
  const th = useTouchHold();
  const run = mo.running && !th.touch;
  const top = useTape(run, 56);
  const bottom = useTape(run, 30);
  const manual = mo.reduced || mo.userPaused;
  return (
    <section className={m.two} aria-label={label}>
      <div className={m.row}>
        <span className={m.rowLead} aria-hidden="true">Markets</span>
        <TapeViewport tape={top} reduced={mo.reduced} hold={mo.hold} touch={th.bind}>
          {(copy) => quotes.map((it) => <li key={it.id}><QuoteItem it={it} tabIndex={copy ? -1 : undefined} /></li>)}
        </TapeViewport>
        <div className={m.ctls}>
          {manual && <StepButton dir="prev" onClick={() => { pageBy(top.vp.current, -1, mo.reduced); pageBy(bottom.vp.current, -1, mo.reduced); }} label="Scroll both rows back" />}
          {manual && <StepButton dir="next" onClick={() => { pageBy(top.vp.current, 1, mo.reduced); pageBy(bottom.vp.current, 1, mo.reduced); }} label="Scroll both rows forward" />}
          <PauseButton paused={mo.userPaused} onToggle={mo.toggle} held={mo.held} reduced={mo.reduced} compact />
          <EventList items={[...quotes, ...events]} label="All" />
        </div>
      </div>
      <div className={`${m.row} ${m.rowSlow}`}>
        <span className={m.rowLead} aria-hidden="true">On-chain</span>
        <TapeViewport tape={bottom} reduced={mo.reduced} hold={mo.hold} touch={th.bind}>
          {(copy) => events.map((it) => <li key={it.id}><InlineItem it={it} tabIndex={copy ? -1 : undefined} /></li>)}
        </TapeViewport>
      </div>
    </section>
  );
}

/* ───────────────────────── Sample 3 — exchange tape ─────────────────────────
 * Pinned LIVE badge, stock-style symbols, category separators in the stream, and a detail line that shows the
 * pointed-at (or focused) item's full sentence with its link — the tape pauses while you read it. */

const CAT: Record<TickerTopic, string> = { ironwood: 'Ironwood', price: 'Price', markets: 'Markets', privacy: 'Privacy', network: 'Network' };
const CAT_ORDER: TickerTopic[] = ['ironwood', 'price', 'markets', 'privacy', 'network'];

export function ExchangeTape({ items, label = 'Zcash exchange-style tape' }: { items: TickerItem[]; label?: string }) {
  const mo = useMotion();
  const th = useTouchHold();
  const tape = useTape(mo.running && !th.touch, 48);
  const [peek, setPeek] = useState<TickerItem | null>(null);
  const groups = CAT_ORDER.map((k) => ({ k, items: items.filter((i) => i.topic === k) })).filter((g) => g.items.length);
  const manual = mo.reduced || mo.userPaused;

  const row = (copy: 0 | 1) => groups.map((g) => (
    <Fragment key={g.k}>
      <li className={m.cat} aria-hidden="true"><span>{CAT[g.k]}</span></li>
      {g.items.map((it) => (
        <li key={it.id}>
          <Link
            href={it.href}
            className={`${m.quote} ${it.hot ? m.quoteHot : ''} ${peek?.id === it.id ? m.peeked : ''}`}
            tabIndex={copy ? -1 : undefined}
            onMouseEnter={() => setPeek(it)}
            onFocus={() => setPeek(it)}
            aria-label={`${CAT[g.k]}: ${it.label}${it.value ? ` ${it.value}` : ''}${it.delta ? `, ${it.delta.text}` : ''}`}
          >
            <span className={m.sym}>{it.sym}</span>
            {it.value && <b className={m.qv}>{it.value}</b>}
            <DeltaText d={it.delta} />
          </Link>
        </li>
      ))}
    </Fragment>
  ));

  return (
    <section className={m.exch} aria-label={label} onMouseLeave={() => setPeek(null)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPeek(null); }}>
      <div className={m.exRow}>
        <span className={m.liveBadge}><i aria-hidden="true" />Live</span>
        <TapeViewport tape={tape} reduced={mo.reduced} hold={mo.hold} touch={th.bind} className={m.exVp}>{row}</TapeViewport>
        <div className={m.ctls}>
          {manual && <StepButton dir="prev" onClick={() => pageBy(tape.vp.current, -1, mo.reduced)} label="Scroll tape back" />}
          {manual && <StepButton dir="next" onClick={() => pageBy(tape.vp.current, 1, mo.reduced)} label="Scroll tape forward" />}
          <PauseButton paused={mo.userPaused} onToggle={mo.toggle} held={mo.held} reduced={mo.reduced} compact />
          <EventList items={items} label="All" />
        </div>
      </div>
      <p className={`${m.detail} ${peek ? m.detailOn : ''}`} aria-hidden="true">
        {peek ? <><span className={m.dSym}>{peek.sym}</span><span className={m.dText}>{peek.text}</span><span className={m.dGo}>{peek.hrefLabel} →</span></> : <span className={m.dHint}>Point at or tab to an item to read it; click to open its page.</span>}
      </p>
    </section>
  );
}
