import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Tiles } from '@/components/ui/blocks';
import { Correlate } from '@/components/tools/Correlate';
import { CORR_DEFAULTS, getCorrelations, metricId, pairIndex } from '@/lib/data/tools';
import { num } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

const rTxt = (r: number | null) => (r == null ? '—' : `${r < 0 ? '−' : ''}${num(Math.abs(r), 2)}`);

export const metadata: Metadata = pageMetadata('/correlate');

export default async function CorrelatePage() {
  const data = await getCorrelations();
  const M = data.metrics.length;
  const at = (a: string, b: string) => {
    const i = data.metrics.findIndex((m) => m.id === metricId(a)), j = data.metrics.findIndex((m) => m.id === metricId(b));
    return data.windows['1Y'].r[pairIndex(i, j, M)];
  };
  const priceTx = at('ZEC Price', 'Transactions / Day');
  const priceShield = at('ZEC Price', 'Shielded Supply');
  return (
    <>
      <SectionLd path="/correlate" />
      <Masthead
        title="Which Zcash metrics move together?"
        lede={<>Every pair of metrics, scored from −1 (opposite) to +1 (together). Over the last year ZEC&apos;s price tracked transactions per day at r {rTxt(priceTx)} and shielded supply at r {rTxt(priceShield)}. Pick any cell for its scatter.</>}
      />
      <Correlate data={data} defaults={CORR_DEFAULTS} />
      <More summary="How to read it">
        <p><b>Each pair appears once.</b> Correlation is symmetric — A against B is the same number as B against A — so the grid shows only the lower half instead of every value twice.</p>
        <p><b>r, not r².</b> The signed r is printed in every cell, and the colour (blue together, orange opposite) only repeats it, so nothing depends on telling hues apart.</p>
        <p><b>The forward price metrics</b> (ZEC price 30 or 90 days later) are the price shifted back in time. Correlating a metric against them hints at whether it led the price — over this history, not as a rule.</p>
        <p><b>Trends inflate r.</b> Two series that both grew over the years will correlate strongly even if their day-to-day moves are unrelated. Shorter windows are a useful check. Correlation is not causation.</p>
      </More>
      <Tiles
        items={[
          { href: '/compare', title: 'Compare charts', desc: 'Put the two metrics of a pair on one time range, one above the other.', value: 'Any 2–6 charts' },
          { href: '/metrics', title: 'Metrics table', desc: 'Every metric in this grid, with its 28-day and 12-month change.', value: `${M - 2} metrics` },
          { href: '/chart/price', title: 'ZEC price', desc: 'The series most pairs are measured against.', value: 'Daily close' },
          { href: '/chart/tx', title: 'Transactions per day', desc: 'On-chain use, the other side of the price-activity question.', value: '7-day average' },
        ]}
      />
    </>
  );
}
