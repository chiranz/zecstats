import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, More, Section, Tiles } from '@/components/ui/blocks';
import { BarList } from '@/components/reports/BarList';
import { LinkSeg } from '@/components/reports/LinkSeg';
import { WalletAppsChart } from '@/components/reports/WalletAppsChart';
import { hrefWith, one, pick } from '@/components/reports/params';
import r from '@/components/reports/report.module.css';
import { getWalletApps } from '@/lib/data/crosschain';
import { dateLong, num, pct, usd, usdCompact } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/wallet-apps');

// ≤5 hues: the live chart's 9 series folded into 5 groups (same apps, summed).
const GROUPS = [
  { key: 'zodl', label: 'Zodl (Zashi)', color: 'var(--s2)', apps: ['Zodl (Zashi)'] },
  { key: 'nio', label: 'near-intents.org', color: 'var(--s3)', apps: ['near-intents.org'] },
  { key: 'swapkit', label: 'SwapKit wallets', color: 'var(--s4)', apps: ['THORSwap (SwapKit)', 'Trust Wallet (SwapKit)', 'Ledger (SwapKit)'] },
  { key: 'ref', label: 'Intents referral codes', color: 'var(--s5)', apps: ['near-intents.intents-referral.near', 'new.intents-referral.near', 'solswap.intents-referral.near'] },
  { key: 'other', label: 'Other apps', color: 'var(--s6)', apps: ['Other'] },
];

/** The live table's style: $20M · $6.5M · $954.8K · $147 */
const money = (v: number) => (v >= 1e6 ? usdCompact(v, 1) : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : usd(v, 0));

// ?p= is the live page's leaderboard window. The 7-day table is the full one (every app, swaps, direction, code);
// the other windows are summed from each app's daily volume, so they cover the eight largest apps plus Other.
const P = ['day', 'week', 'month', 'quarter', 'all'] as const;
type Win = (typeof P)[number];
const WIN: Record<Win, { label: string; days: number; phrase: string; title: string }> = {
  day: { label: 'Today', days: 1, phrase: 'today so far', title: 'today' },
  week: { label: '7 days', days: 7, phrase: 'the last 7 days', title: 'this week' },
  month: { label: '30 days', days: 30, phrase: 'the last 30 days', title: 'in the last 30 days' },
  quarter: { label: '90 days', days: 90, phrase: 'the last 90 days', title: 'in the last 90 days' },
  all: { label: 'All time', days: Infinity, phrase: 'all time', title: 'of all time' },
};

export default async function WalletAppsPage({ searchParams }: PageProps<'/wallet-apps'>) {
  const sp = await searchParams;
  const p = pick(one(sp.p), P, 'week');
  const w = WIN[p];
  const wa = await getWalletApps();
  const full = p === 'week';

  // the window's leaderboard: the full 7-day table, or the eight named apps summed over the window
  const start = Number.isFinite(w.days) ? Math.max(0, wa.dates.length - w.days) : 0;
  const sums = wa.apps.map((app, i) => ({ app, usd: wa.usd[i].slice(start).reduce((a, v) => a + v, 0) }));
  const winTotal = full ? wa.summary.usd : sums.reduce((a, x) => a + x.usd, 0);
  const otherUsd = sums.find((x) => x.app === 'Other')?.usd ?? 0;
  type Row = { rank: number; app: string; usd: number; share_pct: number; swaps?: number; into_usd?: number; out_usd?: number; code?: string };
  const board: Row[] = full ? wa.leaderboard : sums.filter((x) => x.app !== 'Other' && x.usd > 0).sort((a, b) => b.usd - a.usd).map((x, i) => ({ rank: i + 1, app: x.app, usd: x.usd, share_pct: winTotal ? (x.usd / winTotal) * 100 : 0 }));
  const leader = board[0];
  const top3 = board.slice(0, 3).reduce((a, b) => a + b.share_pct, 0);
  const allTime = wa.usd.reduce((a, s) => a + s.reduce((x, v) => x + v, 0), 0);

  return (
    <>
      <SectionLd path="/wallet-apps" />
      <Masthead
        title="Which wallet apps route ZEC swaps?"
        cadence="updates every 10 minutes"
        lede={leader
          ? <><b className="value">{leader.app}</b> led {w.phrase} with <b className="num value">{money(leader.usd)}</b> — {pct(leader.share_pct, 1)} of the <b className="num value">{money(winTotal)}</b> in {full ? `${num(wa.summary.swaps)} ` : ''}ZEC swaps on NEAR Intents.</>
          : <>No named app has sent a ZEC swap on NEAR Intents {w.phrase}.</>}
      >
        <p className={r.mastNote}>Each swap carries the code of the app that sent it; that is what is counted here. History is complete: all {num(wa.history.swaps)} ZEC swaps since {wa.history.since}.</p>
      </Masthead>

      <div className={r.fbar} role="region" aria-label="Leaderboard range">
        <div className={r.grp}>
          <span className={r.glbl} id="g-rng">Leaderboard range</span>
          <div className={r.grpRow}>
            <LinkSeg labelledBy="g-rng" active={p} options={P.map((k) => ({ key: k, label: WIN[k].label, href: hrefWith('/wallet-apps', sp, { p: k }) }))} />
            <span className={r.count}><b>{money(winTotal)}</b>{full ? ` in ${num(wa.summary.swaps)} swaps` : ''} · {w.phrase}</span>
          </div>
        </div>
        <p className="small" style={{ flex: '1 1 260px' }}>The range drives the leaderboard only; the chart below always covers all history.</p>
      </div>

      {leader && (
        <Card
          title={`Who sent the most ZEC swaps ${w.title}?`}
          takeaway={<>The top three apps carried <b>{pct(top3, 1)}</b> of the volume; {leader.app} alone moved <b>{money(leader.usd)}</b>{leader.swaps != null ? ` in ${num(leader.swaps)} swaps` : ''}.</>}
          actions={<ChartActions name="wallet app leaderboard" />}
          foot={`Volume is the dollar value sent in, into or out of ZEC · ${w.phrase}`}
        >
          <BarList label={`Share of ZEC swap volume by app, ${w.phrase}`} max={leader.usd} items={board.slice(0, 10).map((b) => ({
            key: b.app, name: <>{b.rank}. {b.app}</>, value: money(b.usd), sub: b.swaps != null ? `${pct(b.share_pct, 1)} · ${num(b.swaps)} swaps` : pct(b.share_pct, 1), highlight: b.rank === 1, title: b.app,
            parts: [{ key: 'v', value: b.usd, color: b.rank === 1 ? 'var(--s2)' : 'var(--p-transparent)' }],
          }))} />
        </Card>
      )}

      <KpiBand label="Wallet apps summary">
        <Kpi k={p === 'all' ? 'All-time volume' : p === 'day' ? 'Volume today' : `${w.days}-day volume`} v={money(winTotal)} s={full ? `${num(wa.summary.swaps)} ZEC swaps` : w.phrase} />
        <Kpi k="Leader" v={leader ? pct(leader.share_pct, 1) : '—'} s={leader ? `${leader.app} · ${money(leader.usd)}` : 'no volume yet'} />
        {full
          ? <Kpi k="Apps with volume" v={board.length} s="this week, by referral code or fee account" />
          : <Kpi k="Other apps" v={money(otherUsd)} s={`${pct(winTotal ? (otherUsd / winTotal) * 100 : 0, 1)} · every app outside the eight largest`} />}
        {p === 'all'
          ? <Kpi k="7-day volume" v={money(wa.summary.usd)} s={`${num(wa.summary.swaps)} ZEC swaps`} />
          : <Kpi k="All-time volume" v={usdCompact(allTime, 2)} s={`since ${dateLong(wa.dates[0])}`} />}
      </KpiBand>

      <Section title={full ? 'Every app this week' : `Every named app, ${w.phrase}`}>
        <div className="tbl-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
          <table className="t">
            <caption className="sr-only">{`ZEC swap volume by app, ${w.phrase}`}</caption>
            <thead><tr><th scope="col">#</th><th scope="col" style={{ textAlign: 'left' }}>App</th><th scope="col">Volume</th><th scope="col">Share</th>{full && <><th scope="col">Swaps</th><th scope="col">Into ZEC</th><th scope="col">Out of ZEC</th><th scope="col" style={{ textAlign: 'left' }}>Code / fee account</th></>}</tr></thead>
            <tbody>
              {board.map((b) => (
                <tr key={b.rank} className={b.rank === 1 ? r.focusRow : undefined}>
                  <td>{b.rank}</td>
                  <td className="l" style={{ textAlign: 'left', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.app}>{b.app}</td>
                  <td>{money(b.usd)}</td>
                  <td><i className={r.minibar} style={{ width: Math.max(3, (b.share_pct / leader.share_pct) * 60), background: 'var(--s2)' }} />{pct(b.share_pct, 1)}</td>
                  {full && <>
                    <td>{num(b.swaps)}</td>
                    <td>{money(b.into_usd ?? 0)}</td>
                    <td>{money(b.out_usd ?? 0)}</td>
                    <td style={{ textAlign: 'left', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.code}>{b.code || <span className="muted">none</span>}</td>
                  </>}
                </tr>
              ))}
              {!full && otherUsd > 0 && (
                <tr>
                  <td><span className="muted">—</span></td>
                  <td className="l muted" style={{ textAlign: 'left' }}>Other apps</td>
                  <td>{money(otherUsd)}</td>
                  <td>{pct(winTotal ? (otherUsd / winTotal) * 100 : 0, 1)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {full
          ? <p className="small">“unlabeled …” = an app that sets no referral code, shown by its fee account until we know whose it is. Codes ending “…” are cut short in the source page.</p>
          : <p className="small">Summed from each app’s daily volume. Swap counts, the into/out split and codes are listed for the <Link href={hrefWith('/wallet-apps', sp, { p: 'week' })} replace scroll={false}>7-day table</Link>. Apps outside the eight largest of all time are grouped as Other, so one of them can be bigger than the last app named here.</p>}
      </Section>

      <WalletAppsChart dates={wa.dates} apps={wa.apps} usd={wa.usd} groups={GROUPS} />

      <More summary="Where these names come from">
        <p>Source: the NEAR Intents explorer, every successful swap into or out of ZEC. Volume is the dollar value sent in. App names come from each swap’s referral code or, for apps that route through SwapKit, from the wallet’s fee account (trustswapkit.near is Trust Wallet, ledgerswapkit.near is Ledger). near-intents.org is the protocol’s own swap page. A swap with ZEC on both sides (ZEC moved between chains) is counted once, as into ZEC.</p>
      </More>

      <Tiles items={[
        { href: '/swaps', title: 'Swaps', desc: 'Where ZEC sits in the NEAR Intents network.' },
        { href: '/btc-migration', title: 'Bitcoin → Zcash', desc: 'BTC swapped into ZEC, and how long it sat still.' },
        { href: '/chart/near-flow', title: 'NEAR Intents ZEC flow', desc: 'Inbound vs outbound, by counter-asset.' },
        { href: '/chart/swap-assets', title: 'ZEC swap assets', desc: 'What ZEC is swapped for, over time.' },
      ]} />
    </>
  );
}
