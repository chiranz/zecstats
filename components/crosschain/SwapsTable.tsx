'use client';

import { useMemo, useState } from 'react';
import r from '@/components/reports/report.module.css';
import { Pager, pageSlice } from '@/components/reports/Pager';

export type SwapRow = { id: string; date: string; btc: number; usd: number; zec: number; valueNow: number; returnPct: number; ageDays: number | null; trace: string; sender: string; txid: string };

const usdF = (v: number) => `$${v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(0)}`;
const age = (d: number) => (d >= 365 ? `${(d / 365).toFixed(1)} y` : d >= 1 ? `${Math.round(d)} d` : `${Math.max(1, Math.round(d * 24))} h`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dShort = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
type SortKey = 'date' | 'btc' | 'returnPct' | 'ageDays';

export function SwapsTable({ rows }: { rows: SwapRow[] }) {
  const [min, setMin] = useState(0.1);
  const [outcome, setOutcome] = useState<'all' | 'up' | 'down'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'date', dir: -1 });
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(25);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((x) => x.btc >= min && (outcome === 'all' || (outcome === 'up' ? x.returnPct >= 0 : x.returnPct < 0)) && (!needle || x.sender.toLowerCase().includes(needle) || x.txid.toLowerCase().includes(needle)))
      .sort((a, b) => { const ka = a[sort.k] ?? -1, kb = b[sort.k] ?? -1; return (ka < kb ? -1 : ka > kb ? 1 : 0) * sort.dir; });
  }, [rows, min, outcome, q, sort]);
  const totalBtc = filtered.reduce((a, x) => a + x.btc, 0);
  const reset = (f: () => void) => { f(); setPage(1); };
  const th = (k: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={sort.k === k ? r.sorted : undefined}>
      <button type="button" className={r.sortBtn} onClick={() => reset(() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 })))}>{label} <span aria-hidden="true">{sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span></button>
    </th>
  );

  return (
    <div className="card" style={{ gap: 14 }}>
      <div className={r.dirTools}>
        <div className={r.grp}>
          <span className={r.glbl} id="sw-min">Swap size</span>
          <div className="seg" role="group" aria-labelledby="sw-min">
            {[0.1, 1, 5].map((v) => <button key={v} type="button" aria-pressed={min === v} onClick={() => reset(() => setMin(v))}>≥ {v} BTC</button>)}
          </div>
        </div>
        <div className={r.grp}>
          <span className={r.glbl} id="sw-out">Outcome</span>
          <div className="seg" role="group" aria-labelledby="sw-out">
            {([['all', 'All'], ['up', 'In profit'], ['down', 'Underwater']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={outcome === k} onClick={() => reset(() => setOutcome(k))}>{l}</button>)}
          </div>
        </div>
        <label className={`${r.grp} ${r.grow}`}>
          <span className={r.glbl}>Search</span>
          <span className={r.inp}><input type="search" value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Bitcoin address or txid" aria-label="Search swaps by Bitcoin address or txid" /></span>
        </label>
        <span className={r.count} style={{ paddingBottom: 8 }} aria-live="polite"><b>{filtered.length}</b> swaps · {totalBtc.toFixed(2)} BTC</span>
      </div>
      <div className="tbl-wrap">
        <table className={`t ${r.compact}`}>
          <caption className="sr-only">Bitcoin swapped into ZEC</caption>
          <thead>
            <tr>
              {th('date', 'Swapped')}
              {th('btc', 'BTC in')}
              <th scope="col">Paid</th>
              <th scope="col">ZEC out</th>
              <th scope="col">Worth now</th>
              {th('returnPct', 'Return')}
              {th('ageDays', 'Coins sat still')}
              <th scope="col" style={{ textAlign: 'left' }}>Trace</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice(filtered, page, per).map((x) => (
              <tr key={x.id}>
                <td>{dShort(x.date)}</td>
                <td>{x.btc.toFixed(3)}</td>
                <td>{usdF(x.usd)}</td>
                <td>{x.zec.toLocaleString('en-US', { maximumFractionDigits: x.zec < 10 ? 2 : 0 })}</td>
                <td>{usdF(x.valueNow)}</td>
                <td className={x.returnPct >= 0 ? 'up' : 'dn'}>{x.returnPct >= 0 ? '▲' : '▼'} {Math.abs(x.returnPct).toFixed(1)}%</td>
                <td>{x.ageDays == null ? <span className={r.mut}>awaiting trace</span> : age(x.ageDays)}</td>
                <td style={{ textAlign: 'left' }}>{x.trace === 'ok' ? <span className={`${r.pill} ${r.ok}`}><i aria-hidden="true" />Traced</span> : <span className={`${r.pill} ${r.unk}`}><i aria-hidden="true" />Pending</span>}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} className="l" style={{ textAlign: 'left' }}>No swap matches these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager total={filtered.length} page={page} per={per} onPage={setPage} onPer={(n) => { setPer(n); setPage(1); }} label="swap table" />
    </div>
  );
}
