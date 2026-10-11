'use client';

import { useMemo, useState } from 'react';
import r from '@/components/reports/report.module.css';
import { Pager, pageSlice } from '@/components/reports/Pager';

export type DirRow = {
  id: string; network: string; host: string; country: string; client: string; clientLabel: string; clientColor: string;
  version: string | null; atTip: boolean | null; behind: number | null; firstSeen: string; lastSeen: string;
};

const NETS = [['all', 'All'], ['ipv4', 'IPv4'], ['ipv6', 'IPv6'], ['onion', 'Tor']] as const;
const fmtTime = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const syncRank = (x: DirRow) => (x.atTip ? 0 : x.atTip === false ? 1 + (x.behind ?? 0) / 1e9 : 3);

export function NodeDirectory({ rows, clients }: { rows: DirRow[]; clients: { key: string; label: string }[] }) {
  const [q, setQ] = useState('');
  const [net, setNet] = useState<string>('all');
  const [client, setClient] = useState('all');
  const [sync, setSync] = useState('all');
  const [sort, setSort] = useState<{ k: 'sync' | 'first' | 'country'; dir: 1 | -1 }>({ k: 'first', dir: -1 });
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(25);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((x) =>
      (net === 'all' || x.network === net) &&
      (client === 'all' || x.client === client) &&
      (sync === 'all' || (sync === 'tip' ? x.atTip === true : sync === 'behind' ? x.atTip === false : x.atTip == null)) &&
      (!needle || [x.id, x.host, x.country, x.version ?? '', x.clientLabel].some((f) => f.toLowerCase().includes(needle))));
    const key = (x: DirRow) => (sort.k === 'sync' ? syncRank(x) : sort.k === 'country' ? x.country : x.firstSeen);
    return out.sort((a, b) => { const ka = key(a), kb = key(b); return (ka < kb ? -1 : ka > kb ? 1 : 0) * sort.dir; });
  }, [rows, q, net, client, sync, sort]);

  const set = <T,>(f: (v: T) => void) => (v: T) => { f(v); setPage(1); };
  const th = (k: typeof sort.k, label: string) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={sort.k === k ? r.sorted : undefined} style={{ textAlign: 'left' }}>
      <button type="button" className={r.sortBtn} onClick={() => { setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === 'first' ? -1 : 1 })); setPage(1); }}>
        {label} <span aria-hidden="true">{sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
  const shown = pageSlice(filtered, page, per);

  return (
    <div className="card" style={{ gap: 14 }}>
      <div className={r.dirTools}>
        <label className={`${r.grp} ${r.grow}`}>
          <span className={r.glbl}>Search</span>
          <span className={r.inp}>
            <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m13.5 13.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <input type="search" value={q} onChange={(e) => set(setQ)(e.target.value)} placeholder="Node, range, country or version" aria-label="Search nodes" />
          </span>
        </label>
        <div className={r.grp}>
          <span className={r.glbl} id="dir-net">Network</span>
          <div className="seg" role="group" aria-labelledby="dir-net">
            {NETS.map(([k, l]) => <button key={k} type="button" aria-pressed={net === k} onClick={() => set(setNet)(k)}>{l}</button>)}
          </div>
        </div>
        <label className={r.grp}>
          <span className={r.glbl}>Client</span>
          <span className={r.sel}>
            <select value={client} onChange={(e) => set(setClient)(e.target.value)}>
              <option value="all">All clients</option>
              {clients.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </label>
        <label className={r.grp}>
          <span className={r.glbl}>Sync status</span>
          <span className={r.sel}>
            <select value={sync} onChange={(e) => set(setSync)(e.target.value)}>
              <option value="all">Any status</option>
              <option value="tip">At tip</option>
              <option value="behind">Behind</option>
              <option value="unknown">Unknown</option>
            </select>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </label>
        <span className={r.count} style={{ marginLeft: 'auto', paddingBottom: 8 }} aria-live="polite"><b>{filtered.length}</b> of {rows.length} reachable addresses</span>
      </div>
      <div className="tbl-wrap">
        <table className={`t ${r.compact}`}>
          <caption className="sr-only">Reachable Zcash node addresses</caption>
          <thead>
            <tr>
              <th scope="col">Node</th>
              <th scope="col" style={{ textAlign: 'left' }}>Network</th>
              <th scope="col" style={{ textAlign: 'left' }}>Range</th>
              {th('country', 'Location')}
              <th scope="col" style={{ textAlign: 'left' }}>Client</th>
              <th scope="col" style={{ textAlign: 'left' }}>Version</th>
              {th('sync', 'Sync')}
              {th('first', 'First seen')}
              <th scope="col">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => (
              <tr key={`${x.id}-${x.network}`}>
                <td>{x.id}</td>
                <td style={{ textAlign: 'left' }}><span className={r.netb}>{x.network === 'ipv4' ? 'IPv4' : x.network === 'ipv6' ? 'IPv6' : 'Tor'}</span></td>
                <td style={{ textAlign: 'left' }}>{x.host}</td>
                <td className="l" style={{ textAlign: 'left' }}>{x.country}</td>
                <td className="l" style={{ textAlign: 'left' }}><i className={r.dotc} style={{ background: x.clientColor }} />{x.clientLabel}</td>
                <td style={{ textAlign: 'left' }}>{x.version ?? <span className={r.mut}>—</span>}</td>
                <td style={{ textAlign: 'left' }}>
                  {x.atTip ? <span className={`${r.pill} ${r.ok}`}><i aria-hidden="true" />At tip</span>
                    : x.atTip === false ? <span className={`${r.pill} ${r.lag}`}><i aria-hidden="true" />{(x.behind ?? 0).toLocaleString('en-US')} behind</span>
                    : <span className={`${r.pill} ${r.unk}`}><i aria-hidden="true" />Unknown</span>}
                </td>
                <td>{fmtTime(x.firstSeen)}</td>
                <td>{fmtTime(x.lastSeen)}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={9} className="l" style={{ textAlign: 'left' }}>No address matches these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager total={filtered.length} page={page} per={per} onPage={setPage} onPer={(n) => { setPer(n); setPage(1); }} label="node directory" />
    </div>
  );
}
