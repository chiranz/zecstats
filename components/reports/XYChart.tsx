'use client';

// A small general-purpose chart for the report pages: categorical columns, numeric/log x (CDFs), date x with bands
// (median + p10–p90), and scatter dots. Same look and tooltip as TimeSeriesChart; everything passed in is
// serialisable so server components configure it. Ticks are computed by the caller so labels read exactly as intended.
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { scaleBand, scaleLinear, scaleLog } from 'd3-scale';
import { area as d3area, line as d3line, curveLinear } from 'd3-shape';
import { axisLabels, formatValue, type ValueFormat } from '@/components/charts/valueFormat';
import { compact } from '@/lib/format';

export type XYSeries = {
  key: string;
  label: string;
  color: string;
  type?: 'line' | 'bar' | 'band' | 'dot';
  values: (number | null)[];
  lo?: (number | null)[]; // band: lower edge (values = upper edge)
  r?: number[]; // dot: radius in px per point
  size?: number[]; // dot: a value per point drawn as area (radius ∝ √value, within rRange); pairs with sizeKey
  rRange?: [number, number]; // dot: smallest and largest radius for `size` (default 2.5–13.5 px)
  colors?: (string | null)[]; // bar: per-point colour override (e.g. the peak hour)
  dashed?: boolean;
  dash?: string; // stroke-dasharray (wins over dashed), so same-hue lines read apart
  width?: number;
  opacity?: number;
  noTip?: boolean;
  format?: ValueFormat; // tooltip format for this series (defaults to yFormat)
};
export type Tick = { v: number; label: string };
/** labelPos 'top' puts the label above the plot, clear of dense dots. */
export type Marker = { x: number; label: string; color?: string; dy?: number; labelPos?: 'inside' | 'top' };
/** labelPos 'margin' puts the label in the right margin, clear of dense dots. */
export type HLine = { y: number; label: string; color?: string; labelPos?: 'inside' | 'margin' };

export type XYChartProps = {
  x: number[];
  xScale?: 'band' | 'linear' | 'log';
  xTicks: Tick[];
  series: XYSeries[];
  yFormat: ValueFormat;
  yLog?: boolean;
  yDomain?: [number, number];
  yTicks?: Tick[];
  tipTitles?: string[];
  tipExtra?: string[]; // one extra muted line per point
  height?: number;
  ariaLabel: string;
  markers?: Marker[];
  hLines?: HLine[];
  /** Y-axis title shown once above the ticks (defaults from yFormat: ZEC, BTC…). */
  yUnit?: string;
  /** Key for a bubble scatter: reference circles for these values ("Size = BTC: ○ 0.1 ○ 1 ○ 10"). Radii come from
   *  the dot series' `size` scale, or `r` (px, one per value) when the dots use explicit radii. */
  sizeKey?: { label: string; values: number[]; r?: number[]; format?: ValueFormat };
};

const M = { top: 16, right: 16, bottom: 28, left: 58 };
const CW = 7.3;
const TXT: CSSProperties = { fontSize: 12 };
const LAB: CSSProperties = { fontSize: 12, fill: 'var(--text-2)', paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 4, strokeLinejoin: 'round' };
const dashOf = (s: XYSeries) => s.dash ?? (s.dashed ? '5 4' : undefined);

export function XYChart(props: XYChartProps) {
  const { x, xScale = 'linear', xTicks, series, yFormat, yLog = false, yDomain, yTicks: yTicksIn, tipTitles, tipExtra, height = 300, ariaLabel, markers = [], hLines = [], yUnit, sizeKey } = props;
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<number | null>(null);
  const [kbd, setKbd] = useState(false);
  // The plot is drawn after mount only (its width is measured then anyway): log scales can differ in the last float
  // digit between Node and the browser, which would make hydration fail.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 520;
  const h = narrow ? Math.max(220, Math.min(height, Math.round(width * 0.75))) : height;
  const hasUnit = !!(yUnit ?? (yTicksIn ? undefined : axisLabels([0], yFormat).unit));
  const topLabels = markers.some((mk) => mk.labelPos === 'top');
  const marginW = Math.min(narrow ? 110 : 180, Math.max(0, ...hLines.filter((l) => l.labelPos === 'margin').map((l) => Math.ceil(l.label.length * CW) + 12)));
  const top = M.top + (hasUnit || topLabels ? 14 : 0);
  const ih = h - top - M.bottom;

  const makeX = (iw: number) => {
    if (xScale === 'band') {
      const b = scaleBand<number>().domain(x.map((_, i) => i)).range([0, iw]).paddingInner(0.18).paddingOuter(0.05);
      return { pos: (i: number) => (b(i) ?? 0) + b.bandwidth() / 2, val: (v: number) => (b(v) ?? 0) + b.bandwidth() / 2, bw: b.bandwidth() };
    }
    const vals = [...x, ...xTicks.map((t) => t.v)].filter((v) => Number.isFinite(v) && (xScale !== 'log' || v > 0));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const s = xScale === 'log' ? scaleLog().domain([lo, hi]).range([0, iw]) : scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([0, iw]);
    const bw = Math.max(1, (iw / Math.max(1, x.length)) * 0.72);
    return { pos: (i: number) => s(x[i]), val: (v: number) => s(v), bw };
  };

  const y = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const s of series) {
      for (const v of s.values) if (v != null && Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      if (s.lo) for (const v of s.lo) if (v != null && Number.isFinite(v)) lo = Math.min(lo, v);
    }
    for (const l of hLines) { lo = Math.min(lo, l.y); hi = Math.max(hi, l.y); }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    if (yDomain) { lo = yDomain[0]; hi = yDomain[1]; }
    if (yLog) return scaleLog().domain([Math.max(lo, 1e-9), hi]).range([ih, 0]);
    if (!yDomain) { if (lo > 0) lo = 0; hi += (hi - lo) * 0.06 || 1; }
    return yDomain ? scaleLinear().domain([lo, hi]).range([ih, 0]) : scaleLinear().domain([lo, hi]).range([ih, 0]).nice(5);
  }, [series, hLines, yDomain, yLog, ih]);

  const yTicks: Tick[] = useMemo(() => {
    if (yTicksIn) return yTicksIn;
    const ts = yLog ? (y as ReturnType<typeof scaleLog>).ticks(5).filter((t) => Math.log10(t) % 1 === 0) : (y as ReturnType<typeof scaleLinear>).ticks(narrow ? 4 : 5);
    const { labels } = axisLabels(ts, yFormat, yLog);
    return ts.map((t, i) => ({ v: t, label: labels[i] })).filter((t, i, a) => i === 0 || t.label !== a[i - 1].label);
  }, [yTicksIn, y, yLog, narrow, yFormat]);

  const unitTxt = yUnit ?? (yTicksIn ? undefined : axisLabels(yTicks.map((t) => t.v), yFormat).unit);
  const left = Math.max(narrow ? 36 : 46, Math.ceil(Math.max(0, ...yTicks.map((t) => t.label.length)) * CW) + 12);
  const m = { top, bottom: M.bottom, left, right: (narrow ? 10 : M.right) + marginW };
  const iw = Math.max(40, width - m.left - m.right);
  const xf = useMemo(() => makeX(iw), [x, xScale, xTicks, iw]);

  const xT = useMemo(() => {
    const kept: Tick[] = [];
    const gap = narrow ? 76 : 64;
    for (const t of xTicks) {
      const px = xf.val(t.v);
      if (px < -1 || px > iw + 1) continue;
      if (kept.every((k) => Math.abs(xf.val(k.v) - px) >= gap)) kept.push(t);
    }
    return kept;
  }, [xTicks, xf, iw, narrow]);

  const n = x.length;
  const xs = useMemo(() => x.map((_, i) => xf.pos(i)), [x, xf]);
  // bubble radius ∝ √value (area ∝ value), shared by the dots and the size key
  const sized = series.find((s) => s.type === 'dot' && s.size);
  const sizeMax = sized ? Math.max(...sized.size!.filter(Number.isFinite), ...(sizeKey?.values ?? []), 1e-12) : 1;
  const rOf = (s: XYSeries, v: number) => { const [r0, r1] = s.rRange ?? [2.5, 13.5]; return r0 + Math.sqrt(Math.max(0, v) / sizeMax) * (r1 - r0); };
  const radius = (s: XYSeries, i: number) => (s.size && s.size[i] != null ? rOf(s, s.size[i]) : s.r?.[i] ?? 3);
  const hasDots = series.some((s) => s.type === 'dot');

  const onMove = (clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el || !n) return;
    const r = el.getBoundingClientRect();
    const px = clientX - r.left - m.left, py = clientY - r.top - m.top;
    let best = 0, bd = Infinity;
    if (hasDots) {
      const s = series.find((q) => q.type === 'dot')!;
      for (let i = 0; i < n; i++) { const v = s.values[i]; if (v == null) continue; const d = (xs[i] - px) ** 2 + (y(v) - py) ** 2; if (d < bd) { bd = d; best = i; } }
    } else {
      for (let i = 0; i < n; i++) { const d = Math.abs(xs[i] - px); if (d < bd) { bd = d; best = i; } }
    }
    setKbd(false);
    setHover(best);
  };

  const hi = hover != null && hover < n ? hover : null;
  const tipLeft = hi != null ? Math.min(Math.max(0, xs[hi] + m.left + 14), width - 220) : 0;
  const flip = hi != null && xs[hi] + m.left + 240 > width;
  const yZero = yLog ? ih : y(Math.max(0, (y.domain() as number[])[0]));
  // marker labels: each takes the first 16px row (below its own dy) where it overlaps no label already placed
  const mks = (() => {
    const boxes: [number, number, number][] = [];
    return markers.flatMap((mk) => {
      const px = xf.val(mk.x);
      if (px < 0 || px > iw) return [];
      const w = mk.label.length * CW;
      let right = px > iw - Math.min(160, w + 12);
      let l0 = right ? px - 6 - w : px + 6;
      if (right && l0 < 4) { right = false; l0 = 4; } // too long for either side: start at the plot's left edge
      const base = (mk.labelPos === 'top' ? -6 : 11) + (mk.dy ?? 0);
      let ty = base;
      for (let r = 0; r < 8; r++) {
        ty = base + r * 16;
        if (!boxes.some(([a, b, t]) => l0 < b + 6 && a < l0 + w + 6 && Math.abs(t - ty) < 16)) break;
      }
      boxes.push([l0, l0 + w, ty]);
      return [{ mk, px, right, ty, lx: right ? px - 6 : l0 }];
    });
  })();
  const tipRow = (s: XYSeries, i: number) => {
    const v = s.values[i];
    if (s.noTip || v == null) return null;
    const f = s.format ?? yFormat;
    return s.type === 'band' && s.lo?.[i] != null ? `${formatValue(s.lo[i]!, f)} – ${formatValue(v, f)}` : formatValue(v, f);
  };
  const tipText = hi == null ? '' : [tipTitles?.[hi], ...series.map((s) => { const t = tipRow(s, hi); return t ? `${s.label}: ${t}` : null; }), tipExtra?.[hi]].filter(Boolean).join('; ');
  const legendData = JSON.stringify(series.filter((s) => !s.noTip).map((s) => ({ label: s.label, color: s.color, dash: dashOf(s) ?? null, line: s.type === 'line' || !s.type })));
  const keyR = sizeKey ? sizeKey.values.map((v, i) => sizeKey.r?.[i] ?? (sized ? rOf(sized, v) : 4)) : [];

  return (
    <div className="stack chart-box" style={{ gap: 10 }}>
      <div
        ref={wrapRef}
        className="chart chart-h"
        style={{ '--h': `${height}px`, '--hk': 75, touchAction: 'pan-y' } as CSSProperties}
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => onMove(e.clientX, e.clientY)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setKbd(true); setHover((v) => Math.max(0, (v ?? n) - 1)); }
          if (e.key === 'ArrowRight') { e.preventDefault(); setKbd(true); setHover((v) => Math.min(n - 1, (v ?? -1) + 1)); }
          if (e.key === 'Escape') setHover(null);
        }}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true" data-legend={legendData} data-unit={unitTxt || undefined}>
          <defs><clipPath id={`xy-${uid}`}><rect x={-2} y={-8} width={iw + 4} height={ih + 10} /></clipPath></defs>
          {ready && <g transform={`translate(${m.left},${m.top})`}>
            {yTicks.map((t) => (
              <g key={`y${t.v}`}>
                <line className="gl" x1={0} x2={iw} y1={y(t.v)} y2={y(t.v)} />
                <text x={-8} y={y(t.v)} dy="0.32em" textAnchor="end" style={TXT}>{t.label}</text>
              </g>
            ))}
            {unitTxt && <text x={-m.left + 2} y={-14} style={TXT}>{unitTxt}</text>}
            <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
            {xT.map((t, i) => {
              const px = xf.val(t.v);
              const anchor = px < 24 ? 'start' : px > iw - 24 ? 'end' : 'middle';
              return <text key={`x${i}`} x={px} y={ih + 18} textAnchor={anchor} style={TXT}>{t.label}</text>;
            })}
            <g clipPath={`url(#xy-${uid})`}>
              {series.map((s) => {
                const pts = s.values.map((v, i) => [xs[i], v] as const);
                const ok = (d: readonly [number, number | null]) => d[1] != null && Number.isFinite(d[1]) && (!yLog || d[1]! > 0);
                if (s.type === 'bar') {
                  return (
                    <g key={s.key}>
                      {pts.map(([px, v], i) => {
                        if (v == null) return null;
                        const y1 = y(yLog ? Math.max(v, 1e-9) : v);
                        return <rect key={i} x={px - xf.bw / 2} y={Math.min(y1, yZero)} width={xf.bw} height={Math.max(0.5, Math.abs(yZero - y1))} rx={xf.bw > 5 ? 1.5 : 0} fill={s.colors?.[i] ?? s.color} opacity={hi != null && hi !== i ? 0.6 : s.opacity ?? 1} />;
                      })}
                    </g>
                  );
                }
                if (s.type === 'band') {
                  const lo = s.lo ?? [];
                  const ar = d3area<number>().defined((i) => s.values[i] != null && lo[i] != null && (!yLog || (lo[i]! > 0 && s.values[i]! > 0))).x((i) => xs[i]).y1((i) => y(s.values[i]!)).y0((i) => y(lo[i]!));
                  return <path key={s.key} d={ar(s.values.map((_, i) => i)) ?? ''} fill={s.color} opacity={s.opacity ?? 0.2} />;
                }
                if (s.type === 'dot') {
                  return (
                    <g key={s.key}>
                      {pts.map(([px, v], i) => (v == null || (yLog && v <= 0) ? null : <circle key={i} cx={px} cy={y(v)} r={radius(s, i)} fill={s.color} fillOpacity={hi === i ? 0.9 : s.opacity ?? 0.45} stroke={s.color} strokeWidth={hi === i ? 2 : 1} />))}
                    </g>
                  );
                }
                const ln = d3line<readonly [number, number | null]>().defined(ok).x((d) => d[0]).y((d) => y(d[1]!)).curve(curveLinear);
                return <path key={s.key} d={ln(pts) ?? ''} fill="none" stroke={s.color} strokeWidth={s.width ?? 1.9} strokeDasharray={dashOf(s)} strokeLinejoin="round" opacity={s.opacity ?? 1} />;
              })}
            </g>
            {hLines.map((l, i) => (
              <g key={`h${i}`}>
                <line x1={0} x2={iw} y1={y(l.y)} y2={y(l.y)} stroke={l.color ?? 'var(--axis)'} strokeDasharray="4 4" />
                {l.labelPos === 'margin'
                  ? <text x={iw + 6} y={y(l.y)} dy="0.32em" style={LAB}>{l.label.length * CW > marginW - 8 ? `${l.label.slice(0, Math.max(3, Math.floor((marginW - 8) / CW) - 1))}…` : l.label}</text>
                  : <text x={6} y={y(l.y) - 6} style={LAB}>{l.label}</text>}
              </g>
            ))}
            {mks.map(({ mk, px, right, ty, lx }, i) => (
              <g key={`m${i}`}>
                <line x1={px} x2={px} y1={0} y2={ih} stroke={mk.color ?? 'var(--axis)'} strokeDasharray="3 4" />
                <text x={lx} y={ty} textAnchor={right ? 'end' : 'start'} style={LAB}>{mk.label}</text>
              </g>
            ))}
            {hi != null && (
              <g pointerEvents="none" data-noexport="">
                {!hasDots && xScale !== 'band' && <line x1={xs[hi]} x2={xs[hi]} y1={0} y2={ih} stroke="var(--axis)" />}
                {series.map((s) => (s.type === 'line' || !s.type) && s.values[hi] != null && (!yLog || s.values[hi]! > 0) ? <circle key={s.key} cx={xs[hi]} cy={y(s.values[hi]!)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={1.5} /> : null)}
              </g>
            )}
          </g>}
        </svg>
        {hi != null && (
          <div className="tip" style={{ top: 8, left: flip ? undefined : tipLeft, right: flip ? width - (xs[hi] + m.left) + 14 : undefined, pointerEvents: 'none' }}>
            {tipTitles?.[hi] && <b>{tipTitles[hi]}</b>}
            {series.map((s) => {
              const txt = tipRow(s, hi);
              if (txt == null) return null;
              return (
                <span key={s.key} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, alignItems: 'center' }}>
                  <i className="sw" style={{ background: s.colors?.[hi] ?? s.color, opacity: s.type === 'band' ? 0.6 : 1 }} />
                  <span>{s.label}</span>
                  <b>{txt}</b>
                </span>
              );
            })}
            {tipExtra?.[hi] && <span className="muted" style={{ fontSize: 12 }}>{tipExtra[hi]}</span>}
          </div>
        )}
      </div>
      {sizeKey && keyR.length > 0 && (
        <div className="row" style={{ gap: '4px 12px', alignItems: 'center', font: '400 12px var(--mono)', color: 'var(--text-2)' }}>
          <span>{sizeKey.label}</span>
          {sizeKey.values.map((v, i) => (
            <span key={i} className="row" style={{ gap: 5, alignItems: 'center' }}>
              <svg width={keyR[i] * 2 + 2} height={keyR[i] * 2 + 2} aria-hidden="true" style={{ flex: 'none' }}>
                <circle cx={keyR[i] + 1} cy={keyR[i] + 1} r={keyR[i]} fill={sized?.color ?? 'var(--text-2)'} fillOpacity={0.3} stroke={sized?.color ?? 'var(--text-2)'} />
              </svg>
              {sizeKey.format ? formatValue(v, sizeKey.format) : compact(v, 2)}
            </span>
          ))}
        </div>
      )}
      <div className="sr-only" aria-live="polite">{kbd ? tipText : ''}</div>
    </div>
  );
}
