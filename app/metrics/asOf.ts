import 'server-only';
import { COMPARE_PERIODS, getMetricSeries, type MetricPeriod, type MetricRow, type MetricsTable, type PeriodKey } from '@/lib/data/tools';

// ?date=YYYY-MM-DD — the table as it read at the end of that complete day (the live page's as-of view). Same rules as
// getMetricsTable, with "now" moved back: each row's labels and kind come from the latest table, its values from the
// same daily series at the chosen day. A metric with no value that day (not yet tracked) is left out.

const round = (v: number) => (v === 0 ? 0 : Number(v.toPrecision(6)));
function sparkOf(xs: (number | null)[], n = 36): number[] {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
  if (v.length <= n) return v.map(round);
  const out: number[] = [];
  for (let i = 0; i < n - 1; i++) out.push(round(v[Math.floor((i * v.length) / (n - 1))]));
  out.push(round(v[v.length - 1]));
  return out;
}

/** The range a date can take: the first day of the series to the last complete day. */
export async function asOfBounds() {
  const ms = await getMetricSeries();
  return { min: ms.dates[0], max: ms.dates[ms.dates.length - 1] };
}

/** `latest` re-read as of `date` (clamped to the series; a missing day falls back to the day before). */
export async function metricsTableAsOf(latest: MetricsTable, date: string): Promise<MetricsTable> {
  const ms = await getMetricSeries();
  let last = ms.dates.length - 1;
  while (last > 0 && ms.dates[last] > date) last--;
  if (last === ms.dates.length - 1) return latest;
  const at = (i: number) => (i >= 0 ? ms.dates[i] : ms.dates[0]);
  const periodDates = Object.fromEntries(COMPARE_PERIODS.map((p) => [p.key, at(last - p.days)])) as Record<PeriodKey, string>;
  const byName = new Map(ms.metrics.map((m) => [m.name, m.series]));
  const rows: MetricRow[] = [];
  for (const row of latest.rows) {
    const series = byName.get(row.name);
    const now = series?.[last];
    if (!series || now == null) continue;
    const periods = {} as Record<PeriodKey, MetricPeriod>;
    for (const p of COMPARE_PERIODS) {
      const i = last - p.days;
      const from = i >= 0 ? series[i] : null;
      periods[p.key] = { from: from == null ? null : round(from), spark: sparkOf(series.slice(Math.max(0, i), last + 1)) };
    }
    rows.push({ ...row, now: round(now), periods });
  }
  return { date: ms.dates[last], periodDates, rows };
}
