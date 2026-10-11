'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Incident, MatchKind } from '@/lib/data/privacy-tools';
import { dateLong, num, usd } from '@/lib/format';
import { gap } from './fmt';
import ui from './ui.module.css';
import s from './wall.module.css';

const MATCH_LABEL: Record<MatchKind, string> = { zec: 'ZEC', usd: 'USD', both: 'ZEC + USD' };
const POOL_VAR: Record<string, string> = { sprout: 'var(--p-sprout)', sapling: 'var(--p-sapling)', orchard: 'var(--p-orchard)', ironwood: 'var(--p-ironwood)' };
const explorer = (h: number) => `https://blockchair.com/zcash/block/${h}`;
const zecTxt = (v: number) => num(v, v % 1 === 0 ? 0 : 4);
const DAY = 86400;

type SortKey = 'shieldTs' | 'usdIn' | 'deshTs' | 'usdOut' | 'gapSecs';
const SORTS: [SortKey, 1 | -1, string][] = [['shieldTs', -1, 'Newest first'], ['shieldTs', 1, 'Oldest first'], ['usdIn', -1, 'Largest first'], ['usdIn', 1, 'Smallest first'], ['gapSecs', 1, 'Shortest gap first']];
type Period = 'all' | '90d' | '1y' | `y${number}`;

function MatchIcon({ m }: { m: MatchKind }) {
  if (m === 'both') return <svg width="14" height="12" viewBox="0 0 28 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="12" r="8" /><circle cx="18" cy="12" r="8" /></svg>;
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d={m === 'zec' ? 'M9 8h6l-6 8h6M12 6v2M12 16v2' : 'M14.5 9a2.5 2 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2 0 0 1-2.5-1.5M12 6v1.5M12 16.5V18'} />
    </svg>
  );
}

function Tag({ m }: { m: MatchKind }) {
  return <span className={ui.tag}><MatchIcon m={m} />{MATCH_LABEL[m]}</span>;
}

function Route({ from, to }: { from: string; to: string }) {
  return (
    <span className={ui.pools}>
      <i className={ui.dot} style={{ background: POOL_VAR[from] ?? 'var(--p-transparent)' }} aria-hidden="true" />{from}
      <span className={ui.to} aria-label="to">→</span>
      <i className={ui.dot} style={{ background: POOL_VAR[to] ?? 'var(--p-transparent)' }} aria-hidden="true" />{to}
    </span>
  );
}

function pageList(cur: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= total));
  if (cur <= 3) [3, 4].forEach((p) => set.add(p));
  const arr = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  arr.forEach((p, i) => { if (i && p - arr[i - 1] > 1) out.push('…'); out.push(p); });
  return out;
}

export function WallTable({ rows, asOf }: { rows: Incident[]; asOf: number }) {
  const [match, setMatch] = useState<'all' | MatchKind>('all');
  const [route, setRoute] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [minUsd, setMinUsd] = useState('1,000');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'shieldTs', dir: -1 });
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(50);
  const [open, setOpen] = useState(false);
  // phones get shorter pages: 50 cards is a very long scroll
  useEffect(() => { if (window.matchMedia('(max-width: 560px)').matches) setPer(20); }, []);

  const routes = useMemo(() => {
    const c = new Map<string, number>();
    rows.forEach((r) => c.set(`${r.from} → ${r.to}`, (c.get(`${r.from} → ${r.to}`) ?? 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const years = useMemo(() => [...new Set(rows.map((r) => new Date(r.shieldTs * 1000).getUTCFullYear()))].sort((a, b) => b - a), [rows]);
  const counts = useMemo(() => ({ all: rows.length, zec: rows.filter((r) => r.match === 'zec').length, usd: rows.filter((r) => r.match === 'usd').length, both: rows.filter((r) => r.match === 'both').length }), [rows]);

  const filtered = useMemo(() => {
    const min = Number(minUsd.replace(/[^\d.]/g, '')) || 0;
    const needle = q.trim().replace(/[#,\s]/g, '');
    const out = rows.filter((r) => {
      if (match !== 'all' && r.match !== match) return false;
      if (route !== 'all' && `${r.from} → ${r.to}` !== route) return false;
      if (period === '90d' && r.shieldTs < asOf - 90 * DAY) return false;
      if (period === '1y' && r.shieldTs < asOf - 365 * DAY) return false;
      if (period.startsWith('y') && new Date(r.shieldTs * 1000).getUTCFullYear() !== Number(period.slice(1))) return false;
      if (Math.max(r.usdIn, r.usdOut) < min) return false;
      if (needle && !(String(r.blockIn).includes(needle) || String(r.blockOut).includes(needle) || String(r.zecIn).includes(needle) || String(r.zecOut).includes(needle))) return false;
      return true;
    });
    return out.sort((a, b) => (a[sort.key] - b[sort.key]) * sort.dir);
  }, [rows, match, route, period, minUsd, q, sort, asOf]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const cur = Math.min(page, pages);
  const shown = filtered.slice((cur - 1) * per, cur * per);
  const reset = () => { setMatch('all'); setRoute('all'); setPeriod('all'); setMinUsd('1,000'); setQ(''); setPage(1); };
  const onSort = (key: SortKey) => { setSort((p) => (p.key === key ? { key, dir: (p.dir * -1) as 1 | -1 } : { key, dir: -1 })); setPage(1); };
  const th = (key: SortKey, label: ReactNode, sub?: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir < 0 ? 'descending' : 'ascending') : undefined}>
      <button type="button" onClick={() => onSort(key)}>
        {label}{sub && <span className={s.mut} style={{ fontSize: 12 }}>{sub}</span>}
        {sort.key === key && <Icon name={sort.dir < 0 ? 'chevron-down' : 'chevron-up'} size={12} />}
      </button>
    </th>
  );
  const first = filtered.length ? (cur - 1) * per + 1 : 0;
  const last = Math.min(cur * per, filtered.length);

  return (
    <>
      <div className={`${s.fbar}${open ? ` ${s.open}` : ''}`} role="region" aria-label="Filter incidents" id="wall-filters">
        <div className={s.grp}>
          <span className={s.glbl} id="g-m">Matched on</span>
          <div className={s.grpRow} role="group" aria-labelledby="g-m">
            {(['all', 'zec', 'usd', 'both'] as const).map((m) => (
              <button key={m} className="chip" type="button" aria-pressed={match === m} onClick={() => { setMatch(m); setPage(1); }}>
                {m !== 'all' && <MatchIcon m={m} />}{m === 'all' ? 'All' : MATCH_LABEL[m]}<b className={s.chipN}>{counts[m]}</b>
              </button>
            ))}
          </div>
        </div>
        <div className={s.grp}>
          <label className={s.glbl} htmlFor="f-route">Pool route</label>
          <span className={s.sel}>
            <select id="f-route" value={route} onChange={(e) => { setRoute(e.target.value); setPage(1); }}>
              <option value="all">All routes</option>
              {routes.map(([r, n]) => <option key={r} value={r}>{r} ({n})</option>)}
            </select>
            <Icon name="chevron-down" size={12} />
          </span>
        </div>
        <div className={s.grp}>
          <label className={s.glbl} htmlFor="f-date">Shield date</label>
          <span className={s.sel}>
            <select id="f-date" value={period} onChange={(e) => { setPeriod(e.target.value as Period); setPage(1); }}>
              <option value="all">All dates</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last 12 months</option>
              {years.map((y) => <option key={y} value={`y${y}`}>{y}</option>)}
            </select>
            <Icon name="chevron-down" size={12} />
          </span>
        </div>
        <div className={s.grp}>
          <label className={s.glbl} htmlFor="f-min">Min amount</label>
          <span className={s.inp} style={{ width: 120 }}>$<input id="f-min" type="text" inputMode="numeric" value={minUsd} onChange={(e) => { setMinUsd(e.target.value); setPage(1); }} /></span>
        </div>
        <div className={s.grp}>
          <label className={s.glbl} htmlFor="f-q">Search</label>
          <span className={s.inp} style={{ width: 200 }}><Icon name="search" size={13} /><input id="f-q" type="search" placeholder="Block height or ZEC" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></span>
        </div>
        <div className={s.end}>
          <button className={`btn ${s.mOnly}`} type="button" aria-expanded={open} aria-controls="wall-filters" onClick={() => setOpen((o) => !o)}><Icon name="filter" size={14} />Filters</button>
          <span className={s.count} aria-live="polite"><b>{num(filtered.length)}</b> incident{filtered.length === 1 ? '' : 's'}</span>
          <button className={`btn ghost ${s.reset}`} type="button" onClick={reset}>Reset</button>
        </div>
      </div>

      <section className="sec" aria-labelledby="h-all">
        <div className="sec-h">
          <h2 className="h2" id="h-all">Every incident</h2>
          <span className={`small ${s.dOnly}`}>newest first · click a column heading to sort · block numbers link to the explorer</span>
          <span className={`${s.sel} ${s.mOnly}`}>
            <label className="sr-only" htmlFor="f-sort">Sort incidents</label>
            <select id="f-sort" value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key: key as SortKey, dir: Number(dir) as 1 | -1 }); setPage(1); }}>
              {SORTS.map(([k, d, l]) => <option key={`${k}:${d}`} value={`${k}:${d}`}>{l}</option>)}
            </select>
            <Icon name="chevron-down" size={12} />
          </span>
        </div>

        <div className={`tbl-wrap ${s.wrap}`}>
          <table className={`t ${s.tbl}`}>
            <caption className="sr-only">Wall of Shame incidents, {first}–{last} of {filtered.length}</caption>
            <thead>
              <tr>
                {th('shieldTs', 'Shielded')}
                {th('usdIn', 'Amount in ', '$ · ZEC')}
                {th('deshTs', 'Deshielded')}
                {th('usdOut', 'Amount out ', '$ · ZEC')}
                {th('gapSecs', 'Gap')}
                <th scope="col" className={s.left}>Match <span className={s.mut} style={{ fontSize: 12 }}>· Δ in → out</span></th>
                <th scope="col" className={s.left}>Pools</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>{dateLong(r.shieldTs * 1000)}<a href={explorer(r.blockIn)} target="_blank" rel="noopener noreferrer" aria-label={`Shield block ${r.blockIn} on Blockchair`}>#{r.blockIn}</a></td>
                  <td>{usd(r.usdIn, 0)}<span className={s.mut}>{zecTxt(r.zecIn)}</span></td>
                  <td>{dateLong(r.deshTs * 1000)}<a href={explorer(r.blockOut)} target="_blank" rel="noopener noreferrer" aria-label={`Deshield block ${r.blockOut} on Blockchair`}>#{r.blockOut}</a></td>
                  <td>{usd(r.usdOut, 0)}<span className={s.mut}>{zecTxt(r.zecOut)}</span></td>
                  <td>{gap(r.gapSecs)}</td>
                  <td className={`${s.mt} ${s.left}`}><Tag m={r.match} /><span className={s.pctd}>Δ {r.diffPct.toFixed(2)}%</span></td>
                  <td className={s.left}><Route from={r.from} to={r.to} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className={s.empty}>No incidents match these filters. <button type="button" className="linkish" onClick={reset}>Reset filters</button></p>}
        </div>

        <ul className={s.cards} aria-label="Incidents">
          {shown.map((r) => (
            <li key={r.id} className={s.rc}>
              <span className={s.rcAmt}>{usd(r.usdIn, 0)} <span>→ {usd(r.usdOut, 0)}</span></span>
              <div className={s.rcZ}>{zecTxt(r.zecIn)} ZEC in · {zecTxt(r.zecOut)} ZEC out</div>
              <div className={s.rcTop}><span className={s.rcM}><Tag m={r.match} />Δ {r.diffPct.toFixed(2)}%</span><Route from={r.from} to={r.to} /></div>
              <div className={s.rcBot}><span><b>{dateLong(r.shieldTs * 1000)}</b> · <a href={explorer(r.blockIn)} target="_blank" rel="noopener noreferrer">#{r.blockIn}</a></span><span>out after <b>{gap(r.gapSecs)}</b></span></div>
            </li>
          ))}
          {!shown.length && <li className={s.empty}>No incidents match these filters.</li>}
        </ul>

        <div className={s.pager}>
          <span className={s.count}>Showing <b>{first}–{last}</b> of {num(filtered.length)}</span>
          <div className={s.pages} role="group" aria-label="Pages">
            <button className="btn icon" type="button" aria-label="Previous page" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><Icon name="chevron-right" size={14} className={s.flip} /></button>
            {pageList(cur, pages).map((p, i) => (p === '…'
              ? <span key={`g${i}`} className={`${s.gapDots} ${s.pg}`}>…</span>
              : <button key={p} className={`btn ${s.pg}`} type="button" aria-current={p === cur ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => setPage(p)}>{p}</button>))}
            <span className={s.pageOf}>Page {cur} of {pages}</span>
            <button className="btn icon" type="button" aria-label="Next page" disabled={cur >= pages} onClick={() => setPage(cur + 1)}><Icon name="chevron-right" size={14} /></button>
          </div>
          <span className={s.sel}>
            <label className="sr-only" htmlFor="f-per">Rows per page</label>
            <select id="f-per" value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}>
              {[20, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
            </select>
            <Icon name="chevron-down" size={12} />
          </span>
        </div>
      </section>
    </>
  );
}
