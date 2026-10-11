'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { Icon } from '@/components/ui/Icon';
import { compact, dateLong, num } from '@/lib/format';
import type { Correlations, CorrWindowKey, MetricSeries } from '@/lib/data/tools';
import { useWidth } from './useWidth';
import s from './correlate.module.css';
import { downloadCsv, replaceQuery } from '@/components/tools/browser';

const WINDOWS: CorrWindowKey[] = ['3M', '6M', '1Y', '2Y', '5Y', 'ALL'];
const pairIndex = (i: number, j: number, m: number) => { const a = Math.min(i, j), b = Math.max(i, j); return a * m - (a * (a + 1)) / 2 + (b - a - 1); };
const rTxt = (r: number) => (Math.abs(r) < 0.005 ? '0.00' : `${r > 0 ? '+' : '−'}${num(Math.abs(r), 2)}`);
// diverging pair, never pool hues: blue = together, rust = opposite
const tint = (r: number) => `color-mix(in srgb, ${r >= 0 ? 'var(--s1)' : 'var(--s2)'} ${Math.round(Math.abs(r) * 62)}%, var(--inset))`;
/** Axis tick in the metric's own unit (the metric-series `unit`): $1.2K, 29%, 3.4×, 4.1M ZEC. */
const tick = (v: number, unit?: string) => {
  const c = compact(Math.abs(v), 2), sg = v < 0 ? '−' : '';
  return unit === 'usd' ? `${sg}$${c}` : unit === 'pct' ? `${sg}${c}%` : unit === 'mult' ? `${sg}${c}×` : unit === 'kb' ? `${sg}${c} KB` : `${sg}${c}`;
};
const unitWord = (unit?: string) => (unit === 'zec' ? ' (ZEC)' : unit === 'count' ? ' (per day)' : '');
const strength = (r: number) => { const a = Math.abs(r); return a >= 0.9 ? 'almost in lockstep' : a >= 0.7 ? 'strongly' : a >= 0.4 ? 'moderately' : a >= 0.2 ? 'weakly' : 'barely'; };

function Scatter({ xs, ys, xLabel, yLabel, xUnit, yUnit }: { xs: number[]; ys: number[]; xLabel: string; yLabel: string; xUnit?: string; yUnit?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>(520);
  const h = Math.min(360, Math.max(240, Math.round(w * 0.62)));
  const m = { t: 12, r: 12, b: 40, l: 54 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const ext = (a: number[]) => { let lo = Infinity, hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi] as [number, number]; };
  const x = scaleLinear().domain(ext(xs)).range([0, iw]).nice(4);
  const y = scaleLinear().domain(ext(ys)).range([ih, 0]).nice(4);
  // least-squares fit line
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const slope = sxx ? sxy / sxx : 0;
  const [x0, x1] = x.domain();
  const step = Math.max(1, Math.ceil(n / 1500));
  return (
    <div ref={ref} className={s.scatter}>
      <svg width={w} height={h} role="img" aria-label={`Scatter of ${yLabel} against ${xLabel}, ${n} days, with a least-squares fit line`}>
        <defs><clipPath id="sc-clip"><rect width={iw} height={ih} /></clipPath></defs>
        <g transform={`translate(${m.l},${m.t})`}>
          {y.ticks(4).map((t) => <g key={`y${t}`}><line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke="var(--grid)" /><text x={-8} y={y(t)} dy="0.32em" textAnchor="end">{tick(t, yUnit)}</text></g>)}
          {x.ticks(4).map((t) => <text key={`x${t}`} x={x(t)} y={ih + 16} textAnchor="middle">{tick(t, xUnit)}</text>)}
          <line x1={0} x2={iw} y1={ih} y2={ih} stroke="var(--axis)" />
          <g clipPath="url(#sc-clip)">
            {xs.map((v, i) => (i % step ? null : <circle key={i} cx={x(v)} cy={y(ys[i])} r={2} fill="var(--s1)" opacity={0.25 + 0.75 * (i / n)} />))}
            <line x1={x(x0)} x2={x(x1)} y1={y(my + slope * (x0 - mx))} y2={y(my + slope * (x1 - mx))} stroke="var(--value)" strokeDasharray="5 4" strokeWidth={1.4} />
          </g>
          <text x={iw} y={ih + 34} textAnchor="end">{xLabel}{unitWord(xUnit)} →</text>
          <text x={0} y={-2}>↑ {yLabel}{unitWord(yUnit)}</text>
        </g>
      </svg>
    </div>
  );
}

export function Correlate({ data, defaults }: { data: Correlations; defaults: string[] }) {
  const M = data.metrics.length;
  const [win, setWin] = useState<CorrWindowKey>('ALL');
  const [sel, setSel] = useState<string[]>(defaults);
  const [pair, setPair] = useState<[number, number] | null>(null);
  const [series, setSeries] = useState<MetricSeries | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const ready = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const w = q.get('w') as CorrWindowKey | null;
    if (w && WINDOWS.includes(w)) setWin(w);
    const m = q.get('m')?.split(',').filter((id) => data.metrics.some((x) => x.id === id));
    if (m && m.length >= 2) setSel(m);
    ready.current = true;
  }, [data]);
  useEffect(() => {
    if (!ready.current) return;
    const q = new URLSearchParams();
    if (win !== 'ALL') q.set('w', win);
    if (sel.join() !== defaults.join()) q.set('m', sel.join(','));
    replaceQuery(q);
  }, [win, sel, defaults]);

  const idx = sel.map((id) => data.metrics.findIndex((m) => m.id === id)).filter((i) => i >= 0);
  const W = data.windows[win];
  const r = (i: number, j: number) => W.r[pairIndex(i, j, M)];
  const nOf = (i: number, j: number) => W.n[pairIndex(i, j, M)];

  const ranked: { i: number; j: number; r: number }[] = [];
  for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) { const v = r(idx[a], idx[b]); if (v != null) ranked.push({ i: idx[a], j: idx[b], r: v }); }
  ranked.sort((p, q) => Math.abs(q.r) - Math.abs(p.r));

  const active = pair && idx.includes(pair[0]) && idx.includes(pair[1]) ? pair : ranked[0] ? [ranked[0].j, ranked[0].i] as [number, number] : null;

  const hasPair = active != null;
  useEffect(() => {
    if (!hasPair || series || loadErr) return;
    fetch('/api/metric-series').then((res) => res.json()).then(setSeries).catch(() => setLoadErr(true));
  }, [hasPair, series, loadErr]);

  // y metric, x metric as primitives so the scatter is only rebuilt when the pair, data or window changes
  const [ay, ax] = active ?? [-1, -1];
  const scatter = useMemo(() => {
    const sy = series?.metrics[ay]?.series, sx = series?.metrics[ax]?.series;
    if (!series || !sy || !sx) return null;
    const N = series.dates.length;
    const start = N - ({ '3M': 92, '6M': 183, '1Y': 366, '2Y': 731, '5Y': 1827, ALL: N }[win]);
    const xs: number[] = [], ys: number[] = [];
    for (let k = Math.max(0, start); k < N; k++) { const a = sx[k], b = sy[k]; if (a != null && b != null) { xs.push(a); ys.push(b); } }
    return { xs, ys, nx: data.metrics[ax].label, ny: data.metrics[ay].label, ux: series.metrics[ax].unit, uy: series.metrics[ay].unit, from: series.dates[Math.max(0, start)], to: series.dates[N - 1] };
  }, [ay, ax, series, win, data.metrics]);

  const csv = () => {
    const head = ['', ...idx.map((i) => data.metrics[i].label)];
    const rows = idx.map((i) => [data.metrics[i].label, ...idx.map((j) => (i === j ? '1' : r(i, j)?.toFixed(3) ?? ''))]);
    downloadCsv([head, ...rows], `zec-correlations-${win}.csv`);
  };
  const groups = [...new Set(data.metrics.map((m) => m.group))];
  const top = ranked[0];

  return (
    <>
      <div className={s.bar} role="toolbar" aria-label="Correlation options">
        <span className={s.lbl} id="win-l">Window</span>
        <div className="seg" role="group" aria-labelledby="win-l">{WINDOWS.map((w) => <button key={w} type="button" aria-pressed={win === w} onClick={() => setWin(w)}>{w}</button>)}</div>
        <span className="small mono">{dateLong(W.from)} → {dateLong(W.to)}</span>
        <button type="button" className={`btn ${s.sm}`} aria-haspopup="dialog" onClick={() => dlg.current?.showModal()}><Icon name="filter" size={14} />Metrics <span className="small mono">{idx.length} of {M}</span></button>
        <div className={s.push}><button type="button" className={`btn ${s.sm}`} onClick={csv}><Icon name="download" size={14} />CSV</button></div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="stack" style={{ gap: 6, minWidth: 0, flex: '1 1 320px' }}>
            <h2 className="h3">Which pairs move together, and which move opposite?</h2>
            <p className="takeaway">{top ? <>Over this window the strongest pair is <b>{data.metrics[top.i].label}</b> and <b>{data.metrics[top.j].label}</b>: they move {strength(top.r)} {top.r >= 0 ? 'together' : 'in opposite directions'} (r <b className="mono">{rTxt(top.r)}</b>).</> : 'Pick at least two metrics.'}</p>
          </div>
          <div className={s.scaleKey} aria-hidden="true"><span>−1 opposite</span><i className={s.grad} /><span>+1 together</span></div>
        </div>
        <div className={s.wrap}>
          <table className={s.mx}>
            <caption className="sr-only">Correlation r between each pair of selected metrics, {win} window. Each pair appears once.</caption>
            <thead><tr><td />{idx.slice(0, -1).map((j) => <th key={j} scope="col">{data.metrics[j].label}</th>)}</tr></thead>
            <tbody>
              {idx.slice(1).map((i, row) => (
                <tr key={i}>
                  <th scope="row">{data.metrics[i].label}<small>{data.metrics[i].group}</small></th>
                  {idx.slice(0, -1).map((j, col) => {
                    if (col > row) return <td key={j} className={s.blank} />;
                    const v = r(i, j);
                    const on = !!active && ((active[0] === i && active[1] === j) || (active[0] === j && active[1] === i));
                    return (
                      <td key={j}>
                        <button type="button" className={s.cell} aria-pressed={on} style={v != null ? { background: tint(v) } : undefined} onClick={() => setPair([i, j])}
                          aria-label={`${data.metrics[i].label} vs ${data.metrics[j].label}: ${v == null ? 'not enough shared days' : `r ${rTxt(v)}`}`}>
                          {v == null ? <span className={s.na}>n/a</span> : rTxt(v)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">r is Pearson correlation of the daily values, from −1 (always opposite) through 0 (unrelated) to +1 (always together); the sign is printed in every cell, colour only repeats it. Each pair uses only days where both metrics have data.</p>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="stack" style={{ gap: 6 }}>
            <h2 className="h3">{active ? `How does ${data.metrics[active[0]].label} track ${data.metrics[active[1]].label}?` : 'Pick a cell'}</h2>
            {active && (() => { const v = r(active[0], active[1]); return <p className="takeaway">{v == null ? 'Not enough shared days in this window.' : <>r <b className="mono">{rTxt(v)}</b>, r² <b className="mono">{num(v * v, 3)}</b> over <b className="mono">{num(nOf(active[0], active[1]))}</b> shared days. Later days are drawn more opaque{scatter ? <> (faint {dateLong(scatter.from)} → solid {dateLong(scatter.to)})</> : null}.</>}</p>; })()}
          </div>
          {scatter ? <Scatter xs={scatter.xs} ys={scatter.ys} xLabel={scatter.nx} yLabel={scatter.ny} xUnit={scatter.ux} yUnit={scatter.uy} /> : <p className="note">{loadErr ? 'Could not load the daily series for the scatter.' : 'Loading the daily series…'}</p>}
          <p className="small">Each dot is one day · dashed line: least-squares fit · correlation is not causation.</p>
        </div>
        <div className="card">
          <div className="stack" style={{ gap: 6 }}>
            <h2 className="h3">Which relationships are strongest?</h2>
            <p className="takeaway">Every pair of the {idx.length} selected metrics, strongest first, whichever direction.</p>
          </div>
          <ul className={s.pairs}>
            {ranked.slice(0, 10).map((p) => {
              const on = !!active && ((active[0] === p.i && active[1] === p.j) || (active[0] === p.j && active[1] === p.i));
              return (
                <li key={`${p.i}-${p.j}`}>
                  <button type="button" aria-pressed={on} onClick={() => setPair([p.j, p.i])}>
                    <span>{data.metrics[p.i].label} <span className="muted">vs</span> {data.metrics[p.j].label}</span>
                    <b className={p.r >= 0 ? s.pos : s.neg}>{rTxt(p.r)}</b>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <dialog ref={dlg} className={s.dlg} aria-labelledby="cdlg-h" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className={s.dlgIn}>
          <div className={s.dlgHead}>
            <h2 className="h3" id="cdlg-h">Choose metrics <span className="small mono">{idx.length} of {M}</span></h2>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className={`btn ${s.sm}`} onClick={() => setSel(defaults)}>Defaults</button>
              <button type="button" className={`btn ${s.sm}`} onClick={() => setSel(sel.slice(0, 2))}>Clear</button>
            </div>
          </div>
          <div className={s.dlgBody}>
            {groups.map((g) => (
              <fieldset key={g}>
                <legend>{g}</legend>
                {data.metrics.filter((m) => m.group === g).map((m) => (
                  <label key={m.id}><input type="checkbox" checked={sel.includes(m.id)} disabled={!sel.includes(m.id) && sel.length >= 10} onChange={() => setSel((xs) => (xs.includes(m.id) ? (xs.length > 2 ? xs.filter((x) => x !== m.id) : xs) : [...xs, m.id]))} />{m.label}</label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className={s.dlgFoot}><span className="small">2 to 10 metrics · kept in the link.</span><button type="button" className="btn primary" onClick={() => dlg.current?.close()}>Done</button></div>
        </div>
      </dialog>
    </>
  );
}
