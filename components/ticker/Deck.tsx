'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { TickerItem } from '@/lib/data/ticker';
import { useMotion } from './useMotion';
import { DeltaText, EventList, Mini, PauseButton, StepButton, Tag } from './parts';
import d from './Deck.module.css';

const DWELL_MS = 5000;

/**
 * Sample 2 — a deck of event cards. One card at a time; the next two sit behind it for depth. Auto-advances every 5 s
 * (the progress line under the deck IS the timer, so pausing it pauses the deck exactly). Swipe on touch.
 */
export function Deck({ items, label = 'Zcash event deck', inset = false }: { items: TickerItem[]; label?: string; inset?: boolean }) {
  const mo = useMotion();
  const [i, setI] = useState(0);
  const N = items.length;
  const go = (step: number) => setI((x) => (x + step + N) % N);
  const sx = useRef<number | null>(null);
  const swiped = useRef(false);
  const next = [1, 2, 3].map((k) => items[(i + k) % N]);

  return (
    <section className={`${d.wrap} ${inset ? d.inset : ''}`} aria-label={label}>
      <div className={d.main}>
        <div
          className={d.stage}
          {...mo.hold}
          onPointerDown={(e) => { sx.current = e.clientX; swiped.current = false; }}
          onPointerUp={(e) => { if (sx.current != null && Math.abs(e.clientX - sx.current) > 40) { swiped.current = true; go(e.clientX < sx.current ? 1 : -1); } sx.current = null; }}
          onClickCapture={(e) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } }}
        >
          {items.map((it, k) => {
            const p = (k - i + N) % N;
            const pos = p === 0 ? d.front : p === 1 ? d.back1 : p === 2 ? d.back2 : p === N - 1 ? d.gone : d.hidden;
            return (
              <article key={it.id} className={`${d.card} ${pos}`} aria-hidden={p !== 0} inert={p !== 0}>
                <div className={d.meta}>
                  <Tag item={it} />
                  {it.severity === 'major' && !it.hot && <span className={d.major}>Major</span>}
                  <time className={d.when} dateTime={it.date}>{it.when === 'Now' ? 'Right now' : it.when}</time>
                </div>
                <h3 className={d.title}><Link href={it.href}>{it.text}</Link></h3>
                <div className={d.foot}>
                  {it.value && <b className={d.value}>{it.value}</b>}
                  {it.progress != null && <span className={d.bar}><Mini value={it.progress} wide /></span>}
                  <DeltaText d={it.delta} />
                  <span className={d.links}>
                    {it.newsHref && <Link href={it.newsHref} className={d.sub}>In the feed</Link>}
                    <Link href={it.href} className={d.go}>{it.hrefLabel} →</Link>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
        <div className={d.ctrls}>
          <span className={d.count}><b>{i + 1}</b> / {N}</span>
          <span className={d.track} aria-hidden="true">
            {mo.mounted && !mo.reduced && (
              <span key={i} className={d.prog} style={{ animationDuration: `${DWELL_MS}ms`, animationPlayState: mo.running ? 'running' : 'paused' }} onAnimationEnd={() => go(1)} />
            )}
          </span>
          <StepButton dir="prev" onClick={() => go(-1)} label="Previous event" />
          <PauseButton paused={mo.userPaused} onToggle={mo.toggle} held={mo.held} reduced={mo.reduced} />
          <StepButton dir="next" onClick={() => go(1)} label="Next event" />
          <EventList items={items} label="All" />
        </div>
      </div>
      {!inset && <aside className={d.queue} aria-label="Up next">
        <h4 className={d.qh}>Up next</h4>
        <ol>
          {next.map((it, k) => (
            <li key={it.id}>
              <button type="button" className={d.qi} onClick={() => go(k + 1)}>
                <Tag item={it} />
                <span className={d.ql}>{it.label}</span>
                {it.value && <b className={d.qv}>{it.value}</b>}
              </button>
            </li>
          ))}
        </ol>
      </aside>}
    </section>
  );
}
