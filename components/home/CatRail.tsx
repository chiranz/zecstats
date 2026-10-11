'use client';

import { useScrollSpy } from '@/components/privacy/Subnav';

/** Sticky category rail for the chart index; marks the group in view. Classes come from the page's CSS Module. */
export function CatRail({ groups, className, itemClass }: { groups: { id: string; title: string; count: number }[]; className: string; itemClass: string }) {
  const [active, setActive] = useScrollSpy(groups.map((g) => `g-${g.id}`), '-140px 0px -50% 0px');
  return (
    <nav className={className} aria-label="Chart categories">
      <h3>Categories</h3>
      {groups.map((g) => (
        <a key={g.id} className={itemClass} href={`#g-${g.id}`} aria-current={active === `g-${g.id}` ? 'true' : undefined} onClick={() => setActive(`g-${g.id}`)}>
          {g.title}<span>{g.count}</span>
        </a>
      ))}
    </nav>
  );
}
