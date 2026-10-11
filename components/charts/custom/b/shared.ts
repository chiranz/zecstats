'use client';

import { useEffect, useRef, useState } from 'react';

/** Width of a container, tracked with ResizeObserver (first paint assumes `initial`). */
export function useWidth<T extends HTMLElement>(initial = 900) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const longDate = (d: string) => { const x = new Date(`${d}T00:00:00Z`); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };

/** Electrical power given in GW → "60 MW", "1.2 GW". */
export function power(gw: number): string {
  if (!Number.isFinite(gw)) return '—';
  if (gw >= 1) return `${+gw.toPrecision(3)} GW`;
  if (gw >= 1e-3) return `${+(gw * 1e3).toPrecision(3)} MW`;
  if (gw >= 1e-6) return `${+(gw * 1e6).toPrecision(3)} kW`;
  if (gw >= 1e-9) return `${+(gw * 1e9).toPrecision(3)} W`;
  return `${+(gw * 1e12).toPrecision(3)} mW`;
}

/** Round SVG coordinates so server and browser maths (log/pow differ in the last bit) hydrate identically. */
export const r2 = (v: number) => Math.round(v * 100) / 100;
