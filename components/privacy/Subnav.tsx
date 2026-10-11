'use client';

import { useEffect, useState } from 'react';
import s from './Subnav.module.css';

/** Id of the first watched element currently in the reading band (sticky header excluded). */
export function useScrollSpy(ids: string[], rootMargin: string) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(' ');
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin });
    key.split(' ').forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [key, rootMargin]);
  return [active, setActive] as const;
}

/** Sticky "on this page" jump links; the section in view is marked current. */
export function Subnav({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useScrollSpy(items.map((i) => i.id), '-120px 0px -55% 0px');
  return (
    <nav className={s.subnav} aria-label={label}>
      <ul>
        {items.map((i) => (
          <li key={i.id}><a href={`#${i.id}`} aria-current={active === i.id ? 'true' : undefined} onClick={() => setActive(i.id)}>{i.label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
