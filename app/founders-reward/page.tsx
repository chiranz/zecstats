import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import r from '@/components/reports/report.module.css';
import { getFoundersReward } from '@/lib/data/reports';
import { dateLong, num, pct, usd, usdCompact } from '@/lib/format';

export const metadata: Metadata = { title: "Founders' Reward", description: "What the 2016–2020 Zcash Founders' Reward was worth when it was paid, and what the same coins are worth today." };

export default async function FoundersRewardPage() {
  const fr = await getFoundersReward();
  const pts = fr.points;
  const dates = pts.map((p) => p.date);
  const best = pts.reduce((b, p) => (p.usd > b.usd ? p : b), pts[0]);
  const multiple = fr.value_today_usd / fr.total_usd;
  const st = fr.stages;
  // Founders' share per stage, from the consensus schedule (slow start is what remains of the 2.1M total).
  const stage3 = (fr.era.halving_height - fr.era.blossom_height) * st.post_blossom_fr_zec;
  const stage2 = (fr.era.blossom_height - fr.era.slow_start_interval) * st.pre_blossom_fr_zec;
  const stage1 = fr.schedule_zec - stage2 - stage3;
  const holder = fr.unmoved.still_holding[0];
  const sweptPct = (1 - fr.unmoved.balance_zec / fr.unmoved.received_zec) * 100;

  return (
    <>
      <Masthead
        crumbs={[{ label: 'Tools' }, { label: 'Reports' }, { label: "Founders' Reward" }]}
        title="What was the Founders' Reward worth?"
        lede={<>The 2.1M ZEC paid to Zcash’s builders from 2016 to 2020 was worth <b className="num value">{usdCompact(fr.total_usd, 1)}</b> on the days it arrived — and <b className="num value">{usdCompact(fr.value_today_usd, 2)}</b> at today’s price, {num(multiple, 1)}× more.</>}
      />

      <section className="hero" aria-label="Answer">
        <div className={r.heroTop}>
          <div>
            <p className="kicker">Blocks {num(fr.era.first_height)} – {num(fr.era.last_height)} · {fr.era.first_date.slice(0, 4)}–{fr.era.last_date.slice(0, 4)}</p>
            <p className="figure">{usdCompact(fr.total_usd, 1)}<small>on receipt</small></p>
          </div>
          <div className={r.heroNote}>
            <p>That is what the entire Founders’ Reward was worth on the days it was paid — each day’s coins marked at that day’s ZEC close, then added up: the cash someone selling it as it arrived would have banked.</p>
            <p>The same <b>{num(fr.schedule_zec)}</b> ZEC at today’s <b>{usd(fr.spot_usd)}</b> would be worth <b>{usdCompact(fr.value_today_usd, 2)}</b>.</p>
          </div>
        </div>
      </section>

      <KpiBand six label="Founders' Reward summary">
        <Kpi k="Coins issued" v={num(fr.schedule_zec)} unit="ZEC" s="20% of every block reward, for four years" />
        <Kpi k="Average price received" v={usd(fr.avg_price_usd)} s="dollars banked ÷ coins received" />
        <Kpi k="Same coins today" v={usdCompact(fr.value_today_usd, 2)} s="if not one had been sold" />
        <Kpi k="Worst it ever got" v={usdCompact(fr.min_held.usd, 1)} s={`holding, on ${dateLong(fr.min_held.date)}`} />
        <Kpi k="Share of ZEC today" v={pct(fr.pct_of_supply, 1)} s="of all ZEC in existence" />
        <Kpi k="Never moved" v={num(fr.unmoved.balance_zec, 4)} unit="ZEC" s={`left on the ${fr.unmoved.addresses_total} reward addresses`} />
      </KpiBand>

      <Section title="What was the Founders' Reward?">
        <div className="split">
          <div className={r.prose}>
            <p>Zcash launched on 28 October 2016 with no premine and no ICO. Instead, for the first four years, <b>20% of every block reward</b> went not to the miner but to a fixed list of {fr.unmoved.addresses_total} addresses belonging to the founders, early investors, employees and advisors, the company now called Electric Coin Co., and the Zcash Foundation.</p>
            <p>It ran to block {num(fr.era.last_height)} and stopped at the first halving on 18 November 2020. The <b>slow start</b> ramped the subsidy up over the first {num(fr.era.slow_start_interval)} blocks, so launch week issued only a few dozen founders’ coins even though ZEC briefly printed above $19,000. <b>Blossom</b> halved the block time and the per-block reward together, so the reward ran at a steady {num(st.pre_blossom_per_day_zec)} ZEC per day throughout.</p>
          </div>
          <div className="tbl-wrap">
            <table className="t">
              <caption className="sr-only">Founders' Reward schedule</caption>
              <thead><tr><th scope="col">Blocks</th><th scope="col" style={{ textAlign: 'left' }}>Dates</th><th scope="col">Founders’ share per block</th><th scope="col">Total</th></tr></thead>
              <tbody>
                <tr><td>1 – {num(fr.era.slow_start_interval - 1)}</td><td className="l" style={{ textAlign: 'left' }}>Oct–Nov 2016</td><td>20% of a ramp to {st.pre_blossom_subsidy_zec} ZEC</td><td>{num(stage1)} ZEC</td></tr>
                <tr><td>{num(fr.era.slow_start_interval)} – {num(fr.era.blossom_height - 1)}</td><td className="l" style={{ textAlign: 'left' }}>Nov 2016 – Dec 2019</td><td>{st.pre_blossom_fr_zec} of {st.pre_blossom_subsidy_zec} ZEC</td><td>{num(stage2)} ZEC</td></tr>
                <tr><td>{num(fr.era.blossom_height)} – {num(fr.era.last_height)}</td><td className="l" style={{ textAlign: 'left' }}>Dec 2019 – Nov 2020</td><td>{st.post_blossom_fr_zec} of {st.post_blossom_subsidy_zec} ZEC</td><td>{num(stage3)} ZEC</td></tr>
                <tr className={r.rgrp}><td>Total</td><td /><td /><td>{num(fr.schedule_zec)} ZEC</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="What was it worth day by day?" aside={<a className="btn" href="/api/founders-reward" download="zec-founders-reward.json">Download data</a>}>
        <Card
          title="How many dollars did the reward bring in each day?"
          takeaway={<>The best single day was <b>{dateLong(best.date)}</b>, at <b>{usdCompact(best.usd, 2)}</b>; the bars peak in the January 2018 mania and never come close again.</>}
          actions={<ChartActions api="founders-reward" name="dollars received per day" />}
          foot="That day’s Founders’ Reward in ZEC × that day’s ZEC/USD close — the sell-as-you-receive figure. Bars are summed into periods when they would be thinner than a pixel."
        >
          <TimeSeriesChart dates={dates} format="usdCompact" ranges={false} height={260} series={[{ key: 'u', label: 'Dollars received', color: 'var(--zec)', type: 'bar', values: pts.map((p) => p.usd) }]} ariaLabel={`Founders' Reward dollars received per day, 2016–2020; best day ${dateLong(best.date)} at ${usdCompact(best.usd, 2)}.`} />
        </Card>

        <Card
          title="What did selling on receipt cost, against never selling?"
          takeaway={<>Sold as it arrived, the reward banked <b>{usdCompact(fr.total_usd, 1)}</b>; held, the same coins are worth <b>{usdCompact(fr.value_today_usd, 2)}</b> today. The gap is the cost of having sold.</>}
          actions={<ChartActions api="founders-reward" name="cumulative dollars" />}
          foot={`Both lines are dollars on one axis. “Worth today” marks the coins received so far at today’s ${usd(fr.spot_usd)}.`}
        >
          <TimeSeriesChart
            dates={dates} format="usdCompact" ranges={false} height={300} zeroBaseline
            series={[{ key: 'sold', label: 'Sold on receipt', color: 'var(--text-2)', values: pts.map((p) => p.cum_usd) }, { key: 'held', label: 'Worth today', color: 'var(--zec)', values: pts.map((p) => p.cum_zec * fr.spot_usd), width: 2.2 }]}
            ariaLabel={`Cumulative Founders' Reward value: sold on receipt reaches ${usdCompact(fr.total_usd, 1)}, worth today reaches ${usdCompact(fr.value_today_usd, 2)}.`}
          />
        </Card>

        <Card
          title="What price was the reward received at?"
          takeaway={<>The coin-weighted average was <b>{usd(fr.avg_price_usd)}</b> — close to a plain average of the daily closes, because issuance was flat at {num(st.pre_blossom_per_day_zec)} ZEC a day.</>}
          actions={<ChartActions api="founders-reward" name="price received" />}
          foot="ZEC’s daily close through the Founders’ Reward era. Log scale: the range spans three orders of magnitude."
        >
          <TimeSeriesChart
            dates={dates} format="usd" ranges={false} logToggle defaultLog height={300}
            series={[{ key: 'p', label: 'ZEC price', color: 'var(--zec)', values: pts.map((p) => p.zec_usd) }, { key: 'avg', label: 'Average received', color: 'var(--text-2)', values: pts.map(() => fr.avg_price_usd), dashed: true, width: 1.4 }]}
            ariaLabel={`ZEC daily close from ${dateLong(dates[0])} to ${dateLong(dates.at(-1)!)}, log scale, with the average received price ${usd(fr.avg_price_usd)}.`}
          />
        </Card>
      </Section>

      <div className="grid2">
        <Section title="What happened year by year?">
          <div className="tbl-wrap">
            <table className="t">
              <caption className="sr-only">Founders' Reward by year</caption>
              <thead><tr><th scope="col">Year</th><th scope="col">ZEC received</th><th scope="col">Value on receipt</th><th scope="col">Average price</th></tr></thead>
              <tbody>
                {fr.by_year.map((y) => <tr key={y.year}><td>{y.year}</td><td>{num(y.zec)}</td><td>{usdCompact(y.usd, 1)}</td><td>{usd(y.avg_price_usd)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="small">2016 is two months and 2020 stops at the halving in November, which is why both are short. Dates are UTC.</p>
        </Section>
        <Section title="Who received it?">
          <div className="tbl-wrap">
            <table className="t">
              <caption className="sr-only">Founders' Reward recipients, as disclosed</caption>
              <thead><tr><th scope="col">Recipient</th><th scope="col">Before mid-2018</th><th scope="col">After</th></tr></thead>
              <tbody>
                <tr><td className="l">Founders &amp; vested employees</td><td>12.8%</td><td>9.6%</td></tr>
                <tr><td className="l">Electric Coin Co. &amp; employee compensation</td><td>4.2%</td><td>8.2%</td></tr>
                <tr><td className="l">Zcash Foundation</td><td>3.0%</td><td>2.2%</td></tr>
                <tr className={r.rgrp}><td>Total</td><td>20%</td><td>20%</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small">Shares of the whole block reward, as disclosed by Electric Coin Co. — the one thing on this page not measured from the chain.</p>
        </Section>
      </div>

      <Section title="How much has never moved?">
        <div className={r.heroGrid}>
          <div className="stack" style={{ gap: 8 }}>
            <p className="figure md">{num(sweptPct, 6)}%<small> swept out</small></p>
            <p className="note">Of the {num(fr.unmoved.received_zec, 2)} ZEC the {fr.unmoved.addresses_total} reward addresses ever received, only <b className="value">{num(fr.unmoved.balance_zec, 8)} ZEC</b> ({usd(fr.unmoved.balance_usd)}) is still there. “Moved” is not “sold”: most of it went to a shielded pool, where the chain stops answering questions by design.</p>
          </div>
          <div className="tbl-wrap">
            <table className="t">
              <caption className="sr-only">Reward addresses still holding a balance</caption>
              <thead><tr><th scope="col">Address</th><th scope="col">Received</th><th scope="col">Still holding</th></tr></thead>
              <tbody><tr><td style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{holder.address}</td><td>{num(holder.received_zec, 2)} ZEC</td><td>{num(holder.balance_zec, 8)} ZEC</td></tr></tbody>
            </table>
          </div>
        </div>
      </Section>

      <More summary="How is this number built — and why the real figure is lower">
        <p>This is a mark, not a simulation: what each day’s coins were worth at that day’s price, which makes it an upper bound on the cash. Selling {num(st.pre_blossom_per_day_zec)} ZEC into the market every day would have moved the price against the seller; in 2016 and 2017 that was a meaningful fraction of daily volume. Taxes, exchange access, custody and vesting schedules all cut it further.</p>
        <p>Coins come from the consensus schedule — the slow-start ramp, the flat 2.5 ZEC, the post-Blossom 1.25 ZEC — evaluated block by block and bucketed into UTC days. Prices are the daily ZEC/USD closes every chart on this site uses. {fr.unpriced_zec ? `${num(fr.unpriced_zec)} ZEC fell on days with no price and is left out of the dollar total.` : 'Every day of the era has a price, so nothing is left out of the dollar total.'} Lifetime received at the addresses runs a little above 2.1M because anyone can pay a transparent address.</p>
      </More>

      <Tiles items={[
        { href: '/chart/supply', title: 'Total ZEC mined', desc: 'Supply against the 21M cap.' },
        { href: '/chart/dev-fund', title: 'Dev fund paid out', desc: 'The share of each block reward since NU6.' },
        { href: '/chart/inflation', title: 'Daily emission + inflation', desc: 'New ZEC per day and the annual rate.' },
        { href: '/halving', title: 'Halving', desc: 'When the block reward next halves.' },
      ]} />
    </>
  );
}
