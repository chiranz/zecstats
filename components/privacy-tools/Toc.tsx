'use client';

import { useEffect, useState } from 'react';
import s from './ui.module.css';

/** "On this page" rail; marks the section in view (sticky on desktop, a scrolling tab row under 900px). */
export function Toc({ items }: { items: { id: string; n: string; label: string }[] }) {
  const [cur, setCur] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setCur(vis[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav className={s.toc} aria-label="On this page">
      <span className="kicker">On this page</span>
      <ol>
        {items.map((i) => (
          <li key={i.id}><a href={`#${i.id}`} aria-current={cur === i.id ? 'true' : undefined}><span>{i.n}</span>{i.label}</a></li>
        ))}
      </ol>
    </nav>
  );
}
