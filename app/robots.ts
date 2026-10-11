import type { MetadataRoute } from 'next';
import { INDEXABLE, SITE_URL } from '@/lib/seo';

// Crawl everything people read; keep crawlers out of the JSON mirror, the internal design previews and the live site's
// `tf=` query variants (a parameter its robots.txt already blocks and this site never reads).
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/design/', '/*?tf=', '/*&tf='] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
