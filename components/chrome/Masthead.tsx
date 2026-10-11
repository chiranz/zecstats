import type { ReactNode } from 'react';
import { PageCadence } from './cadence';

export type KeyFigure = { value: ReactNode; delta?: ReactNode; dir?: 'up' | 'dn' | 'flat'; label: string };

/**
 * Page header (navigation direction D, "answer first"): the H1 and the one-sentence answer. Where the page sits is
 * said by the context bar, and freshness by the status pill, so neither repeats here. Single-number pages (charts)
 * add the key figure on the right; phones hide it because the sentence already carries the number.
 * `cadence` is this page's own update rhythm when it differs from the site's daily update; the status popover shows it.
 */
export function Masthead({ title, lede, children, figure, cadence }: { title: ReactNode; lede?: ReactNode; children?: ReactNode; figure?: KeyFigure; cadence?: string }) {
  return (
    <header className={`mast${figure ? ' with-fig' : ''}`}>
      {cadence && <PageCadence value={cadence} />}
      <div className="mast-t">
        <h1 className="h1">{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
      {figure && (
        <div className="mast-fig" aria-label={figure.label}>
          <span className="mast-fv" aria-hidden="true">{figure.value}</span>
          {figure.delta && <span className={`delta${figure.dir === 'dn' ? ' dn' : ''}`} aria-hidden="true">{figure.delta}</span>}
        </div>
      )}
    </header>
  );
}
