import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Tiles } from '@/components/ui/blocks';
import { HopsReport } from '@/components/reports/HopsReport';
import { HOP_CLASSES, HOP_RANGES, type HopClass } from '@/components/reports/views';
import { ParamNote } from '@/components/reports/LinkSeg';
import { one, pick } from '@/components/reports/params';
import { MoreCols, Prose } from '@/components/privacy-tools/parts';
import { zamt } from '@/components/privacy-tools/fmt';
import { getActivity, getPrivacySuggestions, getShieldHops, getWallOfShame, type ShieldHops } from '@/lib/data/privacy-tools';
import { api, DATA_SOURCE } from '@/lib/data/core';
import { compact, num, zat } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Shield-bound hops',
  description: 'How much ZEC moves at a time when a transparent coin goes shielded: the median hop, its spread, and how much of it is one automated process.',
};

export default async function ShieldHopsPage({ searchParams }: PageProps<'/shield-hops'>) {
  // live's params: ?class=all|single|sweep (default single) &days=90|365|1200|4000 (default 365) &repeat=drop|keep
  const sp = await searchParams;
  const cls = pick(one(sp.class), HOP_CLASSES.map((c) => c[0]), 'single') as HopClass;
  const days = Number(pick(one(sp.days), HOP_RANGES.map((r) => String(r[0])), '365'));
  const repeat = one(sp.repeat) === 'drop' ? 'drop' : 'keep';
  const live = DATA_SOURCE === 'live';
  const [hops, act, ps, wall] = await Promise.all([live ? api<ShieldHops>('shield-hops', { class: cls, days, repeat }) : getShieldHops(), getActivity(), getPrivacySuggestions(), getWallOfShame()]);
  // the view that came back (the only one there is, unless the data source is live)
  const label = (c: string, r: string) => `${HOP_CLASSES.find((x) => x[0] === c)?.[1] ?? c}${r === 'drop' ? ', repeated amount dropped' : ''}`;
  const unmet = hops.class !== cls || hops.repeat !== repeat;
  const sum = hops.summary[hops.class];
  const med = zat(sum.median_of_daily_medians_zat), mean = zat(sum.mean_zat);
  const savings = act.buckets.shielded_savings.last_7d;

  return (
    <>
      <Masthead
        title="How much ZEC moves when a coin goes shielded?"
        lede={<>Usually not much: the median shield-bound hop is <b className="value">{zamt(med)} ZEC</b>. The mean is {zamt(mean)} ZEC, {num(mean / med, 0)}× higher, because a handful of very large hops pull the average up.</>}
      />

      {unmet && <ParamNote>The “{label(cls, repeat)}” view isn’t available yet — showing “{label(hops.class, hops.repeat)}”.</ParamNote>}
      <HopsReport initial={hops} fixed={!live} initialDays={days} />

      <More summary="What this measures, and what it cannot">
        <MoreCols>
          <Prose>
            <p>A <b>shield-bound transparent hop</b> is one transparent coin that arrived, sat for a while, and was then spent by a transaction that shielded it. Because a coin is spent exactly once, that is the whole story of that coin: it landed in the open, and the next thing that happened to it was going private. This page asks how big those hops are — not how many ZEC moved in total, but how much moved at a time.</p>
            <p><b>Chain shape only — no address data.</b> A hop is identified by what happened to a coin, not by who held it. “An exchange withdrawal being made private” is a reasonable guess, but a coin arriving transparent and leaving shielded is equally consistent with a holder tidying their own wallet, a payment put away, or a service moving its own float.</p>
          </Prose>
          <Prose>
            <p><b>Sweeps</b> are hops whose spending transaction was sweep-shaped (≥15 inputs, ≤2 outputs) — the signature of something automated gathering many coins at once. <b>The repeated amount</b> is the single exact size that occurred most often that day; dropping it removes a payout robot a sweep filter can miss. On 10 Sep 2026, 8,000 of that day’s 10,614 hops were one weekly process paying exactly 0.125 ZEC. Each combination is computed separately, per day, because a median of what is left is not a function of the median of everything.</p>
            <p><b>The unit is a coin</b>, not a person and not a transaction: one shielding transaction can spend many transparent outputs. A percentile of several days pooled together is not recoverable from per-day summaries, so the range figure is the <b>median of the daily medians</b> — the typical day’s typical hop. Counts and totals are plain sums and are exact. Direction is not observable either: the page says moved, never bought or sold.</p>
          </Prose>
        </MoreCols>
      </More>

      <Tiles items={[
        { href: '/activity', title: 'Transparent activity', desc: 'Where transparent ZEC goes, and who holds it.', value: <>{compact(zat(savings.value_zat), 1)} ZEC to savings, 7d</> },
        { href: '/tx-sizes', title: 'Transaction sizes', desc: 'How big a transparent transaction is.', value: 'Median, p90, p99' },
        { href: '/privacy-suggestions', title: 'Privacy tips', desc: 'Round amounts with the biggest crowd to hide in.', value: <>{compact(ps.shieldTx + ps.deshieldTx, 1)} txs ranked</> },
        { href: '/wall-of-shame', title: 'Wall of Shame', desc: 'Round trips that reused a near-identical amount.', value: <>{num(wall.length)} incidents</> },
      ]} />
    </>
  );
}
