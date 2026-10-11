'use client';

import { useEffect, useSyncExternalStore } from 'react';

// The page's own update cadence ("daily close", "every block"…), shown in the status popover.
// Set by the page header (Masthead) and cleared when the page unmounts.
let current: string | null = null;
const subs = new Set<() => void>();
const set = (v: string | null) => { current = v; subs.forEach((f) => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const usePageCadence = () => useSyncExternalStore(subscribe, () => current, () => null);

export function PageCadence({ value }: { value: string }) {
  useEffect(() => { set(value); return () => set(null); }, [value]);
  return null;
}
