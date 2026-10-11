import { chartSeo } from '@/components/seo/chart';
import { changeDelta, chartCard, OG_SIZE, OG_TYPE, type OgDelta } from '@/components/seo/og';
import { delta } from '@/lib/format';
import { ALL_SLUGS } from '@/lib/charts';

// One card per chart, every one rendered at build time.
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
  // a share's change is in points, which the shared helper doesn't know
  const pts = h?.change?.pts ? delta(h.change.pct, 2, ' pts') : null;
  const d: OgDelta | undefined = pts ? { text: `${pts.text} vs ${h!.change!.days} days earlier`, dir: pts.dir } : changeDelta(h?.change);
  return chartCard({
    kicker: c.group ? `Charts · ${c.group.title}` : 'Charts',
    path: `/chart/${slug}`,
    title: c.title,
    question: c.question || c.title,
    value: h?.value,
    delta: d,
    spark: c.data?.spark,
    dataThrough: c.dataThrough,
  });
}
