'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** A value the page can't show is listed but disabled; `off` says why (shown as the button's title). */
export type ParamOption = { value: string; label: string; off?: string };

/** Segmented control bound to one URL param (the live page's names). The server renders the chosen view, so a click
 *  replaces the URL in place — no history entry, no scroll — and the button shows the new choice while it loads. */
export function ParamSeg({ param, value, options, labelledBy, describedBy }: { param: string; value: string; options: ParamOption[]; labelledBy: string; describedBy?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState(value);
  const shown = pending ? picked : value;
  const pick = (v: string) => {
    if (v === shown) return;
    setPicked(v);
    const u = new URLSearchParams(window.location.search);
    u.set(param, v);
    start(() => router.replace(`${pathname}?${u}`, { scroll: false }));
  };
  return (
    <div className="seg" role="group" aria-labelledby={labelledBy} aria-busy={pending || undefined}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={shown === o.value} disabled={!!o.off} title={o.off} aria-describedby={o.off ? describedBy : undefined} onClick={() => pick(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Replace one URL param in place (for client components that keep their own state, e.g. the table's view). */
export function useParamWriter() {
  const router = useRouter();
  const pathname = usePathname();
  const [, start] = useTransition();
  return (param: string, v: string) => {
    const u = new URLSearchParams(window.location.search);
    u.set(param, v);
    start(() => router.replace(`${pathname}?${u}`, { scroll: false }));
  };
}
