import type { MetadataRoute } from 'next';
import { PAGES } from '@/lib/seo';
import { SITE } from '@/lib/site';

// Colours are the dark tokens in app/globals.css (--bg; the site opens dark).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — Zcash network statistics`,
    short_name: SITE.name,
    description: PAGES['/'].description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050a06',
    theme_color: '#050a06',
    categories: ['finance', 'utilities'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
