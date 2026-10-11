'use client';

import { useMemo, useState } from 'react';
import { TimeSeriesChart, type RangeKey } from '@/components/charts/TimeSeriesChart';
import { Card, ChartActions, Section } from '@/components/ui/blocks';
import { dateLong, pct, usdCompact } from '@/lib/format';

// /wallet-apps "How has each app's volume moved?" with the live page's Daily / Weekly / Monthly / Quarterly rollup,
// and the leader table that follows it. Daily covers the last 90 days (as live); the other rollups all history.
// Each bar is dated by the first day of its period (weeks start Monday, UTC); the newest is the period so far.

type Roll = 'day' | 'week' | 'month' | 'quarter';
export type AppGroup = { key: string; label: string; color: string; apps: string[] };

const ROLLS: { key: Roll; label: string; noun: string; head: string }[] = [
  { key: 'day', label: 'Daily', noun: 'day', head: 'Day' },
  { key: 'week', label: 'Weekly', noun: 'week', head: 'Week of' },
  { key: 'month', label: 'Monthly', noun: 'month', head: 'Month' },
  { key: 'quarter', label: 'Quarterly', noun: 'quarter', head: 'Quarter' },
];
const RANGES: Record<Roll, { ranges: RangeKey[] | false; def?: RangeKey }> = {
  day: { ranges: false }, week: { ranges: ['3M', '6M', '1Y', 'ALL'], def: '1Y' }, month: { ranges: ['1Y', 'ALL'], def: 'ALL' }, quarter: { ranges: false },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function bucketOf(d: string, roll: Roll) {
  if (roll === 'day') return d;
  if (roll === 'week') { const t = new Date(`${d}T00:00:00Z`); return new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10); }
  if (roll === 'month') return `${d.slice(0, 7)}-01`;
  return `${d.slice(0, 4)}-${String(Math.floor((Number(d.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, '0')}-01`;
}
function label(b: string, roll: Roll) {
  if (roll === 'month') return `${MONTHS[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`;
  if (roll === 'quarter') return `Q${Math.floor((Number(b.slice(5, 7)) - 1) / 3) + 1} ${b.slice(0, 4)}`;
  return dateLong(b);
}

export function WalletAppsChart({ dates, apps, usd, groups }: { dates: string[]; apps: string[]; usd: number[][]; groups: AppGroup[] }) {
  const [roll, setRoll] = useState<Roll>('week');
  const r = ROLLS.find((x) => x.key === roll)!;

  const { keys, sums } = useMemo(() => {
    const start = roll === 'day' ? Math.max(0, dates.length - 90) : 0;
    const ks: string[] = [], idx = new Map<string, number>(), ss: number[][] = apps.map(() => []);
    for (let i = start; i < dates.length; i++) {
      const b = bucketOf(dates[i], roll);
      let k = idx.get(b);
      if (k == null) { k = ks.length; idx.set(b, k); ks.push(b); ss.forEach((s) => s.push(0)); }
      apps.forEach((_, a) => (ss[a][k!] += usd[a][i] ?? 0));
    }
    // start where the volume does (the first days of history are empty)
    const from = roll === 'day' ? 0 : Math.max(0, ks.findIndex((_, k) => ss.reduce((t, s) => t + s[k], 0) > 1000));
    return { keys: ks.slice(from), sums: ss.map((s) => s.slice(from)) };
  }, [dates, apps, usd, roll]);

  const series = groups.map((g) => ({ key: g.key, label: g.label, color: g.color, type: 'bar' as const, values: keys.map((_, k) => g.apps.reduce((t, app) => t + (sums[apps.indexOf(app)]?.[k] ?? 0), 0)) }));
  const named = apps.map((a, i) => ({ a, i })).filter(({ a }) => a !== 'Other');
  const leaders = keys.slice(0, -1).slice(-12).reverse().map((b) => {
    const k = keys.indexOf(b);
    const total = apps.reduce((t, _, ai) => t + sums[ai][k], 0);
    const ranked = named.map(({ a, i }) => ({ a, v: sums[i][k] })).sort((x, y) => y.v - x.v);
    return { b, total, first: ranked[0], second: ranked[1] };
  });
  const top = leaders.length ? [...new Set(leaders.map((l) => l.first.a))].map((a) => ({ a, n: leaders.filter((l) => l.first.a === a).length })).sort((x, y) => y.n - x.n)[0] : null;
  const allTime = usd.reduce((t, s) => t + s.reduce((x, v) => x + v, 0), 0);
  const rg = RANGES[roll];

  return (
    <>
      <Card
        title="How has each app’s volume moved?"
        takeaway={<>{top ? <>{top.a} led <b>{top.n} of the last {leaders.length}</b> full {r.noun}s; </> : null}all apps together have moved <b>{usdCompact(allTime, 2)}</b> of ZEC swaps since {dateLong(dates[0])}.</>}
        actions={<ChartActions name={`${r.label.toLowerCase()} volume by app`} />}
        foot={`${r.label} totals${roll === 'day' ? ', last 90 days' : ''}${roll === 'week' ? ', weeks starting Monday (UTC)' : ''}; each column is dated by the first day of its ${r.noun} and the newest is the ${r.noun} so far. Nine apps are folded into five groups: SwapKit wallets = THORSwap, Trust Wallet and Ledger; referral codes = three near-intents referral accounts.`}
      >
        <div className="toolbar">
          <span className="lbl" id="wa-roll">Rollup</span>
          <div className="seg" role="group" aria-labelledby="wa-roll">
            {ROLLS.map((x) => <button key={x.key} type="button" aria-pressed={roll === x.key} onClick={() => setRoll(x.key)}>{x.label}</button>)}
          </div>
        </div>
        <TimeSeriesChart key={roll} dates={keys} series={series} format="usdCompact" stacked shareToggle ranges={rg.ranges} defaultRange={rg.def} height={320} ariaLabel={`${r.label} ZEC swap volume on NEAR Intents by app group, stacked.`} />
      </Card>

      <Section title={`Which app led each ${r.noun}?`}>
        <div className="tbl-wrap">
          <table className="t">
            <caption className="sr-only">{`Leader among named apps, last ${leaders.length} full ${r.noun}s`}</caption>
            <thead><tr><th scope="col">{r.head}</th><th scope="col" style={{ textAlign: 'left' }}>Leader</th><th scope="col">Share</th><th scope="col" style={{ textAlign: 'left' }}>Second</th><th scope="col">Share</th><th scope="col">Total</th></tr></thead>
            <tbody>
              {leaders.map((l) => (
                <tr key={l.b}>
                  <td>{label(l.b, roll)}</td>
                  <td className="l" style={{ textAlign: 'left' }}>{l.first.a}</td>
                  <td>{pct(l.total ? (l.first.v / l.total) * 100 : 0, 1)}</td>
                  <td className="l" style={{ textAlign: 'left' }}>{l.second.a}</td>
                  <td>{pct(l.total ? (l.second.v / l.total) * 100 : 0, 1)}</td>
                  <td>{usdCompact(l.total, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">Among the eight apps the chart names; everything else is “Other” and is counted in the total only. The {r.noun} in progress is left out.</p>
      </Section>
    </>
  );
}
