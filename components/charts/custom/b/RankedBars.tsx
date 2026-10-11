'use client';

import { scaleLinear, scaleLog } from 'd3-scale';
import s from './b.module.css';
import { useWidth, r2 } from './shared';
import { formatValue, type ValueFormat } from '@/components/charts/valueFormat';

type Row = { label: string; value?: number; left?: number; right?: number; highlight?: boolean; color?: string };
type Props = {
  mode: 'single' | 'diverging';
  rows: Row[];
  format: ValueFormat;
  unit?: string;
  log?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  ariaLabel?: string;
};

/** Horizontal ranked bars. single: one value per row (highlighted row in the accent, others neutral).
 *  diverging: `left` drawn to the left of zero, `right` to the right, with a marker at right − left. */
export function RankedBars(props: Record<string, unknown>) {
  const { mode, rows, format, unit, log = false, leftLabel, rightLabel, ariaLabel } = props as Props;
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width < 520;
  const rh = 26, gap = 6;
  const labelW = narrow ? 52 : 70, valueW = mode === 'single' ? (narrow ? 62 : 76) : 0;
  const top = mode === 'diverging' ? 22 : 4;
  const h = top + rows.length * (rh + gap) + 18;
  const iw = width - labelW - valueW - 8;
  const f = (v: number, axis = false) => formatValue(v, format, axis);

  let body;
  if (mode === 'single') {
    const vs = rows.map((r) => r.value ?? 0).filter((v) => v > 0);
    const lo = Math.min(...vs), hi = Math.max(...vs);
    const xr = log ? scaleLog().domain([10 ** Math.floor(Math.log10(lo)), 10 ** Math.ceil(Math.log10(hi))]).range([0, iw]) : scaleLinear().domain([0, hi]).range([0, iw]).nice();
    const x = (v: number) => r2(xr(v));
    const ticks = log ? (() => { const t: number[] = []; for (let p = Math.floor(Math.log10(lo)); p <= Math.ceil(Math.log10(hi)); p++) t.push(10 ** p); const k = Math.ceil(t.length / (narrow ? 4 : 7)); return t.filter((_, i) => i % k === 0); })() : (xr as ReturnType<typeof scaleLinear>).ticks(narrow ? 3 : 5);
    const x0 = log ? 0 : x(0);
    body = (
      <g transform={`translate(${labelW},${top})`}>
        {ticks.map((t) => <g key={t}><line className="gl" x1={x(t)} x2={x(t)} y1={0} y2={rows.length * (rh + gap)} /><text x={x(t)} y={rows.length * (rh + gap) + 14} textAnchor="middle">{f(t, true)}</text></g>)}
        {rows.map((r, i) => {
          const yy = i * (rh + gap), v = r.value ?? 0;
          return (
            <g key={r.label}>
              <text x={-8} y={yy + rh / 2} dy="0.32em" textAnchor="end" className={r.highlight ? s.strong : s.label}>{r.label}</text>
              <rect x={x0} y={yy} width={Math.max(1, x(Math.max(v, log ? xr.domain()[0] : 0)) - x0)} height={rh} rx={3} fill={r.highlight ? 'var(--zec)' : r.color ?? 'var(--s6)'} opacity={r.highlight ? 1 : 0.75} />
              <text x={iw + 8} y={yy + rh / 2} dy="0.32em" className={r.highlight ? s.strong : undefined}>{f(v)}</text>
            </g>
          );
        })}
      </g>
    );
  } else {
    const max = Math.max(...rows.flatMap((r) => [r.left ?? 0, r.right ?? 0]));
    const xr = scaleLinear().domain([-max, max]).range([0, iw]).nice();
    const x = (v: number) => r2(xr(v));
    const ticks = xr.ticks(narrow ? 4 : 6);
    body = (
      <g transform={`translate(${labelW},${top})`}>
        <text x={x(0) - 8} y={-8} textAnchor="end" className={s.label}>◀ {leftLabel}</text>
        <text x={x(0) + 8} y={-8} className={s.label}>{rightLabel} ▶</text>
        {ticks.map((t) => <g key={t}><line className="gl" x1={x(t)} x2={x(t)} y1={0} y2={rows.length * (rh + gap)} /><text x={x(t)} y={rows.length * (rh + gap) + 14} textAnchor="middle">{f(Math.abs(t), true)}</text></g>)}
        <line className="ax" x1={x(0)} x2={x(0)} y1={-2} y2={rows.length * (rh + gap)} />
        {rows.map((r, i) => {
          const yy = i * (rh + gap), L = r.left ?? 0, R = r.right ?? 0, net = R - L;
          const nx = x(net), cy = yy + rh / 2;
          return (
            <g key={r.label}>
              <title>{`${r.label}: ${leftLabel} ${f(L)} · ${rightLabel} ${f(R)} · net ${net >= 0 ? '+' : '−'}${f(Math.abs(net))}`}</title>
              <text x={-8} y={cy} dy="0.32em" textAnchor="end" className={s.label}>{r.label}</text>
              <rect x={x(-L)} y={yy + 3} width={Math.max(0, x(0) - x(-L))} height={rh - 6} rx={2} fill="var(--s4)" opacity={0.85} />
              <rect x={x(0)} y={yy + 3} width={Math.max(0, x(R) - x(0))} height={rh - 6} rx={2} fill="var(--s2)" opacity={0.85} />
              <path d={`M${nx} ${cy - 6} L${nx + 6} ${cy} L${nx} ${cy + 6} L${nx - 6} ${cy} Z`} fill="var(--value)" stroke="var(--card)" strokeWidth={1} />
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <div>
      <div className={s.legend} aria-hidden="true">
        {mode === 'diverging'
          ? <><span className={s.key}><b style={{ background: 'var(--s4)' }} />{leftLabel}</span><span className={s.key}><b style={{ background: 'var(--s2)' }} />{rightLabel}</span><span className={s.key}><span style={{ color: 'var(--value)' }}>◆</span>net</span></>
          : <>{unit && <span>USD {unit}</span>}{log && <span>· log scale</span>}</>}
      </div>
      <div ref={ref} className={s.wrap} role="img" aria-label={ariaLabel ?? 'Ranked bars'}>
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">{body}</svg>
      </div>
    </div>
  );
}
