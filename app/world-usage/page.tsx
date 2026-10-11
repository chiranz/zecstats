import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Tiles } from '@/components/ui/blocks';
import { XYChart } from '@/components/reports/XYChart';
import { Heatmap } from '@/components/reports/Heatmap';
import { dateTicks, dayMs } from '@/components/reports/ticks';
import { FixedSeg } from '@/components/reports/FixedSeg';
import r from '@/components/reports/report.module.css';
import { getUsageClock, getUsageWeekly } from '@/lib/data/reports';
import { getExchangeCoverage } from '@/lib/data/crosschain';
import { compact, dateLong, num, pct } from '@/lib/format';

export const metadata: Metadata = { title: 'When the world uses Zcash', description: 'At which UTC hours Zcash is busiest, and which parts of the world are awake then.' };

// The live page's own region list (centre longitudes) — used to say where it is daytime at a given UTC hour.
const REGIONS = [
  { n: 'Americas', lon: -95 }, { n: 'South America', lon: -58 }, { n: 'Europe', lon: 12 }, { n: 'Africa', lon: 20 }, { n: 'Middle East', lon: 48 },
  { n: 'India', lon: 78 }, { n: 'East Asia', lon: 114 }, { n: 'Southeast Asia', lon: 106 }, { n: 'Japan', lon: 138 }, { n: 'Australia', lon: 135 },
];
const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;
const localSolar = (utcHour: number, lon: number) => (((utcHour + 0.5 + lon / 15) % 24) + 24) % 24;
const isDay = (utcHour: number, lon: number) => { const l = localSolar(utcHour, lon); return l >= 7 && l < 19; };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // API: 0 = Sunday

export default async function WorldUsagePage() {
  const [clock, weeks, ex] = await Promise.all([getUsageClock(), getUsageWeekly(), getExchangeCoverage()]);
  const byHour = [...clock.by_hour].sort((a, b) => a.hour - b.hour);
  const total = byHour.reduce((a, h) => a + h.txs, 0);
  const peak = byHour.reduce((b, h) => (h.txs > b.txs ? h : b));
  const trough = byHour.reduce((b, h) => (h.txs < b.txs ? h : b));
  const ratio = peak.txs / trough.txs;
  const share = (h: { txs: number }) => (h.txs / total) * 100;
  const from = new Date(clock.from * 1000).toISOString().slice(0, 10), to = new Date(clock.to * 1000).toISOString().slice(0, 10);

  const heat = DOW_ORDER.map((dow) => Array.from({ length: 24 }, (_, hr) => clock.by_dow_hour.find((x) => x.dow === dow && x.hour === hr)?.txs ?? 0));
  const dayTotals = heat.map((row) => row.reduce((a, v) => a + v, 0));
  const busiestDay = dayTotals.indexOf(Math.max(...dayTotals)), quietestDay = dayTotals.indexOf(Math.min(...dayTotals));

  const litPeak = REGIONS.filter((x) => isDay(peak.hour, x.lon)).map((x) => x.n);
  const litTrough = REGIONS.filter((x) => isDay(trough.hour, x.lon)).map((x) => x.n);
  const wk = weeks.slice(0, -1); // last week is partial
  const meanPeak = wk.reduce((a, w) => a + w.peak_hour, 0) / wk.length;
  const meanMean = wk.reduce((a, w) => a + w.mean_hour, 0) / wk.length;

  return (
    <>
      <Masthead
        crumbs={[{ label: 'Tools' }, { label: 'Reports' }, { label: 'When the world uses Zcash' }]}
        title="When does the world use Zcash?"
        lede={<>Busiest at <b className="num value">{hh(peak.hour)} UTC</b>, quietest at <b className="num value">{hh(trough.hour)} UTC</b> — {num(ratio, 2)}× apart. The peak falls in daylight across {litPeak.slice(0, 3).join(', ')}{litPeak.length > 3 ? ' and beyond' : ''}.</>}
      >
        <p className={r.mastNote}>Zcash transactions carry no location — that is the point of them — but every block carries a UTC timestamp. So this page shows <i>when</i> the chain is busy, and lines those hours up with where the sun is.</p>
      </Masthead>

      <div className={r.fbar} role="region" aria-label="Report filters">
        <div className={r.grp}>
          <span className={r.glbl} id="g-period">Period</span>
          <div className={r.grpRow}>
            <FixedSeg labelledBy="g-period" options={['1M', '3M', '6M', '1Y', 'ALL']} active="ALL" />
            <span className={r.count}><b>{dateLong(from)} – {dateLong(to)}</b> · {num(clock.blocks)} blocks · {compact(clock.txs, 2)} transactions</span>
          </div>
        </div>
      </div>

      <Card
        title="At what hour is Zcash busiest?"
        takeaway={<><b>{hh(peak.hour)} UTC</b> carries {pct(share(peak), 2)} of all transactions and <b>{hh(trough.hour)} UTC</b> only {pct(share(trough), 2)}: activity climbs through the European morning and peaks as the Americas wake up.</>}
        actions={<ChartActions api="usage-clock" name="activity by hour" />}
        legend={<Legend items={[{ label: 'Transactions in that UTC hour', color: 'var(--s2)' }, { label: 'Busiest hour', color: 'var(--zec)' }]} />}
        foot={`Every block since ${dateLong(from)}, bucketed by its UTC timestamp · ${num(clock.txs)} transactions`}
      >
        <XYChart
          x={byHour.map((h) => h.hour)} xScale="band" xTicks={[0, 3, 6, 9, 12, 15, 18, 21].map((v) => ({ v, label: hh(v) }))}
          series={[{ key: 'tx', label: 'Transactions', color: 'var(--s2)', type: 'bar', values: byHour.map((h) => h.txs), colors: byHour.map((h) => (h.hour === peak.hour ? 'var(--zec)' : null)), format: 'count' }]}
          yFormat="count" tipTitles={byHour.map((h) => `${hh(h.hour)}–${hh(h.hour + 1)} UTC`)} tipExtra={byHour.map((h) => `${pct(share(h), 2)} of the day · daylight in ${REGIONS.filter((x) => isDay(h.hour, x.lon)).length} of ${REGIONS.length} regions`)}
          height={300} ariaLabel={`Transactions by UTC hour. Peak ${hh(peak.hour)} with ${num(peak.txs)}, trough ${hh(trough.hour)} with ${num(trough.txs)}.`}
        />
      </Card>

      <KpiBand label="Usage by hour">
        <Kpi k="Busiest hour" v={`${hh(peak.hour)} UTC`} s={`${num(peak.txs)} transactions · ${pct(share(peak), 2)}`} />
        <Kpi k="Quietest hour" v={`${hh(trough.hour)} UTC`} s={`${num(trough.txs)} transactions · ${pct(share(trough), 2)}`} />
        <Kpi k="Peak ÷ trough" v={`${num(ratio, 2)}×`} s="a flat day would read 1.00×" />
        <Kpi k="Busiest weekday" v={DAYS[busiestDay]} s={`${pct((dayTotals[busiestDay] / total) * 100, 1)} of transactions; quietest ${DAYS[quietestDay]} ${pct((dayTotals[quietestDay] / total) * 100, 1)}`} />
      </KpiBand>

      <div className="grid2">
        <Card
          title="Does the weekend look different?"
          takeaway={<><b>{DAYS[busiestDay]}</b> is the busiest day and <b>{DAYS[quietestDay]}</b> the quietest, but the daily rhythm barely changes: every day peaks in the same afternoon hours.</>}
          actions={<ChartActions api="usage-clock" name="day and hour heatmap" />}
          foot="Monday to Sunday, UTC. Stronger colour = more transactions in that hour of that weekday, all history."
        >
          <Heatmap rows={DAYS} cols={Array.from({ length: 24 }, (_, i) => hh(i).slice(0, 2))} colTicks={[0, 6, 12, 18]} values={heat} unit="txs" ariaLabel={`Transactions by weekday and UTC hour. Busiest day ${DAYS[busiestDay]}, quietest ${DAYS[quietestDay]}.`} />
        </Card>
        <Card
          title="Where is it daytime at the busiest and quietest hours?"
          takeaway={<>At the {hh(peak.hour)} peak the sun is up over <b>{litPeak.length}</b> of {REGIONS.length} regions; at the {hh(trough.hour)} low, over <b>{litTrough.length}</b> — mostly {litTrough.slice(0, 3).join(', ')}.</>}
          foot="Local solar time at each region’s centre longitude; “day” = 07:00–19:00. A proxy for who is awake, not a measurement of users."
        >
          <div className="tbl-wrap">
            <table className="t">
              <caption className="sr-only">Local time by region at the peak and trough hours</caption>
              <thead><tr><th scope="col">Region</th><th scope="col">At {hh(peak.hour)} UTC</th><th scope="col">At {hh(trough.hour)} UTC</th></tr></thead>
              <tbody>
                {REGIONS.map((x) => (
                  <tr key={x.n}>
                    <td className="l">{x.n}</td>
                    <td>{hh(Math.floor(localSolar(peak.hour, x.lon)))} <span className={isDay(peak.hour, x.lon) ? 'up' : 'muted'}>{isDay(peak.hour, x.lon) ? 'day' : 'night'}</span></td>
                    <td>{hh(Math.floor(localSolar(trough.hour, x.lon)))} <span className={isDay(trough.hour, x.lon) ? 'up' : 'muted'}>{isDay(trough.hour, x.lon) ? 'day' : 'night'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title="Does the busiest hour drift over the year?"
        takeaway={<>Week by week the busiest hour moves around, averaging <b>{hh(Math.round(meanPeak))} UTC</b>; the transaction-weighted average hour holds steady near <b>{num(meanMean, 1)}h</b>.</>}
        actions={<ChartActions api="usage-weekly" name="weekly peak hour" />}
        legend={<Legend items={[{ label: 'Busiest hour that week', color: 'var(--s2)' }, { label: 'Transaction-weighted average hour', color: 'var(--zec)', line: true }]} />}
        foot={`Trailing year, one point per week (weeks starting Sunday); the current, partial week is left out · last full week ${dateLong(wk.at(-1)!.date)}`}
      >
        <XYChart
          x={wk.map((w) => dayMs(w.date))} xTicks={dateTicks(wk[0].date, wk.at(-1)!.date, 'quarter')}
          series={[
            { key: 'peak', label: 'Busiest hour', color: 'var(--s2)', type: 'dot', values: wk.map((w) => w.peak_hour), r: wk.map(() => 4), format: 'count' },
            { key: 'mean', label: 'Average hour', color: 'var(--zec)', values: wk.map((w) => Math.round(w.mean_hour * 10) / 10), width: 2, format: 'ratio' },
          ]}
          yFormat="count" yDomain={[0, 24]} yTicks={[0, 6, 12, 18, 24].map((v) => ({ v, label: `${String(v).padStart(2, '0')}h` }))}
          tipTitles={wk.map((w) => `Week of ${dateLong(w.date)}`)} tipExtra={wk.map((w) => `${num(w.total_txs)} transactions that week`)}
          height={280} ariaLabel={`Weekly busiest UTC hour and the transaction-weighted average hour over the trailing year; average peak ${hh(Math.round(meanPeak))}.`}
        />
      </Card>

      <More summary="How to read it, and what it cannot show">
        <p>Each transaction is counted in the UTC hour of the block that mined it. Hours are compared as shares of the same 24-hour total, so the shape is what matters, not the level. Exchange-driven activity follows trading hours, so the peak says as much about where exchanges and bots run as about where people live.</p>
        <p>Exchange access by country — {pct(ex.access_pop_pct, 0)} of the world’s population can reach a regulated exchange that lists ZEC — is on its own page.</p>
      </More>

      <Tiles items={[
        { href: '/exchange-support', title: 'Exchanges by country', desc: 'Where ZEC can be bought on a regulated exchange.', value: <>{pct(ex.access_pop_pct, 0)} of people</> },
        { href: '/chart/tx', title: 'Transactions per day', desc: 'How much the chain is used, day by day.' },
        { href: '/chart/tx-types', title: 'Transaction types', desc: 'Shielded, transparent and mixed, per day.' },
        { href: '/network', title: 'Network nodes', desc: 'Where the publicly reachable nodes are.' },
      ]} />
    </>
  );
}
