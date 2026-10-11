import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { XYChart } from '@/components/reports/XYChart';
import { PercentileStrip } from '@/components/reports/PercentileStrip';
import { dateTicks, dayMs, usdDecades, usdTick } from '@/components/reports/ticks';
import { CsvButton } from '@/components/reports/CsvButton';
import { LinkSeg, ParamNote } from '@/components/reports/LinkSeg';
import { TxRange } from '@/components/reports/TxRange';
import { hrefWith, one, pick } from '@/components/reports/params';
import { customWindow, isRangeKey, presetFrom, RANGE_NAME, type RangeKey } from '@/components/charts/range';
import r from '@/components/reports/report.module.css';
import { getTxValues, type TxValues } from '@/lib/data/reports';
import { api, DATA_SOURCE } from '@/lib/data/core';
import { getCompleteDailyStats } from '@/lib/data/snapshot';
import { dateLong, num, pct, usd, usdCompact, zat } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/tx-sizes');

/** $0.0047 · $184 · $3,548 · $113K · $1.76M */
const fmt = (v: number) => (v >= 1e4 ? usdCompact(v, 2) : v >= 100 ? usd(v, 0) : v >= 1 ? usd(v, 2) : `$${v.toPrecision(2)}`);

// Live's link state: ?class=transparent|deshield|all, and the chart pages' window (?range=3M or ?from=&to=).
const CLASSES = [['transparent', 'Transparent → transparent'], ['deshield', 'Leaving a shielded pool'], ['all', 'Everything']] as const;
type Cls = (typeof CLASSES)[number][0];
const PRESETS: RangeKey[] = ['1M', '3M', '6M', '9M', '1Y', '5Y', 'YTD', 'ALL'];
const dayMinus = (d: string, n: number) => new Date(dayMs(d) - n * 86400000).toISOString().slice(0, 10);
const near = (a: string, b: string) => Math.abs(dayMs(a) - dayMs(b)) <= 3 * 86400000;

export default async function TxSizesPage({ searchParams }: PageProps<'/tx-sizes'>) {
  const sp = await searchParams;
  const live = DATA_SOURCE === 'live';
  const stats = await getCompleteDailyStats();
  const bounds = { from: stats[0].date, to: stats.at(-1)!.date };
  const cls = pick(one(sp.class), CLASSES.map((c) => c[0]), 'transparent') as Cls;
  const cw = customWindow(one(sp.from), one(sp.to), bounds.from, bounds.to);
  const rq = one(sp.range)?.toUpperCase();
  const preset: RangeKey = isRangeKey(rq) && PRESETS.includes(rq) ? rq : '1Y';
  const want = cw ?? { from: presetFrom(preset, bounds.from, bounds.to), to: bounds.to };
  const tv = live ? await api<TxValues>('tx-values', { class: cls, from: want.from, to: want.to }) : await getTxValues();
  // what came back: one class and one window (the trailing year, transparent, unless the data source is live)
  const got = { from: tv.range.from, to: dayMinus(tv.range.to_exclusive, 1) };
  const unmet = tv.class !== cls || (live ? !near(got.from, want.from) || !near(got.to, want.to) : cw != null || preset !== '1Y');
  const activeRange: RangeKey | null = unmet ? '1Y' : cw ? null : preset;
  const clsLabel = (c: string) => CLASSES.find((x) => x[0] === c)?.[1] ?? c;
  const winLabel = (w: { from: string; to: string }, r: RangeKey | null) => (r ? RANGE_NAME[r].toLowerCase() : `${dateLong(w.from)} – ${dateLong(w.to)}`);
  const csvRows = tv.days.map((d) => ({
    date: d.date, zec_usd: d.price, transactions: d.count, usd_moved: zat(d.total_zat) * d.price, mean_usd: zat(d.mean_zat) * d.price,
    p10_usd: zat(d.p10_zat) * d.price, p25_usd: zat(d.p25_zat) * d.price, median_usd: zat(d.p50_zat) * d.price, p75_usd: zat(d.p75_zat) * d.price,
    p90_usd: zat(d.p90_zat) * d.price, p95_usd: zat(d.p95_zat) * d.price, p99_usd: zat(d.p99_zat) * d.price, p999_usd: zat(d.p999_zat) * d.price,
    max_usd: zat(d.max_zat) * d.price, mode_zec: zat(d.top_value_zat), mode_count: d.top_value_count,
  }));
  const days = tv.days;
  const first = days[0].date, last = days.at(-1)!.date;
  const nDays = days.length;
  const N = tv.range.transactions, USD = tv.range.usd;
  const mean = USD / N;
  const P = tv.pooled;
  const ratio = mean / P.p50;
  const lastDay = days.at(-1)!;
  const modeUsd = zat(lastDay.top_value_zat) * lastDay.price;
  const perDay = N / nDays, usdPerDay = USD / nDays;

  // ---- CDF reads ----
  const cdf = tv.cdf.filter((c) => c.usd >= 1e-3 && c.usd <= 1e9);
  const at = (usdV: number, f: 'tx' | 'value') => { // share at or below a size (linear in log-size between points)
    const i = cdf.findIndex((c) => c.usd >= usdV);
    if (i <= 0) return i === 0 ? cdf[0][f] : 1;
    const a = cdf[i - 1], b = cdf[i], t = (Math.log(usdV) - Math.log(a.usd)) / (Math.log(b.usd) - Math.log(a.usd));
    return a[f] + (b[f] - a[f]) * t;
  };
  const halfDollars = cdf.find((c) => c.value >= 0.5)!.usd; // size above which half of all dollars moved
  const txAboveHalf = 1 - at(halfDollars, 'tx');
  const dollarsAtP90 = at(P.p90, 'value');

  // ---- histogram (quarter-decade bands) ----
  const hist = tv.hist.filter((h) => h.hi_usd > 1e-3 && h.lo_usd < 1e9);
  const hN = hist.reduce((a, h) => a + h.count, 0), hU = hist.reduce((a, h) => a + h.usd, 0);
  const bandLabel = (h: (typeof hist)[number]) => `${fmt(h.lo_usd)} – ${fmt(h.hi_usd)}`;
  const histTicks = hist.map((h, i) => ({ i, lo: h.lo_usd })).filter(({ lo }) => Math.abs(Math.log10(lo) - Math.round(Math.log10(lo))) < 1e-6 && Math.round(Math.log10(lo)) % 2 === 0).map(({ i, lo }) => ({ v: i, label: usdTick(lo) }));
  const argmax = (xs: number[]) => xs.indexOf(Math.max(...xs));
  const txPeak = argmax(hist.map((h) => h.count));
  const usdPeak = argmax(hist.map((h) => h.usd));
  const medianBand = hist.findIndex((h) => h.hi_usd >= P.p50);
  const halfBand = hist.findIndex((h) => h.hi_usd >= halfDollars);

  // ---- per-day series (USD at each day's close) ----
  const u = (d: (typeof days)[number], k: keyof typeof d) => zat(d[k] as number) * d.price;
  const dates = days.map((d) => d.date);
  const xDays = dates.map(dayMs);
  const med = days.map((d) => u(d, 'p50_zat'));
  const dailyMedMin = med.indexOf(Math.min(...med));
  const p99 = days.map((d) => u(d, 'p99_zat'));
  const avgP99 = p99.reduce((a, v) => a + v, 0) / p99.length;
  const avgMed = med.reduce((a, v) => a + v, 0) / med.length;
  const counts = days.map((d) => d.count);
  const usdDay = days.map((d) => u(d, 'total_zat'));
  const busiest = argmax(counts);
  const richest = argmax(usdDay);
  const roll = (xs: number[], n = 30) => xs.map((_, i) => { const s = xs.slice(Math.max(0, i - n + 1), i + 1); return s.reduce((a, v) => a + v, 0) / s.length; });
  const monthTicks = dateTicks(first, last, 'month');

  const rangeLabel = `${dateLong(first)} – ${dateLong(last)}`;
  const dataThrough = stats.at(-1)!.date;
  const tx7 = stats.slice(-7).reduce((a, x) => a + x.tx_count - x.block_count, 0) / 7;

  return (
    <>
      <SectionLd path="/tx-sizes" />
      <Masthead
        title="How big is a transparent Zcash transaction?"
        lede={<>Half of the {num(N)} {tv.class === 'deshield' ? 'deshielding' : tv.class === 'all' ? 'transparent-output' : 'transparent'} transactions between {dateLong(first)} and {dateLong(last)} moved <b className="num value">{fmt(P.p50)}</b> or less. The average is far higher because a few giant transfers carry most of the money.</>}
      />

      <div className={r.fbar} role="region" aria-label="Report filters">
        <div className={r.grp}>
          <span className={r.glbl} id="g-range">Range</span>
          <div className={r.grpRow}>
            <TxRange labelledBy="g-range" presets={PRESETS} active={activeRange} win={!unmet && cw ? got : null} bounds={bounds} fixed={!live} />
            <span className={r.count}><b>{rangeLabel}</b> · {nDays} days</span>
          </div>
        </div>
        <div className={r.grp}>
          <span className={r.glbl} id="g-view">View</span>
          <LinkSeg labelledBy="g-view" active={tv.class} options={CLASSES.map(([k, l]) => ({ key: k, label: l, href: hrefWith('/tx-sizes', sp, { class: k }), disabled: !live }))} />
        </div>
        <div className={r.end}><CsvButton rows={csvRows} slug="transparent-tx-sizes" /></div>
      </div>
      {unmet && <ParamNote>{clsLabel(cls)}, {winLabel(want, cw ? null : preset)}, isn’t available yet — showing {clsLabel(tv.class).toLowerCase()}, {winLabel(got, '1Y')}.</ParamNote>}

      <section className="hero" aria-label="Answer">
        <div className={r.heroTop}>
          <div>
            <p className="kicker">Median · {clsLabel(tv.class).toLowerCase()} · {rangeLabel}</p>
            <p className={r.lead}>A typical transparent transaction moves</p>
            <p className="figure">{fmt(P.p50)}<small>median</small></p>
          </div>
          <div className={r.heroNote}>
            <p>Half of the <b>{num(N)}</b> transactions in this range moved less than <b>{fmt(P.p50)}</b>; half moved more. Nine in ten moved <b>{fmt(P.p90)}</b> or less.</p>
            <p>The mean is <b>{fmt(mean)}</b> — <b>{num(ratio)}×</b> the median — because the top <b>{pct(txAboveHalf * 100, 2)}</b> of transactions (over {fmt(halfDollars)} each) carry half of all the dollars. The median is the number that describes an ordinary transaction.</p>
          </div>
        </div>
        <div className={`${r.stripH} only-desk`}>
          <span className="kicker">Where each percentile falls · log scale</span>
          <Legend items={[{ label: 'Middle 80% (P10–P90)', color: 'color-mix(in srgb, var(--s2) 45%, transparent)' }, { label: 'Mean', color: 'var(--s4)' }]} />
        </div>
        <div className="only-desk">
          <PercentileStrip
            lo={1e-3} hi={1e9} band={[P.p10, P.p90]} fmtTick={usdTick}
            marks={[{ label: 'P10', v: P.p10, display: fmt(P.p10) }, { label: 'Median', v: P.p50, display: fmt(P.p50), strong: true }, { label: 'P90', v: P.p90, display: fmt(P.p90) }, { label: 'P95', v: P.p95, display: fmt(P.p95) }, { label: 'P99', v: P.p99, display: fmt(P.p99) }, { label: 'P99.9', v: P.p999, display: fmt(P.p999) }]}
            mean={mean} meanDisplay={fmt(mean)} meanNote={`${num(ratio)}× the median — pulled up by a few giant transfers`}
            ariaLabel={`Percentile strip on a log dollar axis from $0.001 to $1B. P10 ${fmt(P.p10)}, median ${fmt(P.p50)}, P90 ${fmt(P.p90)}, P95 ${fmt(P.p95)}, P99 ${fmt(P.p99)}, P99.9 ${fmt(P.p999)}. The mean, ${fmt(mean)}, is ${num(ratio)} times the median.`}
          />
        </div>
      </section>

      <Section title="Across the selected range" aside={<span className="small">every transaction in the {nDays} days, not a typical day</span>}>
        <KpiBand>
          <Kpi k="Median" v={fmt(P.p50)} s="half moved less, half more" />
          <Kpi k="Mean" v={fmt(mean)} s={`total dollars ÷ transactions; ${num(ratio)}× the median`} />
          <Kpi k="P90" v={fmt(P.p90)} s="1 in 10 moved more" />
          <Kpi k="P95" v={fmt(P.p95)} s="1 in 20 moved more" />
          <Kpi k="P99" v={fmt(P.p99)} s="1 in 100 moved more" />
          <Kpi k="P99.9" v={fmt(P.p999)} s="1 in 1,000 moved more" />
          <Kpi k="Mode (latest day)" v={lastDay.top_value_count > 1 ? usd(modeUsd, 2) : '—'} s={lastDay.top_value_count > 1 ? `exactly ${num(zat(lastDay.top_value_zat), 6)} ZEC, ${lastDay.top_value_count} times on ${dateLong(lastDay.date)} (${pct((lastDay.top_value_count / lastDay.count) * 100, 1)})` : `no amount repeated on ${dateLong(lastDay.date)}`} />
          <Kpi k="Per day" v={num(perDay)} unit="txs" s={`${fmt(usdPerDay)} moved per day`} />
        </KpiBand>
      </Section>

      <Section title="The distribution" aside={<span className="small">every series is labelled on the chart</span>}>
        <Card
          title="What share of transactions — and of dollars — sits below each size?"
          takeaway={<>Transactions of <b>{fmt(P.p90)} or less</b> are 90% of the count, but carry only <b>{pct(dollarsAtP90 * 100, 1)}</b> of the dollars; half of all dollars moved in transfers above <b>{fmt(halfDollars)}</b> — just <b>{pct(txAboveHalf * 100, 2)}</b> of transactions.</>}
          actions={<ChartActions api="tx-values" name="transaction size distribution" />}
          legend={<Legend items={[{ label: 'Share of transactions', color: 'var(--s2)', line: true }, { label: 'Share of dollars', color: 'var(--s4)', line: true }]} />}
          foot={`${clsLabel(tv.class)} · ${rangeLabel} · dollars at each day’s close · data through ${dateLong(dataThrough)}`}
        >
          <XYChart
            x={cdf.map((c) => c.usd)} xScale="log" xTicks={usdDecades(1e-3, 1e9)}
            series={[
              { key: 'tx', label: 'Transactions at or below', color: 'var(--s2)', values: cdf.map((c) => c.tx * 100), format: 'pct' },
              { key: 'usd', label: 'Dollars at or below', color: 'var(--s4)', values: cdf.map((c) => c.value * 100), format: 'pct' },
            ]}
            yFormat="pct0" yDomain={[0, 100]} yTicks={[0, 25, 50, 75, 100].map((v) => ({ v, label: `${v}%` }))}
            tipTitles={cdf.map((c) => `At ${fmt(c.usd)} per transaction`)}
            markers={[{ x: P.p50, label: `Median ${fmt(P.p50)}` }, { x: P.p90, label: `P90 ${fmt(P.p90)}`, dy: 14 }, { x: P.p99, label: `P99 ${fmt(P.p99)}`, dy: 28 }]}
            height={320}
            ariaLabel={`Cumulative distribution on a log dollar axis. ${pct(at(P.p50, 'tx') * 100, 0)} of transactions are at or below the median ${fmt(P.p50)}; half of all dollars moved in transactions above ${fmt(halfDollars)}.`}
          />
        </Card>

        <Card
          title="Where do transactions cluster, and where does the money sit?"
          takeaway={<>The most common size band is <b>{bandLabel(hist[txPeak])}</b>; the most dollars sit in the <b>{bandLabel(hist[usdPeak])}</b> band. The gap between the two panels is the skew.</>}
          actions={<ChartActions api="tx-values" name="transaction size histogram" />}
          foot={`Size bands are a quarter of a decade wide · two panels share one dollar axis · data through ${dateLong(dataThrough)}`}
        >
          <span className={r.panelLbl}>Share of transactions</span>
          <XYChart
            x={hist.map((_, i) => i)} xScale="band" xTicks={histTicks}
            series={[{ key: 'n', label: 'Share of transactions', color: 'var(--s2)', type: 'bar', values: hist.map((h) => (h.count / hN) * 100), format: 'pct' }]}
            yFormat="pct0" tipTitles={hist.map(bandLabel)} tipExtra={hist.map((h) => `${num(h.count)} transactions · ${fmt(h.usd)}`)}
            markers={[{ x: medianBand, label: `median ${fmt(P.p50)}` }]} height={200}
            ariaLabel={`Histogram of transaction counts by size band; the busiest band is ${bandLabel(hist[txPeak])}.`}
          />
          <span className={r.panelLbl}>Share of dollars moved</span>
          <XYChart
            x={hist.map((_, i) => i)} xScale="band" xTicks={histTicks}
            series={[{ key: 'u', label: 'Share of dollars', color: 'var(--s4)', type: 'bar', values: hist.map((h) => (h.usd / hU) * 100), format: 'pct' }]}
            yFormat="pct0" tipTitles={hist.map(bandLabel)} tipExtra={hist.map((h) => `${num(h.count)} transactions · ${fmt(h.usd)}`)}
            markers={[{ x: halfBand, label: `half the dollars are above ${fmt(halfDollars)}` }]} height={200}
            ariaLabel={`Histogram of dollars moved by size band; the band carrying the most dollars is ${bandLabel(hist[usdPeak])}.`}
          />
        </Card>

        <Card
          title={`Has the typical size changed over these ${nDays} days?`}
          takeaway={<>The daily median averaged <b>{fmt(avgMed)}</b>, with its low of <b>{fmt(med[dailyMedMin])}</b> on {dateLong(dates[dailyMedMin])}, and ended the range at <b>{fmt(med.at(-1)!)}</b> on {dateLong(last)}.</>}
          actions={<ChartActions api="tx-values" name="transaction size over time" />}
          legend={<Legend items={[{ label: 'Median', color: 'var(--s2)', line: true }, { label: 'P25–P75', color: 'color-mix(in srgb, var(--s2) 55%, transparent)' }, { label: 'P10–P90', color: 'color-mix(in srgb, var(--s2) 25%, transparent)' }, { label: 'Mean', color: 'var(--s4)', line: true, dashed: true }]} />}
          foot={`Log scale · ${clsLabel(tv.class).toLowerCase()} · ${rangeLabel} · dollars at each day’s close · data through ${dateLong(dataThrough)}`}
        >
          <XYChart
            x={xDays} xTicks={monthTicks} yLog yFormat="usdCompact"
            series={[
              { key: 'b80', label: 'P10–P90', color: 'var(--s2)', type: 'band', values: days.map((d) => u(d, 'p90_zat')), lo: days.map((d) => u(d, 'p10_zat')), opacity: 0.14, format: 'usdCompact' },
              { key: 'b50', label: 'P25–P75', color: 'var(--s2)', type: 'band', values: days.map((d) => u(d, 'p75_zat')), lo: days.map((d) => u(d, 'p25_zat')), opacity: 0.24, format: 'usdCompact' },
              { key: 'med', label: 'Median', color: 'var(--s2)', values: med, width: 2.2, format: 'usdCompact' },
              { key: 'mean', label: 'Mean', color: 'var(--s4)', values: days.map((d) => u(d, 'mean_zat')), dashed: true, width: 1.4, format: 'usdCompact' },
            ]}
            tipTitles={dates.map((d) => dateLong(d))} height={320}
            ariaLabel={`Daily median transaction size with P25–P75 and P10–P90 bands on a log dollar scale, ${rangeLabel}. Latest median ${fmt(med.at(-1)!)}.`}
          />
        </Card>

        <Card
          title="How big are the largest transactions each day?"
          takeaway={<>The top 1% of transactions are each worth <b>{fmt(avgP99)}</b> or more on an average day — about <b>{num(avgP99 / avgMed)}×</b> the median.</>}
          actions={<ChartActions api="tx-values" name="upper tail" />}
          foot={`Log scale · P99 highlighted, the rest grey for context, each with its own dash and named at its right end · the window is the page’s range · data through ${dateLong(dataThrough)}`}
        >
          <TimeSeriesChart
            dates={dates} format="usdCompact" logToggle defaultLog ranges={false} height={320} endLabel
            series={[
              { key: 'p999', label: 'P99.9', color: 'var(--text-2)', values: days.map((d) => u(d, 'p999_zat')), width: 1.2, dash: '8 3' },
              { key: 'p99', label: 'P99', color: 'var(--s2)', values: p99, width: 2.4 },
              { key: 'p95', label: 'P95', color: 'var(--other)', values: days.map((d) => u(d, 'p95_zat')), width: 1.2 },
              { key: 'p90', label: 'P90', color: 'var(--other)', values: days.map((d) => u(d, 'p90_zat')), width: 1.2, dash: '2 3' },
              { key: 'p50', label: 'Median', color: 'var(--text-2)', values: med, width: 1.2, dash: '10 3 2 3' },
            ]}
            ariaLabel="Daily P90, P95, P99 and P99.9 transaction sizes with the median, log dollar scale."
          />
        </Card>

        <Card
          title="How many transactions a day, and how many dollars?"
          takeaway={<>An average day carried <b>{num(perDay)}</b> transactions moving <b>{fmt(usdPerDay)}</b>; the busiest single day was {dateLong(dates[busiest])} ({num(counts[busiest])}) and the biggest single dollar day {dateLong(dates[richest])} ({fmt(usdDay[richest])}), both marked on the charts.</>}
          actions={<ChartActions api="tx-values" name="transactions and dollars per day" />}
          foot={`Two panels instead of two y-axes: a count and a dollar total are different quantities · where several days share a column it shows their average day, so a single-day peak sits above its column · the window is the page’s range · data through ${dateLong(dataThrough)}`}
        >
          <span className={r.panelLbl}>Transactions per day</span>
          <TimeSeriesChart
            dates={dates} format="count" unit="transactions" ranges={false} height={220} events={[{ date: dates[busiest], label: `busiest day ${num(counts[busiest])}` }]}
            series={[{ key: 'n', label: 'Transactions', color: 'color-mix(in srgb, var(--s2) 60%, transparent)', type: 'bar', values: counts, agg: 'mean' }, { key: 'avg', label: '30-day average', color: 'var(--s2)', values: roll(counts), width: 2 }]}
            ariaLabel={`Transparent transactions per day, average ${num(perDay)}; busiest day ${dateLong(dates[busiest])} with ${num(counts[busiest])}.`}
          />
          <span className={r.panelLbl}>Dollars moved per day</span>
          <TimeSeriesChart
            dates={dates} format="usdCompact" ranges={false} height={220} events={[{ date: dates[richest], label: `biggest day ${fmt(usdDay[richest])}` }]}
            series={[{ key: 'u', label: 'Dollars moved', color: 'color-mix(in srgb, var(--s4) 60%, transparent)', type: 'bar', values: usdDay, agg: 'mean' }, { key: 'avg', label: '30-day average', color: 'var(--s4)', values: roll(usdDay), width: 2 }]}
            ariaLabel={`Dollars moved by transparent transactions per day, average ${fmt(usdPerDay)}; biggest day ${dateLong(dates[richest])} with ${fmt(usdDay[richest])}.`}
          />
        </Card>
      </Section>

      <More summary="What this measures, and what it cannot">
        <div className={r.moreCols}>
          <div className={r.prose}>
            <p><b>One data point is one transaction:</b> the total it paid to transparent outputs, priced at that day’s ZEC close. Coinbase (mining reward) transactions are left out — they are issuance, not anyone moving money.</p>
            <p><b>Change is included, so every figure is an upper bound.</b> Spending a 100 ZEC coin to pay someone 1 ZEC sends 99 ZEC back as change, and the chain does not mark which output is which. Every method of guessing the change output is a guess, so this page reports what is provable.</p>
            <p><b>Three views.</b> Transparent → transparent is coins moving between transparent holders. Leaving a shielded pool releases value from a shielded pool to transparent outputs. Everything also includes shielding transactions, whose only transparent output is usually their change — which is why it is not the default.</p>
          </div>
          <div className={r.prose}>
            <p><b>The mode is an exact amount.</b> A ZEC amount is a whole number of zatoshi, and automated payers repeat one amount exactly. When the mode covers a large share of a day, that day’s median describes a robot, not a crowd.</p>
            <p><b>How exact the range figures are.</b> Each day’s transactions are stored in size bands a twentieth of a decade wide (each about 12% wider than the last), so a range percentile is good to about 12%, not to the cent. The mean, counts and totals are exact, and the per-day lines are exact for each day.</p>
            <p>Shielded transactions hide their amounts, so this page cannot see them at all. Source: every block, via our full node.</p>
          </div>
        </div>
      </More>

      <Tiles items={[
        { href: '/shield-hops', title: 'Shield-bound hop sizes', desc: 'The same report for coins going private.' },
        { href: '/wall-of-shame', title: 'Wall of Shame', desc: 'Round trips that reused a near-identical amount.' },
        { href: '/chart/tx', title: 'Transactions per day', desc: 'Every transaction type, not just transparent.', value: <>{num(tx7)} / day, 7-day avg</> },
        { href: '/privacy-suggestions', title: 'Privacy tips', desc: 'Round amounts with the biggest crowd to hide in.' },
      ]} />
    </>
  );
}

