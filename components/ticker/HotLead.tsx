'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TickerItem } from '@/lib/data/ticker';
import { useMotion } from './useMotion';
import { DeltaText, EventList, Mini, PauseButton, StepButton, Tag } from './parts';
import h from './HotLead.module.css';

const DWELL_MS = 4500;

/**
 * Sample 3 — a pinned "hot" lead that never moves (the Ironwood migration with its progress bar) and, beside it, one
 * slot that rolls the other events upward one at a time.
 */
export function HotLead({ hot, items, label = 'Hot topic and latest events', stacked = false }: { hot: TickerItem; items: TickerItem[]; label?: string; stacked?: boolean }) {
  const mo = useMotion();
  const rest = items.filter((x) => x.id !== hot.id);
  const N = rest.length;
  const [i, setI] = useState(0);
  const go = (step: number) => setI((x) => (x + step + N) % N);
  const it = rest[i];

  return (
    <section className={`${h.bar} ${stacked ? h.stacked : ''}`} aria-label={label}>
      <Link href={hot.href} className={h.pin}>
        <span className={h.hotTag}>Hot</span>
        <span className={h.pinBody}>
          <span className={h.pinTop}>
            <span className={h.pinLabel}>{hot.label}</span>
            <b className={h.pinValue}>{hot.value}</b>
          </span>
          <span className={h.pinBar}><Mini value={hot.progress ?? 0} wide /></span>
        </span>
        <span className={h.pinDelta}><DeltaText d={hot.delta} /></span>
      </Link>

      <div className={h.roll}>
        <span className={h.rollLead} aria-hidden="true">Latest</span>
        <div className={h.slot} {...mo.hold}>
          <Link key={it.id} href={it.href} className={`${h.item} ${mo.mounted && !mo.reduced ? h.enter : ''}`}>
            <Tag item={it} />
            <span className={h.text}>{it.label}</span>
            {it.value && <b className={h.value}>{it.value}</b>}
            <DeltaText d={it.delta} />
            {it.when !== 'Now' && <time className={h.when} dateTime={it.date}>{it.when}</time>}
          </Link>
          <span className={h.track} aria-hidden="true">
            {mo.mounted && !mo.reduced && (
              <span key={i} className={h.prog} style={{ animationDuration: `${DWELL_MS}ms`, animationPlayState: mo.running ? 'running' : 'paused' }} onAnimationEnd={() => go(1)} />
            )}
          </span>
        </div>
        <div className={h.ctls}>
          <span className={h.count}>{i + 1}/{N}</span>
          <StepButton dir="prev" onClick={() => go(-1)} label="Previous event" />
          <PauseButton paused={mo.userPaused} onToggle={mo.toggle} held={mo.held} reduced={mo.reduced} compact />
          <StepButton dir="next" onClick={() => go(1)} label="Next event" />
          <EventList items={items} label="All" />
        </div>
      </div>
    </section>
  );
}
