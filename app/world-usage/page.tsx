import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Tiles } from '@/components/ui/blocks';
import { XYChart } from '@/components/reports/XYChart';
import { Heatmap } from '@/components/reports/Heatmap';
import { dateTicks, dayMs } from '@/components/reports/ticks';
import { LinkSeg, ParamNote } from '@/components/reports/LinkSeg';
import { hrefWith, one, pick } from '@/components/reports/params';
import r from '@/components/reports/report.module.css';
import { getCompleteUsageWeeks, getUsageClock, type UsageClock } from '@/lib/data/reports';
import { api, DATA_SOURCE } from '@/lib/data/core';
import { getExchangeCoverage } from '@/lib/data/crosschain';
import { compact, dateLong, num, pct } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/world-usage');

// The live page's own region list (centre longitudes) — used to say where it is daytime at a given UTC hour.
const REGIONS = [
  { n: 'Americas', lon: -95 }, { n: 'South America', lon: -58 }, { n: 'Europe', lon: 12 }, { n: 'Africa', lon: 20 }, { n: 'Middle East', lon: 48 },
  { n: 'India', lon: 78 }, { n: 'East Asia', lon: 114 }, { n: 'Southeast Asia', lon: 106 }, { n: 'Japan', lon: 138 }, { n: 'Australia', lon: 135 },
];
const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;
/** 14.49 → "14:29" (a fractional hour as a clock time). */
const hm = (h: number) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const localSolar = (utcHour: number, lon: number) => (((utcHour + 0.5 + lon / 15) % 24) + 24) % 24;
const isDay = (utcHour: number, lon: number) => { const l = localSolar(utcHour, lon); return l >= 7 && l < 19; };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // API: 0 = Sunday

// Live's ?days= period: 30, 90, 180, 365 or 0 (all history)
const PERIODS = [['30', '30D'], ['90', '90D'], ['180', '6M'], ['365', '1Y'], ['0', 'ALL']] as const;
const PERIOD_PHRASE: Record<string, string> = { '30': 'the last 30 days', '90': 'the last 90 days', '180': 'the last 6 months', '365': 'the last year', '0': 'all history' };

export default async function WorldUsagePage({ searchParams }: PageProps<'/world-usage'>) {
  const sp = await searchParams;
  const live = DATA_SOURCE === 'live';
  const want = pick(one(sp.days)?.trim(), PERIODS.map((x) => x[0]), '' as (typeof PERIODS)[number][0]) || null;
  const [clock, weeks, ex] = await Promise.all([live && want ? api<UsageClock>('usage-clock', { days: want }) : getUsageClock(), getCompleteUsageWeeks(), getExchangeCoverage()]);
  const got = String(clock.days);
  const unmet = want != null && want !== got;
  const phrase = PERIOD_PHRASE[got] ?? `the last ${got} days`;
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
  const dayPeaks = heat.map((row) => row.indexOf(Math.max(...row)));
  const pLo = Math.min(...dayPeaks), pHi = Math.max(...dayPeaks);

  const litPeak = REGIONS.filter((x) => isDay(peak.hour, x.lon)).map((x) => x.n);
  const litTrough = REGIONS.filter((x) => isDay(trough.hour, x.lon)).map((x) => x.n);
  const wk = weeks; // full Monday–Sunday weeks only
  const meanPeak = wk.reduce((a, w) => a + w.peak_hour, 0) / wk.length;
  const meanMean = wk.reduce((a, w) => a + w.mean_hour, 0) / wk.length;

  return (
    <>
      <SectionLd path="/world-usage" />
      <Masthead
        title="When does the world use Zcash?"
        lede={<>Busiest at <b className="num value">{hh(peak.hour)} UTC</b>, quietest at <b className="num value">{hh(trough.hour)} UTC</b> — {num(ratio, 2)}× apart. The peak falls in daylight across {litPeak.slice(0, 3).join(', ')}{litPeak.length > 3 ? ' and beyond' : ''}.</>}
      >
        <p className={r.mastNote}>Zcash transactions carry no location — that is the point of them — but every block carries a UTC timestamp. So this page shows <i>when</i> the chain is busy, and lines those hours up with where the sun is.</p>
      </Masthead>

      <div className={r.fbar} role="region" aria-label="Report filters">
        <div className={r.grp}>
          <span className={r.glbl} id="g-period">Period</span>
          <div className={r.grpRow}>
            <LinkSeg labelledBy="g-period" active={got} options={PERIODS.map(([k, l]) => ({ key: k, label: l, href: hrefWith('/world-usage', sp, { days: k }), disabled: !live }))} />
            <span className={r.count}><b>{dateLong(from)} – {dateLong(to)}</b> · {num(clock.blocks)} blocks · {compact(clock.txs, 2)} transactions</span>
          </div>
        </div>
      </div>

      {unmet && <ParamNote>Usage for {PERIOD_PHRASE[want!]} isn’t available yet — showing {phrase}.</ParamNote>}

      <Card
        title="At what hour is Zcash busiest?"
        takeaway={<><b>{hh(peak.hour)} UTC</b> carries {pct(share(peak), 2)} of all transactions and <b>{hh(trough.hour)} UTC</b> only {pct(share(trough), 2)}: activity climbs through the European morning and peaks as the Americas wake up.</>}
        actions={<ChartActions api="usage-clock" name="activity by hour" />}
        legend={<Legend items={[{ label: 'Transactions in that UTC hour', color: 'var(--other)' }, { label: 'Busiest hour', color: 'var(--s1)' }]} />}
        foot={`Every block ${got === '0' ? 'since' : 'from'} ${dateLong(from)}${got === '0' ? '' : ` to ${dateLong(to)}`}, bucketed by its UTC timestamp · ${num(clock.txs)} transactions`}
      >
        <XYChart
          x={byHour.map((h) => h.hour)} xScale="band" xTicks={[0, 3, 6, 9, 12, 15, 18, 21].map((v) => ({ v, label: hh(v) }))}
          series={[{ key: 'tx', label: 'Transactions', color: 'var(--other)', type: 'bar', values: byHour.map((h) => h.txs), colors: byHour.map((h) => (h.hour === peak.hour ? 'var(--s1)' : null)), format: 'count' }]}
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
          takeaway={<><b>{DAYS[busiestDay]}</b> is the busiest day and <b>{DAYS[quietestDay]}</b> the quietest{pLo === pHi ? <>, and every day peaks in the same hour, <b>{hh(pLo)} UTC</b>.</> : <>; each day’s busiest hour falls between <b>{hh(pLo)}</b> and <b>{hh(pHi)} UTC</b>.</>}</>}
          actions={<ChartActions api="usage-clock" name="day and hour heatmap" />}
          foot={`Monday to Sunday, UTC. Stronger colour = more transactions in that hour of that weekday, ${phrase}. Tab into the grid and use the arrow keys to read each cell.`}
        >
          <Heatmap rows={DAYS} cols={Array.from({ length: 24 }, (_, i) => hh(i).slice(0, 2))} colNames={Array.from({ length: 24 }, (_, i) => `${hh(i)}–${hh(i + 1)} UTC`)} colTicks={[0, 6, 12, 18]} values={heat} unit="transactions" ariaLabel={`Transactions by weekday and UTC hour. Busiest day ${DAYS[busiestDay]}, quietest ${DAYS[quietestDay]}.`} />
        </Card>
        <Card
          title="Where is it daytime at the busiest and quietest hours?"
          takeaway={<>At the {hh(peak.hour)} peak the sun is up over <b>{litPeak.length}</b> of {REGIONS.length} regions; at the {hh(trough.hour)} low, over <b>{litTrough.length}</b> — mostly {litTrough.slice(0, 3).join(', ')}.</>}
          foot="Local solar time at each region’s centre longitude; “day” = 07:00–19:00. A proxy for who is awake, not a measurement of users."
        >
          <div className="tbl-wrap">
            <table className={`t ${r.compact}`}>
              <caption className="sr-only">Local time by region at the peak and trough hours</caption>
              <thead><tr><th scope="col">Region</th><th scope="col">Peak<br />{hh(peak.hour)} UTC</th><th scope="col">Low<br />{hh(trough.hour)} UTC</th></tr></thead>
              <tbody>
                {REGIONS.map((x) => (
                  <tr key={x.n}>
                    <td className="l" style={{ whiteSpace: 'normal' }}>{x.n}</td>
                    {[peak.hour, trough.hour].map((h) => <td key={h}>{hh(Math.floor(localSolar(h, x.lon)))} <span className={isDay(h, x.lon) ? undefined : 'muted'}>{isDay(h, x.lon) ? 'day' : 'night'}</span></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title="Does the busiest hour drift over the year?"
        takeaway={<>Week by week the busiest hour moves around, averaging <b>{hh(Math.round(meanPeak))} UTC</b>; the transaction-weighted average hour holds steady near <b>{hm(meanMean)} UTC</b>.</>}
        actions={<ChartActions api="usage-weekly" name="weekly peak hour" />}
        legend={<Legend items={[{ label: 'Busiest hour that week', color: 'var(--s1)' }, { label: 'Transaction-weighted average hour', color: 'var(--s4)', line: true }]} />}
        foot={`Trailing year, one point per full week (Monday to Sunday, UTC); partial weeks — at the start, either side of New Year and the current one — are left out · last full week ${dateLong(wk.at(-1)!.date)}`}
      >
        <XYChart
          x={wk.map((w) => dayMs(w.date))} xTicks={dateTicks(wk[0].date, wk.at(-1)!.date, 'quarter')}
          series={[
            { key: 'peak', label: 'Busiest hour', color: 'var(--s1)', type: 'dot', values: wk.map((w) => w.peak_hour), r: wk.map(() => 4) },
            { key: 'mean', label: 'Average hour', color: 'var(--s4)', values: wk.map((w) => w.mean_hour), width: 2 },
          ]}
          yFormat="hour" yDomain={[0, 24]} yTicks={[0, 6, 12, 18, 24].map((v) => ({ v, label: `${String(v).padStart(2, '0')}:00` }))} yUnit="UTC"
          tipTitles={wk.map((w) => `Week of ${dateLong(w.date)}`)} tipExtra={wk.map((w) => `${num(w.total_txs)} transactions`)}
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
