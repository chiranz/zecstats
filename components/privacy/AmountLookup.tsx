'use client';

import { useState } from 'react';
import s from './AmountLookup.module.css';

/** "Check an amount" → the Amount lookup tool (GET /amount-suggest?amount=…&dir=…). */
export function AmountLookup({ id = 'amt-in', compact = false }: { id?: string; compact?: boolean }) {
  const [dir, setDir] = useState<'shield' | 'deshield'>('shield');
  if (compact) {
    return (
      <form className={s.mini} action="/amount-suggest" method="get">
        <label className="field" htmlFor={id}>
          <span className="sr-only">Amount in ZEC</span>
          <input id={id} name="amount" type="text" inputMode="decimal" placeholder="Amount in ZEC, e.g. 2.5" autoComplete="off" />
        </label>
        <button className="btn primary" type="submit">Check</button>
      </form>
    );
  }
  return (
    <form className={s.lookup} action="/amount-suggest" method="get" role="search" aria-label="Amount lookup">
      <label htmlFor={id}>Check an amount</label>
      <div className={s.row}>
        <div className={`field ${s.field}`}>
          <input id={id} name="amount" type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 3.7" />
          <span>ZEC</span>
        </div>
        <input type="hidden" name="dir" value={dir} />
        <div className="seg" role="group" aria-label="Direction">
          <button type="button" aria-pressed={dir === 'shield'} onClick={() => setDir('shield')}>Shield t→z</button>
          <button type="button" aria-pressed={dir === 'deshield'} onClick={() => setDir('deshield')}>Deshield z→t</button>
        </div>
        <button className="btn primary" type="submit">Check</button>
      </div>
      <p className="small">Shows how often that exact amount has been used and the nearest blend-in amounts, in Amount lookup.</p>
    </form>
  );
}
