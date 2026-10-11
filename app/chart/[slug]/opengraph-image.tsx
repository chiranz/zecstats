import { chartSeo } from '@/components/seo/chart';
import { changeDelta, chartCard, OG_SIZE, OG_TYPE } from '@/components/seo/og';
import { ALL_SLUGS } from '@/lib/charts';

// One card per chart, all 58 rendered at build time.
export const alt = 'ZEC Stats chart card: the question the chart answers, its latest figure and its recent trend';
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_SLUGS.map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await chartSeo(slug);
  const h = c.data?.headline;
  return chartCard({
    kicker: c.group ? `Charts · ${c.group.title}` : 'Charts',
    path: `/chart/${slug}`,
    title: c.title,
    question: c.question || c.title,
    value: h?.value,
    delta: changeDelta(h?.change),
    spark: c.data?.spark,
    dataThrough: c.dataThrough,
  });
}
