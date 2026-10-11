'use client';

import Link from 'next/link';
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { TickerItem, TickerTopicGroup } from '@/lib/data/ticker';
import { useMotion } from './useMotion';
import { DeltaText, EventList, Mini, PauseButton, StepButton, Tag } from './parts';
import t from './TopicTiers.module.css';

const DWELL_MS = 3800;

/**
 * Sample 4 — nested two-tier header. Tier 1: topic tabs. Tier 2: that topic's events, rolling left one card at a time.
 * After a topic's last event the next topic takes over, so the header walks the whole site's news in a loop.
 */
export function TopicTiers({ topics, all, label = 'Zcash events by topic' }: { topics: TickerTopicGroup[]; all: TickerItem[]; label?: string }) {
  const mo = useMotion();
  const groups = topics.filter((g) => g.items.length);
  const [ti, setTi] = useState(0);
  const [i, setI] = useState(0);
  const g = groups[ti];
  const vp = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [x, setX] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const panelId = `${uid}-panel`;

  // translate the track so the active card sits at the left edge (never past the last card's end)
  useLayoutEffect(() => {
    const tr = track.current, v = vp.current;
    if (!tr || !v) return;
    const cards = Array.from(tr.children) as HTMLElement[];
    if (!cards.length) return;
    const first = cards[0], last = cards.at(-1)!, el = cards[Math.min(i, cards.length - 1)];
    const cs = getComputedStyle(v);
    const visible = v.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const extent = last.offsetLeft + last.offsetWidth - first.offsetLeft;
    setX(Math.max(0, Math.min(el.offsetLeft - first.offsetLeft, extent - visible)));
    v.scrollLeft = 0;
  }, [i, ti]);

  const step = (d: number) => {
    const n = g.items.length;
    if (i + d >= n) { setTi((k) => (k + 1) % groups.length); setI(0); }
    else if (i + d < 0) { const pk = (ti - 1 + groups.length) % groups.length; setTi(pk); setI(groups[pk].items.length - 1); }
    else setI(i + d);
  };
  const pick = (k: number) => { setTi(k); setI(0); };
  const onTabKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const k = (ti + d + groups.length) % groups.length;
    pick(k);
    tabs.current[k]?.focus();
  };

  return (
    <section className={t.wrap} aria-label={label}>
      <div className={t.tier1}>
        <div className={t.tabs} role="tablist" aria-label="Topics" onKeyDown={onTabKey}>
          {groups.map((gr, k) => (
            <button
              key={gr.key} ref={(el) => { tabs.current[k] = el; }}
              type="button" role="tab" id={`${uid}-tab-${gr.key}`} aria-selected={k === ti} aria-controls={panelId} tabIndex={k === ti ? 0 : -1}
              className={`${t.tab} ${k === ti ? t.on : ''}`} onClick={() => pick(k)}
            >
              {gr.label}<span className={t.n}>{gr.items.length}</span>
              {k === ti && <span className={t.under} aria-hidden="true"><i style={{ width: `${((i + 1) / gr.items.length) * 100}%` }} /></span>}
            </button>
          ))}
        </div>
        <div className={t.ctls}>
          <StepButton dir="prev" onClick={() => step(-1)} label="Previous event" />
          <PauseButton paused={mo.userPaused} onToggle={mo.toggle} held={mo.held} reduced={mo.reduced} compact />
          <StepButton dir="next" onClick={() => step(1)} label="Next event" />
          <EventList items={all} label="All" />
        </div>
      </div>
      <div className={t.tier2} id={panelId} role="tabpanel" aria-labelledby={`${uid}-tab-${g.key}`} {...mo.hold}>
        <div className={t.vp} ref={vp}>
          <ol className={t.track} ref={track} style={{ transform: `translateX(${-x}px)` }}>
            {g.items.map((it, k) => (
              <li key={it.id} className={`${t.card} ${k === i ? t.active : ''}`}>
                <Link href={it.href} className={t.link} onFocus={() => setI(k)}>
                  <span className={t.top}><Tag item={it} /><time className={t.when} dateTime={it.date}>{it.when}</time></span>
                  <span className={t.label}>{it.label}</span>
                  <span className={t.vals}>
                    {it.value && <b className={t.value}>{it.value}</b>}
                    {it.progress != null && <Mini value={it.progress} />}
                    <DeltaText d={it.delta} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <span className={t.ptrack} aria-hidden="true">
          {mo.mounted && !mo.reduced && (
            <span key={`${ti}-${i}`} className={t.prog} style={{ animationDuration: `${DWELL_MS}ms`, animationPlayState: mo.running ? 'running' : 'paused' }} onAnimationEnd={() => step(1)} />
          )}
        </span>
      </div>
    </section>
  );
}
