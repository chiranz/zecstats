'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { dateLong, type Good } from '@/lib/format';
import type { MetricGroupId, MetricRow, MetricsTable as Table, PeriodKey } from '@/lib/data/tools';
import { CopyButton } from './CopyButton';
import { Spark } from './Spark';
import { change, fmtMetric, fmtMetricText } from './metricFormat';
import s from './metrics.module.css';
import { downloadCsv, replaceQuery } from '@/components/tools/browser';

const PERIODS: PeriodKey[] = ['7D', '28D', '3M', '6M', '12M'];
const PERIOD_WORD: Record<PeriodKey, string> = { '7D': '7 days', '28D': '28 days', '3M': '3 months', '6M': '6 months', '12M': '12 months' };
const DEFAULT_CMP: PeriodKey[] = ['28D', '12M'];
const PERIOD_SPAN: Record<PeriodKey, string> = { '7D': '7-day', '28D': '28-day', '3M': '3-month', '6M': '6-month', '12M': '12-month' };
/** The API's chart link where it points at the wrong chart. */
const CHART_FIX: Record<string, string> = { 'Exchange Trading Volume': 'exch-vol', 'Shielded Tx Share': 'tx-types' };
/** Rows where neither direction is good or bad (Bitcoin's own figures, migration between pools, issuance, funding):
 *  their changes are drawn muted. Every other row is better when it rises. */
const NEUTRAL = new Set(['Transparent Pool', 'Sprout Pool', 'Sapling Pool', 'Orchard Pool', 'Total Supply', 'Emission / Day', 'Lockbox (Dev Fund)', 'Avg Difficulty',
  'Blocks / Day', 'Avg Block Size', 'Total Fees Paid / Day', 'BTC Perp Funding (APR)', 'ZEC Perp Funding (APR)', 'ZEC−BTC Funding Spread', 'BTC Open Interest', 'BTC Perp Volume (24h)']);
const goodOf = (name: string): Good => (NEUTRAL.has(name) ? 'neutral' : 'up');

export type Sort = { col: 0 | 1; dir: 'desc' | 'asc' };
/** View state read from the link on the server (?cmp=28D,12M&m=…&spark=0&sort=1a), so a shared link opens as sent. */
export type MetricsView = { cmp: PeriodKey[] | null; m: string[] | null; spark: boolean; sort: Sort };

export function MetricsTable({ table, groups, view, asOf, bounds, defaults }: {
  table: Table; groups: { id: MetricGroupId; title: string; desc: string }[]; view: MetricsView;
  /** the default rows, from the latest table (an early as-of day lacks some, which must not turn into a ?m= list) */
  defaults: string[];
  /** ?date= when the table is shown as of an earlier day (null = the latest complete day) */
  asOf: string | null; bounds: { min: string; max: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [cmp, setCmp] = useState<PeriodKey[]>(view.cmp ?? DEFAULT_CMP);
  const [spark, setSpark] = useState(view.spark);
  const [sel, setSel] = useState<string[]>(view.m ?? defaults);
  const [sort, setSort] = useState<Sort>(view.sort);
  const dlg = useRef<HTMLDialogElement>(null);
  const ready = useRef(false);
  const dateTimer = useRef(0); // typing a date fires a change per segment; wait for a pause before loading it

  // state -> URL; short ids, no JSON blobs. ?date= is the server's (it picks the data), so it is carried over as is.
  useEffect(() => {
    if (!ready.current) { ready.current = true; return; }
    const q = new URLSearchParams();
    const date = new URLSearchParams(window.location.search).get('date');
    if (date) q.set('date', date);
    if (cmp.join() !== DEFAULT_CMP.join()) q.set('cmp', cmp.join(','));
    if ([...sel].sort().join() !== [...defaults].sort().join()) q.set('m', sel.join(','));
    if (!spark) q.set('spark', '0');
    if (sort.col !== 0 || sort.dir !== 'desc') q.set('sort', `${sort.col}${sort.dir[0]}`);
    replaceQuery(q);
  }, [cmp, sel, spark, sort, defaults]);

  // a new as-of day is new data: replace (no history entry, no scroll jump) and let the server re-read the series
  const pickDate = (d: string) => {
    if (!d || d < bounds.min || d > bounds.max) return;
    const q = new URLSearchParams(window.location.search);
    if (d === bounds.max) q.delete('date'); else q.set('date', d);
    const qs = q.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const pickPeriod = (p: PeriodKey) => setCmp((c) => {
    if (c.includes(p)) return c.length > 1 ? c.filter((x) => x !== p) : c;
    const next = c.length >= 2 ? [c[1], p] : [...c, p];
    return PERIODS.filter((x) => next.includes(x));
  });

  const rows = table.rows.filter((r) => sel.includes(r.id));
  const chg = (r: MetricRow, p: PeriodKey) => change(r.now, r.periods[p].from, r.kind, r.signed, goodOf(r.name));
  const sortKey = cmp[Math.min(sort.col, cmp.length - 1)];
  const byGroup = groups.map((g) => {
    const list = rows.filter((r) => r.group === g.id);
    list.sort((a, b) => {
      const ca = chg(a, sortKey)?.value, cb = chg(b, sortKey)?.value;
      if (ca == null && cb == null) return 0;
      if (ca == null) return 1;
      if (cb == null) return -1;
      return sort.dir === 'desc' ? cb - ca : ca - cb;
    });
    return { ...g, list };
  }).filter((g) => g.list.length);

  const first = cmp[0];
  const rose = rows.filter((r) => chg(r, first)?.dir === 'up').length;
  const fell = rows.filter((r) => chg(r, first)?.dir === 'dn').length;

  const onSort = (col: 0 | 1) => setSort((so) => (so.col === col ? { col, dir: so.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' }));

  const csv = () => {
    const head = ['Metric', 'Group', `Now (${table.date})`, ...cmp.flatMap((p) => [`${p} ago (${table.periodDates[p]})`, `${p} change`])];
    const lines = byGroup.flatMap((g) => g.list.map((r) => [r.label, g.title, fmtMetricText(r.now, r.kind), ...cmp.flatMap((p) => [fmtMetricText(r.periods[p].from, r.kind), chg(r, p)?.text ?? 'no data'])]));
    downloadCsv([head, ...lines], `zec-metrics-${table.date}.csv`);
  };
  const toggle = (id: string) => setSel((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  return (
    <>
      <div className={s.tbCard} role="toolbar" aria-label="Table options">
        <div className={s.tg}>
          <label className={s.lbl} htmlFor="asof">As of</label>
          <input key={asOf ?? 'latest'} id="asof" className={s.date} type="date" min={bounds.min} max={bounds.max} defaultValue={asOf ?? table.date}
            onChange={(e) => { const v = e.target.value; window.clearTimeout(dateTimer.current); dateTimer.current = window.setTimeout(() => pickDate(v), 450); }} />
          {asOf && <button type="button" className={`btn ${s.sm}`} onClick={() => pickDate(bounds.max)}>Latest</button>}
        </div>
        <span className={s.sep} aria-hidden="true" />
        <div className={s.tg}>
          <span className={s.lbl} id="cmp-l">Compare against</span>
          <div className="seg" role="group" aria-labelledby="cmp-l">
            {PERIODS.map((p) => <button key={p} type="button" aria-pressed={cmp.includes(p)} onClick={() => pickPeriod(p)}>{p}</button>)}
          </div>
          <span className={s.hint}>pick up to 2</span>
        </div>
        <span className={s.sep} aria-hidden="true" />
        <div className={s.tg}>
          <span className={s.lbl}>View</span>
          <label className="check"><input type="checkbox" checked={spark} onChange={(e) => setSpark(e.target.checked)} />Sparklines</label>
        </div>
        <span className={s.sep} aria-hidden="true" />
        <button className={`btn ${s.sm}`} type="button" aria-haspopup="dialog" onClick={() => dlg.current?.showModal()}>
          <Icon name="filter" size={14} />Customize metrics <span className="small mono">{sel.length} of {table.rows.length}</span>
        </button>
        <div className={`${s.tg} ${s.push}`} role="group" aria-label="Share and download">
          <CopyButton className={`btn ${s.sm}`} size={14} />
          <button className={`btn ${s.sm}`} type="button" onClick={csv}><Icon name="download" size={14} />CSV</button>
        </div>
      </div>

      <section className="sec" aria-labelledby="tbl-h">
        <h2 className="sr-only" id="tbl-h">Metrics table</h2>
        <div className={s.sumline}>
          <p className="takeaway">Over {PERIOD_WORD[first]} <b>{rose} rose</b> and <b>{fell} fell</b>. Rows are grouped by subject and sorted by <b>{sortKey} change</b> ({sort.dir === 'desc' ? 'biggest rise first' : 'biggest fall first'}) inside each group.</p>
          <p className="small mono">Click a name for its chart · {rows.length} rows · {byGroup.length} groups</p>
        </div>
        <div className={`tbl-wrap ${s.wrap}`}>
          <table className={`t ${s.mt}`}>
            <caption className="sr-only">Zcash metrics now, with change over {cmp.map((p) => PERIOD_WORD[p]).join(' and ')}, grouped by subject</caption>
            <colgroup><col className={s.cName} /><col className={s.cNow} />{cmp.map((p) => <col key={p} className={s.chgCol} />)}</colgroup>
            <thead>
              <tr>
                <th scope="col" className={s.lft}>Metric</th>
                <th scope="col">Now<span className={s.sub}>{dateLong(table.date)}</span></th>
                {cmp.map((p, i) => {
                  const on = Math.min(sort.col, cmp.length - 1) === i;
                  return (
                    <th key={p} scope="col" className={s.chgCol} aria-sort={on ? (sort.dir === 'desc' ? 'descending' : 'ascending') : undefined}>
                      <button className={s.sort} type="button" onClick={() => onSort(i as 0 | 1)} aria-label={`Sort by ${p} change`}>
                        {p} change
                        <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d={on ? (sort.dir === 'desc' ? 'M10 4v12M6 12l4 4 4-4' : 'M10 16V4M6 8l4-4 4 4') : 'M7 4v12M4 7l3-3 3 3M13 16V4M10 13l3 3 3-3'} />
                        </svg>
                      </button>
                      <span className={s.sub}>vs {dateLong(table.periodDates[p])}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {byGroup.flatMap((g) => [
                <tr key={`g-${g.id}`} className={s.grp}><th colSpan={2 + cmp.length} scope="colgroup" id={`g-${g.id}`}><span className={s.g}>{g.title}</span><span className={s.gs}>{g.list.length} metric{g.list.length === 1 ? '' : 's'} · {g.desc}</span></th></tr>,
                ...g.list.map((r) => {
                  const now = fmtMetric(r.now, r.kind);
                  return (
                    <tr key={r.id}>
                      <th scope="row" className={s.mname} headers={`g-${g.id}`}>
                        <Link href={`/chart/${CHART_FIX[r.name] ?? r.chart}`}>{r.label}</Link>
                        <span className={s.u}>{r.desc}</span>
                      </th>
                      <td>
                        <span className={s.nowv}>{now.v}{now.unit && <small>{now.unit}</small>}</span>
                        <span className={s.mob}>{cmp.map((p) => { const c = chg(r, p); return <span key={p}><i>{p}</i> {c ? <b className={c.cls === 'muted' ? s.flat : c.cls}>{c.text}</b> : <span className="muted">no data</span>}</span>; })}</span>
                      </td>
                      {cmp.map((p) => {
                        const c = chg(r, p);
                        const per = r.periods[p];
                        if (!c) return <td key={p} className={s.chgCol}><span className={s.nodata} title={per.from === 0 ? `Was 0 on ${dateLong(table.periodDates[p])}` : 'No history this far back'}>{per.from === 0 ? 'Was 0 then' : 'No data'}</span></td>;
                        return (
                          <td key={p} className={s.chgCol}>
                            <span className={s.chg}>
                              {spark && <Spark values={per.spark} window={PERIOD_SPAN[p]} label={r.label} />}
                              <span className={s.cv}><b className={c.cls === 'muted' ? s.flat : c.cls}>{c.text}</b><small>from {fmtMetricText(per.from, r.kind)}</small></span>
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
      </section>

      <dialog ref={dlg} className={s.dlg} aria-labelledby="dlg-h" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className={s.dlgIn}>
          <div className={s.dlgHead}>
            <h2 className="h3" id="dlg-h">Choose metrics <span className="small mono">{sel.length} of {table.rows.length}</span></h2>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className={`btn ${s.sm}`} onClick={() => setSel(table.rows.map((r) => r.id))}>All</button>
              <button type="button" className={`btn ${s.sm}`} onClick={() => setSel([])}>None</button>
              <button type="button" className={`btn ${s.sm}`} onClick={() => setSel(defaults)}>Defaults</button>
            </div>
          </div>
          <div className={s.dlgBody}>
            {groups.map((g) => (
              <fieldset key={g.id}>
                <legend>{g.title}</legend>
                {table.rows.filter((r) => r.group === g.id).map((r) => (
                  <label key={r.id}><input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} />{r.label}</label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className={s.dlgFoot}>
            <span className="small">Your choice is kept in the link.</span>
            <button type="button" className="btn primary" onClick={() => dlg.current?.close()}>Done</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
