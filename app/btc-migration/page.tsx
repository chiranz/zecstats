import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { XYChart } from '@/components/reports/XYChart';
import { SwapsTable, type SwapRow } from '@/components/crosschain/SwapsTable';
import { dateTicks } from '@/components/reports/ticks';
import { FixedSeg } from '@/components/reports/FixedSeg';
import r from '@/components/reports/report.module.css';
import { getBtcMigration } from '@/lib/data/crosschain';
import { dateLong, num, pct, usd, usdCompact } from '@/lib/format';

export const metadata: Metadata = { title: 'Bitcoin → Zcash', description: 'How much BTC is being swapped into ZEC through NEAR Intents, and how long those coins had sat still.' };

const btcF = (v: number) => `${v.toFixed(v >= 100 ? 1 : 2)} BTC`;
const dn = (v: number) => <span className={v >= 0 ? 'up' : 'dn'}>{v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%</span>;

export default async function BtcMigrationPage() {
  const bm = await getBtcMigration();
  const S = bm.summary;
  const swaps = bm.swaps;
  const first = bm.series[0].date, last = bm.series.at(-1)!.date;
  const window = `${dateLong(first)} – ${dateLong(last)}`;
  const ageY = S.btc_weighted_age_days / 365;

  // BTC per day
  const days: string[] = [];
  for (let t = Date.parse(`${first}T00:00:00Z`); t <= Date.parse(`${last}T00:00:00Z`); t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
  const perDay = days.map((d) => swaps.filter((s) => s.date === d).reduce((a, s) => a + s.btc, 0));
  const bigDay = perDay.indexOf(Math.max(...perDay));

  // scatter: every traced swap, x = time, y = how long the coins had sat still (log), size = BTC
  const traced = swaps.filter((s): s is typeof s & { age_days: number } => s.age_days != null && s.age_days > 0).sort((a, b) => a.ts - b.ts);
  const maxBtc = Math.max(...traced.map((s) => s.btc));
  const oldest = traced.reduce((b, s) => (s.age_days > b.age_days ? s : b), traced[0]);
  const overYear = traced.filter((s) => s.age_days >= 365).length;

  const rows: SwapRow[] = swaps.map((s, i) => ({ id: `${s.btc_txid}-${i}`, date: s.date, btc: s.btc, usd: s.usd, zec: s.zec, valueNow: s.value_now, returnPct: s.return_pct, ageDays: s.age_days ?? null, trace: s.trace_status, sender: s.sender_btc ?? '', txid: s.btc_txid ?? '' }));

  return (
    <>
      <Masthead
        crumbs={[{ label: 'Tools' }, { label: 'Cross-chain' }, { label: 'Bitcoin → Zcash' }]}
        title="How much Bitcoin is moving into Zcash?"
        lede={<><b className="num value">{btcF(S.btc)}</b> was swapped into ZEC through NEAR Intents in the last {bm.days} days, in {num(S.swaps)} swaps of {bm.min_btc} BTC or more — and <b className="num value">{btcF(S.btc_over_1y)}</b> of it had not moved for over a year.</>}
      />

      <div className={r.fbar} role="region" aria-label="Report filters">
        <div className={r.grp}>
          <span className={r.glbl} id="g-win">Window</span>
          <div className={r.grpRow}>
            <FixedSeg labelledBy="g-win" options={['7D', '30D', '90D', 'ALL']} active="30D" />
            <span className={r.count}><b>{window}</b> · swaps ≥ {bm.min_btc} BTC · {S.pending} awaiting a Bitcoin trace</span>
          </div>
        </div>
        <div className={r.end}><a className="btn" href="/api/btc-migration" download="zec-btc-migration.json">Download data</a></div>
      </div>

      <section className="hero" aria-label="Answer">
        <div className={r.heroTop}>
          <div>
            <p className="kicker">Bitcoin swapped for ZEC · last {bm.days} days</p>
            <p className="figure">{S.btc.toFixed(1)}<small>BTC</small></p>
            <p className={r.lead}>{usdCompact(S.usd, 1)} in · {num(S.zec)} ZEC out</p>
          </div>
          <div className={r.heroNote}>
            <p>Those coins had sat still for <b>{ageY.toFixed(1)} years</b> on average (weighted by BTC); <b>{btcF(S.btc_over_5y)}</b> had not moved in over five years.</p>
            <p>At today’s prices the ZEC bought is worth <b>{usdCompact(S.value_now, 1)}</b>, {S.return_pct >= 0 ? 'up' : 'down'} <b>{Math.abs(S.return_pct).toFixed(1)}%</b> on what was paid — and {Math.abs(S.vs_btc_pct).toFixed(1)}% {S.vs_btc_pct >= 0 ? 'ahead of' : 'behind'} simply keeping the Bitcoin.</p>
          </div>
        </div>
      </section>

      <KpiBand label="Bitcoin to Zcash summary">
        <Kpi k="Swaps" v={num(S.swaps)} s={`${S.traced} traced back to where the coins rested`} />
        <Kpi k="ZEC bought" v={num(S.zec)} unit="ZEC" s={`at ${usd(S.usd / S.zec, 0)} per ZEC on average`} />
        <Kpi k="Held over 1 year" v={btcF(S.btc_over_1y)} s={`${pct((S.btc_over_1y / S.btc) * 100, 0)} of the BTC swapped`} />
        <Kpi k="Held over 5 years" v={btcF(S.btc_over_5y)} s={`${pct((S.btc_over_5y / S.btc) * 100, 0)} of the BTC swapped`} />
        <Kpi k="Weighted age" v={ageY.toFixed(1)} unit="years" s={`implied BTC growth ${S.cagr_pct >= 0 ? '+' : ''}${S.cagr_pct.toFixed(1)}%/yr while held`} />
        <Kpi k="Worth now" v={usdCompact(S.value_now, 1)} s={<>paid {usdCompact(S.usd, 1)} · {dn(S.return_pct)}</>} />
        <Kpi k="Vs keeping the BTC" v={dn(S.vs_btc_pct)} s={`the BTC would be worth ${usdCompact(S.btc_value_now, 1)}`} />
        <Kpi k="From a consolidation" v={btcF(S.btc_consolidated)} s="assembled from many small inputs" />
      </KpiBand>

      <Card
        title="What did the money turn into?"
        takeaway={<>Swappers paid <b>{usdCompact(S.usd, 1)}</b> for ZEC now worth <b>{usdCompact(S.value_now, 1)}</b> — {dn(S.return_pct)} at {usd(bm.prices.zec_usd)} per ZEC.</>}
        actions={<ChartActions api="btc-migration" name="paid and worth" />}
        foot={`Running totals over the window · ZEC priced at ${usd(bm.prices.zec_usd)} and BTC at ${usd(bm.prices.btc_usd, 0)} (${dateLong(bm.prices.close_date)})`}
      >
        <TimeSeriesChart
          dates={bm.series.map((s) => s.date)} format="usdCompact" ranges={false} height={280} zeroBaseline
          series={[{ key: 'paid', label: 'Paid in', color: 'var(--btc)', values: bm.series.map((s) => s.invested_usd) }, { key: 'worth', label: 'Worth now', color: 'var(--zec)', values: bm.series.map((s) => s.value_usd), width: 2.2 }]}
          ariaLabel={`Cumulative dollars paid for ZEC with BTC versus what that ZEC is worth now, ${window}.`}
        />
      </Card>

      <div className="grid2">
        <Card
          title="How long had the swapped Bitcoin sat still?"
          takeaway={<><b>{overYear}</b> of {traced.length} traced swaps spent coins that had not moved for over a year; the oldest had rested <b>{(oldest.age_days / 365).toFixed(1)} years</b>.</>}
          actions={<ChartActions api="btc-migration" name="every swap" />}
          legend={<Legend items={[{ label: 'One swap (size = BTC)', color: 'var(--btc)' }]} />}
          foot="Log scale. Age = time since the coins last moved, traced back through recent shuffling hops — “last moved”, not “acquired”."
        >
          <XYChart
            x={traced.map((s) => s.ts * 1000)} xTicks={dateTicks(first, last, 'month').concat([{ v: Date.parse(`${first}T00:00:00Z`), label: dateLong(first).slice(0, 6) }]).sort((a, b) => a.v - b.v)}
            series={[{ key: 'age', label: 'Sat still', color: 'var(--btc)', type: 'dot', values: traced.map((s) => s.age_days), r: traced.map((s) => 2.5 + Math.sqrt(s.btc / maxBtc) * 11), format: 'days' }]}
            yFormat="days" yLog yDomain={[1 / 48, 8000]} yTicks={[{ v: 1 / 24, label: '1 hour' }, { v: 1, label: '1 day' }, { v: 30, label: '1 month' }, { v: 365, label: '1 year' }, { v: 3652, label: '10 years' }]}
            hLines={[{ y: 365, label: 'held more than a year ↑' }]}
            tipTitles={traced.map((s) => `${dateLong(s.date)} · ${s.btc.toFixed(3)} BTC`)} tipExtra={traced.map((s) => `${usdCompact(s.usd, 1)} in · ${num(s.zec, 1)} ZEC out`)}
            height={300} ariaLabel={`Each traced swap by date and how long its coins had sat still, log scale; ${overYear} of ${traced.length} over a year.`}
          />
        </Card>
        <Card
          title="How much moved each day?"
          takeaway={<>The biggest day was <b>{dateLong(days[bigDay])}</b>, with <b>{btcF(perDay[bigDay])}</b>; an average day saw {btcF(S.btc / days.length)}.</>}
          actions={<ChartActions api="btc-migration" name="BTC per day" />}
          foot={`BTC swapped into ZEC per UTC day, swaps ≥ ${bm.min_btc} BTC.`}
        >
          <XYChart
            x={days.map((d) => Date.parse(`${d}T00:00:00Z`))} xTicks={days.filter((_, i) => i % 7 === 0).map((d) => ({ v: Date.parse(`${d}T00:00:00Z`), label: dateLong(d).slice(0, -5) }))}
            series={[{ key: 'btc', label: 'BTC swapped', color: 'var(--btc)', type: 'bar', values: perDay, format: 'btc' }]}
            yFormat="btc" yTicks={Array.from({ length: Math.ceil(Math.max(...perDay) / 10) + 1 }, (_, i) => ({ v: i * 10, label: `${i * 10}` }))}
            tipTitles={days.map((d) => dateLong(d))} height={300}
            ariaLabel={`BTC swapped into ZEC per day, ${window}; biggest day ${dateLong(days[bigDay])}.`}
          />
        </Card>
      </div>

      <Section id="swaps" title="Every swap" aside={<span className="small">{num(swaps.length)} swaps · {window}</span>}>
        <SwapsTable rows={rows} />
        <p className="small">Return = worth now ÷ dollars paid. “Coins sat still” follows the largest input back through hops that are just recent shuffling and stops at the transaction where the coins came to rest.</p>
      </Section>

      <More summary="What this measures, and what it cannot">
        <div className={r.moreCols}>
          <div className={r.prose}>
            <p><b>The swap half is reported, not inferred.</b> NEAR Intents publishes each swap: the Bitcoin sent, the ZEC returned, the sending Bitcoin address and the transaction that funded it. No address clustering happens anywhere here.</p>
            <p><b>The age half is a walk.</b> Someone selling a long-held pile consolidates it and swaps it a slice at a time, each slice spending the previous slice’s change. So the trace follows the largest input backwards while each hop is recent shuffling — at most two outputs, within 30 days of the swap — and stops at the first transaction that is neither.</p>
          </div>
          <div className={r.prose}>
            <p><b>“Last moved” is not “acquired”.</b> A transaction that fans out to many outputs (an exchange withdrawal, a payout batch) is the last point the chain can speak to. A consolidation is a shape, not an intention.</p>
            <p><b>One venue, not the market.</b> NEAR Intents is a large BTC → ZEC route but not the only one. Since {dateLong(bm.network_share.since)} it has delivered {num(bm.network_share.all_time_zec)} ZEC — {pct(bm.network_share.all_time_pct, 2)} of all ZEC in existence. Swaps under 0.1 BTC (bots, tests, dust) are left out.</p>
          </div>
        </div>
      </More>

      <Tiles items={[
        { href: '/swaps', title: 'Swaps', desc: 'Where ZEC sits in the NEAR Intents network.' },
        { href: '/wallet-apps', title: 'Wallet apps', desc: 'Which apps route these swaps.' },
        { href: '/chart/near-flow', title: 'NEAR Intents ZEC flow', desc: 'Inbound vs outbound, by counter-asset.' },
        { href: '/btc-bull-run', title: 'ZEC 2026 vs BTC 2017', desc: 'Day-by-day run comparison.' },
      ]} />
    </>
  );
}
