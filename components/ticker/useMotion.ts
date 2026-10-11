'use client';

import { useEffect, useState, type FocusEvent } from 'react';

/**
 * Shared motion state for every ticker sample.
 * - `reduced`: the visitor prefers reduced motion → nothing moves by itself; only manual controls work.
 * - `userPaused`: the visible Pause/Play button (WCAG 2.2.2).
 * - `held`: pointer over, or keyboard focus inside, the moving area (pauses without changing the button).
 * Bind `hold` to the MOVING area only, not to the controls, so pressing Play while focused on the button resumes.
 */
export function useMotion() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
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
    userPaused,
    held: hover || focus,
    running: mounted && !reduced && !userPaused && !hover && !focus,
    toggle: () => setUserPaused((p) => !p),
    hold,
  };
}
