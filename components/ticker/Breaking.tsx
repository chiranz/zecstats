'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { TickerItem } from '@/lib/data/ticker';
import { DeltaText } from './parts';
import b from './Breaking.module.css';

const KEY = 'zec-ticker-dismissed';
const hm = (ts: number) => new Date(ts * 1000).toISOString().slice(11, 16);
const dm = (ts: number) => { const d = new Date(ts * 1000); return `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };

/**
 * Sample 6 — a "breaking" banner for ONE major event, with an expiry. Nothing moves, so there is nothing to pause.
 * It disappears by itself 48 h after the event (refTs = the snapshot time) or when dismissed (remembered per tab).
 */
export function Breaking({ item, refTs }: { item: TickerItem & { expiresTs: number; postedTs: number }; refTs: number }) {
  const [gone, setGone] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem(KEY) === item.id) setGone(true); } catch { /* storage blocked: show it */ } }, [item.id]);
  const dismiss = (v: boolean) => { setGone(v); try { if (v) sessionStorage.setItem(KEY, item.id); else sessionStorage.removeItem(KEY); } catch { /* ignore */ } };
  if (refTs >= item.expiresTs) return null;
  const left = Math.max(0, Math.min(1, (item.expiresTs - refTs) / (item.expiresTs - item.postedTs)));
  const hoursLeft = Math.round((item.expiresTs - refTs) / 3600);

  if (gone) {
    return (
      <div className={b.undo}>
        <span>Alert hidden.</span>
        <button type="button" className={b.linkBtn} onClick={() => dismiss(false)}>Show it again</button>
      </div>
    );
  }
  return (
    <section className={b.banner} aria-label="Major event">
      <span className={b.badge}>Major</span>
      <div className={b.body}>
        <p className={b.head}>
          <Link href={item.href}>{item.label}{item.value ? <>: <b>{item.value}</b></> : null}</Link>
          <DeltaText d={item.delta} />
        </p>
        <p className={b.sub}>{item.body ?? item.text} <span className={b.meta}>Posted {dm(item.postedTs)}, {hm(item.postedTs)} UTC · shows for {hoursLeft} h more</span></p>
      </div>
      <span className={b.life} role="img" aria-label={`${hoursLeft} hours left before this alert expires`}><i style={{ width: `${left * 100}%` }} /></span>
      <Link href={item.href} className={b.go}>{item.hrefLabel} →</Link>
      <button type="button" className={b.x} onClick={() => dismiss(true)} aria-label="Dismiss this alert">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </section>
  );
}
