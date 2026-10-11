import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { BarList } from '@/components/reports/BarList';
import { FixedSeg } from '@/components/reports/FixedSeg';
import r from '@/components/reports/report.module.css';
import { getWalletApps } from '@/lib/data/crosschain';
import { dateLong, num, pct, usd, usdCompact } from '@/lib/format';

export const metadata: Metadata = { title: 'Wallet apps', description: 'Which wallets and apps route ZEC swaps through NEAR Intents, and who leads.' };

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

export default async function WalletAppsPage() {
  const wa = await getWalletApps();
  const board = wa.leaderboard;
  const leader = board[0];
  const top3 = board.slice(0, 3).reduce((a, b) => a + b.share_pct, 0);

  // weekly totals (weeks start Monday, UTC); the last week is still running
  const weekOf = (d: string) => { const t = new Date(`${d}T00:00:00Z`); const dow = (t.getUTCDay() + 6) % 7; return new Date(t.getTime() - dow * 86400000).toISOString().slice(0, 10); };
  const weeks = [...new Set(wa.dates.map(weekOf))];
  const wIdx = new Map(weeks.map((w, i) => [w, i]));
  const appWeekly = wa.apps.map(() => new Array(weeks.length).fill(0));
  wa.dates.forEach((d, di) => { const wi = wIdx.get(weekOf(d))!; wa.usd.forEach((s, ai) => (appWeekly[ai][wi] += s[di])); });
  const firstActive = appWeekly.reduce((acc, s) => Math.min(acc, s.findIndex((v) => v > 1000)), Infinity);
  const from = Math.max(0, firstActive);
  const series = GROUPS.map((g) => ({ key: g.key, label: g.label, color: g.color, type: 'bar' as const, values: weeks.map((_, wi) => g.apps.reduce((a, app) => a + (appWeekly[wa.apps.indexOf(app)]?.[wi] ?? 0), 0)).slice(from) }));

  // which app led each of the last 12 full weeks (named apps only)
  const named = wa.apps.map((a, i) => ({ a, i })).filter(({ a }) => a !== 'Other');
  const full = weeks.slice(0, -1);
  const leaders = full.slice(-12).reverse().map((w) => {
    const wi = wIdx.get(w)!;
    const total = wa.apps.reduce((a, _, ai) => a + appWeekly[ai][wi], 0);
    const ranked = named.map(({ a, i }) => ({ a, v: appWeekly[i][wi] })).sort((x, y) => y.v - x.v);
    return { w, total, first: ranked[0], second: ranked[1] };
  });
  const zodlWeeks = leaders.filter((l) => l.first.a === 'Zodl (Zashi)').length;
  const allTime = wa.usd.reduce((a, s) => a + s.reduce((x, v) => x + v, 0), 0);

  return (
    <>
      <Masthead
        crumbs={[{ label: 'Tools' }, { label: 'Cross-chain' }, { label: 'Wallet apps' }]}
        title="Which wallet apps route ZEC swaps?"
        cadence="updates every 10 minutes"
        lede={<><b className="value">{leader.app}</b> led the last 7 days with <b className="num value">{money(leader.usd)}</b> — {pct(leader.share_pct, 1)} of the <b className="num value">{money(wa.summary.usd)}</b> in {num(wa.summary.swaps)} ZEC swaps on NEAR Intents.</>}
      >
        <p className={r.mastNote}>Each swap carries the code of the app that sent it; that is what is counted here. History is complete: all {num(wa.history.swaps)} ZEC swaps since {wa.history.since}.</p>
      </Masthead>

      <div className={r.fbar} role="region" aria-label="Leaderboard range">
        <div className={r.grp}>
          <span className={r.glbl} id="g-rng">Leaderboard range</span>
          <div className={r.grpRow}>
            <FixedSeg labelledBy="g-rng" options={['Today', '7 days', '30 days', '90 days', 'All time']} active="7 days" why="Only the 7-day leaderboard is in this snapshot" />
            <span className={r.count}><b>{money(wa.summary.usd)}</b> in {num(wa.summary.swaps)} swaps · last 7 days at capture</span>
          </div>
        </div>
        <p className="small" style={{ flex: '1 1 260px' }}>The range drives the leaderboard only; the chart below always covers all history.</p>
      </div>

      <Card
        title="Who sent the most ZEC swaps this week?"
        takeaway={<>The top three apps carried <b>{pct(top3, 1)}</b> of the week’s volume; {leader.app} alone moved <b>{money(leader.usd)}</b> in {num(leader.swaps)} swaps.</>}
        actions={<ChartActions name="wallet app leaderboard" />}
        foot="Volume is the dollar value sent in, into or out of ZEC · last 7 days at capture"
      >
        <BarList label="Share of 7-day ZEC swap volume by app" max={leader.usd} items={board.slice(0, 10).map((b) => ({
          key: b.app, name: <>{b.rank}. {b.app}</>, value: money(b.usd), sub: `${pct(b.share_pct, 1)} · ${num(b.swaps)} swaps`, highlight: b.rank === 1, title: b.app,
          parts: [{ key: 'v', value: b.usd, color: b.rank === 1 ? 'var(--s2)' : 'var(--p-transparent)' }],
        }))} />
      </Card>

      <KpiBand label="Wallet apps summary">
        <Kpi k="7-day volume" v={money(wa.summary.usd)} s={`${num(wa.summary.swaps)} ZEC swaps`} />
        <Kpi k="Leader" v={pct(leader.share_pct, 1)} s={`${leader.app} · ${money(leader.usd)}`} />
        <Kpi k="Apps with volume" v={board.length} s="this week, by referral code or fee account" />
        <Kpi k="All-time volume" v={usdCompact(allTime, 2)} s={`since ${dateLong(wa.dates[0])}`} />
      </KpiBand>

      <Section title="Every app this week">
        <div className="tbl-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
          <table className="t">
            <caption className="sr-only">ZEC swap volume by app, last 7 days</caption>
            <thead><tr><th scope="col">#</th><th scope="col" style={{ textAlign: 'left' }}>App</th><th scope="col">Volume</th><th scope="col">Share</th><th scope="col">Swaps</th><th scope="col">Into ZEC</th><th scope="col">Out of ZEC</th><th scope="col" style={{ textAlign: 'left' }}>Code / fee account</th></tr></thead>
            <tbody>
              {board.map((b) => (
                <tr key={b.rank} className={b.rank === 1 ? r.focusRow : undefined}>
                  <td>{b.rank}</td>
                  <td className="l" style={{ textAlign: 'left', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.app}>{b.app}</td>
                  <td>{money(b.usd)}</td>
                  <td><i className={r.minibar} style={{ width: Math.max(3, (b.share_pct / leader.share_pct) * 60), background: 'var(--s2)' }} />{pct(b.share_pct, 1)}</td>
                  <td>{num(b.swaps)}</td>
                  <td>{money(b.into_usd)}</td>
                  <td>{money(b.out_usd)}</td>
                  <td style={{ textAlign: 'left', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.code}>{b.code || <span className="muted">none</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">“unlabeled …” = an app that sets no referral code, shown by its fee account until we know whose it is. Codes ending “…” are cut short in the source page.</p>
      </Section>

      <Card
        title="How has each app’s volume moved?"
        takeaway={<>Zodl (Zashi) led <b>{zodlWeeks} of the last 12</b> full weeks; all apps together have moved <b>{usdCompact(allTime, 2)}</b> of ZEC swaps since March 2025.</>}
        actions={<ChartActions name="weekly volume by app" />}
        foot="Weekly totals, weeks starting Monday (UTC); the newest bar is the week so far. Nine apps are folded into five groups: SwapKit wallets = THORSwap, Trust Wallet and Ledger; referral codes = three near-intents referral accounts."
      >
        <TimeSeriesChart dates={weeks.slice(from)} series={series} format="usdCompact" stacked shareToggle ranges={['3M', '6M', '1Y', 'ALL']} defaultRange="1Y" height={320} ariaLabel="Weekly ZEC swap volume on NEAR Intents by app group, stacked." />
      </Card>

      <Section title="Which app led each week?">
        <div className="tbl-wrap">
          <table className="t">
            <caption className="sr-only">Weekly leader among named apps, last 12 full weeks</caption>
            <thead><tr><th scope="col">Week of</th><th scope="col" style={{ textAlign: 'left' }}>Leader</th><th scope="col">Share</th><th scope="col" style={{ textAlign: 'left' }}>Second</th><th scope="col">Share</th><th scope="col">Total</th></tr></thead>
            <tbody>
              {leaders.map((l) => (
                <tr key={l.w}>
                  <td>{dateLong(l.w)}</td>
                  <td className="l" style={{ textAlign: 'left' }}>{l.first.a}</td>
                  <td>{pct((l.first.v / l.total) * 100, 1)}</td>
                  <td className="l" style={{ textAlign: 'left' }}>{l.second.a}</td>
                  <td>{pct((l.second.v / l.total) * 100, 1)}</td>
                  <td>{usdCompact(l.total, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">Among the eight apps the live chart names; everything else is “Other” and is counted in the total only.</p>
      </Section>

      <More summary="Where these names come from">
        <p>Source: the NEAR Intents explorer, every successful swap into or out of ZEC. Volume is the dollar value sent in. App names come from each swap’s referral code or, for apps that route through SwapKit, from the wallet’s fee account (trustswapkit.near is Trust Wallet, ledgerswapkit.near is Ledger). near-intents.org is the protocol’s own swap page. A swap with ZEC on both sides (ZEC moved between chains) is counted once, as into ZEC.</p>
        <p>This page’s data is not served by any API route on the live site — it is rendered into the page — so the snapshot parses it out of the captured page.</p>
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
