'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RouteSkeleton } from './RouteSkeleton';
import { shapeFor } from './shape';

/**
 * Shows the destination's loading skeleton while a client navigation to another page is on its way. Not a loading.tsx:
 * a route-level Suspense boundary also wraps every direct page load, and React holds a streamed boundary's reveal back
 * (to ~2.3 s), which delayed the first paint of every page. Here direct loads render as plain HTML; only clicks show it.
 *
 * Starts on a left click on a same-site link to another page (or `startNavigation` from code, e.g. search), appears only
 * if the page hasn't landed within SHOW_AFTER (prefetched pages never flash it), and ends when the pathname changes.
 */
const SHOW_AFTER = 120;
const GIVE_UP = 15000;
const EVENT = 'zec:navigate';

/** For navigations made in code (router.push) rather than by a link. */
export const startNavigation = (href: string) => window.dispatchEvent(new CustomEvent(EVENT, { detail: href }));

/** The pathname a click or call will open, or null when it stays on this page, leaves the site or isn't a page. */
function destination(href: string): string | null {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return null;
  if (url.pathname.startsWith('/api/') || /\.[a-z0-9]+$/i.test(url.pathname)) return null;
  return url.pathname;
}

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement) || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
      setTarget(destination(a.href));
    };
    const onCall = (e: Event) => setTarget(destination((e as CustomEvent<string>).detail));
    const onPop = () => setTarget(null);
    // capture: next/link cancels the default action in its own (earlier) handler, so a bubbling listener would see every
    // link click as already handled
    document.addEventListener('click', onClick, true);
    window.addEventListener(EVENT, onCall);
    window.addEventListener('popstate', onPop);
    return () => { document.removeEventListener('click', onClick, true); window.removeEventListener(EVENT, onCall); window.removeEventListener('popstate', onPop); };
  }, []);

  // the new page has landed
  useEffect(() => { setTarget(null); }, [pathname]);

  useEffect(() => {
    setShow(false);
    if (!target) return;
    const t = window.setTimeout(() => { setShow(true); window.scrollTo(0, 0); }, SHOW_AFTER);
    const stop = window.setTimeout(() => setTarget(null), GIVE_UP);
    return () => { window.clearTimeout(t); window.clearTimeout(stop); };
  }, [target]);

  const loading = show && target != null;
  return (
    <>
      {loading && <RouteSkeleton shape={shapeFor(target)} />}
      <div style={{ display: loading ? 'none' : 'contents' }}>{children}</div>
    </>
  );
}
