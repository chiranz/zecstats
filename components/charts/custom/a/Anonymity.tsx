'use client';

// /chart/anonymity: "If I deshield X ZEC, how many shielding transactions could be my source?"
// Step chart over a log ZEC-amount axis + an amount field that reads the answer out in words.
import { useState } from 'react';
import { XYChart } from './XYChart';
import s from './a.module.css';

type AnonBucket = { label: string; lo: number; hi: number; mid: number; shieldCum: number; deshieldCum: number };
type Props = { buckets: AnonBucket[] };

const n0 = (v: number) => v.toLocaleString('en-US');

export function Anonymity(props: Record<string, unknown>) {
  const { buckets } = props as unknown as Props;
  const [amt, setAmt] = useState('10');
  const a = Number(amt);
  const b = Number.isFinite(a) && a > 0 ? buckets.find((x) => a >= x.lo && a < x.hi) ?? buckets[buckets.length - 1] : null;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className={s.anonQ}>
        <label htmlFor="anon-amt" className={s.anonL}>If you deshield</label>
        <span className={`field ${s.anonF}`}>
          <input id="anon-amt" type="number" inputMode="decimal" min="0" step="any" value={amt} onChange={(e) => setAmt(e.target.value)} aria-describedby="anon-out" />
          <span className="muted mono">ZEC</span>
        </span>
        <p id="anon-out" className={s.anonOut} aria-live="polite">
          {b ? <>from Orchard or Ironwood, <b>{n0(b.shieldCum)}</b> shielding transactions have ever moved at least the {b.label} ZEC bucket into those pools — that is your crowd. {n0(b.deshieldCum)} deshields of that size or larger have happened.</> : 'Type an amount in ZEC.'}
        </p>
      </div>
      <XYChart
        series={[
          { key: 'shield', label: 'Shielding txs ≥ amount (your crowd)', color: 'var(--s1)', points: buckets.map((x) => [x.mid, x.shieldCum]) },
          { key: 'deshield', label: 'Deshielding txs ≥ amount', color: 'var(--s2)', points: buckets.map((x) => [x.mid, x.deshieldCum]), dashed: true },
        ]}
        xFormat="zecAmount" yFormat="countCompact" xLabel="amount (ZEC, log scale) →" xLog step yLogDefault logToggle
        xTicks={[0.01, 0.1, 1, 10, 100, 1000, 10000]}
        markX={b?.mid}
        ariaLabel="Step chart: for each ZEC amount, how many shielding and deshielding transactions into or out of Orchard and Ironwood were at least that large. The count falls steeply above 100 ZEC."
      />
    </div>
  );
}
