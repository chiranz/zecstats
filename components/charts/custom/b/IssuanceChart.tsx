'use client';

import { useId, useMemo, useState } from 'react';
import { scaleLinear, scaleLog } from 'd3-scale';
import { line as d3line } from 'd3-shape';
import s from './b.module.css';
import { useWidth, longDate, power, r2 } from './shared';
import { formatValue, type ValueFormat } from '@/components/charts/valueFormat';

type Pt = [number, number, string]; // [coins issued, value, date]
type Props = {
  series: { key: string; label: string; color: string; points: Pt[] }[];
  unit: 'power' | ValueFormat;
  log?: boolean;
  marker?: number; // coins issued "today" (vertical reference)
  ariaLabel?: string;
};

/** Lines on x = coins issued (millions), log y with a labelled tick at every decade. */
export function IssuanceChart(props: Record<string, unknown>) {
  const { series, unit, log = true, marker, ariaLabel } = props as Props;
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hx, setHx] = useState<number | null>(null);
  const clip = `b-iss-${useId().replace(/:/g, '')}`;
  const narrow = width < 520;
  const m = { top: 12, right: narrow ? 12 : 64, bottom: 40, left: narrow ? 52 : 62 };
  const h = narrow ? 300 : 380;
  const iw = width - m.left - m.right, ih = h - m.top - m.bottom;
  const fmt = (v: number, axis = false) => (unit === 'power' ? power(v) : formatValue(v, unit, axis));

  const { x, y, yTicks, xTicks } = useMemo(() => {
    const xs = series.flatMap((q) => q.points.map((p) => p[0]));
    const vs = series.flatMap((q) => q.points.map((p) => p[1])).filter((v) => v > 0);
    const xMax = Math.max(...xs);
    const x = scaleLinear().domain([0, xMax]).range([0, iw]).nice();
    const lo = Math.min(...vs), hi = Math.max(...vs);
    const y = log ? scaleLog().domain([lo, hi * 1.3]).range([ih, 0]) : scaleLinear().domain([0, hi * 1.08]).range([ih, 0]).nice();
    let yTicks: number[];
    if (log) {
      const all: number[] = [];
      for (let p = Math.ceil(Math.log10(lo)); p <= Math.floor(Math.log10(hi * 1.3)); p++) all.push(10 ** p);
      const step = Math.ceil(all.length / (narrow ? 5 : 8));
      yTicks = all.filter((_, i) => (all.length - 1 - i) % step === 0);
    } else yTicks = (y as ReturnType<typeof scaleLinear>).ticks(5);
    const xTicks = x.ticks(narrow ? 4 : 7);
    return { x, y, yTicks, xTicks };
  }, [series, iw, ih, log, narrow]);

  const paths = useMemo(() => series.map((q) => ({ ...q, d: d3line<Pt>().defined((p) => p[1] > 0).x((p) => x(p[0])).y((p) => y(p[1]))(q.points) ?? '' })), [series, x, y]);
  const near = (pts: Pt[], sx: number) => {
    if (!pts.length || sx < pts[0][0] || sx > pts[pts.length - 1][0]) return null;
    let best = pts[0], bd = Infinity;
    for (const p of pts) { const d = Math.abs(p[0] - sx); if (d < bd) { bd = d; best = p; } }
    return best;
  };
  const sx = hx != null ? x.invert(hx) : null;
  const hits = sx != null ? series.map((q) => ({ q, p: near(q.points, sx) })) : [];
  const both = hits.length === 2 && hits[0].p && hits[1].p ? hits[0].p[1] / hits[1].p[1] : null;

  return (
    <div>
      <div className={s.legend} aria-hidden="true">
        {series.map((q) => <span key={q.key} className={s.key}><i style={{ background: q.color }} />{q.label}</span>)}
        {log && <span>Log scale — each gridline is 10×</span>}
      </div>
      <div
        ref={ref}
        className={s.wrap}
        role="img"
        aria-label={ariaLabel ?? 'Issuance-aligned comparison'}
        tabIndex={0}
        style={{ touchAction: 'pan-y' }}
        onPointerMove={(e) => { const v = e.clientX - e.currentTarget.getBoundingClientRect().left - m.left; setHx(v >= 0 && v <= iw ? v : null); }}
        onPointerLeave={() => setHx(null)}
        onBlur={() => setHx(null)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setHx(null);
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setHx((v) => Math.max(0, Math.min(iw, (v ?? (marker != null ? x(marker) : iw)) + (e.key === 'ArrowRight' ? 1 : -1) * iw / 60))); }
        }}
      >
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">
          <defs><clipPath id={clip}><rect x={0} y={-2} width={iw} height={ih + 4} /></clipPath></defs>
          <g transform={`translate(${m.left},${m.top})`}>
            {yTicks.map((t) => (
              <g key={t}><line className="gl" x1={0} x2={iw} y1={r2(y(t))} y2={r2(y(t))} /><text x={-8} y={r2(y(t))} dy="0.32em" textAnchor="end">{fmt(t, true)}</text></g>
            ))}
            <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
            {xTicks.map((t, i) => <text key={i} x={r2(x(t))} y={ih + 18} textAnchor={i === 0 ? 'start' : 'middle'}>{t === 0 ? '0' : `${+(t / 1e6).toFixed(1)}M`}</text>)}
            <text x={iw} y={ih + 34} textAnchor="end">coins issued →</text>
            {marker != null && (
              <g><line x1={r2(x(marker))} x2={r2(x(marker))} y1={0} y2={ih} stroke="var(--axis)" strokeDasharray="3 4" /><text x={r2(x(marker) - 6)} y={12} textAnchor="end" className={s.label}>Zcash today</text></g>
            )}
            <g clipPath={`url(#${clip})`}>
              {paths.map((q) => <path key={q.key} d={q.d} fill="none" stroke={q.color} strokeWidth={q.key === 'zec' ? 2.2 : 1.8} strokeLinejoin="round" />)}
            </g>
            {!narrow && paths.map((q) => { const p = q.points[q.points.length - 1]; return p ? <text key={`l${q.key}`} x={r2(x(p[0]) + 6)} y={r2(y(p[1]))} dy="0.32em" style={{ fill: q.color }}>{q.label}</text> : null; })}
            {hx != null && (
              <g>
                <line x1={hx} x2={hx} y1={0} y2={ih} stroke="var(--axis)" />
                {hits.map(({ q, p }) => (p ? <circle key={q.key} cx={x(p[0])} cy={y(p[1])} r={3.5} fill={q.color} stroke="var(--card)" strokeWidth={1.5} /> : null))}
              </g>
            )}
          </g>
        </svg>
        {hx != null && sx != null && (
          <div className="tip" style={{ top: 8, left: hx + m.left > width - 250 ? undefined : hx + m.left + 14, right: hx + m.left > width - 250 ? width - (hx + m.left) + 14 : undefined, pointerEvents: 'none' }}>
            <b>{(sx / 1e6).toFixed(2)}M coins issued</b>
            {hits.map(({ q, p }) => p && (
              <span key={q.key} className={s.tipRow}><i className="sw" style={{ background: q.color }} /><span>{q.label} <span className="muted">{longDate(p[2])}</span></span><b>{fmt(p[1])}</b></span>
            ))}
            {both != null && <span className="muted">{series[0].label} = {both < 1 ? both.toFixed(3) : both.toFixed(1)}× {series[1].label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
