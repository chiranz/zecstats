import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Callout, More, Tiles } from '@/components/ui/blocks';
import { BullRun } from '@/components/tools/BullRun';
import { alignRun, atDay, BTC_CYCLE, isRun, peakAndTrough } from '@/components/tools/runAlign';
import { getPriceArrays, getBullRunSnapshot } from '@/lib/data/tools';
import { getLive } from '@/lib/data/snapshot';
import { dateLong, delta, num, usd } from '@/lib/format';

export const metadata: Metadata = { title: 'ZEC 2026 vs BTC 2017 — day by day', description: "Zcash's 2026 run and Bitcoin's 2017 run laid over each other, day for day from the day each left $800 behind." };

export default async function BullRunPage() {
  const [prices, snap, live] = await Promise.all([getPriceArrays(), getBullRunSnapshot(), getLive()]);
  const zec = alignRun(prices.dates, prices.zec, 800, null);
  const btc = alignRun(prices.dates, prices.btc, 800, BTC_CYCLE);
  let lede = "Zcash's 2026 run and Bitcoin's 2017 run, laid over each other day for day from the day each first left $800 behind.";
  let fall = 0;
  if (isRun(zec) && isRun(btc)) {
    const today = zec.points.at(-1)!, b = atDay(btc.points, today.d);
    const { peak, trough } = peakAndTrough(btc.points);
    fall = Math.abs((trough.usd / peak.usd - 1) * 100);
    if (b) lede = `On day ${today.d} of its run Zcash is at ${num(today.mult, 2)}× its $800 anchor; Bitcoin was at ${num(b.mult, 2)}× on its own day ${today.d}, and went on to peak at ${num(peak.mult, 0)}× on day ${peak.d} before falling ${num(fall, 0)}%.`;
  }
  return (
    <>
      <Masthead crumbs={[{ href: '/tools', label: 'Tools' }, { label: 'ZEC 2026 vs BTC 2017' }]} title="ZEC 2026 vs BTC 2017, day for day" lede={lede} />
      <Callout title="A sample of one, not a forecast." tone="warn">
        Built because people asked for it, not because the comparison means anything. Nothing here is a projection, a target or a number this site stands behind. The caveats are at the bottom of the page.
      </Callout>
      <BullRun prices={prices} />
      <More summary="Read this before you read the chart · method">
        <p><b>One run against one run.</b> A sample of two is a shape, not a base rate — and the 2017 curve is famous precisely because it was unusual.</p>
        <p><b>The anchor is a round number, not a level.</b> Move it. A conclusion that survives $500 and $1,000 might be about the assets; one that only works at $800 is about the anchor.</p>
        <p><b>The assets are not comparable where it matters.</b> Different issuance, float and liquidity, and a market structure — regulated venues, deep derivatives, spot ETFs — that did not exist in 2017.</p>
        <p><b>The drawdown is part of the analogy.</b> Bitcoin peaked at day {isRun(btc) ? peakAndTrough(btc.points).peak.d : '—'} and gave back {num(fall, 0)}% of it. Using this chart for the upside means using it for that too, which is why the peak and the bottom sit on the same line as the run.</p>
        <p><b>Method.</b> Day 0 is the day after each asset&apos;s last daily close below the anchor, found by walking back from the latest close at or above it — not the first close above it. Bitcoin first closed over $800 on 21 Dec 2016, gave it back on 11 Jan 2017, and only then went; a first-crossing rule would have to pick one of those arbitrarily. Bitcoin is searched only within its {BTC_CYCLE.from}–{BTC_CYCLE.to} cycle, so an anchor can never quietly match a later cycle.</p>
        <p><b>Data.</b> Daily USD closes, the same series every price chart uses, through {dateLong(prices.lastComplete)}. Days are counted from the anchor date, so a gap in the feed leaves a gap in the line rather than shifting everything after it. Day 0 is {dateLong(snap.zec.anchor_date)} for Zcash and {dateLong(snap.btc.anchor_date)} for Bitcoin (/api/btc-bull-run). Daily prices start on {dateLong(prices.dates[0])}, so the $500 anchor (which needs Bitcoin before then) is unavailable.</p>
      </More>
      <Tiles
        items={[
          { href: '/chart/price', title: 'ZEC price', desc: 'The whole price history, with log scale and moving averages.', value: <>${num(live.zec_usd, 2)} <span className={live.zec_usd_change_24h_pct >= 0 ? 'up' : 'dn'} style={{ fontSize: 13 }}>{delta(live.zec_usd_change_24h_pct).text}</span></> },
          { href: '/chart/zec-btc-ratio', title: 'ZEC/BTC ratio', desc: 'Zcash priced in Bitcoin: the cleaner way to compare the two.', value: num(live.zec_btc, 5) },
          { href: '/chart/mktcap-issuance', title: 'Market cap by coins issued', desc: 'Zcash and Bitcoin aligned by issuance instead of by calendar.', value: 'ZEC vs BTC' },
          { href: '/savings', title: 'Investment calculator', desc: 'What buying every month would have returned, against Bitcoin.', value: usd(100, 0) + ' a month' },
        ]}
      />
    </>
  );
}
