import { chartSeo } from '@/components/seo/chart';
import { changeDelta, defaultCard, OG_SIZE, OG_TYPE } from '@/components/seo/og';
import { getIronwood } from '@/lib/data/ironwood';
import { getPrivacy } from '@/lib/data/privacy';
import { getFreshness } from '@/lib/data/snapshot';
import { num } from '@/lib/format';

// The default social card: every page without its own card (built once, at build time).
export const alt = 'ZEC Stats — every Zcash number, from our own node: ZEC price, shielded share and Ironwood progress';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image() {
  const [price, pv, iw, f] = await Promise.all([chartSeo('price'), getPrivacy(), getIronwood(), getFreshness()]);
  const h = price.data?.headline;
  const shPts = pv.now.shieldedPct - pv.yearAgo.shieldedPct;
  // as the event tape: Orchard coins crossed in the last 7 complete days, in points of the activation balance
  const migr7 = (iw.days.filter((d) => d.complete).slice(-7).reduce((a, d) => a + d.orchard, 0) / iw.base) * 100;
  return defaultCard({
    dataThrough: f.dataThrough,
    kpis: [
      { label: 'ZEC price', value: h?.value ?? '—', delta: changeDelta(h?.change, true) },
      { label: 'Shielded', value: `${num(pv.now.shieldedPct, 1)}%`, delta: { text: `${shPts >= 0 ? '▲' : '▼'} ${num(Math.abs(shPts), 1)} pts in a year`, dir: shPts >= 0 ? 'up' : 'dn' } },
      { label: 'Ironwood', value: `${num(iw.pct, 2)}%`, accent: true, delta: { text: `▲ ${num(migr7, 2)} pts in 7 days`, dir: 'up' } },
    ],
  });
}
