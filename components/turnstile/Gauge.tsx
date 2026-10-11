// Inflation Suspicion Index (0–100): a semicircle gauge, and a linear meter for small cards. Server-rendered. Bands come
// from ISI_BANDS (one scheme site-wide); each gauge names every band and its range in a key under it.
import { ISI_BANDS, isiBand } from '@/lib/data/turnstile';
import s from './Gauge.module.css';

const CX = 150, CY = 150, R = 128;
const ang = (v: number) => Math.PI - (Math.max(0, Math.min(100, v)) / 100) * Math.PI;
const pt = (v: number, r = R) => [CX + r * Math.cos(ang(v)), CY - r * Math.sin(ang(v))] as const;
const f = (n: number) => n.toFixed(1);
const desc = (v: number) => `Inflation Suspicion Index ${Math.round(v)} out of 100, in the ${isiBand(v).name} band (${ISI_BANDS.map((b) => `${b.name} ${b.from}–${b.to}`).join(', ')}).`;

/** Key: swatch · band name · range, the current band bold. */
export function IsiKey({ value }: { value: number }) {
  const on = isiBand(value);
  return (
    <ul className={s.key} aria-hidden="true">
      {ISI_BANDS.map((b) => (
        <li key={b.name} className={b === on ? s.on : undefined}><i style={{ background: b.color }} />{b.name}<span>{b.from}–{b.to}</span></li>
      ))}
    </ul>
  );
}

export function Gauge({ value }: { value: number }) {
  const v = Math.round(value);
  const zone = isiBand(value);
  const [nx, ny] = pt(value, R - 30);
  return (
    <div className={s.wrap}>
      <svg className={s.svg} viewBox="0 0 300 214" role="img" aria-label={desc(value)}>
        {ISI_BANDS.map((z) => {
          const [x0, y0] = pt(z.from + (z.from ? 0.8 : 0));
          const [x1, y1] = pt(z.to - (z.to < 100 ? 0.8 : 0));
          return <path key={z.name} d={`M${f(x0)} ${f(y0)} A${R} ${R} 0 0 1 ${f(x1)} ${f(y1)}`} fill="none" style={{ stroke: z.color }} strokeOpacity={z === zone ? 1 : 0.4} strokeWidth={22} />;
        })}
        {ISI_BANDS.slice(1).map((z) => {
          const [a, b] = pt(z.from, R - 13), [c, d] = pt(z.from, R - 30);
          return <line key={z.from} x1={f(a)} y1={f(b)} x2={f(c)} y2={f(d)} stroke="var(--axis)" />;
        })}
        <line x1={CX} y1={CY} x2={f(nx)} y2={f(ny)} stroke="var(--value)" strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={9} fill="var(--card)" stroke="var(--value)" strokeWidth={3.5} />
        <text x={CX} y={208} textAnchor="middle" className={s.v}>{v}<tspan className={s.of}> / 100</tspan></text>
      </svg>
      <IsiKey value={value} />
    </div>
  );
}

/** Linear version for a narrow card: bands sized by their range, a needle, and the same key. */
export function IsiMeter({ value }: { value: number }) {
  const on = isiBand(value);
  return (
    <div className={s.meter}>
      <div className={s.track} role="img" aria-label={desc(value)}>
        {ISI_BANDS.map((b) => <i key={b.name} style={{ flex: b.to - b.from, background: b.color, opacity: b === on ? 1 : 0.4 }} />)}
        <b style={{ left: `calc(${Math.max(0, Math.min(100, value))}% - 1.5px)` }} />
      </div>
      <IsiKey value={value} />
    </div>
  );
}
