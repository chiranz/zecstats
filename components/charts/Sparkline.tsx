// Tiny server-rendered trend line. No axes — always pair it with the number it summarises.
export function Sparkline({ values, width = 120, height = 32, color = 'var(--accent)', area = true, label }: { values: number[]; width?: number; height?: number; color?: string; area?: boolean; label?: string }) {
  const xs = values.filter((v) => Number.isFinite(v));
  if (xs.length < 2) return null;
  const min = Math.min(...xs), max = Math.max(...xs);
  const span = max - min || 1;
  const pts = xs.map((v, i) => [(i / (xs.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: 'block', overflow: 'visible' }}>
      {area && <path d={`${d}L${width},${height}L0,${height}Z`} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2.4} fill={color} />
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
