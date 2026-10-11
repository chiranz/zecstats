'use client';

import { useMemo, useState } from 'react';
import { delta } from '@/lib/format';
import r from '@/components/reports/report.module.css';
import { Pager, pageSlice } from '@/components/reports/Pager';
import { useParamWriter } from './ParamSeg';
import p from './page.module.css';

// The live page's one table with two indexes (`by=swap|address`) and a row count (`rows=50|250|500`), plus its
// client-side filters: date range, minimum BTC, minimum dollars, outcome and an address/txid search.

export type MigRow = {
  id: string; date: string; ts: number; btc: number; usd: number; zec: number; valueNow: number; returnPct: number;
  ageDays: number | null; restTxid: string | null; sender: string; txid: string; deposit: string;
  btcValueNow: number; consolidated: boolean;
};
type AddrRow = { sender: string; swaps: number; btc: number; usd: number; zec: number; valueNow: number; btcValueNow: number; returnPct: number; ageDays: number | null; consolidated: boolean };
export type By = 'swap' | 'address';

const NEAR = (q: string) => `https://explorer.near-intents.org/?search=${encodeURIComponent(q)}`;
const MEMPOOL_TX = (t: string) => `https://mempool.space/tx/${t}`;
const MEMPOOL_ADDR = (a: string) => `https://mempool.space/address/${a}`;
const usdF = (v: number) => `$${v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(0)}`;
const age = (d: number) => (d >= 365 ? `${(d / 365).toFixed(1)} y` : d >= 1 ? `${Math.round(d)} d` : d >= 1 / 24 ? `${Math.round(d * 24)} h` : `${Math.max(1, Math.round(d * 1440))} min`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dShort = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const hhmm = (ts: number) => new Date(ts * 1000).toISOString().slice(11, 16);
const short = (a: string) => (!a ? '—' : a.length <= 16 ? a : `${a.slice(0, 8)}…${a.slice(-6)}`);
const ret = (v: number) => { const d = delta(v); return <span className={d.cls}>{d.text}</span>; };
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** One row per sending address, added up from the swaps that pass the filters (so both views always agree). */
function byAddress(list: MigRow[]): AddrRow[] {
  const acc = new Map<string, AddrRow>();
  for (const x of list) {
    const k = x.sender || '(unknown)';
    const a = acc.get(k) ?? { sender: k, swaps: 0, btc: 0, usd: 0, zec: 0, valueNow: 0, btcValueNow: 0, returnPct: 0, ageDays: null, consolidated: false };
    a.swaps += 1; a.btc += x.btc; a.usd += x.usd; a.zec += x.zec; a.valueNow += x.valueNow; a.btcValueNow += x.btcValueNow;
    if (x.ageDays != null) a.ageDays = Math.max(a.ageDays ?? 0, x.ageDays);
    a.consolidated ||= x.consolidated;
    acc.set(k, a);
  }
  return [...acc.values()].map((a) => ({ ...a, returnPct: a.usd > 0 ? (a.valueNow / a.usd - 1) * 100 : 0 }));
}

type SwapKey = 'date' | 'btc' | 'usd' | 'returnPct' | 'ageDays';
type AddrKey = 'sender' | 'swaps' | 'btc' | 'usd' | 'returnPct' | 'ageDays';
const ROWS = [50, 250, 500];

export function MigrationTable({ rows, initialBy, initialRows, first, last }: { rows: MigRow[]; initialBy: By; initialRows: number; first: string; last: string }) {
  const write = useParamWriter();
  const [by, setBy] = useState<By>(initialBy);
  const [per, setPer] = useState(initialRows);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minBtc, setMinBtc] = useState('');
  const [minUsd, setMinUsd] = useState('');
  const [outcome, setOutcome] = useState<'all' | 'up' | 'down'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: SwapKey | AddrKey; dir: 1 | -1 }>({ k: 'date', dir: -1 });
  const [page, setPage] = useState(1);

  const matched = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const mb = minBtc === '' ? null : Number(minBtc), mu = minUsd === '' ? null : Number(minUsd);
    return rows.filter((x) => (!from || x.date >= from) && (!to || x.date <= to)
      && (mb == null || !Number.isFinite(mb) || x.btc >= mb) && (mu == null || !Number.isFinite(mu) || x.usd >= mu)
      && (outcome === 'all' || (outcome === 'up' ? x.valueNow > x.usd : x.valueNow < x.usd))
      && (!needle || x.sender.toLowerCase().includes(needle) || x.txid.toLowerCase().includes(needle) || x.deposit.toLowerCase().includes(needle)));
  }, [rows, from, to, minBtc, minUsd, outcome, q]);

  const list = useMemo(() => {
    const base: (MigRow | AddrRow)[] = by === 'address' ? byAddress(matched) : matched;
    // A sort key the other view lacks falls back to its first column; missing values sort last either way.
    const k = (by === 'address' ? ['sender', 'swaps', 'btc', 'usd', 'returnPct', 'ageDays'] : ['date', 'btc', 'usd', 'returnPct', 'ageDays']).includes(sort.k) ? sort.k : by === 'address' ? 'btc' : 'date';
    const val = (x: MigRow | AddrRow) => (k === 'date' ? (x as MigRow).ts : (x as Record<string, unknown>)[k]) as number | string | null;
    return [...base].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number)) * sort.dir;
    });
  }, [matched, by, sort]);

  const reset = (f: () => void) => { f(); setPage(1); };
  const clear = () => reset(() => { setFrom(''); setTo(''); setMinBtc(''); setMinUsd(''); setOutcome('all'); setQ(''); });
  const filtered = matched.length !== rows.length;
  const dirty = !!(from || to || minBtc || minUsd || q) || outcome !== 'all';
  const inUsd = matched.reduce((a, x) => a + x.usd, 0), gain = matched.reduce((a, x) => a + x.valueNow - x.usd, 0);

  const th = (k: SwapKey | AddrKey, label: string, left = false) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={sort.k === k ? r.sorted : undefined} style={left ? { textAlign: 'left' } : undefined}>
      <button type="button" className={r.sortBtn} onClick={() => reset(() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === 'sender' ? 1 : -1 })))}>{label} <span aria-hidden="true">{sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span></button>
    </th>
  );
  const sender = (a: string) => (
    <span className={p.addr}>
      <a href={NEAR(a)} {...ext} title="Every swap this address made, on the NEAR Intents explorer">{short(a)}</a>
      <a href={MEMPOOL_ADDR(a)} {...ext} className={p.btcLink} title="This address on a Bitcoin explorer" aria-label={`${short(a)} on mempool.space`}>₿</a>
    </span>
  );

  return (
    <div className="card" style={{ gap: 14 }}>
      <div className={r.dirTools}>
        <div className={r.grp}>
          <span className={r.glbl} id="mt-by">Rows</span>
          <div className="seg" role="group" aria-labelledby="mt-by">
            {([['swap', 'Each swap'], ['address', 'By address']] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={by === k} onClick={() => reset(() => { setBy(k); write('by', k); })}>{l}</button>
            ))}
          </div>
        </div>
        <label className={r.grp}>
          <span className={r.glbl}>From</span>
          <span className={`${r.inp} ${p.date}`}><input type="date" value={from} min={first} max={last} onChange={(e) => reset(() => setFrom(e.target.value))} aria-label="Swapped on or after" /></span>
        </label>
        <label className={r.grp}>
          <span className={r.glbl}>To</span>
          <span className={`${r.inp} ${p.date}`}><input type="date" value={to} min={first} max={last} onChange={(e) => reset(() => setTo(e.target.value))} aria-label="Swapped on or before" /></span>
        </label>
        <label className={r.grp}>
          <span className={r.glbl}>Min BTC</span>
          <span className={`${r.inp} ${p.num}`}><input type="number" inputMode="decimal" min={0} step={0.1} placeholder="any" value={minBtc} onChange={(e) => reset(() => setMinBtc(e.target.value))} aria-label="Minimum BTC swapped" /></span>
        </label>
        <label className={r.grp}>
          <span className={r.glbl}>Min $ in</span>
          <span className={`${r.inp} ${p.num}`}><input type="number" inputMode="numeric" min={0} step={1000} placeholder="any" value={minUsd} onChange={(e) => reset(() => setMinUsd(e.target.value))} aria-label="Minimum dollars paid" /></span>
        </label>
        <div className={r.grp}>
          <span className={r.glbl} id="mt-out">Outcome</span>
          <div className="seg" role="group" aria-labelledby="mt-out">
            {([['all', 'All'], ['up', 'In profit'], ['down', 'Underwater']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={outcome === k} onClick={() => reset(() => setOutcome(k))}>{l}</button>)}
          </div>
        </div>
        <label className={`${r.grp} ${r.grow}`}>
          <span className={r.glbl}>Search</span>
          <span className={r.inp}><input type="search" value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Bitcoin address or txid" aria-label="Search swaps by Bitcoin address, txid or deposit address" /></span>
        </label>
        <button type="button" className="btn" onClick={clear} disabled={!dirty} style={{ height: 34 }}>Reset</button>
      </div>

      <div className="tbl-wrap">
        <table className={`t ${r.compact}`}>
          <caption className="sr-only">Bitcoin swapped into ZEC, {by === 'address' ? 'one row per sending address' : 'one row per swap'}</caption>
          <thead>
            {by === 'swap' ? (
              <tr>{th('date', 'Swapped')}{th('btc', 'BTC in')}{th('usd', 'Paid')}<th scope="col">ZEC out</th><th scope="col">Worth now</th>{th('returnPct', 'Return')}{th('ageDays', 'Coins sat still')}<th scope="col" style={{ textAlign: 'left' }}>Sender</th></tr>
            ) : (
              <tr>{th('sender', 'Sender', true)}{th('swaps', 'Swaps')}{th('btc', 'BTC in')}{th('usd', 'Paid')}<th scope="col">ZEC out</th><th scope="col">Worth now</th>{th('returnPct', 'Return')}{th('ageDays', 'Oldest coins')}</tr>
            )}
          </thead>
          <tbody>
            {by === 'swap'
              ? pageSlice(list as MigRow[], page, per).map((x) => (
                <tr key={x.id}>
                  <td><a href={NEAR(x.deposit)} {...ext} title="This swap on the NEAR Intents explorer">{dShort(x.date)}</a> <span className={r.mut}>{hhmm(x.ts)}</span></td>
                  <td>{x.txid ? <a href={MEMPOOL_TX(x.txid)} {...ext} title="The Bitcoin transaction that funded it">{x.btc.toFixed(3)}</a> : x.btc.toFixed(3)}</td>
                  <td>{usdF(x.usd)}</td>
                  <td>{x.zec.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{usdF(x.valueNow)}</td>
                  <td>{ret(x.returnPct)}</td>
                  <td>{x.ageDays == null ? <span className={r.mut}>awaiting trace</span> : x.restTxid ? <a href={MEMPOOL_TX(x.restTxid)} {...ext} title="Where the coins came to rest">{age(x.ageDays)}</a> : age(x.ageDays)}</td>
                  <td style={{ textAlign: 'left' }}>{sender(x.sender)}</td>
                </tr>
              ))
              : pageSlice(list as AddrRow[], page, per).map((x) => (
                <tr key={x.sender}>
                  <td style={{ textAlign: 'left' }}>{sender(x.sender)}{x.consolidated && <span className={p.tag}>consolidated</span>}</td>
                  <td>{x.swaps}</td>
                  <td>{x.btc.toFixed(3)}</td>
                  <td>{usdF(x.usd)}</td>
                  <td>{x.zec.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{usdF(x.valueNow)}</td>
                  <td>{ret(x.returnPct)}</td>
                  <td>{x.ageDays == null ? <span className={r.mut}>awaiting trace</span> : age(x.ageDays)}</td>
                </tr>
              ))}
            {!list.length && <tr><td colSpan={8} className="l" style={{ textAlign: 'left' }}>No swap matches these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="small" aria-live="polite">
        {list.length.toLocaleString('en-US')} {by === 'address' ? `address${list.length === 1 ? '' : 'es'} across ${matched.length.toLocaleString('en-US')} swaps` : `swap${list.length === 1 ? '' : 's'}`}
        {filtered && ` (filtered from ${rows.length.toLocaleString('en-US')})`}
        {matched.length > 0 && <> · {usdF(inUsd)} in, <span className={delta(gain, 0, '').cls}>{delta(gain, 0, '').dir === 'flat' ? '$0' : `${gain >= 0 ? '▲' : '▼'} ${usdF(Math.abs(gain))}`}</span> since</>}
        {by === 'address' && list.some((x) => (x as AddrRow).consolidated) && <> · <span className={p.tag}>consolidated</span> = at least one swap spent a pile assembled from 15 or more inputs</>}
      </p>
      <Pager total={list.length} page={page} per={per} options={ROWS} onPage={setPage} onPer={(n) => { setPer(n); setPage(1); write('rows', String(n)); }} label="swap table" />
    </div>
  );
}
