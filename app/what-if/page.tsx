import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Section, Tiles } from '@/components/ui/blocks';
import { WhatIf, type WhatIfAsset } from '@/components/tools/WhatIf';
import t from '@/components/tools/tools.module.css';
import { BTC_ISSUED, getWhatIfInputs, WHAT_IF_ASSETS, ZEC_MAX } from '@/lib/data/tools';
import { getPools } from '@/lib/data/snapshot';
import { dateLong, num, pct } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/what-if');

const big = (v: number) => (v >= 1e12 ? `$${num(v / 1e12, 1)}T` : `$${num(v / 1e9, 0)}B`);

export default async function WhatIfPage() {
  const [w, pools] = await Promise.all([getWhatIfInputs(), getPools()]);
  const assets: WhatIfAsset[] = [
    { id: 'gold', label: 'Gold', size: WHAT_IF_ASSETS[0].size, source: WHAT_IF_ASSETS[0].source },
    { id: 'btc', label: 'Bitcoin', size: w.btcSize, source: `Computed here: $${num(w.btcUsd, 0)} per BTC × ${num(BTC_ISSUED / 1e6, 1)}M coins issued` },
    { id: 'offshore', label: 'Offshore wealth', size: WHAT_IF_ASSETS[1].size, source: WHAT_IF_ASSETS[1].source },
    { id: 'stocks', label: 'World stock market', size: WHAT_IF_ASSETS[2].size, source: WHAT_IF_ASSETS[2].source },
  ];
  const gold1 = (WHAT_IF_ASSETS[0].size * 0.01) / ZEC_MAX;
  const desc: Record<string, string> = {
    gold: WHAT_IF_ASSETS[0].desc,
    btc: 'Every bitcoin mined so far at the latest daily close. Coins whose keys are lost are counted, because the chain cannot tell which those are.',
    offshore: WHAT_IF_ASSETS[1].desc,
    stocks: WHAT_IF_ASSETS[2].desc,
  };
  return (
    <>
      <SectionLd path="/what-if" />
      <Masthead
        title="What if Zcash took a share of gold?"
        lede={<>If every ZEC that will ever exist added up to 1% of gold&apos;s {big(WHAT_IF_ASSETS[0].size)}, one ZEC would be worth ${num(gold1, 0)} — {num(gold1 / w.zecUsd, 1)}× the ${num(w.zecUsd, 2)} it closed at on {dateLong(w.date)}. Pick another asset or share below.</>}
      />
      <WhatIf assets={assets} zecUsd={w.zecUsd} mined={w.mined} max={ZEC_MAX} />
      <Section id="sources" title="Where do these numbers come from?">
        <div className={t.twoCol}>
          {assets.map((a) => (
            <div key={a.id} id={`src-${a.id}`} className="stack" style={{ gap: 4, scrollMarginTop: 120 }}>
              <h3 className="h3">{a.label} · <span className="mono">{big(a.size)}</span></h3>
              <p className="small mono" style={{ color: 'var(--accent)' }}>{a.source}</p>
              <p>{desc[a.id]}</p>
            </div>
          ))}
        </div>
      </Section>
      <More summary="Why divide by 21 million, not the coins mined so far">
        <p>A share of an asset class has to be shared out among all the coins eventually, so the default divides by <b>21,000,000 ZEC</b> — every coin that will ever exist — not the {num(w.mined)} mined so far. Using today&apos;s count would make every number roughly {pct((ZEC_MAX / w.mined - 1) * 100, 0)} larger than it should be; the toggle shows that version anyway.</p>
        <p>The three figures that are not Bitcoin are read from a published report once a year and typed in, because nothing publishes them as a live feed; they were last reviewed on 17 Sep 2026. Bitcoin is computed from the latest daily close.</p>
        <p>For scale: {pct(pools.shieldedPct)} of the current supply is shielded today. None of these outcomes is more or less likely because of anything on this page.</p>
      </More>
      <Tiles
        items={[
          { href: '/chart/market-cap', title: 'Market cap', desc: 'What all mined ZEC is worth at today’s price.', value: `$${num((w.zecUsd * w.mined) / 1e9, 2)}B` },
          { href: '/chart/supply', title: 'Total ZEC mined', desc: 'How far along the 21M issuance schedule Zcash is.', value: `${pct((w.mined / ZEC_MAX) * 100)} of 21M` },
          { href: '/chart/price', title: 'ZEC price', desc: 'The price every cell above is compared with.', value: `$${num(w.zecUsd, 2)}` },
          { href: '/savings', title: 'Investment calculator', desc: 'What buying every month would actually have returned.', value: '$100 a month' },
        ]}
      />
    </>
  );
}
