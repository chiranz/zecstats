// Semicircle gauge for the Inflation Suspicion Index (0–100). Server-rendered SVG; zones match the live page's bands.

const ZONES = [
  { from: 0, to: 25, label: 'Quiet', color: 'var(--line-strong)' },
  { from: 25, to: 55, label: 'Inconclusive', color: 'var(--warn)' },
  { from: 55, to: 80, label: 'Suspicious', color: 'var(--s4)' },
  { from: 80, to: 100, label: 'Breach', color: 'var(--down)' },
];
const CX = 210, CY = 180, R = 134;
const ang = (v: number) => Math.PI - (Math.max(0, Math.min(100, v)) / 100) * Math.PI;
const pt = (v: number, r = R) => [CX + r * Math.cos(ang(v)), CY - r * Math.sin(ang(v))] as const;
const f = (n: number) => n.toFixed(1);

export function Gauge({ value }: { value: number }) {
  const v = Math.round(value);
  const zone = ZONES.find((z) => value >= z.from && value < z.to) ?? ZONES[ZONES.length - 1];
  const [nx, ny] = pt(value, R - 26);
  const desc = `Inflation Suspicion Index gauge from 0 to 100 with four zones: ${ZONES.map((z) => `${z.label} ${z.from}–${z.to}`).join(', ')}. The needle reads ${v}, in the ${zone.label} zone.`;
  return (
    <div className="chart">
      <svg viewBox="-24 0 468 250" role="img" aria-label={desc}>
        {ZONES.map((z) => {
          const [x0, y0] = pt(z.from + (z.from ? 0.8 : 0));
          const [x1, y1] = pt(z.to - (z.to < 100 ? 0.8 : 0));
          const mid = (z.from + z.to) / 2;
          const [lx, ly] = pt(mid, R + 30);
          const on = z === zone;
          const anchor = mid < 35 ? 'end' : mid > 65 ? 'start' : 'middle';
          return (
            <g key={z.label}>
              <path d={`M${f(x0)} ${f(y0)} A${R} ${R} 0 0 1 ${f(x1)} ${f(y1)}`} fill="none" stroke={z.color} strokeOpacity={on ? 1 : 0.85} strokeWidth={22} />
              <text x={f(lx)} y={f(ly)} textAnchor={anchor} style={{ fontSize: 12, fill: on ? 'var(--value)' : 'var(--muted)', fontWeight: on ? 600 : 400 }}>{z.label}</text>
            </g>
          );
        })}
        {[0, 25, 50, 75, 100].map((t) => {
          const [a, b] = pt(t, R - 16), [c, d] = pt(t, R - 22);
          return <line key={t} x1={f(a)} y1={f(b)} x2={f(c)} y2={f(d)} stroke="var(--axis)" />;
        })}
        <text x={CX - R} y={CY + 20} textAnchor="middle">0</text>
        <text x={CX + R} y={CY + 20} textAnchor="middle">100</text>
        <line x1={CX} y1={CY} x2={f(nx)} y2={f(ny)} stroke="var(--value)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={8} fill="var(--card)" stroke="var(--value)" strokeWidth={3} />
        <text x={CX} y={238} textAnchor="middle" style={{ font: '700 44px var(--mono)', fill: 'var(--value)' }}>
          {v}<tspan style={{ fontSize: 16, fontWeight: 500, fill: 'var(--muted)' }}> / 100</tspan>
        </text>
      </svg>
    </div>
  );
}
