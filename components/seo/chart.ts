import 'server-only';
import { cache } from 'react';
import { chartBySlug } from '@/lib/charts';
import { CHART_GROUPS, GROUP_SLUGS, type ChartData, type ChartGroupId } from '@/lib/charts/types';
import { getLiveCharts, liveTitle } from '@/lib/data/charts-a';
import { getFreshness } from '@/lib/data/snapshot';
import { dateLong } from '@/lib/format';
import { clipDescription } from '@/lib/seo';

// What search and sharing need from one chart: its def, its loaded data (null if the loader fails) and plain copy.
// Cached per request, so generateMetadata, the page's JSON-LD and the card share one load.

const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1');

export const chartSeo = cache(async (slug: string) => {
  const def = chartBySlug(slug);
  const gid = (Object.keys(GROUP_SLUGS) as ChartGroupId[]).find((g) => GROUP_SLUGS[g].includes(slug));
  const group = CHART_GROUPS.find((g) => g.id === gid);
  if (!def) {
    // a slug the live catalogue has but the redesign has not built: its live title and one-liner
    const live = (await getLiveCharts()).get(slug);
    const f = await getFreshness();
    return { def: null, data: null as ChartData | null, group, title: await liveTitle(slug), short: await liveTitle(slug), question: live?.d ?? '', description: clipDescription(live?.d ?? `${await liveTitle(slug)}, from ZEC Stats.`), dataThrough: f.dataThrough };
  }
  let data: ChartData | null = null;
  try { data = await def.load(); } catch { data = null; }
  const dataThrough = data?.dataThrough ?? (await getFreshness()).dataThrough;
  const h = data?.headline;
  // "<question> <takeaway sentence>"; when that is over 160 characters, "<question> <label>: <value> on <date>.", then shorter
  const sentence = h ? plain(h.sentence) : '';
  const fits = (x: string) => x.length <= 160;
  const options = [
    `${def.question} ${sentence}`.trim(),
    h?.value && /\d/.test(h.value) ? `${def.question} ${h.label}: ${h.value} on ${dateLong(h.date || dataThrough)}.` : '',
    `${def.question} ${def.sourceNote}. Data through ${dateLong(dataThrough)}.`,
    `${def.question} Data through ${dateLong(dataThrough)}.`,
  ].filter(Boolean);
  const description = options.find(fits) ?? options[0];
  return { def, data, group, title: def.title, short: def.short, question: def.question, description: clipDescription(description), dataThrough };
});
