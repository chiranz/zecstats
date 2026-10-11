import { NextResponse } from 'next/server';
import { api, DATA_SOURCE } from '@/lib/data/core';

// Public export the /privacy-suggestions page links ("JSON API"), at the live site's path. Same body as
// /api/privacy-suggestions, read through the data seam; cache headers match app/api/[...path]/route.ts.

export async function GET() {
  return NextResponse.json(await api('privacy-suggestions'), {
    headers: { 'cache-control': DATA_SOURCE === 'live' ? 'public, max-age=30, s-maxage=60' : 'public, max-age=3600' },
  });
}
