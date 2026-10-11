import { OG_SIZE, OG_TYPE, progressCard } from '@/components/seo/og';
import { getIronwood } from '@/lib/data/ironwood';
import { getFreshness } from '@/lib/data/snapshot';
import { num } from '@/lib/format';

export const alt = 'ZEC Stats: how much of Orchard has crossed into Ironwood, with the share crossed and a progress bar';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image() {
  const [iw, f] = await Promise.all([getIronwood(), getFreshness()]);
  // as the event tape: Orchard coins crossed in the last 7 complete days, in points of the activation balance
  const migr7 = (iw.days.filter((d) => d.complete).slice(-7).reduce((a, d) => a + d.orchard, 0) / iw.base) * 100;
  return progressCard({
    kicker: 'Privacy · Ironwood',
    path: '/ironwood',
    question: 'How much of Orchard has crossed into Ironwood?',
    value: `${num(iw.pct, 2)}%`,
    pct: iw.pct,
    delta: { text: `▲ ${num(migr7, 2)} pts in 7 days`, dir: 'up' },
    answer: `of Orchard's coins, in ${iw.liveDays} days. ${num(iw.orchardNow)} ZEC are still in Orchard, yet to cross.`,
    dataThrough: f.dataThrough,
  });
}
