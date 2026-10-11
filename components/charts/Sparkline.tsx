// The one sparkline (server-rendered, no axes; always pair it with the number it summarises). One rule everywhere:
// a stated window ("1-year trend"), gaps kept as gaps, a neutral end dot, and either a bare line or an area anchored
// at zero (a min→max area would fake a zero baseline). `fluid` stretches it to its box with a constant stroke.
import type { ReactNode } from 'react';

export type SparklineProps = {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  /** Fill down to zero (the scale then includes 0). Off by default: a bare line on a min→max scale. */
  area?: boolean;
  /** What the line shows, for screen readers ("ZEC price"). */
  label?: string;
  /** The period covered, e.g. "30-day" or "1-year": read out as "30-day trend" and shown on hover. */
  window?: string;
  /** Dashed reference line at the window's first value. */
  base?: boolean;
  /** End dot (in the line colour; never coloured by direction). Default on, except in fluid mode. */
  dot?: boolean;
  /** Stretch to the box (CSS sets the size); `height` is then only the drawing's aspect. */
  fluid?: boolean;
  className?: string;
  strokeWidth?: number;
  /** Rendered when there are fewer than two points (default: nothing). */
  empty?: ReactNode;
};

export function Sparkline({ values, width = 120, height = 32, color = 'var(--text-2)', area = false, label, window: win, base = false, dot, fluid = false, className, strokeWidth = 1.6, empty = null }: SparklineProps) {
  const fin = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (fin.length < 2) return <>{empty}</>;
  const W = fluid ? 200 : width;
  let min = Math.min(...fin), max = Math.max(...fin);
  if (area) { min = Math.min(min, 0); max = Math.max(max, 0); }
  const span = max - min || 1;
  const n = values.length - 1 || 1;
  const pad = 2;
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const X = (i: number) => (i / n) * W;
  // runs of consecutive finite points; a missing value starts a new run (the gap stays visible)
  const runs: [number, number][][] = [];
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) { if (runs.at(-1)?.length) runs.push([]); return; }
    if (!runs.length) runs.push([]);
    runs.at(-1)!.push([X(i), y(v)]);
  });
  const segs = runs.filter((r) => r.length);
  const d = segs.map((r) => r.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('')).join('');
  const y0 = y(Math.max(min, Math.min(max, 0)));
  const fill = area ? segs.map((r) => `${r.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('')}L${r.at(-1)![0].toFixed(1)},${y0.toFixed(1)}L${r[0][0].toFixed(1)},${y0.toFixed(1)}Z`).join('') : '';
  const lastI = values.findLastIndex((v) => v != null && Number.isFinite(v));
  const first = values.find((v): v is number => v != null && Number.isFinite(v))!;
  const name = [label, win && `${win} trend`].filter(Boolean).join(', ');
  const showDot = dot ?? !fluid;
  return (
    <svg className={className} width={fluid ? undefined : width} height={fluid ? undefined : height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio={fluid ? 'none' : undefined}
      role={name ? 'img' : undefined} aria-label={name || undefined} aria-hidden={name ? undefined : true}
      style={fluid ? undefined : { display: 'block', flex: 'none', overflow: 'visible' }}>
      {win && <title>{`${win} trend`}</title>}
      {base && <line x1={0} x2={W} y1={y(first)} y2={y(first)} stroke="var(--axis)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
      {area && <path d={fill} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {showDot && <circle cx={X(lastI)} cy={y(values[lastI]!)} r={2.4} fill={color} />}
    </svg>
  );
}

/** Downsample a series to at most n points (keeps the last point). */
export function downsample<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs;
  const step = xs.length / n;
  const out: T[] = [];
  for (let i = 0; i < n - 1; i++) out.push(xs[Math.floor(i * step)]);
  out.push(xs[xs.length - 1]);
  return out;
}
