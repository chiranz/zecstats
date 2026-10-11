'use client';

// Line chart over a NUMERIC x-axis (coins issued, ZEC amount …) — the non-date counterpart of TimeSeriesChart.
// Same visual language: faint gridlines, mono ticks, one tooltip style, chips for series, Linear/Log switch.
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { scaleLinear, scaleLog } from 'd3-scale';
import { line as d3line, curveLinear, curveStepBefore } from 'd3-shape';
import { formatValue, type ValueFormat } from '@/components/charts/valueFormat';

type XYSeries = { key: string; label: string; color: string; points: [number, number][]; dashed?: boolean; width?: number };
type XFormat = 'millions' | 'zecAmount';
export type YFormat = ValueFormat | 'power';

export type XYChartProps = {
  series: XYSeries[];
  xFormat: XFormat;
  yFormat: YFormat;
  xLabel: string;
  xLog?: boolean;
  yLogDefault?: boolean;
  logToggle?: boolean;
  step?: boolean;
  height?: number;
  ariaLabel: string;
  /** Tooltip extra line: ratio of series[0] to series[1] at the hovered x, with this noun ("market cap"). */
  ratioNoun?: string;
  /** Initial hovered x (shown statically until the pointer moves). */
  markX?: number;
  xTicks?: number[];
};

function fmtX(v: number, f: XFormat) {
  if (f === 'millions') return `${(v / 1e6).toFixed(v < 1e7 ? 1 : 0).replace(/\.0$/, '')}M`;
  return v >= 1000 ? `${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K` : v >= 1 ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : String(+v.toPrecision(2));
}
function fmtY(v: number, f: YFormat, axis = false) {
  if (f === 'power') {
    const a = Math.abs(v);
    return a >= 1 ? `${+a.toPrecision(3)} GW` : a >= 1e-3 ? `${+(a * 1e3).toPrecision(3)} MW` : a >= 1e-6 ? `${+(a * 1e6).toPrecision(3)} kW` : `${+(a * 1e9).toPrecision(3)} W`;
  }
  return formatValue(v, f, axis);
}

const M = { top: 14, right: 16, bottom: 40, left: 62 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function XYChart(p: XYChartProps) {
  const { series, xFormat, yFormat, xLabel, xLog = false, logToggle = true, step = false, height = 380, ariaLabel, ratioNoun } = p;
  const uid = useId().replace(/:/g, '');
  const [ref, width] = useWidth();
  const [log, setLog] = useState(p.yLogDefault ?? false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hx, setHx] = useState<number | null>(p.markX ?? null);
  const narrow = width < 520;
  const h = narrow ? Math.max(240, Math.min(height, Math.round(width * 0.8))) : height;
  const m = narrow ? { ...M, left: 50, right: 10 } : M;
  const iw = width - m.left - m.right, ih = h - m.top - m.bottom;

  const vis = series.filter((s) => !hidden.has(s.key));
  const { x, y, xTicks, yTicks } = useMemo(() => {
    const xs = vis.flatMap((s) => s.points.map((d) => d[0])).filter((v) => !xLog || v > 0);
    const ys = vis.flatMap((s) => s.points.map((d) => d[1])).filter((v) => Number.isFinite(v) && (!log || v > 0));
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const x = xLog ? scaleLog().domain([x0, x1]).range([0, iw]) : scaleLinear().domain([0, x1]).nice().range([0, iw]);
    const y = log ? scaleLog().domain([y0 * 0.8, y1 * 1.25]).range([ih, 0]) : scaleLinear().domain([0, y1 * 1.06]).nice(5).range([ih, 0]);
    let yt: number[];
    if (log) {
      const [a, b] = (y as ReturnType<typeof scaleLog>).domain();
      yt = [];
      for (let e = Math.ceil(Math.log10(a)); e <= Math.floor(Math.log10(b)); e++) yt.push(10 ** e);
      const k = Math.ceil(yt.length / (narrow ? 4 : 6));
      yt = yt.filter((_, i) => i % k === 0);
    } else yt = (y as ReturnType<typeof scaleLinear>).ticks(5);
    let xt = p.xTicks ?? (xLog ? [] : (x as ReturnType<typeof scaleLinear>).ticks(narrow ? 4 : 7));
    xt = xt.filter((t) => t >= x.domain()[0] && t <= x.domain()[1]);
    if (narrow && xt.length > 5) xt = xt.filter((_, i) => i % 2 === 0);
    return { x, y, xTicks: xt, yTicks: yt };
  }, [vis, xLog, log, iw, ih, narrow, p.xTicks]);

  const nearest = (s: XYSeries, xv: number) => {
    let best: [number, number] | null = null, bd = Infinity;
    for (const d of s.points) {
      const dist = xLog ? Math.abs(Math.log(d[0]) - Math.log(xv)) : Math.abs(d[0] - xv);
      if (dist < bd) { bd = dist; best = d; }
    }
    if (!best) return null;
    const [lo, hi] = [s.points[0][0], s.points[s.points.length - 1][0]];
    if (xv < lo * (xLog ? 0.5 : 1) - (xLog ? 0 : 1) || xv > hi * (xLog ? 2 : 1.02)) return null;
    if (step || xLog) return best;
    // continuous series: interpolate so the readout matches the line under the crosshair
    const k = s.points.findIndex((d) => d[0] >= xv);
    if (k <= 0) return best;
    const a = s.points[k - 1], b = s.points[k];
    const t = (xv - a[0]) / (b[0] - a[0] || 1);
    return [xv, a[1] + (b[1] - a[1]) * t] as [number, number];
  };
  const hov = hx != null ? vis.map((s) => ({ s, d: nearest(s, hx) })) : [];
  const ratio = ratioNoun && hov.length >= 2 && hov[0].d && hov[1].d && hov[1].d[1] ? hov[0].d[1] / hov[1].d[1] : null;
  const hpx = hx != null ? x(hx) : null;

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const px = clientX - el.getBoundingClientRect().left - m.left;
    if (px < 0 || px > iw) return;
    setHx(x.invert(px));
  };
  const curve = step ? curveStepBefore : curveLinear;
  const flip = hpx != null && hpx + m.left + 240 > width;

  return (
    <div className="stack chart-box" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        {logToggle && (
          <div className="seg" role="group" aria-label="Scale">
            <button type="button" aria-pressed={!log} onClick={() => setLog(false)}>Linear</button>
            <button type="button" aria-pressed={log} onClick={() => setLog(true)}>Log</button>
          </div>
        )}
        {series.length > 1 && series.map((s) => {
          const on = !hidden.has(s.key);
          return (
            <button key={s.key} type="button" className="chip" aria-pressed={on} onClick={() => setHidden((hs) => { const n = new Set(hs); if (n.has(s.key)) n.delete(s.key); else if (series.length - n.size > 1) n.add(s.key); return n; })} style={on ? undefined : { opacity: 0.55 }}>
              <i className="ln" style={{ width: 14, background: s.dashed ? `repeating-linear-gradient(90deg, ${s.color} 0 4px, transparent 4px 7px)` : s.color }} />{s.label}
            </button>
          );
        })}
      </div>
      <div ref={ref} className="chart chart-h" style={{ '--h': `${height}px`, '--hk': 80, '--hmin': '240px', touchAction: 'pan-y' } as CSSProperties} tabIndex={0} role="img" aria-label={ariaLabel}
        onPointerMove={(e) => onMove(e.clientX)}
        onKeyDown={(e) => {
          const pts = Array.from(new Set(vis.flatMap((s) => s.points.map((d) => d[0])))).sort((a, b) => a - b);
          if (!pts.length) return;
          const i = hx == null ? pts.length - 1 : pts.findIndex((v) => v >= hx);
          if (e.key === 'ArrowLeft') { e.preventDefault(); setHx(pts[Math.max(0, (i < 0 ? pts.length : i) - 1)]); }
          if (e.key === 'ArrowRight') { e.preventDefault(); setHx(pts[Math.min(pts.length - 1, (i < 0 ? pts.length - 1 : i) + 1)]); }
        }}>
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">
          <defs><clipPath id={`xy-${uid}`}><rect x={0} y={-2} width={iw} height={ih + 4} /></clipPath></defs>
          <g transform={`translate(${m.left},${m.top})`}>
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line className="gl" x1={0} x2={iw} y1={y(t)} y2={y(t)} />
                <text x={-10} y={y(t)} dy="0.32em" textAnchor="end">{fmtY(t, yFormat, true)}</text>
              </g>
            ))}
            <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
            {xTicks.map((t, i) => <text key={`x${i}`} x={x(t)} y={ih + 18} textAnchor={i === 0 && x(t) < 16 ? 'start' : 'middle'}>{fmtX(t, xFormat)}</text>)}
            <text x={iw} y={ih + 34} textAnchor="end" style={{ fontSize: 11 }}>{xLabel}</text>
            <g clipPath={`url(#xy-${uid})`}>
              {vis.map((s) => {
                const ln = d3line<[number, number]>().defined((d) => Number.isFinite(d[1]) && (!log || d[1] > 0)).x((d) => x(d[0])).y((d) => y(d[1])).curve(curve);
                return <path key={s.key} d={ln(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={s.width ?? 1.9} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />;
              })}
            </g>
            {hpx != null && (
              <g>
                <line x1={hpx} x2={hpx} y1={0} y2={ih} stroke="var(--axis)" />
                {hov.map(({ s, d }) => (d ? <circle key={s.key} cx={x(d[0])} cy={y(d[1])} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={1.5} /> : null))}
              </g>
            )}
          </g>
        </svg>
        {hpx != null && hov.some((r) => r.d) && (
          <div className="tip" style={{ top: 8, left: flip ? undefined : Math.max(0, hpx + m.left + 14), right: flip ? width - (hpx + m.left) + 14 : undefined, pointerEvents: 'none' }}>
            <b>{xFormat === 'millions' ? `${fmtX(hx!, xFormat)} coins issued` : `~${fmtX(hx!, xFormat)} ZEC`}</b>
            {hov.map(({ s, d }) => d && (
              <span key={s.key} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, alignItems: 'center' }}>
                <i className="sw" style={{ background: s.color }} /><span>{s.label}</span><b>{fmtY(d[1], yFormat)}</b>
              </span>
            ))}
            {ratio != null && <span style={{ borderTop: '1px solid var(--line)', paddingTop: 5 }}>ZEC = <b>{ratio < 1 ? ratio.toFixed(3) : ratio.toFixed(2)}×</b> BTC {ratioNoun}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

