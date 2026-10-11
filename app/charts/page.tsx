import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { ChartsIndex, type IndexItem, type UnitKind } from '@/components/chart-page/ChartsIndex';
import { groupOf, safeLoad } from '@/components/chart-page/ChartPage';
import type { ValueFormat } from '@/components/charts/valueFormat';
import { CHARTS, ALL_SLUGS } from '@/lib/charts';
import { CHART_GROUPS, VS_BTC, type ChartGroupId } from '@/lib/charts/types';
import { getLiveCharts, liveTitle } from '@/lib/data/charts-a';
import { dateLong } from '@/lib/format';

export const metadata: Metadata = {
  title: `All ${ALL_SLUGS.length} Zcash charts`,
  description: 'Every ZEC Stats chart, grouped by the question it answers: price, cost basis, privacy, usage, holders, supply and markets.',
};

const SYNONYMS: Record<string, string> = {
  'orchard-internal': 'z-to-z ztoz fully shielded internal',
  'realized-all': 'cost basis realised',
  realized: 'cost basis realised',
  'cost-basis': 'cost basis acquisition',
  mvrv: 'cost basis profit market value realized value',
  anonymity: 'anonymity set privacy crowd',
  pools: 'shielded supply sapling orchard ironwood sprout',
  'shielding-rate': 'shielded percent privacy adoption',
  'flow-compare': 'net flows migration turnstile',
  hashrate: 'mining difficulty security',
  'total-fees': 'fees fee revenue',
  fees: 'fee distribution',
  price: 'usd zec price',
  'zec-btc-ratio': 'bitcoin btc ratio',
};

function unitOf(f: ValueFormat | undefined): UnitKind | undefined {
  if (!f) return undefined;
  if (f.startsWith('usd')) return 'USD';
  if (f.startsWith('zec')) return 'ZEC';
  if (f.startsWith('pct')) return '%';
  if (f === 'ratio' || f === 'ratio5' || f === 'x' || f === 'btc') return 'Ratio';
  return 'Count';
}

const FEAT_COLOR: Partial<Record<ChartGroupId, string>> = { privacy: 'var(--p-ironwood)', costbasis: 'var(--zec)' };

export default async function ChartsPage() {
  const live = await getLiveCharts();
  const items: IndexItem[] = await Promise.all(
    ALL_SLUGS.map(async (slug): Promise<IndexItem> => {
      const def = CHARTS.find((c) => c.slug === slug);
      const l = live.get(slug);
      const group = groupOf(slug)!;
      const base = { slug, group, vsBtc: VS_BTC.includes(slug) };
      if (!def) {
        return { ...base, title: await liveTitle(slug), built: false, value: '—', spark: [], ext: false, pools: [], keywords: `${l?.d ?? ''} ${SYNONYMS[slug] ?? ''}` };
      }
      const data = await safeLoad(def);
      const ts = data?.panels.find((p) => p.kind === 'timeseries');
      const value = data ? data.indexValue ?? data.headline.value : '—';
      return {
        ...base,
        title: def.short,
        built: !!data,
        value,
        spark: data?.spark ?? [],
        ext: def.source === 'external',
        source: def.source,
        unit: unitOf(ts && ts.kind === 'timeseries' ? ts.format : undefined),
        pools: def.pools ?? [],
        keywords: `${def.title} ${def.question} ${l?.t ?? ''} ${l?.d ?? ''} ${SYNONYMS[slug] ?? ''}`,
        feat: data ? { value: data.headline.value, change: data.headline.change ?? null, caption: `${data.headline.label} · ${dateLong(data.headline.date)}`, color: FEAT_COLOR[group] ?? 'var(--zec)', descriptor: data.indexValue && data.indexValue !== data.headline.value ? data.indexValue : undefined } : undefined,
      };
    }),
  );
  return (
    <>
      <Masthead title={`All ${ALL_SLUGS.length} Zcash charts`} lede="Grouped by the question they answer. Every chart has a permalink, CSV and PNG." />
      <ChartsIndex items={items} groups={CHART_GROUPS} />
    </>
  );
}
