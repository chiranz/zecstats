import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, More, Tiles } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { HBars, MoreCols, Prose, poolColor, ui } from '@/components/privacy-tools/parts';
import { WallTable } from '@/components/privacy-tools/WallTable';
import { getPrivacySuggestions, getWallOfShame } from '@/lib/data/privacy-tools';
import { getInflation } from '@/lib/data/turnstile';
import { getFreshness, getPools } from '@/lib/data/snapshot';
import { compact, dateLong, iso, num, pct, usd } from '@/lib/format';
import s from './page.module.css';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/wall-of-shame');

const DAY = 86400000;
const weekStart = (ms: number) => { const d = new Date(ms); const dow = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow); };

export default async function WallOfShamePage() {
  const [rows, f, ps, pools, inf] = await Promise.all([getWallOfShame(), getFreshness(), getPrivacySuggestions(), getPools(), getInflation()]);
  const n = rows.length;
  const by = (m: string) => rows.filter((r) => r.match === m).length;
  const asOf = Date.parse(f.capturedAt);

  // incidents per week (Monday start), from the first listed incident to the snapshot week
  const counts = new Map<number, number>();
  rows.forEach((r) => { const w = weekStart(r.shieldTs * 1000); counts.set(w, (counts.get(w) ?? 0) + 1); });
  const first = Math.min(...counts.keys()), lastW = weekStart(asOf);
  const dates: string[] = [], vals: number[] = [];
  for (let w = first; w <= lastW; w += 7 * DAY) { dates.push(iso(new Date(w))); vals.push(counts.get(w) ?? 0); }
  const yearAgo = lastW - 52 * 7 * DAY;
  let peakW = 0, peakN = 0;
  counts.forEach((c, w) => { if (w >= yearAgo && c > peakN) { peakN = c; peakW = w; } });
  const latest = rows.reduce((a, r) => (r.shieldTs > a.shieldTs ? r : a), rows[0]);
  const last90 = rows.filter((r) => r.shieldTs * 1000 >= asOf - 90 * DAY).length;

  // pool routes
  const routeCount = new Map<string, { from: string; to: string; n: number }>();
  rows.forEach((r) => { const k = `${r.from}→${r.to}`; const c = routeCount.get(k) ?? { from: r.from, to: r.to, n: 0 }; c.n++; routeCount.set(k, c); });
  const routes = [...routeCount.values()].sort((a, b) => b.n - a.n);
  const top = routes[0];

  const minUsd = Math.min(...rows.map((r) => Math.min(r.usdIn, r.usdOut)));
  const totalUsd = rows.reduce((a, r) => a + r.usdIn, 0);
  const shieldCol = ps.cols.find((c) => c.dir === 'shield')!;
  const popular = shieldCol.buckets.slice(0, 3).map((b) => b.items[0][0]);

  return (
    <>
      <SectionLd path="/wall-of-shame" />
      <Masthead
        title="Wall of Shame"
        lede={<>Shield-and-deshield round trips that reused a near-identical amount — <b className="num value">{num(n)}</b> found so far. Each one lets an observer link the transparent addresses on both sides of the shielded pool.</>}
      />

      <KpiBand label="Summary">
        <Kpi k="Incidents" v={num(n)} s="round trips within 7 days, worth $1,000+" />
        <Kpi k="Matched in ZEC" v={num(by('zec'))} s={`${pct((by('zec') / n) * 100, 0)} · same ZEC amount, within 0.5%`} />
        <Kpi k="Matched in USD" v={num(by('usd'))} s={`${pct((by('usd') / n) * 100, 0)} · same dollar value, within 0.5%`} />
        <Kpi k="Matched in both" v={num(by('both'))} s={`${pct((by('both') / n) * 100, 0)} · ZEC and dollars both within 0.5%`} />
      </KpiBand>

      <div className={s.sum}>
        <Card
          title="How many leaks happen each week?"
          takeaway={<>The latest was <b>{dateLong(latest.shieldTs * 1000)}</b>; the busiest week of the past year, starting {dateLong(peakW)}, had <b>{num(peakN)}</b>. Only {num(last90)} in the last 90 days.</>}
          actions={<ChartActions name="leaks per week" />}
          foot={`Incidents by the week they were shielded (weeks start Monday) · ${num(n)} listed · data through ${dateLong(f.dataThrough)}`}
        >
          <TimeSeriesChart
            dates={dates}
            series={[{ key: 'n', label: 'Incidents', color: 'var(--s2)', values: vals, type: 'bar' }]}
            format="count"
            ranges={['1Y', 'ALL']}
            defaultRange="1Y"
            height={240}
            showLegend={false}
            ariaLabel={`Columns: Wall of Shame incidents per week. The busiest week of the past year started ${dateLong(peakW)} with ${peakN} incidents; the latest incident was on ${dateLong(latest.shieldTs * 1000)}.`}
          />
        </Card>
        <Card
          title="Which pool routes leak?"
          takeaway={<>Most visible leaks start and end in <b>{top.from === top.to ? top.from[0].toUpperCase() + top.from.slice(1) : `${top.from} → ${top.to}`}</b> — {num(top.n)} of {num(n)}.</>}
          foot="Route = pool shielded into → pool deshielded from."
        >
          <HBars
            stacked
            label="Incidents by pool route"
            items={routes.map((r) => ({
              key: `${r.from}-${r.to}`,
              label: <span className={ui.pools}><i className={ui.dot} style={{ background: poolColor(r.from) }} aria-hidden="true" /><i className={ui.dot} style={{ background: poolColor(r.to), marginLeft: -2 }} aria-hidden="true" />{r.from} → {r.to}</span>,
              value: r.n,
              text: num(r.n),
            }))}
          />
        </Card>
      </div>

      <aside className={ui.act} aria-label="How to avoid this">
        <span className={ui.ic}><Icon name="shield" size={22} /></span>
        <span className={ui.ttl}>How to avoid this — shield and deshield round amounts other people use</span>
        <p>An amount like <b className="num">{num(latest.zecIn, 4)} ZEC</b> is a fingerprint; {popular.map((a, i) => <span key={a}>{i ? (i === popular.length - 1 ? ' or ' : ', ') : ''}<b className="num">{a}</b></span>)} ZEC hides you among thousands of identical transactions. And don’t take the same amount back out a few hours later.</p>
        <div className={ui.cta}>
          <Link className="btn primary" href="/privacy-suggestions">Privacy tips <Icon name="arrow-right" size={12} /></Link>
          <Link className="btn" href="/amount-suggest">Check an amount</Link>
        </div>
      </aside>

      <WallTable rows={rows} asOf={Math.floor(asOf / 1000)} />

      <More summary="How a leak is detected, and what it cannot prove">
        <MoreCols>
          <Prose>
            <p>A shielded hop only buys privacy if the amount doesn’t fingerprint you. An incident is a transaction that shielded an <b>unusual (non-round) amount</b> and was followed by a deshield of a <b>near-identical amount (within 0.5%)</b> within <b>7 days</b>. We match on both the ZEC amount and the dollar value, with a floor of $1,000.</p>
            <p>The list holds {num(n)} incidents worth {usd(totalUsd / 1e6, 0)}M on the way in; the smallest is {usd(minUsd, 0)}, well above the $1,000 floor, so the list appears to be capped at its {num(n)} largest or most recent entries.</p>
          </Prose>
          <Prose>
            <p><b>This is heuristic inference from net pool value flows, not proof.</b> Amounts are per-transaction shield and deshield legs, and we link to the containing block (the exact txid isn’t stored). A near-exact match on an arbitrary amount is very unlikely to be coincidence, but it can be.</p>
            <p>Nothing here identifies a person: the list shows amounts, times and blocks that anyone running a node can already see.</p>
          </Prose>
        </MoreCols>
      </More>

      <Tiles items={[
        { href: '/privacy-suggestions', title: 'Privacy tips', desc: 'Round amounts with the biggest crowd to hide in.', value: <>{compact(ps.shieldTx + ps.deshieldTx, 1)} txs ranked</> },
        { href: '/amount-suggest', title: 'Amount lookup', desc: 'Check how common an amount is before you send it.', value: 'Any amount, instant' },
        { href: '/chart/anonymity', title: 'Shielded anonymity set', desc: 'How many coins you blend in with when deshielding.', value: <><b>{pct(pools.shieldedPct)}</b> of ZEC shielded</> },
        { href: '/orchard-turnstile', title: 'Orchard turnstile watch', desc: 'Was the Orchard bug used to mint fake ZEC?', value: <>Index <b>{Math.round(inf.index.isi)} / 100</b></> },
      ]} />
    </>
  );
}
