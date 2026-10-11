import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ALL_SLUGS, chartBySlug } from '@/lib/charts';
import { getLiveCharts, liveTitle } from '@/lib/data/charts-a';
import { ChartPage } from '@/components/chart-page/ChartPage';

// One template renders every ChartDef (lib/charts/registry-a.ts + registry-b.ts). Unknown slugs 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/chart/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  if (!ALL_SLUGS.includes(slug)) return {};
  const def = chartBySlug(slug);
  const title = def?.title ?? (await liveTitle(slug));
  const description = def ? `${def.question} ${def.sourceNote}.` : (await getLiveCharts()).get(slug)?.d;
  return { title, description, alternates: { canonical: `/chart/${slug}` }, openGraph: { title: `${title} — ZEC Stats`, description } };
}

export default async function Page({ params }: PageProps<'/chart/[slug]'>) {
  const { slug } = await params;
  if (!ALL_SLUGS.includes(slug)) notFound();
  return <ChartPage slug={slug} />;
}
