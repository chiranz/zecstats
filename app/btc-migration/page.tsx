import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { XYChart } from '@/components/reports/XYChart';
import { dateTicks, valueTicks } from '@/components/reports/ticks';
import r from '@/components/reports/report.module.css';
import { api, DATA_SOURCE } from '@/lib/data/core';
import type { BtcMigration, BtcSwap } from '@/lib/data/crosschain';
import { dateLong, dateShort, delta, monthYear, num, pct, usd, usdCompact } from '@/lib/format';
import { MigrationTable, type By, type MigRow } from './MigrationTable';
import { ParamSeg, type ParamOption } from './ParamSeg';
import p from './page.module.css';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/btc-migration');

// URL params are the live page's: days (7 · 30 · 90 · 400 = ALL), min_btc (0.1 · 1 · 5 · 0 = all sizes) choose the
// data; gran (auto · day · week · month) and unit (btc · usd) the volume chart; by (swap · address) and rows (50 · 250 ·
// 500) the table. A window or size floor the loaded data can't produce is listed but disabled.
const DAYS = [['7', '7D'], ['30', '30D'], ['90', '90D'], ['400', 'ALL']] as const;
const SIZES = [['0.1', '≥ 0.1 BTC'], ['1', '≥ 1 BTC'], ['5', '≥ 5 BTC'], ['0', 'All sizes']] as const;
const GRANS = [['auto', 'Auto'], ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']] as const;
const UNITS = [['btc', 'BTC'], ['usd', 'USD']] as const;
type Gran = 'day' | 'week' | 'month';
// Trace fields the API sends that the shared type leaves out.
type Swap = BtcSwap & { btc_value_then?: number | null; rest_txid?: string | null };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pick = <T extends string>(v: string | undefined, opts: readonly (readonly [T, string])[], d: T): T => (opts.some(([o]) => o === v) ? (v as T) : d);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const btcF = (v: number) => `${v.toFixed(v >= 100 ? 1 : 2)} BTC`;
const dn = (v: number) => { const d = delta(v); return <span className={d.cls}>{d.text}</span>; };
/** Day-month ticks about every `step` days from `from` (inclusive) to `to`, for short windows; month ticks otherwise. */
const dayTicks = (from: string, to: string, days: number) => {
  if (days > 120) return dateTicks(from, to, days > 400 ? 'quarter' : 'month');
  const step = days <= 10 ? 1 : days <= 35 ? 7 : 14, out: { v: number; label: string }[] = [];
  for (let d = from; d <= to; d = addDays(d, step)) out.push({ v: Date.parse(`${d}T00:00:00Z`), label: dateShort(d) });
  return out;
};

/** The page's totals, from whichever swaps are in view (matches the API's summary when nothing is filtered). */
function summarise(sw: Swap[]) {
  const add = (f: (s: Swap) => number | null | undefined, xs: Swap[] = sw) => xs.reduce((a, s) => a + (f(s) ?? 0), 0);
  const traced = sw.filter((s) => s.age_days != null);
  const held = traced.filter((s) => (s.held_years ?? 0) > 0);
  const btc = add((s) => s.btc), usdIn = add((s) => s.usd), valueNow = add((s) => s.value_now), btcNow = add((s) => s.btc_value_now);
  const btcTraced = add((s) => s.btc, traced);
  // BTC's own growth while the coins sat still: dollars at the swap ÷ dollars when they came to rest, traced swaps only
  const rested = held.filter((s) => (s.btc_value_then ?? 0) > 0);
  const then = add((s) => s.btc_value_then, rested), atSwap = add((s) => s.usd, rested);
  const years = rested.length ? add((s) => s.btc * s.held_years!, rested) / add((s) => s.btc, rested) : 0;
  return {
    btc, usd: usdIn, zec: add((s) => s.zec), value_now: valueNow, btc_value_now: btcNow, swaps: sw.length, traced: traced.length, pending: sw.length - traced.length,
    btc_over_1y: add((s) => (s.age_days! >= 365 ? s.btc : 0), traced), btc_over_5y: add((s) => (s.age_days! >= 365 * 5 ? s.btc : 0), traced),
    btc_consolidated: add((s) => ((s.consolidation_inputs ?? 0) >= 15 ? s.btc : 0)),
    weighted_age_days: btcTraced ? add((s) => s.btc * s.age_days!, traced) / btcTraced : 0,
    return_pct: usdIn ? (valueNow / usdIn - 1) * 100 : 0, vs_btc_pct: btcNow ? (valueNow / btcNow - 1) * 100 : 0,
    cagr_pct: then > 0 && years >= 0.25 ? ((atSwap / then) ** (1 / years) - 1) * 100 : null,
  };
}

/** Start of the bucket a day falls in: the day, its Monday (UTC), or the 1st of its month. */
function bucket(d: string, g: Gran) {
  if (g === 'day') return d;
  if (g === 'month') return `${d.slice(0, 7)}-01`;
  return addDays(d, -((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7));
}

export default async function BtcMigrationPage({ searchParams }: PageProps<'/btc-migration'>) {
  const sp = await searchParams;
  const want = { days: pick(one(sp.days), DAYS, '30'), min: pick(one(sp.min_btc), SIZES, '0.1') };
  const live = DATA_SOURCE === 'live';
  const bm = await api<BtcMigration>('btc-migration', { days: want.days, min_btc: want.min });

  // What the loaded data can show: any window inside it and any size floor at or above its own.
  const can = (d: string, m: string) => Number(d) <= bm.days && Number(m) >= bm.min_btc;
  const days = can(want.days, want.min) ? want.days : String(bm.days);
  const minS = can(days, want.min) ? want.min : String(bm.min_btc);
  const D = Number(days), MIN = Number(minS);
  const unavailable = !live ? `Not available here: this view holds the last ${bm.days} days of swaps of ${bm.min_btc} BTC or more` : undefined;
  const dayOpts: ParamOption[] = DAYS.map(([v, l]) => ({ value: v, label: l, off: can(v, minS) ? undefined : unavailable }));
  const sizeOpts: ParamOption[] = SIZES.map(([v, l]) => ({ value: v, label: l, off: can(days, v) ? undefined : unavailable }));
  const gran0 = pick(one(sp.gran), GRANS, 'auto'), unit = pick(one(sp.unit), UNITS, 'btc');
  const by: By = one(sp.by) === 'address' ? 'address' : 'swap';
  const rowsPer = ['50', '250', '500'].includes(one(sp.rows) ?? '') ? Number(one(sp.rows)) : 50;

  const today = bm.series.at(-1)!.date;
  const start = addDays(today, -D);
  const swaps = (bm.swaps as Swap[]).filter((s) => s.date >= start && s.btc >= MIN);
  const S = summarise(swaps);
  const series = (() => {
    const byDay = new Map<string, { usd: number; zec: number }>();
    for (const s of swaps) { const e = byDay.get(s.date) ?? { usd: 0, zec: 0 }; e.usd += s.usd; e.zec += s.zec; byDay.set(s.date, e); }
    let inv = 0, z = 0;
    return bm.series.filter((x) => x.date >= start).map((x) => { const e = byDay.get(x.date); inv += e?.usd ?? 0; z += e?.zec ?? 0; return { date: x.date, invested: inv, value: z * x.zec_price }; });
  })();
  const first = series[0].date, last = today;
  const window = `${dateLong(first)} – ${dateLong(last)}`;
  const ageY = S.weighted_age_days / 365;
  const sizeWords = MIN > 0 ? `of ${MIN} BTC or more` : 'of any size';
  const has = swaps.length > 0;

  // Volume: complete days only (today's swaps are still arriving), bucketed by the chosen grain.
  const complete = swaps.filter((s) => s.date < today);
  const span = complete.length ? (Math.max(...complete.map((s) => s.ts)) - Math.min(...complete.map((s) => s.ts))) / 86400 : 0;
  const gran: Gran = gran0 !== 'auto' ? gran0 : span <= 45 ? 'day' : span <= 200 ? 'week' : 'month';
  const keys: string[] = [];
  for (let d = bucket(start, gran); d < today; d = gran === 'day' ? addDays(d, 1) : gran === 'week' ? addDays(d, 7) : bucket(addDays(d, 32), 'month')) keys.push(d);
  const vol = keys.map(() => 0);
  for (const s of complete) { const i = keys.indexOf(bucket(s.date, gran)); if (i >= 0) vol[i] += unit === 'usd' ? s.usd : s.btc; }
  const big = vol.indexOf(Math.max(...vol));
  const per = gran === 'day' ? 'day' : gran === 'week' ? 'week' : 'month';
  const bLabel = (d: string) => (gran === 'day' ? dateLong(d) : gran === 'week' ? `week of ${dateLong(d)}` : monthYear(d).replace(/'(\d\d)$/, '20$1'));
  const vF = (v: number) => (unit === 'usd' ? usdCompact(v, 1) : btcF(v));
  const yMax = Math.max(...vol, unit === 'usd' ? 1000 : 1);
  const yTicks = valueTicks(0, yMax, unit === 'usd' ? 'usdCompact' : 'btc', 4);
  const tickEvery = Math.max(1, Math.ceil(keys.length / 8));
  const volTicks = keys.map((d, i) => ({ v: i, label: i % tickEvery ? '' : gran === 'month' ? monthYear(d) : dateShort(d) })).filter((t) => t.label);

  // scatter: every traced swap, x = time, y = how long the coins had sat still (log), size = BTC
  const traced = swaps.filter((s): s is Swap & { age_days: number } => s.age_days != null && s.age_days > 0).sort((a, b) => a.ts - b.ts);
  const maxBtc = Math.max(...traced.map((s) => s.btc), 0.1);
  const oldest = traced.reduce<(typeof traced)[number] | null>((b, s) => (!b || s.age_days > b.age_days ? s : b), null);
  const overYear = traced.filter((s) => s.age_days >= 365).length;

  const rows: MigRow[] = swaps.map((s, i) => ({
    id: `${s.btc_txid}-${i}`, date: s.date, ts: s.ts, btc: s.btc, usd: s.usd, zec: s.zec, valueNow: s.value_now, returnPct: s.return_pct,
    ageDays: s.age_days ?? null, restTxid: s.rest_txid ?? null, sender: s.sender_btc ?? '', txid: s.btc_txid ?? '', deposit: s.deposit_address ?? '',
    btcValueNow: s.btc_value_now, consolidated: (s.consolidation_inputs ?? 0) >= 15,
  }));

  return (
    <>
      <SectionLd path="/btc-migration" />
      <Masthead
        title="How much Bitcoin is moving into Zcash?"
        lede={has
          ? <><b className="num value">{btcF(S.btc)}</b> was swapped into ZEC through NEAR Intents in the last {D} days, in {num(S.swaps)} swaps {sizeWords} — and <b className="num value">{btcF(S.btc_over_1y)}</b> of it had not moved for over a year.</>
          : <>No Bitcoin was swapped into ZEC through NEAR Intents in swaps {sizeWords} in the last {D} days. Pick a smaller swap size or a longer window.</>}
      />

      <div className={r.fbar} role="region" aria-label="Report filters">
        <div className={r.grp}>
          <span className={r.glbl} id="g-win">Window</span>
          <ParamSeg param="days" value={days} options={dayOpts} labelledBy="g-win" describedBy="g-note" />
        </div>
        <div className={r.grp}>
          <span className={r.glbl} id="g-size">Swap size</span>
          <ParamSeg param="min_btc" value={minS} options={sizeOpts} labelledBy="g-size" describedBy="g-note" />
        </div>
        <div className={r.end}><a className="btn" href="/api/btc-migration" download="zec-btc-migration.json">Download data</a></div>
        <p className={`${r.count} ${p.note}`} id="g-note" style={{ flexBasis: '100%' }}>
          <b>{window}</b> · {num(S.swaps)} swaps {sizeWords} · {S.pending} awaiting a Bitcoin trace
          {unavailable && <> · {(want.days !== days || want.min !== minS) ? 'That view is not available here, so this is the closest one. ' : ''}Longer windows and swaps under {bm.min_btc} BTC are not loaded here.</>}
        </p>
      </div>

      <section className="hero" aria-label="Answer">
        <div className={r.heroTop}>
          <div>
            <p className="kicker">Bitcoin swapped for ZEC · last {D} days</p>
            <p className="figure">{S.btc.toFixed(1)}<small>BTC</small></p>
            <p className={r.lead}>{usdCompact(S.usd, 1)} in · {num(S.zec)} ZEC out</p>
          </div>
          {has && (
            <div className={r.heroNote}>
              <p>Those coins had sat still for <b>{ageY.toFixed(1)} years</b> on average (weighted by BTC); <b>{btcF(S.btc_over_5y)}</b> had not moved in over five years.</p>
              <p>At today’s prices the ZEC bought is worth <b>{usdCompact(S.value_now, 1)}</b>, {S.return_pct >= 0 ? 'up' : 'down'} <b>{Math.abs(S.return_pct).toFixed(1)}%</b> on what was paid — and {Math.abs(S.vs_btc_pct).toFixed(1)}% {S.vs_btc_pct >= 0 ? 'ahead of' : 'behind'} simply keeping the Bitcoin.</p>
            </div>
          )}
        </div>
      </section>

      <KpiBand label="Bitcoin to Zcash summary">
        <Kpi k="Swaps" v={num(S.swaps)} s={`${S.traced} traced back to where the coins rested`} />
        <Kpi k="ZEC bought" v={num(S.zec)} unit="ZEC" s={S.zec ? `at ${usd(S.usd / S.zec, 0)} per ZEC on average` : 'no swaps in this view'} />
        <Kpi k="Held over 1 year" v={btcF(S.btc_over_1y)} s={`${pct(S.btc ? (S.btc_over_1y / S.btc) * 100 : 0, 0)} of the BTC swapped`} />
        <Kpi k="Held over 5 years" v={btcF(S.btc_over_5y)} s={`${pct(S.btc ? (S.btc_over_5y / S.btc) * 100 : 0, 0)} of the BTC swapped`} />
        <Kpi k="Weighted age" v={ageY.toFixed(1)} unit="years" s={S.cagr_pct != null ? <>BTC itself grew <span className={delta(S.cagr_pct).cls}>{delta(S.cagr_pct).text}</span> a year while it sat still</> : 'held too briefly to annualise'} />
        <Kpi k="Worth now" v={usdCompact(S.value_now, 1)} s={<>paid {usdCompact(S.usd, 1)} · {dn(S.return_pct)}</>} />
        <Kpi k="Vs keeping the BTC" v={dn(S.vs_btc_pct)} s={`the BTC would be worth ${usdCompact(S.btc_value_now, 1)}`} />
        <Kpi k="From a consolidation" v={btcF(S.btc_consolidated)} s="assembled from many small inputs" />
      </KpiBand>

      <Card
        title="What did the money turn into?"
        takeaway={has ? <>Swappers paid <b>{usdCompact(S.usd, 1)}</b> for ZEC now worth <b>{usdCompact(S.value_now, 1)}</b> — {dn(S.return_pct)} at {usd(bm.prices.zec_usd)} per ZEC.</> : <>No swaps {sizeWords} in this window.</>}
        actions={<ChartActions api="btc-migration" name="paid and worth" csv={{ file: 'btc-migration-paid-and-worth', panels: [{ dates: series.map((x) => x.date), series: [{ label: 'Paid in (USD)', values: series.map((x) => x.invested) }, { label: 'Value at the time (USD)', values: series.map((x) => x.value) }] }] }} />}
        foot={`Running totals over the window. “Value at the time” = the ZEC bought so far × that day’s ZEC close (marked to market), so its last point is today’s worth: ZEC at ${usd(bm.prices.zec_usd)}, BTC at ${usd(bm.prices.btc_usd, 0)} (${dateLong(bm.prices.close_date)}).`}
      >
        <TimeSeriesChart
          dates={series.map((x) => x.date)} format="usdCompact" ranges={false} height={280} zeroBaseline
          series={[{ key: 'paid', label: 'Paid in', color: 'var(--btc)', values: series.map((x) => x.invested) }, { key: 'worth', label: 'Value at the time', color: 'var(--zec)', values: series.map((x) => x.value), width: 2.2 }]}
          ariaLabel={`Cumulative dollars paid for ZEC with BTC versus what the ZEC bought so far was worth at each day's close, ${window}.`}
        />
      </Card>

      <div className="grid2">
        <Card
          title="How long had the swapped Bitcoin sat still?"
          takeaway={oldest ? <><b>{overYear}</b> of {traced.length} traced swaps spent coins that had not moved for over a year; the oldest had rested <b>{(oldest.age_days / 365).toFixed(1)} years</b>.</> : <>No traced swaps in this view yet.</>}
          actions={<ChartActions api="btc-migration" name="every swap" />}
          legend={<Legend items={[{ label: 'One traced swap', color: 'var(--btc)' }]} />}
          foot="Log scale. Age = time since the coins last moved, traced back through recent shuffling hops — “last moved”, not “acquired”."
        >
          {traced.length > 0 && (
            <XYChart
              x={traced.map((s) => s.ts * 1000)} xTicks={dayTicks(first, last, D)}
              series={[{ key: 'age', label: 'Sat still', color: 'var(--btc)', type: 'dot', values: traced.map((s) => s.age_days), size: traced.map((s) => s.btc), format: 'days' }]}
              sizeKey={{ label: 'Size = BTC', values: [0.1, 1, 10].filter((v) => v <= maxBtc * 1.5) }}
              yFormat="days" yLog yDomain={[1 / 48, 8000]} yTicks={[{ v: 1 / 24, label: '1 hour' }, { v: 1, label: '1 day' }, { v: 30, label: '1 month' }, { v: 365, label: '1 year' }, { v: 3652, label: '10 years' }]}
              hLines={[{ y: 365, label: '↑ 1 yr+', labelPos: 'margin' }]}
              tipTitles={traced.map((s) => `${dateLong(s.date)} · ${s.btc.toFixed(3)} BTC`)} tipExtra={traced.map((s) => `${usdCompact(s.usd, 1)} in · ${num(s.zec, 1)} ZEC out`)}
              height={300} ariaLabel={`Each traced swap by date and how long its coins had sat still, log scale; ${overYear} of ${traced.length} over a year.`}
            />
          )}
        </Card>
        <Card
          title={`How much moved each ${per}?`}
          takeaway={complete.length ? <>The biggest {per} was {gran === 'week' ? 'the ' : ''}<b>{bLabel(keys[big])}</b>, with <b>{vF(vol[big])}</b>; an average {per} saw {vF(vol.reduce((a, v) => a + v, 0) / keys.length)}.</> : <>No complete days in this view yet.</>}
          actions={<ChartActions api="btc-migration" name={`${unit.toUpperCase()} per ${per}`} csv={{ file: `btc-migration-${unit}-per-${per}`, panels: [{ dates: keys, series: [{ label: unit === 'usd' ? 'USD swapped' : 'BTC swapped', values: vol }] }] }} />}
          legend={
            <div className={p.ctl}>
              <div className={r.grp}>
                <span className={r.glbl} id="g-gran">Per</span>
                <ParamSeg param="gran" value={gran0} options={GRANS.map(([v, l]) => ({ value: v, label: l }))} labelledBy="g-gran" />
              </div>
              <div className={r.grp}>
                <span className={r.glbl} id="g-unit">Unit</span>
                <ParamSeg param="unit" value={unit} options={UNITS.map(([v, l]) => ({ value: v, label: l }))} labelledBy="g-unit" />
              </div>
            </div>
          }
          foot={`${unit === 'usd' ? 'Dollars paid' : 'BTC swapped'} into ZEC per UTC ${per}${gran === 'week' ? ' (weeks start Monday)' : ''}, swaps ${sizeWords}; today is left out until it is over.`}
        >
          <XYChart
            x={keys.map((_, i) => i)} xScale="band" xTicks={volTicks}
            series={[{ key: 'v', label: unit === 'usd' ? 'USD swapped' : 'BTC swapped', color: 'var(--btc)', type: 'bar', values: vol, format: unit === 'usd' ? 'usdCompact' : 'btc' }]}
            yFormat={unit === 'usd' ? 'usdCompact' : 'btc'} yTicks={yTicks} yDomain={[0, yTicks.at(-1)!.v]} yUnit={unit === 'usd' ? undefined : 'BTC'}
            tipTitles={keys.map((d) => bLabel(d).replace(/^w/, 'W'))} height={300}
            ariaLabel={`${unit === 'usd' ? 'Dollars' : 'BTC'} swapped into ZEC per ${per}, ${window}${complete.length ? `; biggest ${per} ${bLabel(keys[big])}` : ''}.`}
          />
        </Card>
      </div>

      <Section id="swaps" title="Who swapped, and when?" aside={<span className="small">{num(swaps.length)} swaps · {window}</span>}>
        <MigrationTable rows={rows} initialBy={by} initialRows={rowsPer} first={first} last={last} />
        <p className="small">Return = worth now ÷ dollars paid. “Coins sat still” follows the largest input back through hops that are just recent shuffling and stops at the transaction where the coins came to rest. Grouping by address adds up the swaps that pass the filters, so the two views always agree. An address is an address: several may belong to one person and this page has no way to know, so it does not guess. A sender links to <b>every swap it made</b> on the NEAR Intents explorer, and ₿ to a Bitcoin explorer; per swap, the date opens that one swap, the BTC amount opens the transaction that funded it, and the age opens the transaction where the coins came to rest.</p>
      </Section>

      <Section id="sources" title="Where does every number come from?">
        <div className={r.moreCols}>
          <div className="stack" style={{ gap: 10 }}>
            <h3 className={`h3 ${p.h3}`}>How a row is built</h3>
            <ol className={p.list}>
              <li><b>Read the swap.</b> The <a href="https://explorer.near-intents.org/" target="_blank" rel="noopener noreferrer">NEAR Intents explorer</a> publishes every swap it routed. We store the fields as given: Bitcoin in, ZEC out, the sending Bitcoin address, and the Bitcoin transaction that funded it.</li>
              <li><b>Find the funding transaction on Bitcoin.</b> That txid is looked up on an <a href="https://github.com/Blockstream/esplora/blob/master/API.md" target="_blank" rel="noopener noreferrer">Esplora</a> node, which is what a public block explorer runs.</li>
              <li><b>Walk backwards to where the coins came to rest.</b> Follow the largest input, hop by hop, while each hop looks like recent shuffling: at most two outputs, and dated within 30 days of the swap. Stop at the first transaction that is neither. The age is the gap between that transaction and the swap.</li>
              <li><b>Price it twice.</b> The dollars paid come from that day&apos;s ZEC close. What the Bitcoin was worth when it came to rest comes from the Bitcoin close on the resting day.</li>
              <li><b>Publish the links, not just the numbers.</b> Every row carries the swap, the funding transaction, the resting transaction and the sender, each as a link to a public explorer, so any figure here can be checked against a source that is not us.</li>
            </ol>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <h3 className={`h3 ${p.h3}`}>Sources</h3>
            <ul className={p.list}>
              <li><b>The swaps:</b> <a href="https://explorer.near-intents.org/" target="_blank" rel="noopener noreferrer">NEAR Intents explorer</a>, read through its public API (<code>explorer.near-intents.org/api/v0/transactions-pages</code>).</li>
              <li><b>The Bitcoin chain:</b> the <a href="https://mempool.space/docs/api/rest" target="_blank" rel="noopener noreferrer">mempool.space Esplora API</a>, with <a href="https://blockstream.info/" target="_blank" rel="noopener noreferrer">blockstream.info</a> as a second host. Both serve the same open-source explorer, so a lookup that fails on one is retried on the other.</li>
              <li><b>ZEC prices, and Bitcoin prices since 2015:</b> daily closes, from <a href="https://coinmetrics.io/" target="_blank" rel="noopener noreferrer">Coin Metrics</a> for the history and <a href="https://www.coingecko.com/en/coins/zcash" target="_blank" rel="noopener noreferrer">CoinGecko</a> for today — or Coinbase or Kraken, whichever answers first. All of them feed the one price table the rest of the site reads.</li>
              <li><b>Bitcoin prices before that:</b> <a href="https://www.blockchain.com/explorer/charts/market-price" target="_blank" rel="noopener noreferrer">Blockchain.com&apos;s market-price series</a>, which runs back to 2010. A coin that came to rest in 2013 needs a price from 2013.</li>
              <li><b>The Zcash side</b> — supply, pools, the shielded share this page links out to — is read from the full node this site runs, not from any API. See <Link href="/node">Node Status</Link>.</li>
            </ul>
            <p className="small">Prices are daily closes, so a swap is priced to the day and not to the minute. The gap matters for a single row and not for a total, and the alternative is a per-minute price series we do not keep.</p>
          </div>
        </div>
      </Section>

      <More summary="What this measures, and what it cannot">
        <div className={r.moreCols}>
          <div className={r.prose}>
            <p><b>The swap half is reported, not inferred.</b> NEAR Intents publishes each swap: the Bitcoin sent, the ZEC returned, the sending Bitcoin address and the transaction that funded it. No address clustering happens anywhere here.</p>
            <p><b>The age half is a walk.</b> Someone selling a long-held pile consolidates it and swaps it a slice at a time, each slice spending the previous slice’s change. So the trace follows the largest input backwards while each hop is recent shuffling — at most two outputs, within 30 days of the swap — and stops at the first transaction that is neither.</p>
          </div>
          <div className={r.prose}>
            <p><b>“Last moved” is not “acquired”.</b> A transaction that fans out to many outputs (an exchange withdrawal, a payout batch) is the last point the chain can speak to. A consolidation is a shape, not an intention.</p>
            <p><b>One venue, not the market.</b> NEAR Intents is a large BTC → ZEC route but not the only one. Since {dateLong(bm.network_share.since)} it has delivered {num(bm.network_share.all_time_zec)} ZEC — {pct(bm.network_share.all_time_pct, 2)} of all ZEC in existence. Swaps under 0.1 BTC (bots, tests, dust) are left out by default.</p>
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
