'use client';

import { useState, type ReactNode } from 'react';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { CsvButton } from './CsvButton';
import { setQuery } from './params';
import { ACTIVITY_RANGES, type ActivityRange } from './views';

// /activity "What happens to transparent coins over time?": live's ?range= (30 | 90 | 365 | 0 = all, in days back from
// the last row) sliced here, plus the ?window= control the server renders (it picks the data) and the CSV of the rows.

type Row = { date: string } & Record<string, number | string>;

export function ActivityChart({ rows, buckets, initialRange, windowSeg, unit, ariaLabel }: {
  rows: Row[]; buckets: { key: string; label: string; color: string }[]; initialRange: ActivityRange; windowSeg: ReactNode; unit: string; ariaLabel: string;
}) {
  const [range, setRange] = useState<ActivityRange>(initialRange);
  const last = rows.at(-1)?.date ?? '';
  const cutoff = range === '0' || !last ? '' : new Date(Date.parse(`${last}T00:00:00Z`) - Number(range) * 86400000).toISOString().slice(0, 10);
  const shown = cutoff ? rows.filter((r) => r.date >= cutoff) : rows;

  return (
    <>
      <div className="toolbar">
        <span className="lbl" id="act-win">Columns</span>
        {windowSeg}
        <span className="lbl" id="act-rng">Range</span>
        <div className="seg" role="group" aria-labelledby="act-rng">
          {ACTIVITY_RANGES.map(([k, l]) => <button key={k} type="button" aria-pressed={range === k} onClick={() => { setRange(k); setQuery({ range: k }); }}>{l}</button>)}
        </div>
        <span style={{ marginLeft: 'auto' }}><CsvButton rows={rows} slug="transparent-activity" className="btn" /></span>
      </div>
      <TimeSeriesChart
        key={range}
        dates={shown.map((r) => r.date)}
        series={buckets.map((k) => ({ key: k.key, label: k.label, color: k.color, values: shown.map((r) => Number(r[`${k.key}_zat`]) / 1e8), type: 'bar' as const }))}
        stacked
        shareToggle
        format="zecCompact"
        ranges={false}
        height={320}
        ariaLabel={`${ariaLabel} ${unit === 'weekly' ? 'Weekly' : unit === 'monthly' ? 'Monthly' : 'Daily'} columns.`}
      />
    </>
  );
}
