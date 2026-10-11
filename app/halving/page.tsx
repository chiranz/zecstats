import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Progress, Section, Tiles } from '@/components/ui/blocks';
import { XYChart } from '@/components/reports/XYChart';
import { dateTicks, dayMs } from '@/components/reports/ticks';
import r from '@/components/reports/report.module.css';
import { HALVING, getHalving } from '@/lib/data/reports';
import { getDailyStats, getLatestBlock } from '@/lib/data/snapshot';
import { compact, dateLong, num, pct, zat } from '@/lib/format';

export const metadata: Metadata = { title: 'Halving', description: 'When the next Zcash halving is, and the full block-reward schedule.' };

/** Dates the network actually halved: the UTC day on which the per-block coinbase in daily-stats dropped. */
const HALVED_ON: Record<number, string> = { 1_046_400: '2020-11-18', 2_726_400: '2024-11-23' };
const BLOCKS_PER_DAY = 86400 / HALVING.spacing; // 1,152
const rewardStr = (v: number) => `${v.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')} ZEC`;
const mZec = (v: number) => `${(v / 1e6).toFixed(2)}M`;

export default async function HalvingPage() {
  const [h, lb, stats] = await Promise.all([getHalving(), getLatestBlock(), getDailyStats()]);
  const next = h.next;
  const after = next.rewardAfter;
  const supply0 = zat(lb.end_supply_zat);
  const prevStart = h.prev.height;

  // ---- supply: actual (weekly samples) + projected from the consensus schedule ----
  const actual = stats.filter((_, i) => i % 7 === 0 || i === stats.length - 1).map((s) => ({ t: dayMs(s.date), v: zat(s.end_supply_zat) }));
  const t0 = lb.time * 1000;
  const issuedBetween = (h0: number, h1: number) => { // ZEC issued between two heights on the post-Blossom schedule
    let total = 0;
    for (const row of h.rows) {
      const eraStart = row.height - HALVING.interval, eraEnd = row.height; // reward before this halving = rewardAfter × 2
      const a = Math.max(h0, eraStart), b = Math.min(h1, eraEnd);
      if (b > a) total += (b - a) * row.rewardAfter * 2;
    }
    const lastRow = h.rows.at(-1)!;
    if (h1 > lastRow.height) total += (h1 - Math.max(h0, lastRow.height)) * lastRow.rewardAfter;
    return total;
  };
  const projected: { t: number; v: number }[] = [];
  for (let y = 2026, mo = 11; y < 2041; mo += 3) {
    if (mo > 11) { y += 1; mo -= 12; }
    const t = Date.UTC(y, mo, 1);
    if (t < t0) continue;
    const hh = lb.height + (t - t0) / 1000 / HALVING.spacing;
    projected.push({ t, v: supply0 + issuedBetween(lb.height, hh) });
  }
  projected.unshift({ t: t0, v: supply0 });
  const xs = [...actual.map((p) => p.t), ...projected.map((p) => p.t)];
  const actVals = [...actual.map((p) => p.v), ...projected.map(() => null)];
  const projVals = [...actual.map(() => null), ...projected.map((p) => p.v)];
  projVals[actual.length - 1] = actual.at(-1)!.v; // join the two lines
  const remaining = 21_000_000 - supply0;
  const nextSupply = supply0 + issuedBetween(lb.height, next.height);
  const dateOf = (row: (typeof h.rows)[number]) => (row.done ? HALVED_ON[row.height] : row.date!);

  return (
    <>
      <Masthead
        crumbs={[{ label: 'Tools' }, { label: 'Network' }, { label: 'Halving' }]}
        title="When is the next Zcash halving?"
        lede={<>At block <b className="num value">{num(next.height)}</b>, about <b className="num value">{num(h.daysLeft)} days</b> away (around {dateLong(next.date!)}): the block reward drops from {rewardStr(h.reward)} to {rewardStr(after)}.</>}
      />

      <section className="hero" aria-label="Answer">
        <div className={r.heroTop}>
          <div>
            <p className="kicker">Next halving · block {num(next.height)}</p>
            <p className="figure">~{num(h.daysLeft)}<small>days</small></p>
            <p className={r.lead}>around {dateLong(next.date!)}</p>
          </div>
          <div className={r.heroNote}>
            <p>About <b>{num(h.blocksLeft)}</b> blocks to go. The block reward drops from <b>{rewardStr(h.reward)}</b> to <b>{rewardStr(after)}</b>, and new ZEC per day from <b>{num(h.reward * BLOCKS_PER_DAY)}</b> to <b>{num(after * BLOCKS_PER_DAY)}</b>.</p>
            <p>The date is an estimate from Zcash’s 75-second target spacing, counted from our node’s current block, {num(lb.height)} — not a fixed date. The height is fixed by consensus.</p>
          </div>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <div className="spread">
            <span className="kicker">Through the current era · blocks {num(prevStart)} → {num(next.height)}</span>
            <span className="mono small"><b className="value">{pct(h.eraProgress * 100, 1)}</b> done · {num(lb.height - prevStart)} of {num(HALVING.interval)} blocks</span>
          </div>
          <Progress value={h.eraProgress * 100} label={`${pct(h.eraProgress * 100, 1)} of the way from the second halving to the third`} />
        </div>
      </section>

      <KpiBand label="Halving facts">
        <Kpi k="Current block reward" v={rewardStr(h.reward)} s="per block, every ~75 s" />
        <Kpi k="Halvings so far" v={h.halvingsDone} s={`first at block ${num(HALVING.firstHalving)}`} />
        <Kpi k="Halving interval" v={num(HALVING.interval)} unit="blocks" s="post-Blossom, about 4 years" />
        <Kpi k="Current height" v={num(lb.height)} s="from our full node" href="/node" />
      </KpiBand>

      <Section title="When is every Zcash halving?">
        <div className="stack" style={{ gap: 16 }}>
          <div className="tbl-wrap">
            <table className="t">
              <caption className="sr-only">Zcash halving schedule</caption>
              <thead><tr><th scope="col">#</th><th scope="col">Block</th><th scope="col">Date</th><th scope="col">Reward after</th><th scope="col">New ZEC / day</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {h.rows.map((row) => (
                  <tr key={row.n} className={row.n === next.n ? r.focusRow : undefined}>
                    <td>{row.n}</td>
                    <td>{num(row.height)}</td>
                    <td>{row.done ? dateLong(dateOf(row)) : `~${dateLong(dateOf(row))}`}</td>
                    <td>{rewardStr(row.rewardAfter)}</td>
                    <td>{num(row.rewardAfter * BLOCKS_PER_DAY, row.rewardAfter * BLOCKS_PER_DAY < 100 ? 1 : 0)}</td>
                    <td>{row.done ? <span className="muted">done</span> : row.n === next.n ? <b className="up">next</b> : <span className="muted">projected</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={r.moreCols}><div className={r.prose}>
            <p><b>Past rows are heights the network actually reached</b>, dated by the UTC day the per-block reward fell in our node’s daily data. <b>Future rows are projections:</b> the heights are fixed by consensus, but when the chain reaches them depends on real block times, which drift with hash rate.</p></div><div className={r.prose}>
            <p>Each halving cuts new issuance in half. The next one takes daily issuance from {num(h.reward * BLOCKS_PER_DAY)} to {num(after * BLOCKS_PER_DAY)} ZEC — against the roughly {mZec(nextSupply)} ZEC that will exist by then, an annual rate of about {pct(((after * BLOCKS_PER_DAY * 365) / nextSupply) * 100, 2)} afterwards.</p>
          </div></div>
        </div>
      </Section>

      <Card
        title="How many ZEC will exist after each halving?"
        takeaway={<><b>{mZec(supply0)}</b> of 21M ZEC exist today; about <b>{mZec(nextSupply)}</b> will by the next halving, and the last {mZec(remaining)} take decades to arrive.</>}
        actions={<ChartActions api="daily-stats" name="supply schedule" />}
        legend={<Legend items={[{ label: 'Supply (from our node)', color: 'var(--zec)', line: true }, { label: 'Projected from the schedule', color: 'var(--text-2)', line: true, dashed: true }]} />}
        foot={`Actual supply is each day’s end-of-day total from our node; the projection runs the post-Blossom schedule forward at 75 s per block from block ${num(lb.height)} · data through ${dateLong(stats.at(-2)!.date)}`}
      >
        <XYChart
          x={xs} xTicks={dateTicks('2016-10-28', '2040-12-31', 'year').filter((t) => new Date(t.v).getUTCFullYear() % 2 === 0)}
          series={[
            { key: 'a', label: 'Supply', color: 'var(--zec)', values: actVals, width: 2.2, format: 'zecCompact' },
            { key: 'p', label: 'Projected', color: 'var(--text-2)', values: projVals, dashed: true, width: 1.6, format: 'zecCompact' },
          ]}
          yFormat="zecCompact" yDomain={[0, 22_000_000]} yTicks={[0, 5e6, 10e6, 15e6, 21e6].map((v) => ({ v, label: `${compact(v, 0)}` }))}
          hLines={[{ y: 21_000_000, label: '21M cap' }]}
          markers={h.rows.slice(0, 4).map((row, i) => ({ x: dayMs(dateOf(row)), label: `H${row.n}`, dy: (i % 2) * 14 }))}
          tipTitles={xs.map((t) => dateLong(t))} height={320}
          ariaLabel={`Zcash supply from launch to today and projected to 2040. ${mZec(supply0)} ZEC today; about ${mZec(nextSupply)} at the next halving.`}
        />
      </Card>

      <Section title="Why doesn’t Zcash halve on Bitcoin’s schedule?">
        <div className="split">
          <div className={r.prose}>
            <p>Zcash launched with Bitcoin’s shape. The <b>Blossom</b> upgrade changed it at block {num(HALVING.blossomHeight)}, in December 2019 — three numbers at once.</p>
            <p>Twice as many blocks, each worth half as much, and twice as far to the next halving. The ZEC paid out per day did not change, and neither did the calendar the supply arrives on. Only the block numbers did.</p>
            <p>That is why the first halving landed at block {num(HALVING.firstHalving)} (18 November 2020) rather than 840,000 — the detail most halving countdowns get wrong: assume 840,000 and the dates come out years off.</p>
          </div>
          <div className="card" style={{ gap: 0 }}>
            <div className={r.ba}>
              <span className={r.h} /> <span className={r.h}>Before Blossom</span><span className={r.h} aria-hidden="true" /><span className={r.h}>After Blossom</span>
              <span className={r.k}>One block every</span><span className={r.v}>150 seconds</span><span className={r.arrow} aria-hidden="true">→</span><span className={r.v}>75 seconds</span>
              <span className={r.k}>Reward per block</span><span className={r.v}>12.5 ZEC</span><span className={r.arrow} aria-hidden="true">→</span><span className={r.v}>6.25 ZEC</span>
              <span className={r.k}>Blocks between halvings</span><span className={r.v}>840,000</span><span className={r.arrow} aria-hidden="true">→</span><span className={r.v}>1,680,000</span>
              <span className={r.k}>New ZEC per day</span><span className={r.v}>7,200</span><span className={r.arrow} aria-hidden="true">→</span><span className={r.v}>7,200</span>
            </div>
          </div>
        </div>
      </Section>

      <More summary="How the countdown is computed">
        <p>Blocks to go = {num(next.height)} − {num(lb.height)} (our node’s current height, {dateLong(lb.time * 1000)}). Days = blocks × 75 seconds ÷ 86,400. Real blocks arrive a little faster or slower than target as hash rate changes, so the projected date moves by days, not months.</p>
        <p>The rewards are the total block subsidy. Since NU6 a share of each block goes to the dev fund lockbox rather than the miner; the halving schedule applies to the whole subsidy either way.</p>
      </More>

      <Tiles items={[
        { href: '/chart/inflation', title: 'Daily emission + inflation', desc: 'New ZEC per day and the annual rate.' },
        { href: '/chart/supply', title: 'Total ZEC mined', desc: 'Supply against the 21M cap.', value: <>{mZec(supply0)} ZEC</> },
        { href: '/chart/dev-fund', title: 'Dev fund paid out', desc: 'The share of each block reward since NU6.' },
        { href: '/founders-reward', title: "Founders' Reward", desc: 'What the 2016–2020 reward was worth.' },
      ]} />
    </>
  );
}
