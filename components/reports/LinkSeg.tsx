import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export type LinkOpt = { key: string; label: string; href: string; disabled?: boolean };

/** A segmented control whose options are links to the same page with one param changed (replace, no scroll jump).
 *  The server renders the chosen state, so a permalink opens on it. Options without data are disabled buttons. */
export function LinkSeg({ labelledBy, options, active }: { labelledBy: string; options: LinkOpt[]; active: string }) {
  return (
    <div className="seg" role="group" aria-labelledby={labelledBy}>
      {options.map((o) => (o.disabled && o.key !== active
        ? <button key={o.key} type="button" disabled title="Not available yet">{o.label}</button>
        : <Link key={o.key} href={o.href} replace scroll={false} aria-current={o.key === active ? 'true' : undefined}>{o.label}</Link>))}
    </div>
  );
}

/** One line under a filter bar when the link asked for a view this page can't show; says what is shown instead. */
export function ParamNote({ children }: { children: ReactNode }) {
  return <p className="small" role="status"><Icon name="info" size={13} /> {children}</p>;
}
