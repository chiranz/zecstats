'use client';

import { useEffect, useState } from 'react';

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
