// Fluid sparkline (stretches to its box; stroke width stays constant). Server-rendered; always pair with its number.
export function Spark({ values, color = 'var(--text-2)', area = false, className, label, h = 32 }: { values: (number | null)[]; color?: string; area?: boolean; className?: string; label?: string; h?: number }) {
  const xs = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null && Number.isFinite(p[1]));
  if (xs.length < 2) return null;
  const W = 200;
  const n = values.length - 1 || 1;
  const min = Math.min(...xs.map((p) => p[1])), max = Math.max(...xs.map((p) => p[1]));
  const span = max - min || 1;
  const pts = xs.map(([i, v]) => [(i / n) * W, h - 2 - ((v - min) / span) * (h - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return (
    <svg className={className} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {area && <path d={`${d}L${pts.at(-1)![0]},${h}L${pts[0][0]},${h}Z`} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
