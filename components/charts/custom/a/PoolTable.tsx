'use client';

// "Pool balances today" table for /chart/pools (Chart-pools artboard). Props are JSON from lib/charts/a/privacy.ts.
import s from './a.module.css';

type PoolRow = { key: string; label: string; color: string; status: string; launched: string; balance: number; shareShielded: number | null; shareSupply: number };
type Props = { rows: PoolRow[]; shieldedTotal: number; shieldedShare: number; supply: number; date: string };

const n0 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
const p = (v: number, d = 1) => `${v.toFixed(d)}%`;

export function PoolTable(props: Record<string, unknown>) {
  const { rows, shieldedTotal, shieldedShare, supply, date } = props as unknown as Props;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="tbl-wrap">
        <table className="t">
          <caption className="sr-only">Pool balances on {date}</caption>
          <thead>
            <tr>
              <th scope="col">Pool</th>
              <th scope="col" style={{ textAlign: 'left' }} className={s.hideM}>Status</th>
              <th scope="col" className={s.hideM}>Launched</th>
              <th scope="col">Balance (ZEC)</th>
              <th scope="col">Share of shielded</th>
              <th scope="col" className={s.hideM}>Share of supply</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.shareShielded == null ? s.off : undefined}>
                <td><span className={s.pn}><i className={s.dot} style={{ background: r.color }} aria-hidden="true" />{r.label}</span></td>
                <td className={`${s.st} ${s.hideM}`}>{r.status}</td>
                <td className={s.hideM}>{r.launched}</td>
                <td>{n0(r.balance)}</td>
                <td>
                  {r.shareShielded == null ? <span className="muted">not shielded</span> : (
                    <><span className={s.bar} aria-hidden="true"><i style={{ width: `${Math.max(2, r.shareShielded)}%`, background: r.color }} /></span>{p(r.shareShielded)}</>
                  )}
                </td>
                <td className={s.hideM}>{p(r.shareSupply, 2)}</td>
              </tr>
            ))}
            <tr className={s.tot}>
              <td>Shielded total</td>
              <td className={s.hideM} />
              <td className={s.hideM} />
              <td>{n0(shieldedTotal)}</td>
              <td>100%</td>
              <td className={s.hideM}>{p(shieldedShare, 2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="small">Shares of supply use {n0(supply)} ZEC mined, balances at the end of {date}. The dev-fund lockbox sits outside these pools, so the rows don’t add to exactly 100% of supply.</p>
    </div>
  );
}
