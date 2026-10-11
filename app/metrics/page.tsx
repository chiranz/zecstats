import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Tiles } from '@/components/ui/blocks';
import { MetricsTable, type MetricsView } from '@/components/tools/MetricsTable';
import { isoDay, one } from '@/components/reports/params';
import { asOfBounds, metricsTableAsOf } from './asOf';
import s from '@/components/tools/metrics.module.css';
import { change } from '@/components/tools/metricFormat';
import { COMPARE_PERIODS, getCorrelations, getMetricsTable, METRIC_GROUPS, metricId, pairIndex, type PeriodKey } from '@/lib/data/tools';
import { ALL_SLUGS } from '@/lib/charts';
import { CHART_GROUPS } from '@/lib/charts/types';
import { dateLong, dateShort, num, usd } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/metrics');

const PERIODS = COMPARE_PERIODS.map((p) => p.key);

export default async function MetricsPage({ searchParams }: PageProps<'/metrics'>) {
  const sp = await searchParams;
  const [latest, corr, bounds] = await Promise.all([getMetricsTable(), getCorrelations(), asOfBounds()]);
  // ?date= (live's as-of view): a complete day inside the series; anything else is the latest day
  const date = isoDay(one(sp.date));
  const table = date && date >= bounds.min && date < bounds.max ? await metricsTableAsOf(latest, date) : latest;
  const asOf = table.date === latest.date ? null : table.date;
  // the table's own view params, read here so a shared link renders as sent (bad values fall back to defaults)
  const cmp = one(sp.cmp)?.split(',').filter((x): x is PeriodKey => (PERIODS as string[]).includes(x)).slice(0, 2);
  const m = one(sp.m)?.split(',').filter((id) => latest.rows.some((r) => r.id === id));
  const so = one(sp.sort);
  const view: MetricsView = {
    cmp: cmp?.length ? PERIODS.filter((p) => cmp.includes(p)) : null,
    m: m?.length ? m : null,
    spark: one(sp.spark) !== '0',
    sort: so && /^[01][ad]$/.test(so) ? { col: Number(so[0]) as 0 | 1, dir: so[1] === 'a' ? 'asc' : 'desc' } : { col: 0, dir: 'desc' },
  };
  const byName = (n: string) => table.rows.find((r) => r.name === n);
  const price = byName('ZEC Price'), tx = byName('Transactions / Day');
  // an early as-of day can have no 28-day history; the second sentence is then left out
  const pc = price && change(price.now, price.periods['28D'].from, price.kind, false);
  const tc = tx && change(tx.now, tx.periods['28D'].from, tx.kind, false);
  // how the market rows moved over 28 days, counted rather than assumed
  const mkt = table.rows.filter((x) => x.def && x.group === 'market').map((x) => change(x.now, x.periods['28D'].from, x.kind, x.signed)).filter((c) => c != null);
  const mUp = mkt.filter((c) => c.dir === 'up').length, mDn = mkt.filter((c) => c.dir === 'dn').length;
  const defaults = table.rows.filter((r) => r.def).length;
  const i = corr.metrics.findIndex((m) => m.id === metricId('Shielded Supply'));
  const j = corr.metrics.findIndex((m) => m.id === metricId('Shielded % of Supply'));
  const r = corr.windows.ALL.r[pairIndex(i, j, corr.metrics.length)];

  return (
    <>
      <SectionLd path="/metrics" />
      <Masthead
        title="Every headline number, and how it moved"
        lede={<>{asOf ? <>As of <b className="value">{dateLong(asOf)}</b>: </> : null}{defaults} Zcash numbers in one table, each set against 28 days and 12 months {asOf ? 'before' : 'ago'}.{pc && tc ? <> Over 28 days ZEC&apos;s price {pc.dir === 'up' ? 'rose' : pc.dir === 'dn' ? 'fell' : 'held'} (<span className={pc.cls}>{pc.text}</span>) and transactions per day {tc.dir === 'up' ? 'rose' : tc.dir === 'dn' ? 'fell' : 'held'} (<span className={tc.cls}>{tc.text}</span>, 7-day average); {mUp} of the {mkt.length} market rows rose and {mDn} fell.</> : null}</>}
      />
      <MetricsTable table={table} groups={METRIC_GROUPS} view={view} asOf={asOf} bounds={bounds} defaults={latest.rows.filter((r) => r.def).map((r) => r.id)} />
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
          { href: '/chart/price', title: 'ZEC price', desc: 'The full price history with moving averages and log scale.', value: price ? <>{usd(price.now, 2)} <span className="muted" style={{ fontSize: 13 }}>close, {dateShort(table.date)}</span></> : undefined },
          { href: '/charts', title: `All ${ALL_SLUGS.length} charts`, desc: 'Every chart behind this table, grouped by subject.', value: `${CHART_GROUPS.length} groups` },
        ]}
      />
    </>
  );
}
