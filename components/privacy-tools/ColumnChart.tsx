'use client';

import { useEffect, useRef, useState } from 'react';
import { formatValue, type ValueFormat } from '@/components/charts/valueFormat';

// Categorical column chart (lags, leading digits, amount buckets). Drawn in pixels at the measured width so labels
// stay 11px on a phone; grouped series sit side by side. One tooltip style (.tip), keyboard-steppable.

/** ValueFormat, plus plain decimals for unitless values such as a correlation r. */
export type ColumnFormat = ValueFormat | 'dec1' | 'dec2';
const fmtCol = (v: number, f: ColumnFormat, axis = false) => (f === 'dec1' || f === 'dec2' ? (v < 0 ? '−' : '') + Math.abs(v).toFixed(f === 'dec1' ? 1 : axis ? 1 : 2) : formatValue(v, f, axis));

export type ColumnSeries = { key: string; label: string; color: string; values: (number | null)[] };
export type ColumnChartProps = {
  categories: string[];
  series: ColumnSeries[];
  format: ColumnFormat;
  /** Recolour the first series at these category indexes (e.g. the peak lag). */
  highlight?: { index: number; color: string }[];
  /** Value labels drawn above a bar. */
  labels?: { index: number; series?: number; text: string }[];
  height?: number;
  yDomain?: [number, number];
  ariaLabel: string;
  /** Captions under the axis: left, centre, right. */
  axisNotes?: [string?, string?, string?];
  /** Tooltip header = prefix + category + suffix (strings: server components configure this chart). */
  tipTitle?: { prefix?: string; suffix?: string };
};

const M = { top: 22, right: 8, bottom: 26, left: 46 };

function niceTicks(lo: number, hi: number, n = 5) {
  const span = hi - lo || 1;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) ?? mag * 10;
  const t0 = Math.floor(lo / step) * step, t1 = Math.ceil(hi / step) * step;
  const out: number[] = [];
  for (let v = t0; v <= t1 + step / 2; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

export function ColumnChart({ categories, series, format, highlight = [], labels = [], height = 260, yDomain, ariaLabel, axisNotes, tipTitle }: ColumnChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(860);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = w < 520;
  const notes = axisNotes && axisNotes.some(Boolean);
  const m = { ...M, left: narrow ? 38 : M.left, bottom: M.bottom + (notes ? 18 : 0) };
  const h = height;
  const iw = w - m.left - m.right, ih = h - m.top - m.bottom;

  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const lo0 = yDomain ? yDomain[0] : Math.min(0, ...all);
  const hi0 = yDomain ? yDomain[1] : Math.max(...all, 0) * 1.08 || 1;
  const ticks = niceTicks(lo0, hi0, 5);
  const lo = yDomain ? yDomain[0] : ticks[0], hi = yDomain ? yDomain[1] : ticks[ticks.length - 1];
  const y = (v: number) => ih - ((v - lo) / (hi - lo || 1)) * ih;
  const band = iw / categories.length;
  const pad = band * (series.length > 1 ? 0.18 : 0.22);
  const bw = (band - pad) / series.length;
  // show every k-th label so labels (≈6.8px per mono char at 11px) never touch
  const labW = Math.max(...categories.map((c) => c.length)) * 6.8 + 10;
  const every = Math.max(1, Math.ceil(labW / band));
  const hl = new Map(highlight.map((x) => [x.index, x.color]));
  const fmt = (v: number) => fmtCol(v, format, true);

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const px = clientX - el.getBoundingClientRect().left - m.left;
    const i = Math.floor(px / band);
    setHover(i >= 0 && i < categories.length ? i : null);
  };

  const tipX = hover != null ? m.left + band * hover + band / 2 : 0;
  const flip = tipX > w - 200;

  return (
    <div
      ref={ref}
      className="chart"
      style={{ height: h }}
      role="img"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerMove={(e) => pick(e.clientX)}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); setHover((v) => Math.min(categories.length - 1, (v ?? -1) + 1)); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((v) => Math.max(0, (v ?? categories.length) - 1)); }
        if (e.key === 'Escape') setHover(null);
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <g transform={`translate(${m.left},${m.top})`}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="gl" x1={0} x2={iw} y1={y(t)} y2={y(t)} />
              <text x={-8} y={y(t)} dy="0.32em" textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          <line className="ax" x1={0} x2={iw} y1={y(Math.max(lo, 0))} y2={y(Math.max(lo, 0))} />
          {categories.map((c, i) => {
            const x0 = band * i + pad / 2;
            return (
              <g key={c} opacity={hover != null && hover !== i ? 0.6 : 1}>
                {series.map((s, si) => {
                  const v = s.values[i];
                  if (v == null) return null;
                  const color = si === 0 && hl.has(i) ? hl.get(i)! : s.color;
                  const y0 = y(Math.max(lo, 0)), y1 = y(v);
                  return <rect key={s.key} x={x0 + bw * si} y={Math.min(y0, y1)} width={Math.max(1, bw - (series.length > 1 ? 2 : 0))} height={Math.max(0.5, Math.abs(y0 - y1))} rx={bw > 6 ? 2 : 0} fill={color} />;
                })}
                {i % every === 0 && <text x={band * i + band / 2} y={ih + 17} textAnchor="middle" style={hl.has(i) ? { fill: 'var(--value)', fontWeight: 600 } : undefined}>{c}</text>}
              </g>
            );
          })}
          {labels.map((l) => {
            const v = series[l.series ?? 0]?.values[l.index];
            if (v == null) return null;
            const x = band * l.index + pad / 2 + bw * (l.series ?? 0) + bw / 2;
            return <text key={`${l.index}-${l.series ?? 0}`} x={x} y={y(Math.max(v, 0)) - 7} textAnchor="middle" style={{ fill: 'var(--value)', fontWeight: 600 }}>{l.text}</text>;
          })}
          {notes && (
            <>
              {axisNotes![0] && <text x={0} y={ih + 37} textAnchor="start">{axisNotes![0]}</text>}
              {axisNotes![1] && !narrow && <text x={iw / 2} y={ih + 37} textAnchor="middle">{axisNotes![1]}</text>}
              {axisNotes![2] && <text x={iw} y={ih + 37} textAnchor="end">{axisNotes![2]}</text>}
            </>
          )}
        </g>
      </svg>
      {hover != null && (
        <div className="tip" style={{ top: 4, left: flip ? undefined : tipX + 12, right: flip ? w - tipX + 12 : undefined, pointerEvents: 'none' }}>
          <b>{`${tipTitle?.prefix ?? ''}${categories[hover]}${tipTitle?.suffix ?? ''}`}</b>
          {series.map((s) => (s.values[hover] == null ? null : (
            <span key={s.key} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, alignItems: 'center' }}>
              <i className="sw" style={{ background: s.color }} />
              <span>{s.label}</span>
              <b>{fmtCol(s.values[hover]!, format)}</b>
            </span>
          )))}
        </div>
      )}
    </div>
  );
}
