import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ALL_SLUGS } from '@/lib/charts';
import type { TimeSeriesPanel } from '@/lib/charts/types';
import { breadcrumbLd, buildMetadata, chartCrumbs, datasetLd } from '@/lib/seo';
import { chartSeo } from '@/components/seo/chart';
import { JsonLd } from '@/components/seo/JsonLd';
import { ChartPage } from '@/components/chart-page/ChartPage';

// One template renders every ChartDef (lib/charts/registry-a.ts + registry-b.ts). Unknown slugs 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/chart/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  if (!ALL_SLUGS.includes(slug)) return {};
  const c = await chartSeo(slug);
  // the card comes from ./opengraph-image.tsx, so `images` stays unset
  return buildMetadata({ path: `/chart/${slug}`, title: c.title, description: c.description, ownImage: true });
}

export default async function Page({ params }: PageProps<'/chart/[slug]'>) {
  const { slug } = await params;
  if (!ALL_SLUGS.includes(slug)) notFound();
  const c = await chartSeo(slug);
  const ts = c.data?.panels.find((p): p is TimeSeriesPanel => p.kind === 'timeseries');
  const dataset = datasetLd({
    slug,
    name: c.title,
    description: c.description,
    keywords: ['Zcash', 'ZEC', ...(c.group ? [c.group.title] : []), c.short],
    api: c.def?.api ?? [],
    measured: { name: c.short, unit: c.def?.unit },
    firstDate: ts?.dates[0],
    lastDate: c.data?.dataThrough,
  });
  return (
    <>
      <JsonLd data={[dataset, breadcrumbLd(chartCrumbs(slug, c.short))]} />
      <ChartPage slug={slug} />
    </>
  );
}
