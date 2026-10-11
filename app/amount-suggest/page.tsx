import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Callout, More, Tiles } from '@/components/ui/blocks';
import { AmountLookup } from '@/components/privacy-tools/AmountLookup';
import { MoreCols, Prose } from '@/components/privacy-tools/parts';
import { getPrivacySuggestions, getShieldingHistogram, getWallOfShame } from '@/lib/data/privacy-tools';
import { getPools } from '@/lib/data/snapshot';
import { compact, num, pct } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Amount lookup',
  description: 'How often has a ZEC amount been shielded or deshielded? Check an amount before you send it, and find a nearby amount with a bigger crowd.',
};

export default async function AmountLookupPage({ searchParams }: PageProps<'/amount-suggest'>) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const initialAmount = one(sp.amount);
  const initialDir = one(sp.dir) === 'deshield' ? 'deshield' : 'shield';
  const [hist, ps, wall, pools] = await Promise.all([getShieldingHistogram(), getPrivacySuggestions(), getWallOfShame(), getPools()]);
  const buckets = hist.map((b) => ({ ...b, hi: Number.isFinite(b.hi) ? b.hi : null }));
  const rounds = ps.cols.map((c) => ({ dir: c.dir, items: c.buckets.flatMap((b) => b.items) }));
  const totalS = hist.reduce((a, b) => a + b.shield, 0), totalD = hist.reduce((a, b) => a + b.deshield, 0);

  return (
    <>
      <Masthead
        crumbs={[{ href: '/privacy', label: 'Privacy' }, { label: 'Amount lookup' }]}
        title="How common is your amount?"
        lede={<>Enter an amount you plan to shield or deshield. The more past transactions share it, the bigger the crowd you hide in — a rare amount can link both ends of your trip, as on the <Link href="/wall-of-shame">Wall of Shame</Link>.</>}
      />

      <AmountLookup initialAmount={initialAmount} initialDir={initialDir} buckets={buckets} rounds={rounds} />

      <Callout title="Heads up" tone="warn">
        This lookup is for illustration only — it is not security advice or a guarantee of privacy. The amount you enter is sent to the server to query the index and is not intentionally logged, but treat anything you send to a remote server as potentially observable, and don’t rely on this tool to keep a planned transaction secret.
      </Callout>

      <More summary="What the lookup counts">
        <MoreCols>
          <Prose>
            <p><b>Used</b> is how many past shielding (t→z) or deshielding (z→t) transactions moved that exact amount, at the precision the index rounds it to. <b>Matched</b> means the amount has been seen on both sides — a shield and a deshield of the same value — the correspondence the Wall of Shame looks for.</p>
            <p>The band chart counts every shield and deshield on record: {num(totalS)} shields and {num(totalD)} deshields across Sprout, Sapling, Orchard and Ironwood.</p>
          </Prose>
          <Prose>
            <p><b>Nearest round amounts</b> come from the Privacy tips ranking: how many of {compact(ps.shieldTx + ps.deshieldTx, 1)} past transactions cluster nearest each round amount, generated {ps.generated}.</p>
            <p>A popular amount helps only if you don’t pair it with a giveaway in timing: shielding 10 ZEC and deshielding 10 ZEC an hour later still links the two.</p>
          </Prose>
        </MoreCols>
      </More>

      <Tiles items={[
        { href: '/privacy-suggestions', title: 'Privacy tips', desc: 'The round amounts with the biggest crowd, by range.', value: <>{compact(ps.shieldTx + ps.deshieldTx, 1)} txs ranked</> },
        { href: '/wall-of-shame', title: 'Wall of Shame', desc: 'Round trips that reused a near-identical amount.', value: <>{num(wall.length)} incidents</> },
        { href: '/chart/anonymity', title: 'Shielded anonymity set', desc: 'How many coins you blend in with when deshielding.', value: <>{pct(pools.shieldedPct)} shielded</> },
        { href: '/chart/shielding-rate', title: 'Shielding rate', desc: 'How fast ZEC is moving into the shielded pools.', value: 'Daily, since 2016' },
      ]} />
    </>
  );
}
