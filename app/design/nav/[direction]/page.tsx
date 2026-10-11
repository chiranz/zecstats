import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DirectionView } from '@/components/navlab/DirectionView';
import { getNavLabData } from '@/components/navlab/data';
import { DIRECTIONS, type DirId } from '@/components/navlab/meta';

// Design preview only: five navigation directions, one route each. Not linked from the site, not indexed.
export const dynamicParams = false;
export function generateStaticParams() {
  return DIRECTIONS.map((d) => ({ direction: d.id }));
}

export async function generateMetadata({ params }: PageProps<'/design/nav/[direction]'>): Promise<Metadata> {
  const { direction } = await params;
  const d = DIRECTIONS.find((x) => x.id === direction);
  return { title: d ? `Nav lab ${d.id.toUpperCase()}: ${d.name}` : 'Nav lab', robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps<'/design/nav/[direction]'>) {
  const { direction } = await params;
  if (!DIRECTIONS.some((d) => d.id === direction)) notFound();
  return <DirectionView id={direction as DirId} data={await getNavLabData()} />;
}
