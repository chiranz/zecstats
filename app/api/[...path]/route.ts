import { NextResponse, type NextRequest } from 'next/server';
import { DATA_SOURCE, fetchUpstream, hasSnapshot, api } from '@/lib/data/core';

// Mirror of the live site's JSON API at the same paths (/api/daily-stats, /api/pool-balances, …).
// snapshot mode: serves data/api/<name>.json · live mode: proxies zecstats.com with a snapshot fallback.
// The response header x-zecstats-source says which one answered.

export async function GET(req: NextRequest, ctx: RouteContext<'/api/[...path]'>) {
  const { path } = await ctx.params;
  const name = path.join('/');
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(name)) return NextResponse.json({ error: 'bad route' }, { status: 400 });

  if (DATA_SOURCE === 'live') {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const up = await fetchUpstream(name, params);
    if (up.ok) return NextResponse.json(up.body, { headers: { 'x-zecstats-source': 'live', 'cache-control': 'public, max-age=30, s-maxage=60' } });
    if (!(await hasSnapshot(name))) return NextResponse.json({ error: `upstream unavailable: ${up.reason}` }, { status: 502 });
    return NextResponse.json(await api(name), { headers: { 'x-zecstats-source': `snapshot-fallback (${up.reason})` } });
  }

  if (!(await hasSnapshot(name))) return NextResponse.json({ error: `no snapshot for /api/${name}` }, { status: 404 });
  return NextResponse.json(await api(name), { headers: { 'x-zecstats-source': 'snapshot', 'cache-control': 'public, max-age=3600' } });
}
