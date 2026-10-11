'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear, scaleLog } from 'd3-scale';
import { line as d3line, area as d3area, curveStepAfter } from 'd3-shape';
import { num } from '@/lib/format';

// Cumulative distribution of migration sizes on a log x-axis (ZEC per transaction). Not a time series, so it is drawn here.
export function SizeCdf({ points, median, p90, max, ariaLabel }: { points: { zec: number; cum: number }[]; median: number; p90: number; max: number; ariaLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = w < 520;
  const h = narrow ? 240 : 320;
  const m = { top: 16, right: narrow ? 10 : 20, bottom: 28, left: narrow ? 40 : 48 };
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;
  const pts = useMemo(() => points.filter((p) => p.zec > 0), [points]);
  const lo = 1e-4;
  const x = scaleLog().domain([lo, Math.max(1e5, max)]).range([0, iw]).clamp(true);
  const y = scaleLinear().domain([0, 1]).range([ih, 0]);
  const ticks = [1e-4, 1e-3, 1e-2, 0.1, 1, 10, 100, 1e3, 1e4, 1e5].filter((_, i) => !narrow || i % 2 === 0);
  const fmtTick = (v: number) => (v >= 1000 ? `${num(v / 1000)}k` : v >= 1 ? num(v) : String(v));
  const xy = pts.map((p) => [x(Math.max(lo, p.zec)), y(p.cum)] as [number, number]);
  const ln = d3line<[number, number]>().x((d) => d[0]).y((d) => d[1]).curve(curveStepAfter)(xy) ?? '';
  const ar = d3area<[number, number]>().x((d) => d[0]).y0(ih).y1((d) => d[1]).curve(curveStepAfter)(xy) ?? '';
  const cumAt = (v: number) => { let c = 0; for (const p of pts) { if (p.zec <= v) c = p.cum; else break; } return c; };
  const hp = hover != null ? pts[hover] : null;

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const px = clientX - el.getBoundingClientRect().left - m.left;
    let best = 0, bd = Infinity;
    xy.forEach(([qx], i) => { const d = Math.abs(qx - px); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };

  return (
    <div ref={ref} className="chart" style={{ height: h, touchAction: 'pan-y' }} role="img" aria-label={ariaLabel} tabIndex={0}
      onPointerMove={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <g transform={`translate(${m.left},${m.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line className="gl" x1={0} x2={iw} y1={y(t)} y2={y(t)} />
              <text x={-8} y={y(t)} dy="0.32em" textAnchor="end">{t * 100}%</text>
            </g>
          ))}
          {ticks.map((t) => <line key={`v${t}`} className="gl" x1={x(t)} x2={x(t)} y1={0} y2={ih} />)}
          <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
          {ticks.map((t, i) => <text key={`t${t}`} x={x(t)} y={ih + 18} textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}>{fmtTick(t)}</text>)}
          <path d={ar} fill="var(--p-ironwood)" opacity={0.1} />
          <path d={ln} fill="none" stroke="var(--p-ironwood)" strokeWidth={2} />
          {[{ v: median, c: 0.5, label: `Median ${num(median, 2)} ZEC` }, { v: p90, c: 0.9, label: `P90 ${num(p90)} ZEC` }].map((mk) => (
            <g key={mk.label}>
              <line x1={x(mk.v)} x2={x(mk.v)} y1={y(mk.c)} y2={ih} stroke="var(--text-2)" strokeDasharray="3 3" />
              <line x1={0} x2={x(mk.v)} y1={y(mk.c)} y2={y(mk.c)} stroke="var(--text-2)" strokeDasharray="3 3" />
              <circle cx={x(mk.v)} cy={y(cumAt(mk.v) || mk.c)} r={3.5} fill="var(--card)" stroke="var(--value)" strokeWidth={1.5} />
              <text x={mk.c === 0.5 ? x(mk.v) + 8 : x(mk.v) - 8} y={y(mk.c) + (mk.c === 0.5 ? 16 : -8)} textAnchor={mk.c === 0.5 ? 'start' : 'end'} style={{ fill: 'var(--text-2)' }}>{mk.label}</text>
            </g>
          ))}
          <circle cx={x(max)} cy={y(1)} r={4} fill="var(--p-ironwood)" stroke="var(--card)" strokeWidth={2} />
          <text x={x(max) - 8} y={y(1) + 16} textAnchor="end" style={{ fill: 'var(--value)' }}>Largest {num(max)}</text>
          {hp && (
            <g>
              <line x1={x(Math.max(lo, hp.zec))} x2={x(Math.max(lo, hp.zec))} y1={0} y2={ih} stroke="var(--axis)" />
              <circle cx={x(Math.max(lo, hp.zec))} cy={y(hp.cum)} r={3.5} fill="var(--p-ironwood)" stroke="var(--card)" strokeWidth={1.5} />
            </g>
          )}
        </g>
      </svg>
      {hp && (
        <div className="tip" style={{ top: 8, left: Math.min(Math.max(0, x(Math.max(lo, hp.zec)) + m.left + 14), w - 200), pointerEvents: 'none' }}>
          <b>{num(hp.zec, hp.zec < 1 ? 4 : hp.zec < 100 ? 2 : 0)} ZEC or less</b>
          <span>{num(hp.cum * 100, 1)}% of migrations</span>
        </div>
      )}
    </div>
  );
}
