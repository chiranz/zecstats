import { Masthead } from '@/components/chrome/Masthead';
import { Card, Kpi, KpiBand } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { getDailyPrices, getLive, getPools } from '@/lib/data/snapshot';
import { pct, usd, zecCompact } from '@/lib/format';

// Placeholder — replaced by the full dashboard.
export default async function Home() {
  const [live, prices, pools] = await Promise.all([getLive(), getDailyPrices(), getPools()]);
  return (
    <>
      <Masthead kicker="Zcash network statistics" title="Every Zcash number, from our own node" lede="Foundation smoke test." />
      <KpiBand>
        <Kpi k="ZEC price" v={usd(live.zec_usd)} s="live snapshot" />
        <Kpi k="ZEC/BTC" v={live.zec_btc.toFixed(5)} />
        <Kpi k="Shielded" v={pct(pools.shieldedPct)} s={zecCompact(pools.shielded)} />
        <Kpi k="Ironwood" v={zecCompact(pools.ironwood)} />
      </KpiBand>
      <Card title="ZEC price">
        <TimeSeriesChart dates={prices.map((p) => p.date)} series={[{ key: 'p', label: 'ZEC', color: 'var(--zec)', values: prices.map((p) => p.zec_usd) }]} format="usd" logToggle defaultRange="5Y" ariaLabel="ZEC price" />
      </Card>
    </>
  );
}
