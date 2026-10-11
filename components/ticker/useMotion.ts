'use client';

import { useEffect, useState, type FocusEvent } from 'react';

/**
 * Motion state for the event tape.
 * - `reduced`: the visitor prefers reduced motion → nothing moves by itself; the step buttons move it instead.
 * - `hold`: pointer over, or keyboard focus inside, the moving area holds the tape still.
 */
export function useMotion() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    setMounted(true);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const hold = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setFocus(true),
    onBlur: (e: FocusEvent<HTMLElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false); },
  };

  return {
    mounted,
    reduced,
    running: mounted && !reduced && !hover && !focus,
    hold,
  };
}
