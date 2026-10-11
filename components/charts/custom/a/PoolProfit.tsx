'use client';

// /chart/pool-profit: one cost-basis histogram per pool (small multiples), log cost axis, today's price as a dashed line.
// In profit / in loss is encoded by position (left/right of the price line) AND colour (blue / rust), never red/green or a
// pool hue. The card names the pool's real (consensus) balance; the model's own total is added where it differs.
import s from './a.module.css';

type PnlPool = { pool: string; color: string; exact: boolean; zec: number; balance?: number; realized: number; mvrv: number; pctProfit: number; hist: { cost: number; zec: number; profit: boolean }[] };
type Props = { pools: PnlPool[]; priceNow: number; priceLabel?: string };
const IN = 'var(--s1)', OUT = 'var(--s2)';

const usdShort = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : v >= 1 ? `$${Math.round(v)}` : `$${v.toFixed(2)}`);
const zShort = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : Math.round(v).toString());

export function PoolProfit(props: Record<string, unknown>) {
  const { pools, priceNow, priceLabel = 'Today' } = props as unknown as Props;
  const all = pools.flatMap((p) => p.hist.map((b) => b.cost)).filter((c) => c > 0);
  const lo = Math.max(0.5, Math.min(...all) * 0.9), hi = Math.max(...all, priceNow) * 1.15;
  // rounded so server and client markup agree (Math.log can differ in the last digit between engines)
  const X = (v: number) => Math.round(((Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * 1e5) / 1e3;
  const ticks = [1, 10, 100, 1000, 10000].filter((t) => t >= lo && t <= hi);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="legend" aria-hidden="true">
        <span><i className="sw" style={{ background: IN }} />Cost below the price line (in profit)</span>
        <span><i className="sw" style={{ background: OUT }} />Cost above it (in loss)</span>
        <span><i className="ln" style={{ background: 'repeating-linear-gradient(90deg, var(--text-2) 0 4px, transparent 4px 7px)' }} />{priceLabel} ${Math.round(priceNow).toLocaleString('en-US')}</span>
      </div>
      <div className={s.multi}>
        {pools.map((p) => {
          const max = Math.max(...p.hist.map((b) => b.zec), 1);
          const bw = Math.round(Math.max(0.6, 80 / Math.max(1, p.hist.length)) * 1000) / 1000;
          const bal = p.balance ?? p.zec;
          const off = Math.abs(p.zec - bal) > bal * 0.02;
          return (
            <figure key={p.pool} className={s.pcard} role="img" aria-label={`${p.pool}: ${p.pctProfit.toFixed(0)}% of its ZEC was acquired below the price line (${priceLabel}, ${usdShort(priceNow)}); ${zShort(bal)} ZEC in the pool${off ? `, ${zShort(p.zec)} in the model` : ''}; realized price ${usdShort(p.realized)}.`}>
              <div className={s.ph}>
                <span className={s.pn}><i className={s.dot} style={{ background: p.color }} aria-hidden="true" />{p.pool}{!p.exact && <span className={s.model}>deposit model</span>}</span>
                <b className={s.pp}>{p.pctProfit.toFixed(0)}% <span>in profit</span></b>
              </div>
              <span className="small mono">{zShort(bal)} ZEC in pool{off && ` · model ${zShort(p.zec)}`} · realized {usdShort(p.realized)} · MVRV {p.mvrv.toFixed(2)}×</span>
              <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={s.hist} aria-hidden="true">
                <line x1="0" x2="100" y1="59.5" y2="59.5" stroke="var(--axis)" vectorEffect="non-scaling-stroke" />
                {p.hist.map((b, i) => {
                  const h = Math.round((b.zec / max) * 5600) / 100;
                  return <rect key={i} x={Math.round((X(b.cost) - bw / 2) * 1000) / 1000} y={Math.round((59.5 - h) * 100) / 100} width={bw} height={h} fill={b.profit ? IN : OUT} opacity={0.88} />;
                })}
                <line x1={X(priceNow)} x2={X(priceNow)} y1="0" y2="60" stroke="var(--text-2)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className={s.hx} aria-hidden="true">{ticks.map((t) => <span key={t} style={{ left: `${X(t)}%` }}>{usdShort(t)}</span>)}</div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
