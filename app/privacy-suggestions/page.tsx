import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Callout, Card, Kpi, KpiBand, More, Section, Table, Tiles } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import { HBars, MoreCols, Prose, ui } from '@/components/privacy-tools/parts';
import { getPrivacySuggestions, getShieldHops, getWallOfShame, type PsColumn } from '@/lib/data/privacy-tools';
import { getPools } from '@/lib/data/snapshot';
import { compact, dateLong, num, pct, zat } from '@/lib/format';
import { ramt, zamt } from '@/components/privacy-tools/fmt';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'Privacy tips',
  description: 'Which round ZEC amounts have the biggest crowd to hide in when you shield or deshield — ranked from 1.6 million past transactions.',
};

const DIR_LABEL = { shield: 'Shielding · t→z', deshield: 'Deshielding · z→t' } as const;
const amt = (a: number) => `${ramt(a)} ZEC`;

function Column({ col, total }: { col: PsColumn; total: number }) {
  return (
    <Card
      title={DIR_LABEL[col.dir]}
      takeaway={<>Ranked by how many of {num(total)} past {col.dir === 'shield' ? 'shields' : 'deshields'} sit nearest each round amount. Bars compare amounts <b>within</b> a range.</>}
    >
      <div className={s.groups}>
        {col.buckets.map((b) => {
          const sum = b.items.reduce((a, [, c]) => a + c, 0);
          return (
            <div key={b.range} className={s.group}>
              <div className={s.gh}>{b.range}<span>{num(sum)} txs</span></div>
              <HBars
                label={`${DIR_LABEL[col.dir]}, ${b.range}`}
                items={b.items.map(([a, c], i) => ({ key: String(a), label: amt(a), value: c, text: num(c), strong: i === 0, color: i === 0 ? 'var(--accent)' : 'var(--s2)' }))}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type Recent = { date: string; amount: number; rounded: number | null };
function RecentTable({ col }: { col: PsColumn }) {
  const rows: Recent[] = col.recent.map(([date, amount, rounded]) => ({ date, amount, rounded }));
  const near = rows.filter((r) => r.rounded && Math.abs(r.amount - r.rounded) / r.rounded < 0.01).length;
  return (
    <Card
      title={`What did the last ${rows.length} ${col.dir === 'shield' ? 'shields' : 'deshields'} use?`}
      takeaway={<>Only <b>{near} of {rows.length}</b> landed within 1% of a round amount; the rest are distinctive.</>}
      foot="Nearest round amount from the ranked lists above · “—” = below 0.01 ZEC or above 10,000 ZEC, no round amount to compare"
    >
      <div className={s.recent}>
        <Table<Recent>
          caption={`Most recent ${col.dir} amounts`}
          rowKey={(r, i) => `${r.date}-${i}`}
          cols={[
            { key: 'd', label: 'Date', render: (r) => dateLong(r.date) },
            { key: 'a', label: 'Amount', render: (r) => `${ramt(r.amount)} ZEC` },
            { key: 'r', label: 'Nearest round', render: (r) => (r.rounded == null ? <span className="muted">—</span> : `${ramt(r.rounded)} ZEC`) },
            { key: 'o', label: 'Off by', render: (r) => (r.rounded == null ? <span className="muted">—</span> : pct((Math.abs(r.amount - r.rounded) / r.rounded) * 100, 1)) },
          ]}
          rows={rows}
        />
      </div>
    </Card>
  );
}

export default async function PrivacyTipsPage() {
  const [ps, wall, hops, pools] = await Promise.all([getPrivacySuggestions(), getWallOfShame(), getShieldHops(), getPools()]);
  const [sh, de] = [ps.cols.find((c) => c.dir === 'shield')!, ps.cols.find((c) => c.dir === 'deshield')!];
  const topOf = (c: PsColumn) => c.buckets.flatMap((b) => b.items).reduce((a, x) => (x[1] > a[1] ? x : a));
  const [topS, topD] = [topOf(sh), topOf(de)];
  const picks = sh.buckets.map((b, i) => ({ range: b.range, s: b.items[0], d: de.buckets[i]?.items[0] }));
  const headline = picks.slice(0, 4).map((p) => ramt(p.s[0]));

  return (
    <>
      <Masthead
        crumbs={[{ href: '/privacy', label: 'Privacy' }, { label: 'Privacy tips' }]}
        title="Which ZEC amounts blend in best?"
        lede={<>Shield and deshield in common round amounts — <b className="value">{headline.slice(0, -1).join(', ')} or {headline.at(-1)} ZEC</b> — and you hide among tens of thousands of identical transactions. A distinctive amount fingerprints you: the inverse of the <Link href="/wall-of-shame">Wall of Shame</Link>.</>}
      />

      <section className="hero" aria-labelledby="h-best">
        <div className={ui.heroSplit}>
          <div className="stack" style={{ gap: 12 }}>
            <span className={ui.heroK}>Most-used shielding amount · all time</span>
            <h2 className={ui.heroLead} id="h-best">The biggest crowd to shield into is</h2>
            <div className="figure">{ramt(topS[0])}<small>ZEC</small></div>
            <p className="note" style={{ fontSize: 15 }}>
              <b className="value">{num(topS[1])}</b> past shields sit nearest {ramt(topS[0])} ZEC. On the way out, <b className="value">{ramt(topD[0])} ZEC</b> leads with {num(topD[1])} deshields. Pick the best amount in your range, and don’t take the same amount back out a few hours later.
            </p>
          </div>
          <table className={s.best}>
            <caption className="sr-only">Best round amount per range, shielding and deshielding</caption>
            <thead><tr><th scope="col">Range</th><th scope="col">Best to shield</th><th scope="col">Best to deshield</th></tr></thead>
            <tbody>
              {picks.map((p) => (
                <tr key={p.range}>
                  <td className={s.range}>{p.range}</td>
                  <td><b>{ramt(p.s[0])}</b><span>{compact(p.s[1], 1)}</span></td>
                  <td>{p.d ? <><b>{ramt(p.d[0])}</b><span>{compact(p.d[1], 1)}</span></> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <KpiBand label="Index">
        <Kpi k="Shields analysed" v={num(ps.shieldTx)} s="transparent → shielded" />
        <Kpi k="Deshields analysed" v={num(ps.deshieldTx)} s="shielded → transparent" />
        <Kpi k="Top shield amount" v={ramt(topS[0])} unit="ZEC" s={`${num(topS[1])} nearby shields`} />
        <Kpi k="Top deshield amount" v={ramt(topD[0])} unit="ZEC" s={`${num(topD[1])} nearby deshields`} />
      </KpiBand>

      <Card>
        <form action="/amount-suggest" method="get" className={s.check} aria-label="Look up a specific amount">
          <div className={s.fld}>
            <label htmlFor="ps-amt">Amount in ZEC</label>
            <input id="ps-amt" name="amount" type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 12.5" required />
          </div>
          <div className={s.fld}>
            <label htmlFor="ps-dir">Direction</label>
            <select id="ps-dir" name="dir" defaultValue="shield"><option value="shield">Shield (t→z)</option><option value="deshield">Deshield (z→t)</option></select>
          </div>
          <button className="btn primary" type="submit">Check this amount <Icon name="arrow-right" size={13} /></button>
          <p className="small" style={{ flex: '1 1 260px' }}>Have an amount in mind? The amount lookup shows how often it has been used and which nearby amounts have more cover.</p>
        </form>
      </Card>

      <Section id="ranked" title="How many people use each round amount?">
        <div className="grid2">
          <Column col={sh} total={ps.shieldTx} />
          <Column col={de} total={ps.deshieldTx} />
        </div>
      </Section>

      <Section id="recent" title="Do people actually use round amounts?">
        <div className="grid2">
          <RecentTable col={sh} />
          <RecentTable col={de} />
        </div>
      </Section>

      <Callout title="Round amounts are not the whole story">
        Best practice is still to avoid quickly round-tripping the same amount you moved in: a 10 ZEC shield followed an hour later by a 10 ZEC deshield links the two ends by timing alone. Leave value shielded, and spend it from the shielded pool where you can.
      </Callout>

      <More summary="How the ranking is built">
        <MoreCols>
          <Prose>
            <p>For each magnitude range, round amounts are ranked by how many past shielding or deshielding transactions <b>cluster nearest to them</b>. A higher count means more transactions that look the same to an observer — a bigger anonymity set for you.</p>
            <p>Bars are scaled within each range, so the 1,000–10,000 ZEC list is readable even though it holds far fewer transactions than the 1–10 ZEC list.</p>
          </Prose>
          <Prose>
            <p>Generated {ps.generated} from {num(ps.shieldTx)} shielding + {num(ps.deshieldTx)} deshielding transactions. The same lists are published as JSON at <span className="mono">/privacy-suggestions.json</span>.</p>
            <p>This is guidance from aggregate counts, not a privacy guarantee: timing, address reuse and wallet behaviour can still link transactions.</p>
          </Prose>
        </MoreCols>
      </More>

      <Tiles items={[
        { href: '/amount-suggest', title: 'Amount lookup', desc: 'Check any amount before you send it.', value: 'Any amount' },
        { href: '/wall-of-shame', title: 'Wall of Shame', desc: 'Round trips that reused a near-identical amount.', value: <>{num(wall.length)} incidents</> },
        { href: '/chart/anonymity', title: 'Shielded anonymity set', desc: 'How many coins you blend in with when deshielding.', value: <>{pct(pools.shieldedPct)} shielded</> },
        { href: '/shield-hops', title: 'Shield-bound hops', desc: 'How much ZEC moves when a coin goes shielded.', value: <>Typical {zamt(zat(hops.summary[hops.class]?.median_of_daily_medians_zat ?? 0))} ZEC</> },
      ]} />
    </>
  );
}
