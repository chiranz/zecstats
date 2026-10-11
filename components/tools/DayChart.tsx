'use client';

import { useState, type CSSProperties } from 'react';
import { scaleLinear, scaleLog } from 'd3-scale';
import { line as d3line } from 'd3-shape';
import { useWidth } from './useWidth';

// Line chart over a numeric x axis (day N of a run), for comparisons that are not aligned by calendar date.
// Same visual language as TimeSeriesChart: faint gridlines, mono tick labels, one tooltip style (.tip).
export type DaySeries = { key: string; label: string; color: string; points: { x: number; y: number; date?: string }[]; dashed?: boolean };
export type DayMarker = { x: number; y: number; label: string; color: string; anchor?: 'start' | 'end' };

export function DayChart({ series, xMax, log = false, yFmt, xFmt = (x) => `day ${x}`, tipFmt, refY, refLabel, markers = [], height = 360, ariaLabel, endLabels = true, zero = true }: {
  series: DaySeries[]; xMax: number; log?: boolean; yFmt: (v: number) => string; xFmt?: (x: number) => string; tipFmt?: (s: DaySeries, p: { x: number; y: number; date?: string }) => string;
  refY?: number; refLabel?: string; markers?: DayMarker[]; height?: number; ariaLabel: string; endLabels?: boolean; zero?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>(900);
  const [hover, setHover] = useState<number | null>(null);
  const narrow = width < 520;
  const h = narrow ? Math.max(220, Math.min(height, Math.round(width * 0.72))) : height;
  const m = { top: 16, right: endLabels ? (narrow ? 76 : 110) : 16, bottom: 28, left: narrow ? 46 : 60 };
  const iw = width - m.left - m.right, ih = h - m.top - m.bottom;
  const vis = series.map((s) => ({ ...s, points: s.points.filter((p) => p.x <= xMax) }));
  const ys = vis.flatMap((s) => s.points.map((p) => p.y)).concat(refY != null ? [refY] : []).concat(markers.filter((k) => k.x <= xMax).map((k) => k.y));
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
  const x = scaleLinear().domain([0, xMax]).range([0, iw]);
  const useLog = log && lo > 0;
  const y = useLog ? scaleLog().domain([lo * 0.9, hi * 1.1]).range([ih, 0]) : scaleLinear().domain([zero ? Math.min(0, lo) : lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.08]).range([ih, 0]).nice(5);
  const yTicks = useLog ? (y as ReturnType<typeof scaleLog>).ticks(5).filter((_, i, a) => a.length <= 6 || i % Math.ceil(a.length / 6) === 0) : (y as ReturnType<typeof scaleLinear>).ticks(5);
  const xTicks = x.ticks(narrow ? 4 : 7).filter((tk) => x(tk) <= iw - 10);
  const ln = d3line<{ x: number; y: number }>().x((p) => x(p.x)).y((p) => y(p.y));

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const px = clientX - el.getBoundingClientRect().left - m.left;
    setHover(Math.max(0, Math.min(xMax, Math.round(x.invert(px)))));
  };
  const near = (s: DaySeries, d: number) => {
    let best: (typeof s.points)[number] | undefined;
    for (const p of s.points) { if (p.x <= d) best = p; else break; }
    return best && d - best.x <= 3 ? best : undefined;
  };
  const tipLeft = hover != null ? Math.min(Math.max(0, x(hover) + m.left + 14), width - 220) : 0;
  const flip = hover != null && x(hover) + m.left + 240 > width;

  return (
    <div className="chart-box">
    <div ref={ref} className="chart chart-h" style={{ '--h': `${height}px`, '--hk': 72, touchAction: 'pan-y' } as CSSProperties} tabIndex={0} role="img" aria-label={ariaLabel}
      onPointerMove={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((v) => Math.max(0, (v ?? xMax) - 1)); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setHover((v) => Math.min(xMax, (v ?? -1) + 1)); }
        if (e.key === 'Escape') setHover(null);
      }}>
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">
        <defs><clipPath id={`dc-${ariaLabel.length}-${xMax}`}><rect x={0} y={-2} width={iw} height={ih + 4} /></clipPath></defs>
        <g transform={`translate(${m.left},${m.top})`}>
          {yTicks.map((tk) => (
            <g key={tk}><line className="gl" x1={0} x2={iw} y1={y(tk)} y2={y(tk)} /><text x={-10} y={y(tk)} dy="0.32em" textAnchor="end">{yFmt(tk)}</text></g>
          ))}
          <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
          {xTicks.map((tk, i) => <text key={tk} x={x(tk)} y={ih + 18} textAnchor={i === 0 ? 'start' : 'middle'}>{i === 0 ? xFmt(tk) : tk}</text>)}
          {refY != null && (
            <g>
              <line x1={0} x2={iw} y1={y(refY)} y2={y(refY)} stroke="var(--axis)" strokeDasharray="3 4" />
              {refLabel && <text x={4} y={y(refY) - 6}>{refLabel}</text>}
            </g>
          )}
          <g clipPath={`url(#dc-${ariaLabel.length}-${xMax})`}>
            {vis.map((s) => <path key={s.key} d={ln(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={1.9} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />)}
          </g>
          {markers.filter((k) => k.x <= xMax).map((k) => (
            <g key={k.label}>
              <circle cx={x(k.x)} cy={y(k.y)} r={4} fill={k.color} stroke="var(--card)" strokeWidth={1.5} />
              <text x={x(k.x) + (k.anchor === 'end' ? -8 : 8)} y={y(k.y) - 8} textAnchor={k.anchor ?? 'start'} style={{ fill: 'var(--text-2)' }}>{k.label}</text>
            </g>
          ))}
          {endLabels && vis.map((s) => {
            const p = s.points.at(-1);
            if (!p) return null;
            return <text key={s.key} x={x(p.x) + 8} y={y(p.y)} dy="0.32em" style={{ fill: s.color, fontWeight: 600 }}>{s.label} {yFmt(p.y)}</text>;
          })}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={ih} stroke="var(--axis)" />
              {vis.map((s) => { const p = near(s, hover); return p ? <circle key={s.key} cx={x(p.x)} cy={y(p.y)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={1.5} /> : null; })}
            </g>
          )}
        </g>
      </svg>
      {hover != null && (
        <div className="tip" style={{ top: 8, left: flip ? undefined : tipLeft, right: flip ? width - (x(hover) + m.left) + 14 : undefined, pointerEvents: 'none' }}>
          <b>Day {hover}</b>
          {vis.map((s) => {
            const p = near(s, hover);
            if (!p) return null;
            return (
              <span key={s.key} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, alignItems: 'center' }}>
                <i className="sw" style={{ background: s.color }} /><span>{s.label}</span><b>{tipFmt ? tipFmt(s, p) : yFmt(p.y)}</b>
              </span>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}
