import { OG_POOL_COLOR, OG_SIZE, OG_TYPE, shareCard } from '@/components/seo/og';
import { getPrivacy } from '@/lib/data/privacy';
import { POOL_LABEL, POOLS } from '@/lib/data/snapshot';
import { num } from '@/lib/format';

export const alt = 'ZEC Stats: how private Zcash is right now — the shielded share of supply and how the pools split it';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image() {
  const pv = await getPrivacy();
  const pts = pv.now.shieldedPct - pv.yearAgo.shieldedPct;
  const iwShare = (pv.now.ironwood / pv.now.shielded) * 100;
  return shareCard({
    kicker: 'Privacy',
    path: '/privacy',
    question: 'How private is Zcash right now?',
    value: `${num(pv.now.shieldedPct, 1)}%`,
    delta: { text: `${pts >= 0 ? '▲' : '▼'} ${num(Math.abs(pts), 1)} pts in a year`, dir: pts >= 0 ? 'up' : 'dn' },
    answer: `of all ZEC is shielded. ${num(iwShare, 0)}% of shielded ZEC is now in Ironwood.`,
    parts: POOLS.map((p) => ({ label: POOL_LABEL[p], value: pv.now[p], color: OG_POOL_COLOR[p] })),
    total: pv.now.supply,
    dataThrough: pv.dataThrough,
  });
}
