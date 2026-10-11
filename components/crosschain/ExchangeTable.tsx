'use client';

import { useMemo, useState } from 'react';
import r from '@/components/reports/report.module.css';

export type CountryRow = { name: string; status: 'open' | 'partial' | 'banned' | 'unknown'; count: number; exchanges: string[]; pop: number; note: string };

const LABEL = { open: 'Open', partial: 'Partial', banned: 'Banned', unknown: 'Not assessed' } as const;
const TONE = { open: r.ok, partial: r.lag, banned: r.bad, unknown: r.unk } as const;

export function ExchangeTable({ rows }: { rows: CountryRow[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | CountryRow['status']>('all');
  const [all, setAll] = useState(false);
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((x) => (status === 'all' || x.status === status) && (!n || x.name.toLowerCase().includes(n) || x.exchanges.some((e) => e.toLowerCase().includes(n))));
  }, [rows, q, status]);
  const shown = all || q ? filtered : filtered.slice(0, 25);
  return (
    <div className="card" style={{ gap: 14 }}>
      <div className={r.dirTools}>
        <label className={`${r.grp} ${r.grow}`}>
          <span className={r.glbl}>Find a country or exchange</span>
          <span className={r.inp}><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Brazil, Kraken" aria-label="Find a country or exchange" /></span>
        </label>
        <div className={r.grp}>
          <span className={r.glbl} id="ex-st">ZEC access</span>
          <div className="seg" role="group" aria-labelledby="ex-st">
            {(['all', 'open', 'partial', 'banned'] as const).map((k) => <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>{k === 'all' ? 'All' : LABEL[k]}</button>)}
          </div>
        </div>
        <span className={r.count} style={{ paddingBottom: 8 }} aria-live="polite">{all || q ? <><b>{filtered.length}</b> of {rows.length} countries</> : <>The <b>{shown.length}</b> largest by population</>}</span>
      </div>
      <div className="tbl-wrap">
        <table className={`t ${r.compact}`}>
          <caption className="sr-only">ZEC exchange access by country</caption>
          <thead><tr><th scope="col">Country</th><th scope="col" style={{ textAlign: 'left' }}>ZEC access</th><th scope="col">Exchanges</th><th scope="col">Population</th><th scope="col" style={{ textAlign: 'left' }}>Note</th></tr></thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.name}>
                <td className="l">{x.name}</td>
                <td style={{ textAlign: 'left' }}><span className={`${r.pill} ${TONE[x.status]}`}><i aria-hidden="true" />{LABEL[x.status]}</span></td>
                <td title={x.exchanges.join(', ')}>{x.count}</td>
                <td>{x.pop < 1 ? '<1M' : `${x.pop.toLocaleString('en-US', { maximumFractionDigits: 0 })}M`}</td>
                <td className={r.wrap}>{x.note}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={5} className="l">No country matches.</td></tr>}
          </tbody>
        </table>
      </div>
      {!q && filtered.length > 25 && (
        <div className={r.moreRow}>
          <span>{all ? `All ${filtered.length} shown` : `${filtered.length - 25} more countries`}</span>
          <button type="button" className="btn" onClick={() => setAll((v) => !v)} aria-expanded={all}>{all ? 'Show the 25 largest' : `Show all ${filtered.length}`}</button>
        </div>
      )}
    </div>
  );
}
