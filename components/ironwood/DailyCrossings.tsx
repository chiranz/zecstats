'use client';

import { useState } from 'react';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { Legend } from '@/components/ui/blocks';
import type { DailyCrossing } from '@/lib/data/ironwood';

const HATCH = 'url(#iw-hatch)';

/** "How many coins cross per day?" — stacked daily columns, or the cumulative share of Orchard that has crossed. */
export function DailyCrossings({ days }: { days: DailyCrossing[] }) {
  const [view, setView] = useState<'day' | 'cum'>('day');
  const dates = days.map((d) => d.date);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <pattern id="iw-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="var(--inset)" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="var(--p-orchard)" strokeWidth="2" />
          </pattern>
        </defs>
      </svg>
      <div className="spread" style={{ alignItems: 'center' }}>
        {view === 'day' ? (
          <Legend items={[
            { label: 'From Sapling + transparent, for context', color: 'var(--other)' },
            { label: 'From Orchard, partial (day in progress)', color: 'repeating-linear-gradient(135deg,var(--p-orchard) 0 2px,transparent 2px 4px)' },
            { label: 'From Orchard, complete days', color: 'var(--p-orchard)' },
          ]} />
        ) : (
          <Legend items={[{ label: 'Share of Orchard’s activation balance crossed so far', color: 'var(--p-ironwood)', line: true }]} />
        )}
        <div className="seg" role="group" aria-label="Chart view">
          <button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')}>Per day</button>
          <button type="button" aria-pressed={view === 'cum'} onClick={() => setView('cum')}>Cumulative %</button>
        </div>
      </div>
      {view === 'day' ? (
        <TimeSeriesChart
          key="day"
          dates={dates}
          series={[
            { key: 'orchard', label: 'From Orchard', color: 'var(--p-orchard)', type: 'bar', agg: 'mean', values: days.map((d) => (d.complete ? d.orchard : null)) },
            { key: 'partial', label: 'From Orchard (day in progress)', color: HATCH, type: 'bar', agg: 'mean', values: days.map((d) => (d.complete ? null : d.orchard)) },
            { key: 'other', label: 'Sapling + transparent', color: 'var(--other)', type: 'bar', agg: 'mean', values: days.map((d) => d.other) },
          ]}
          stacked
          format="zecCompact"
          ranges={false}
          showLegend={false}
          height={320}
          ariaLabel="Daily ZEC crossing into Ironwood since 28 July 2026, split into coins from Orchard and coins from Sapling plus transparent"
        />
      ) : (
        <TimeSeriesChart
          key="cum"
          dates={dates}
          series={[{ key: 'cum', label: 'Orchard crossed', color: 'var(--p-ironwood)', values: days.map((d) => d.cumPct) }]}
          format="pct"
          yDomain={[0, 100]}
          ranges={false}
          showLegend={false}
          height={320}
          ariaLabel="Cumulative share of Orchard's activation balance that has crossed into Ironwood, by day"
        />
      )}
    </div>
  );
}
