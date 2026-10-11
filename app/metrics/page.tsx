import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Tiles } from '@/components/ui/blocks';
import { MetricsTable } from '@/components/tools/MetricsTable';
import s from '@/components/tools/metrics.module.css';
import { change } from '@/components/tools/metricFormat';
import { getCorrelations, getMetricsTable, METRIC_GROUPS, metricId, pairIndex } from '@/lib/data/tools';
import { getLive } from '@/lib/data/snapshot';
import { dateLong, delta, num } from '@/lib/format';

export const metadata: Metadata = { title: 'Metrics table — every headline number', description: 'Every headline Zcash number in one table, each set against 28 days and 12 months ago.' };

export default async function MetricsPage() {
  const [table, corr, live] = await Promise.all([getMetricsTable(), getCorrelations(), getLive()]);
  const byName = (n: string) => table.rows.find((r) => r.name === n)!;
  const price = byName('ZEC Price'), tx = byName('Transactions / Day');
  const pc = change(price.now, price.periods['28D'].from, price.kind, false)!;
  const tc = change(tx.now, tx.periods['28D'].from, tx.kind, false)!;
  const defaults = table.rows.filter((r) => r.def).length;
  const i = corr.metrics.findIndex((m) => m.id === metricId('Shielded Supply'));
  const j = corr.metrics.findIndex((m) => m.id === metricId('Shielded % of Supply'));
  const r = corr.windows.ALL.r[pairIndex(i, j, corr.metrics.length)];

  return (
    <>
      <Masthead
        crumbs={[{ href: '/tools', label: 'Tools' }, { label: 'Metrics table' }]}
        title="Every headline number, and how it moved"
        lede={<>{defaults} Zcash numbers in one table, each set against 28 days and 12 months ago. Over 28 days the price-linked numbers {pc.dir === 'up' ? 'rose' : 'fell'} (ZEC <span className={pc.dir}>{pc.text}</span>) while on-chain activity {tc.dir === 'up' ? 'rose' : 'fell'} (transactions <span className={tc.dir}>{tc.text}</span>).</>}
      />
      <MetricsTable table={table} groups={METRIC_GROUPS} />
      <div className={s.fnotes}>
        <p><b>Levels</b> (price, supply, pool balances) are end-of-day values for {dateLong(table.date)}. <b>Rates</b> (per-day counts, fees, flows) are 7-day averages, so one busy day does not swing a row.</p>
        <p><b>No data</b> means the series doesn&apos;t reach back that far (open-interest and perp-volume history start in July 2026). It is not a zero.</p>
        <p>Flows and funding rates can change sign, so their change is shown as a difference (dollars, or percentage points) rather than a percentage.</p>
        <p>Transaction counts exclude coinbase (miner-reward) transactions, so the activity rows reflect user activity.</p>
      </div>
      <More summary="How these numbers are computed">
        <p>Every row comes from the same daily series the charts use (<span className="mono">/api/metric-series</span>): one value per complete UTC day, computed from our own Zebra node for chain figures and from Coin Metrics daily closes for price. Today is still being written, so the table stops at the last complete day, {dateLong(table.date)}.</p>
        <p>Each change column compares that last day with the same series 7, 28, 91, 182 or 365 days earlier. A percentage change is (now ÷ then − 1). The sparkline in each cell is that window of the series, drawn from its first value (dashed line) to now (dot).</p>
        <p>Rows sort by the change in the first compare column, inside their group, so different units are never ranked against each other.</p>
      </More>
      <Tiles
        items={[
          { href: '/correlate', title: 'Correlations', desc: 'Which of these numbers actually move together, and which move opposite.', value: r != null ? <>Shielded supply vs shielded % · r {num(r, 3)}</> : undefined },
          { href: '/compare', title: 'Compare charts', desc: 'Put any two of these rows on one time axis, with one shared range.', value: 'e.g. Price vs tx/day' },
          { href: '/chart/price', title: 'ZEC price', desc: 'The full price history with moving averages and log scale.', value: <>${num(live.zec_usd, 2)} <span className={live.zec_usd_change_24h_pct >= 0 ? 'up' : 'dn'} style={{ fontSize: 13 }}>{delta(live.zec_usd_change_24h_pct).text}</span></> },
          { href: '/charts', title: 'All 58 charts', desc: 'Every chart behind this table, grouped by subject.', value: '7 groups' },
        ]}
      />
    </>
  );
}
