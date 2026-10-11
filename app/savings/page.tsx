import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Tiles } from '@/components/ui/blocks';
import { Calculator } from '@/components/tools/Calculator';
import s from '@/components/tools/calc.module.css';
import { getPriceArrays, ZEC_MAX } from '@/lib/data/tools';
import { getValuation } from '@/lib/data/home';
import { dateLong, delta, num, usd } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/savings');

export default async function SavingsPage() {
  const [prices, val] = await Promise.all([getPriceArrays(), getValuation()]);
  const ch = delta(val.change24h);
  // 1% of gold's $20.0T (the /what-if reference size) spread over every ZEC that will ever exist
  const goldOnePct = (20.0e12 * 0.01) / ZEC_MAX;
  return (
    <>
      <SectionLd path="/savings" />
      <Masthead
        title="What if you had bought ZEC every month?"
        lede="Choose a start date, how often you buy and how much. We replay real daily closing prices, with no smoothing, and set Zcash against Bitcoin bought on the same days."
      />
      <Calculator prices={prices} />
      <More summary="What this calculator assumes">
        <div className={s.assume}>
          <p><b>Daily closes, no fees.</b> Every purchase fills at that day&apos;s closing price (Coin Metrics), with no exchange fee, spread or slippage, and nothing is ever sold. The value today uses the last complete day, {dateLong(prices.lastComplete)}.</p>
          <p><b>The schedule.</b> The first purchase is on your start date. After that, monthly buys fall on the 1st of each month and quarterly buys on the 1st of January, April, July and October; weekly buys every 7 days; daily buys every day.</p>
          <p><b>Per year is XIRR.</b> The money-weighted return is the yearly rate that, applied to each purchase for as long as it was held, adds up to the value today. It is the fair way to compare regular buying, because early dollars had more time to grow.</p>
          <p><b>Not advice.</b> A replay of the past says nothing about the future. Zcash&apos;s first days traded at four-figure prices on almost no liquidity, so start dates in late 2016 look worse than any later start.</p>
        </div>
      </More>
      <Tiles
        items={[
          { href: '/chart/price', title: 'ZEC price', desc: 'The price behind every Zcash purchase above, with log scale and moving averages.', value: <>{usd(val.price)} <span className={ch.cls} style={{ fontSize: 13 }}>{ch.text} 24h</span></> },
          { href: '/chart/realized-all', title: 'Realized price', desc: 'The average price coins last moved at: what the market as a whole paid.', value: `${usd(val.realizedPrice, 0)} · MVRV ${num(val.mvrv, 2)}×` },
          { href: '/chart/market-cap', title: 'Market cap', desc: 'Price × supply, the number most comparisons start from.', value: `$${num(val.marketCap / 1e9, 2)}B` },
          { href: '/what-if', title: 'What if gold', desc: "What one ZEC would be worth if Zcash took a share of gold's value.", value: `${usd(goldOnePct, 0)} a ZEC at 1%` },
        ]}
      />
    </>
  );
}
