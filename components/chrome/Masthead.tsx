import type { ReactNode } from 'react';
import { delta, type Good } from '@/lib/format';
import { PageCadence } from './cadence';

/**
 * Key figure beside the H1. `change` (preferred) formats the delta with lib/format `delta()`: arrow = direction, colour =
 * good/bad per `good`, flat when it rounds to 0. The older `delta` + `dir` pair still works: 'flat' (or no dir) is muted,
 * and `good` decides whether 'up' is green. `label` is what a screen reader hears for the whole figure.
 */
export type KeyFigure = {
  value: ReactNode;
  change?: { v: number; digits?: number; suffix?: string; good?: Good; after?: string };
  delta?: ReactNode;
  dir?: 'up' | 'dn' | 'flat';
  good?: Good;
  label: string;
};

function figDelta(f: KeyFigure): { text: ReactNode; cls: 'up' | 'dn' | 'muted' } | null {
  if (f.change) {
    const d = delta(f.change.v, f.change.digits ?? 1, f.change.suffix ?? '%', f.change.good ?? f.good);
    return { text: `${d.text}${f.change.after ? ` ${f.change.after}` : ''}`, cls: d.cls };
  }
  if (!f.delta) return null;
  const g = f.good ?? 'up';
  const cls = !f.dir || f.dir === 'flat' || g === 'neutral' ? 'muted' : (f.dir === 'up') === (g === 'up') ? 'up' : 'dn';
  return { text: f.delta, cls };
}

/**
 * Page header (navigation direction D, "answer first"): the H1 and the one-sentence answer. Where the page sits is
 * said by the context bar, and freshness by the status pill, so neither repeats here. Single-number pages (charts)
 * add the key figure on the right; phones hide it because the sentence already carries the number.
 * `cadence` is this page's own update rhythm when it differs from the site's daily update; the status popover shows it.
 */
export function Masthead({ title, lede, children, figure, cadence }: { title: ReactNode; lede?: ReactNode; children?: ReactNode; figure?: KeyFigure; cadence?: string }) {
  const d = figure && figDelta(figure);
  return (
    <header className={`mast${figure ? ' with-fig' : ''}`}>
      {cadence && <PageCadence value={cadence} />}
      <div className="mast-t">
        <h1 className="h1">{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
      {figure && (
        <p className="mast-fig">
          <span className="sr-only">{figure.label}</span>
          <span className="mast-fv" aria-hidden="true">{figure.value}</span>
          {d && <span className={`delta${d.cls === 'dn' ? ' dn' : d.cls === 'muted' ? ' flat' : ''}`} aria-hidden="true">{d.text}</span>}
        </p>
      )}
    </header>
  );
}
