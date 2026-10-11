// Table/feed sparkline: neutral line, a dashed baseline at the window's first value, and an end dot coloured by
// direction (the arrow + number beside it carries the meaning; colour is never the only cue).
export function Spark({ values, width = 88, height = 26, label, base = true }: { values: number[]; width?: number; height?: number; label?: string; base?: boolean }) {
  const xs = values.filter((v) => Number.isFinite(v));
  if (xs.length < 2) return <span aria-hidden="true" style={{ display: 'block', width, height }} />;
  const min = Math.min(...xs), max = Math.max(...xs);
  const span = max - min || 1;
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const pts = xs.map((v, i) => [(i / (xs.length - 1)) * width, y(v)] as const);
  const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
  const up = xs.at(-1)! >= xs[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: 'block', flex: 'none', overflow: 'visible' }}>
      {base && <line x1={0} x2={width} y1={y(xs[0])} y2={y(xs[0])} stroke="var(--axis)" strokeWidth={1} strokeDasharray="2 3" />}
      <path d={d} fill="none" stroke="var(--text-2)" strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2.6} fill={up ? 'var(--up)' : 'var(--down)'} />
    </svg>
  );
}
