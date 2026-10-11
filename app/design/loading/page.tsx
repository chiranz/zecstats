import type { Metadata } from 'next';
import { RouteSkeleton } from '@/components/skeleton/RouteSkeleton';
import { SHAPES, shapeFor } from '@/components/skeleton/shape';

export const metadata: Metadata = { title: 'Loading state', robots: { index: false, follow: false } };

// Design preview, not linked from the site: /design/loading?shape=chart (or ?path=/chart/pools, the shape that route
// gets) shows a loading skeleton on its own, so it can be compared with the real page (scripts/skeleton-compare.mjs
// swaps it into the real page's <main>).
export default async function Page({ searchParams }: PageProps<'/design/loading'>) {
  const { shape: q, path } = await searchParams;
  const shape = typeof path === 'string' ? shapeFor(path) : SHAPES.find((x) => x === q) ?? 'default';
  return <RouteSkeleton shape={shape} />;
}
