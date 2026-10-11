import { breadcrumbLd, sectionCrumbs } from '@/lib/seo';
import { JsonLd } from './JsonLd';

/** BreadcrumbList for a Privacy or Tools page, matching its context bar. Renders nothing where the bar has no trail. */
export function SectionLd({ path }: { path: string }) {
  const crumbs = sectionCrumbs(path);
  return crumbs ? <JsonLd data={breadcrumbLd(crumbs)} /> : null;
}
