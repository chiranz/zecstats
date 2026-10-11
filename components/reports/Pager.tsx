'use client';

import r from './report.module.css';

export const pageSlice = <T,>(rows: T[], page: number, per: number) => rows.slice((page - 1) * per, page * per);

/** "Showing 1–25 of 124" + page buttons + rows-per-page select. */
export function Pager({ total, page, per, onPage, onPer, label, options = [25, 50, 100] }: { total: number; page: number; per: number; onPage: (p: number) => void; onPer?: (n: number) => void; label: string; options?: number[] }) {
  const pages = Math.max(1, Math.ceil(total / per));
  const p = Math.min(page, pages);
  const from = total ? (p - 1) * per + 1 : 0;
  const to = Math.min(total, p * per);
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - p) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className={r.pager}>
      <span className={r.count}>Showing <b>{from}–{to}</b> of {total.toLocaleString('en-US')}</span>
      <nav className={r.pages} aria-label={`Pages of the ${label}`}>
        <button className="btn" type="button" onClick={() => onPage(p - 1)} disabled={p <= 1} aria-label="Previous page">‹</button>
        {nums.map((n, i) => (n === '…' ? <span key={`g${i}`} className={r.mut} style={{ padding: '0 4px' }}>…</span> : (
          <button key={n} className="btn" type="button" aria-current={n === p ? 'page' : undefined} onClick={() => onPage(n)} aria-label={`Page ${n}`}>{n}</button>
        )))}
        <button className="btn" type="button" onClick={() => onPage(p + 1)} disabled={p >= pages} aria-label="Next page">›</button>
      </nav>
      {onPer && (
        <label className={r.sel}>
          <span className="sr-only">Rows per page</span>
          <select value={per} onChange={(e) => onPer(Number(e.target.value))}>
            {options.map((o) => <option key={o} value={o}>{o} per page</option>)}
          </select>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </label>
      )}
    </div>
  );
}
