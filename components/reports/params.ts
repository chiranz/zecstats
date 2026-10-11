// URL-state helpers for the report pages. Pages read their params on the server (so a permalink renders its state on
// first load) and controls write them back with the live site's param names. Reading is forgiving: a bad value is the
// default, never an error.

import { isIsoDate } from '@/components/charts/range';

export type SearchParams = Record<string, string | string[] | undefined>;

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** `v` if it is one of `allowed`, else `fallback`. */
export function pick<T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T {
  return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** A real calendar day written YYYY-MM-DD, or null. */
export const isoDay = (v: string | undefined): string | null => (isIsoDate(v) ? v : null);

/** `path?…` with the current params, `patch` applied (null removes a key). */
export function hrefWith(path: string, sp: SearchParams, patch: Record<string, string | number | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) { const x = one(v); if (x != null && !(k in patch)) q.set(k, x); }
  for (const [k, v] of Object.entries(patch)) if (v != null) q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** Client only: merge `patch` into the address bar without a history entry or a server round trip. */
export function setQuery(patch: Record<string, string | number | null>) {
  const q = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) { if (v == null) q.delete(k); else q.set(k, String(v)); }
  const s = q.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${s ? `?${s}` : ''}`);
}

/** zecstats-<slug>-<today>.csv, the live site's export name. */
export const csvName = (slug: string) => `zecstats-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
