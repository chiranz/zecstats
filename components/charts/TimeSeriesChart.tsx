'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { scaleLinear, scaleLog, scaleUtc } from 'd3-scale';
import { area as d3area, line as d3line, curveLinear, curveStepAfter } from 'd3-shape';
import { formatValue, type ValueFormat } from './valueFormat';
import { dateLong, dateShort, monthYear, year } from '@/lib/format';

export type Series = {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  type?: 'line' | 'area' | 'bar';
  dashed?: boolean;
  hidden?: boolean; // initially hidden (toggle with its chip)
  width?: number;
  agg?: 'sum' | 'mean'; // how bars combine when days are bucketed (default sum; mean for daily rates next to an average line)
};

export type RangeKey = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'ALL';
const RANGE_DAYS: Record<RangeKey, number> = { '1M': 31, '3M': 92, '6M': 183, '1Y': 366, '2Y': 731, '5Y': 1827, ALL: Infinity };

export type ChartEvent = { date: string; label: string };

export type TimeSeriesChartProps = {
  dates: string[]; // YYYY-MM-DD, ascending
  series: Series[];
  format: ValueFormat;
  stacked?: boolean;
  ranges?: RangeKey[] | false;
  defaultRange?: RangeKey;
  logToggle?: boolean;
  defaultLog?: boolean;
  shareToggle?: boolean; // stacked only: ZEC | Share %
  height?: number;
  yDomain?: [number, number];
  zeroBaseline?: boolean;
  events?: ChartEvent[];
  step?: boolean;
  ariaLabel: string;
  showLegend?: boolean;
  compactControls?: boolean;
};

const M = { top: 14, right: 16, bottom: 28, left: 58 };

export function TimeSeriesChart(props: TimeSeriesChartProps) {
  const { dates, series, format, stacked = false, ranges = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'], defaultRange = '1Y', logToggle = false, defaultLog = false, shareToggle = false, height = 360, yDomain, zeroBaseline, events = [], step = false, ariaLabel, showLegend = true } = props;
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [range, setRange] = useState<RangeKey>(ranges ? defaultRange : 'ALL');
  const [log, setLog] = useState(defaultLog);
  const [share, setShare] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(series.filter((s) => s.hidden).map((s) => s.key)));
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 520;
  const h = narrow ? Math.max(220, Math.min(height, Math.round(width * 0.7))) : height;
  const m = narrow ? { ...M, left: 46, right: 8 } : M;
  const iw = width - m.left - m.right;
  const ih = h - m.top - m.bottom;

  // ---- range slice ----
  const start = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!Number.isFinite(days) || !dates.length) return 0;
    const last = Date.parse(dates[dates.length - 1]);
    const cutoff = last - days * 86400000;
    let i = 0;
    while (i < dates.length && Date.parse(dates[i]) < cutoff) i++;
    return i;
  }, [dates, range]);

  const visible = series.filter((s) => !hidden.has(s.key));
  const hasBars = series.some((s) => s.type === 'bar');

  // ---- bucket bars when there are too many to draw (sum, or mean with agg) ; thin lines (keep every k-th) ----
  const view = useMemo(() => {
    const ds = dates.slice(start);
    const cols = series.map((s) => s.values.slice(start));
    const maxPts = hasBars ? Math.max(30, Math.floor(iw / 4)) : Math.max(120, iw);
    if (ds.length <= maxPts) return { ds, cols };
    const k = Math.ceil(ds.length / maxPts);
    const nds: string[] = [];
    const ncols: (number | null)[][] = cols.map(() => []);
    for (let i = 0; i < ds.length; i += k) {
      const end = Math.min(ds.length, i + k);
      nds.push(ds[end - 1]);
      cols.forEach((c, si) => {
        if (series[si].type === 'bar') {
          let sum = 0, n = 0;
          for (let j = i; j < end; j++) if (c[j] != null) { sum += c[j]!; n++; }
          ncols[si].push(n ? (series[si].agg === 'mean' ? sum / n : sum) : null);
        } else ncols[si].push(c[end - 1]);
      });
    }
    return { ds: nds, cols: ncols, bucket: k };
  }, [dates, series, start, iw, hasBars]);

  // ---- stacking / share ----
  const layers = useMemo(() => {
    const vis = series.map((s, i) => ({ s, i })).filter(({ s }) => !hidden.has(s.key));
    const n = view.ds.length;
    if (!stacked) return vis.map(({ s, i }) => ({ s, lo: null as (number | null)[] | null, hi: view.cols[i] }));
    const totals = new Array(n).fill(0);
    if (share) for (const { i } of vis) view.cols[i].forEach((v, j) => (totals[j] += v ?? 0));
    const base = new Array(n).fill(0);
    return vis.map(({ s, i }) => {
      const lo = base.slice();
      const hi = view.cols[i].map((v, j) => {
        const val = (v ?? 0) * (share && totals[j] ? 100 / totals[j] : 1);
        base[j] += val;
        return base[j];
      });
      return { s, lo, hi };
    });
  }, [series, hidden, view, stacked, share]);

  // ---- scales ----
  const x = useMemo(() => {
    const t0 = Date.parse(view.ds[0] ?? dates[0]);
    const t1 = Date.parse(view.ds[view.ds.length - 1] ?? dates[dates.length - 1]);
    return scaleUtc().domain([new Date(t0), new Date(t1 === t0 ? t0 + 86400000 : t1)]).range([0, iw]);
  }, [view.ds, dates, iw]);

  const yInfo = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const L of layers) {
      for (const v of L.hi) if (v != null && Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      if (L.lo) for (const v of L.lo) if (v != null) lo = Math.min(lo, v);
    }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    if (share) { lo = 0; hi = 100; }
    if (yDomain && !share) { lo = yDomain[0]; hi = yDomain[1]; }
    const zero = zeroBaseline ?? (stacked || hasBars || series.every((s) => s.type === 'area'));
    const useLog = log && lo > 0;
    if (zero && !useLog && lo > 0) lo = 0;
    if (!yDomain && !share && !useLog) { const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.1 || 1; const wasPositive = lo >= 0; hi += pad; if (!zero) lo -= pad; if (wasPositive && lo < 0) lo = 0; }
    const y = useLog ? scaleLog().domain([lo * 0.9, hi * 1.1]).range([ih, 0]) : scaleLinear().domain([lo, hi]).range([ih, 0]).nice(5);
    return { y, useLog };
  }, [layers, share, yDomain, zeroBaseline, stacked, hasBars, series, log, ih]);
  const { y, useLog } = yInfo;

  const xs = view.ds.map((d) => x(new Date(Date.parse(d))));
  const curve = step ? curveStepAfter : curveLinear;
  const barW = Math.max(1, (iw / Math.max(1, view.ds.length)) * 0.72);
  const spanDays = (Date.parse(view.ds[view.ds.length - 1]) - Date.parse(view.ds[0])) / 86400000;
  const tickFmt = (d: Date) => (spanDays > 900 ? year(d) : spanDays > 120 ? monthYear(d) : dateShort(d));
  // keep ticks at least ~64px from the last kept one so labels never collide
  const xTicks = x.ticks(narrow ? 4 : 6).reduce<Date[]>((kept, t) => {
    const px = x(t);
    if (px <= iw - 18 && (!kept.length || px - x(kept[kept.length - 1]) >= (narrow ? 70 : 64))) kept.push(t);
    return kept;
  }, []);
  const yTicks = useLog ? (y as ReturnType<typeof scaleLog>).ticks(5).filter((_, i, a) => a.length <= 6 || i % Math.ceil(a.length / 6) === 0) : (y as ReturnType<typeof scaleLinear>).ticks(5);
  const fmtY = (v: number) => formatValue(v, share ? 'pct0' : format, true);

  const hi = hover != null && hover < view.ds.length ? hover : null;

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || !view.ds.length) return;
    const px = clientX - el.getBoundingClientRect().left - m.left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < xs.length; i++) { const d = Math.abs(xs[i] - px); if (d < bd) { bd = d; best = i; } }
    setHover(best);
  };

  const toggle = (k: string) => setHidden((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else if (series.length - n.size > 1) n.add(k); return n; });

  const tipLeft = hi != null ? Math.min(Math.max(0, xs[hi] + m.left + 14), width - 210) : 0;
  const flip = hi != null && xs[hi] + m.left + 230 > width;

  return (
    <div className="stack" style={{ gap: 12 }}>
      {(ranges || logToggle || (stacked && shareToggle)) && (
        <div className="toolbar">
          {ranges && (
            <div className="seg" role="group" aria-label="Range">
              {ranges.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
            </div>
          )}
          {logToggle && (
            <div className="seg" role="group" aria-label="Scale">
              <button type="button" aria-pressed={!log} onClick={() => setLog(false)}>Linear</button>
              <button type="button" aria-pressed={log} onClick={() => setLog(true)}>Log</button>
            </div>
          )}
          {stacked && shareToggle && (
            <div className="seg" role="group" aria-label="Units">
              <button type="button" aria-pressed={!share} onClick={() => setShare(false)}>{format.startsWith('usd') ? 'USD' : format.startsWith('zec') ? 'ZEC' : 'Value'}</button>
              <button type="button" aria-pressed={share} onClick={() => setShare(true)}>Share %</button>
            </div>
          )}
        </div>
      )}
      {showLegend && series.length > 1 && (
        <div className="row" style={{ gap: 6 }} role="group" aria-label="Series">
          {series.map((s) => {
            const on = !hidden.has(s.key);
            const last = [...s.values].reverse().find((v) => v != null);
            return (
              <button key={s.key} type="button" className="chip" aria-pressed={on} onClick={() => toggle(s.key)} title={on ? `Hide ${s.label}` : `Show ${s.label}`} style={on ? undefined : { opacity: 0.55 }}>
                <i className={s.type === 'line' || !s.type ? 'ln' : 'sw'} style={{ background: s.dashed ? `repeating-linear-gradient(90deg, ${s.color} 0 4px, transparent 4px 7px)` : s.color, width: s.type === 'line' || !s.type ? 14 : 10 }} />
                {s.label}
                {last != null && <span className="muted" style={{ marginLeft: 2 }}>{formatValue(last, format)}</span>}
              </button>
            );
          })}
        </div>
      )}
      <div
        ref={wrapRef}
        className="chart"
        style={{ height: h, touchAction: 'pan-y' }}
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((v) => Math.max(0, (v ?? view.ds.length) - 1)); }
          if (e.key === 'ArrowRight') { e.preventDefault(); setHover((v) => Math.min(view.ds.length - 1, (v ?? -1) + 1)); }
          if (e.key === 'Escape') setHover(null);
        }}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">
          <defs><clipPath id={`clip-${uid}`}><rect x={0} y={-2} width={iw} height={ih + 4} /></clipPath></defs>
          <g transform={`translate(${m.left},${m.top})`}>
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line className="gl" x1={0} x2={iw} y1={y(t)} y2={y(t)} />
                <text x={-10} y={y(t)} dy="0.32em" textAnchor="end">{fmtY(t)}</text>
              </g>
            ))}
            <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
            {xTicks.map((t, i) => (
              <text key={`x${i}`} x={x(t)} y={ih + 18} textAnchor={i === 0 && x(t) < 20 ? 'start' : 'middle'}>{tickFmt(t)}</text>
            ))}
            <g clipPath={`url(#clip-${uid})`}>
              {layers.map(({ s, lo, hi: top }) => {
                const pts = top.map((v, i) => [xs[i], v] as const);
                if (s.type === 'bar') {
                  return (
                    <g key={s.key} fill={s.color}>
                      {pts.map(([px, v], i) => {
                        if (v == null) return null;
                        const b = lo ? lo[i] ?? 0 : 0;
                        const y0 = y(Math.max(b, useLog ? 1e-9 : -Infinity)), y1 = y(v);
                        return <rect key={i} x={px - barW / 2} y={Math.min(y0, y1)} width={barW} height={Math.max(0.5, Math.abs(y0 - y1))} rx={barW > 4 ? 1.5 : 0} opacity={hi != null && hi !== i ? 0.55 : 1} />;
                      })}
                    </g>
                  );
                }
                const defined = (d: readonly [number, number | null]) => d[1] != null && Number.isFinite(d[1]) && (!useLog || d[1]! > 0);
                const ln = d3line<readonly [number, number | null]>().defined(defined).x((d) => d[0]).y((d) => y(d[1]!)).curve(curve);
                if (s.type === 'area' || stacked) {
                  const ar = d3area<readonly [number, number | null]>().defined(defined).x((d) => d[0]).y1((d) => y(d[1]!)).y0((_, i) => (lo ? y(lo[i] ?? 0) : ih)).curve(curve);
                  return (
                    <g key={s.key}>
                      <path d={ar(pts) ?? ''} fill={s.color} opacity={stacked ? 0.78 : 0.14} />
                      <path d={ln(pts) ?? ''} fill="none" stroke={s.color} strokeWidth={stacked ? 1 : 1.8} />
                    </g>
                  );
                }
                return <path key={s.key} d={ln(pts) ?? ''} fill="none" stroke={s.color} strokeWidth={s.width ?? 1.9} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />;
              })}
            </g>
            {events.map((ev, i) => {
              const t = Date.parse(ev.date);
              if (!view.ds.length || t < Date.parse(view.ds[0]) || t > Date.parse(view.ds[view.ds.length - 1])) return null;
              const ex = x(new Date(t));
              return (
                <g key={i}>
                  <line x1={ex} x2={ex} y1={0} y2={ih} stroke="var(--axis)" strokeDasharray="2 4" />
                  {/* near the right edge the label goes left of its line so it stays inside the plot */}
                  <text x={ex > iw - 80 ? ex - 5 : ex + 5} textAnchor={ex > iw - 80 ? 'end' : 'start'} y={10 + (i % 2) * 13} style={{ fontSize: 10.5 }}>{ev.label}</text>
                </g>
              );
            })}
            {hi != null && (
              <g>
                <line x1={xs[hi]} x2={xs[hi]} y1={0} y2={ih} stroke="var(--axis)" />
                {layers.map(({ s, hi: top }) => (top[hi] != null && s.type !== 'bar' ? <circle key={s.key} cx={xs[hi]} cy={y(top[hi]!)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={1.5} /> : null))}
              </g>
            )}
          </g>
        </svg>
        {hi != null && (
          <div className="tip" style={{ top: 8, left: flip ? undefined : tipLeft, right: flip ? width - (xs[hi] + m.left) + 14 : undefined, pointerEvents: 'none' }}>
            <b>{dateLong(view.ds[hi])}{view.bucket ? <span className="muted"> · {view.bucket}-day</span> : null}</b>
            {series.map((s, si) => {
              if (hidden.has(s.key)) return null;
              const raw = view.cols[si][hi];
              if (raw == null) return null;
              const L = layers.find((l) => l.s.key === s.key);
              const shown = share && L ? (L.hi[hi]! - (L.lo?.[hi] ?? 0)) : raw;
              return (
                <span key={s.key} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, alignItems: 'center' }}>
                  <i className="sw" style={{ background: s.color }} />
                  <span>{s.label}</span>
                  <b>{formatValue(shown, share ? 'pct' : format)}</b>
                </span>
              );
            })}
            {stacked && !share && visible.length > 1 && (
              <span style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 5 }}>
                <i /> <span>Total shown</span>
                <b>{formatValue(series.reduce((a, s, si) => a + (hidden.has(s.key) ? 0 : view.cols[si][hi] ?? 0), 0), format)}</b>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
