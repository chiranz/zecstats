// Server-rendered percentile strip on a log dollar axis (the tx-sizes hero). Labels alternate rows so they never collide.
export type StripMark = { label: string; v: number; display: string; strong?: boolean };

export function PercentileStrip({ marks, mean, meanDisplay, meanNote, lo, hi, band, ariaLabel, fmtTick }: {
  marks: StripMark[]; mean: number; meanDisplay: string; meanNote: string; lo: number; hi: number; band: [number, number]; ariaLabel: string; fmtTick: (v: number) => string;
}) {
  const W = 1100, L = 24, R = 1076;
  const x = (v: number) => L + ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (R - L);
  const ticks: number[] = [];
  for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) ticks.push(10 ** e);
  // two label rows: alternate when neighbours are closer than ~110px
  let lastX = -1e9, row = 0;
  const placed = marks.map((m) => { const px = x(m.v); row = px - lastX < 110 ? 1 - row : 0; lastX = px; return { ...m, px, row }; });
  const mx = x(mean);
  const noteRight = mx < W * 0.62;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} 140`} role="img" aria-label={ariaLabel}>
        <rect x={x(band[0])} y={55} width={x(band[1]) - x(band[0])} height={14} rx={3} fill="var(--s2)" opacity={0.22} />
        <line className="ax" x1={L} x2={R} y1={62} y2={62} />
        {ticks.map((t, i) => (
          <g key={t}>
            <line className="ax" x1={x(t)} x2={x(t)} y1={69} y2={73} />
            <text x={x(t)} y={132} textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}>{fmtTick(t)}</text>
          </g>
        ))}
        <text x={x(band[0]) + 6} y={50} style={{ fill: 'var(--muted)' }}>middle 80% of transactions</text>
        {placed.map((m) => (
          <g key={m.label}>
            <line x1={m.px} x2={m.px} y1={53} y2={78 + m.row * 18} stroke={m.strong ? 'var(--value)' : 'var(--s2)'} strokeWidth={m.strong ? 2 : 1.5} />
            <text x={m.px} y={88 + m.row * 18} textAnchor="middle"><tspan style={{ fill: 'var(--text-2)' }}>{m.label}</tspan> <tspan style={{ fill: 'var(--value)', fontWeight: 600 }}>{m.display}</tspan></text>
          </g>
        ))}
        <path d={`M${mx} 44 l5 6 -5 6 -5 -6z`} fill="var(--s4)" />
        <line x1={mx} x2={mx} y1={56} y2={62} stroke="var(--s4)" strokeDasharray="2 2" />
        <text x={noteRight ? mx + 10 : mx - 10} y={30} textAnchor={noteRight ? 'start' : 'end'}><tspan style={{ fill: 'var(--text-2)' }}>Mean</tspan> <tspan style={{ fill: 'var(--value)', fontWeight: 600 }}>{meanDisplay}</tspan> <tspan style={{ fill: 'var(--muted)' }}>{meanNote}</tspan></text>
      </svg>
    </div>
  );
}
