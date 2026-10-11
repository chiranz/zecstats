import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Delta, Kpi, KpiBand, More, Section, StackBar, Table, Tiles } from '@/components/ui/blocks';
import { HBars, MoreCols, Prose } from '@/components/privacy-tools/parts';
import { fz, zamt } from '@/components/privacy-tools/fmt';
import { getActivity, getLargestWallets, getShieldHops, type Activity, type BucketKey, type Wallet } from '@/lib/data/privacy-tools';
import { api, DATA_SOURCE } from '@/lib/data/core';
import { ActivityChart } from '@/components/reports/ActivityChart';
import { LinkSeg, ParamNote } from '@/components/reports/LinkSeg';
import { hrefWith, one, pick } from '@/components/reports/params';
import { ACTIVITY_RANGES, ACTIVITY_WINDOWS } from '@/components/reports/views';
import { compact, dateLong, dateShort, num, pct, zat, type Good } from '@/lib/format';
import { getFreshness } from '@/lib/data/snapshot';
import { shieldingWindows } from '@/lib/data/flows';
import s from './page.module.css';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/activity');

// behaviour buckets, not pools: generic categorical colours; `good` = which way a change is good news
const BUCKETS: { key: BucketKey; label: string; short: string; color: string; sub: string; good: Good }[] = [
  { key: 'transient_transparent', label: 'Transient transparent', short: 'Transient', color: 'var(--other)', sub: 'ordinary transparent movement — not parked anywhere', good: 'neutral' },
  { key: 'exchanges', label: 'In exchanges (sweep-shaped)', short: 'In exchanges', color: 'var(--s2)', sub: 'flowed through a sweep-shaped consolidation', good: 'neutral' },
  { key: 'shielded_savings', label: 'Shielded savings', short: 'Shielded savings', color: 'var(--s1)', sub: 'dwelled 7+ days, then voluntarily shielded', good: 'up' },
];
const POOL_ROWS = [['sprout', 'Sprout'], ['sapling', 'Sapling'], ['orchard', 'Orchard'], ['ironwood', 'Ironwood']] as const;
const DAY = 86400000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** Last day a column covers: daily = the day, weekly = Sunday, monthly = the month's last day. */
const colEnd = (d: string, unit: string) => {
  if (unit === 'daily') return d;
  if (unit !== 'monthly') return addDays(d, 6);
  const t = new Date(`${d.slice(0, 7)}-01T00:00:00Z`);
  t.setUTCMonth(t.getUTCMonth() + 1, 0);
  return t.toISOString().slice(0, 10);
};
const COHORTS = ['<30d', '30-180d', '180d-1y', '1-3y', '3y+'];
const COHORT_LABEL: Record<string, string> = { '<30d': 'under 30 days', '30-180d': '30–180 days', '180d-1y': '180 days–1 year', '1-3y': '1–3 years', '3y+': '3 years +' };

export default async function ActivityPage({ searchParams }: PageProps<'/activity'>) {
  // live's link state: ?window=daily|weekly|monthly (column size; the server picks the data) &range=30|90|365|0 (days)
  const sp = await searchParams;
  const live = DATA_SOURCE === 'live';
  const want = pick(one(sp.window), ACTIVITY_WINDOWS.map((x) => x[0]), 'weekly');
  const range = pick(one(sp.range), ACTIVITY_RANGES.map((x) => x[0]), '365');
  const [a, w, hops, fresh, sh] = await Promise.all([live && want !== 'weekly' ? api<Activity>('activity', { window: want }) : getActivity(), getLargestWallets(), getShieldHops(), getFreshness(), shieldingWindows(7)]);
  const unit = a.window, unitNoun = unit === 'daily' ? 'day' : unit === 'monthly' ? 'month' : 'week';
  const bf = a.backfill;
  // complete columns only: the one still in progress (it holds today, so far) would read as a collapse
  const series = a.daily_series.filter((r) => colEnd(r.date, unit) <= fresh.dataThrough);
  const cur = series.at(-1)!, prev = series.at(-2)!;
  const colName = (r: { date: string }) => (unit === 'daily' ? dateLong(r.date) : unit === 'monthly' ? r.date.slice(0, 7) : `${dateShort(r.date)} – ${dateShort(colEnd(r.date, unit))}`);
  const l7 = (k: BucketKey) => zat(Number(cur[`${k}_zat`]));
  const p7 = (k: BucketKey) => zat(Number(prev[`${k}_zat`]));
  const total7 = BUCKETS.reduce((x, k) => x + l7(k.key), 0);
  const trend = (k: BucketKey) => (p7(k) ? ((l7(k) - p7(k)) / p7(k)) * 100 : null);
  const exT = trend('exchanges'), svT = trend('shielded_savings');
  const byC = new Map(a.storage.buckets.map((c) => [c.cohort, c]));
  const cohorts = COHORTS.filter((c) => byC.has(c)).map((c) => byC.get(c)!);
  const storTotal = cohorts.reduce((x, c) => x + zat(c.total_zat), 0);
  const { now: sw, prior: sp7 } = sh;
  const netNow = sw.net, netPrior = sp7.net;
  const ch = (now: number, prior: number) => (prior ? ((now - prior) / Math.abs(prior)) * 100 : null);
  const signed = (v: number) => `${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`;
  const win7 = `${dateShort(sw.from)} – ${dateLong(sw.to)}`;
  const typeLab = (t: string) => (t === 'scripthash' ? 'Multisig' : t === 'pubkeyhash' ? 'Single-sig' : t);
  const short = (x: string) => `${x.slice(0, 10)}…${x.slice(-6)}`;
  const complete = bf.activity_backfill_pct >= 99.9;

  return (
    <>
      <SectionLd path="/activity" />
      <Masthead
        title="Where does transparent ZEC go?"
        lede={<>Most of it just keeps moving. In the {unitNoun} of {colName(cur)} <b className="value">{compact(l7('transient_transparent'), 2)} ZEC</b> changed hands transparently, <b className="value">{compact(l7('exchanges'), 1)} ZEC</b> went through exchange-shaped sweeps and <b className="value">{compact(l7('shielded_savings'), 1)} ZEC</b> was parked in shielded savings.</>}
      >
        <span className={s.status}><i aria-hidden="true" />{complete ? `Full chain history classified · ${dateLong(bf.earliest_classified_date)} – ${dateLong(bf.latest_classified_date)}` : `Backfill ${bf.activity_backfill_pct.toFixed(2)}% complete`}</span>
      </Masthead>

      <section className="hero" aria-labelledby="h-new">
        <div className="spread">
          <div className="stack" style={{ gap: 6 }}>
            <span className="kicker">{unit === 'weekly' ? 'Last full week' : `Last full ${unitNoun}`} ({colName(cur)}) vs the one before</span>
            <h2 className="h2" id="h-new" style={{ fontSize: 'clamp(18px,2.1vw,22px)' }}>What happens to a new transparent coin?</h2>
          </div>
          <p className="takeaway" style={{ maxWidth: 560 }}>Exchange-shaped flow is <b>{exT != null && exT >= 0 ? 'up' : 'down'} {num(Math.abs(exT ?? 0), 0)}%</b> on the {unitNoun} before; shielded-savings flow is <b>{svT != null && svT >= 0 ? 'up' : 'down'} {num(Math.abs(svT ?? 0), 0)}%</b>. Not a signal by itself — read it with the storage and direction panels below.</p>
        </div>
        <StackBar legend={false} fmt={(v) => `${compact(v, 2)} ZEC`} label={`Share of classified volume, ${colName(cur)}: ${BUCKETS.map((k) => `${k.label} ${pct((l7(k.key) / total7) * 100)}`).join(', ')}`} parts={BUCKETS.map((k) => ({ key: k.key, value: l7(k.key), color: k.color, label: k.label }))} />
        <div className={s.flows} role="list" aria-label={`Buckets, ${colName(cur)}`}>
          {BUCKETS.map((k) => (
            <div key={k.key} className={s.flow} role="listitem">
              <span className={s.fk}><i style={{ background: k.color }} aria-hidden="true" />{k.label}</span>
              <span className={s.fv}>{compact(l7(k.key), 2)}<small>ZEC</small></span>
              <span><Delta v={trend(k.key)} digits={0} badge good={k.good} label={`vs the ${unitNoun} before`} /></span>
              <span className={s.fs}>{pct((l7(k.key) / total7) * 100)} of volume · {k.sub}</span>
            </div>
          ))}
        </div>
      </section>

      <KpiBand label={`Direction (last 7 complete days, ${win7}) and storage`}>
        <Kpi k="Net shielding · 7d" v={signed(netNow)} unit="ZEC" s={<><Delta v={netNow - netPrior} digits={0} suffix=" ZEC" /> vs {signed(netPrior)} the 7 days before</>} />
        <Kpi k="Shielded · 7d" v={num(sw.shield)} unit="ZEC" s={<><Delta v={ch(sw.shield, sp7.shield)} digits={0} /> vs the 7 days before</>} />
        <Kpi k="Deshielded · 7d" v={num(sw.deshield)} unit="ZEC" s={<><Delta v={ch(sw.deshield, sp7.deshield)} digits={0} good="down" /> vs the 7 days before</>} />
        <Kpi k="Long-term storage" v={compact(zat(a.storage.long_term_zat), 2)} unit="ZEC" s="transparent coins unmoved for 1 year +" />
      </KpiBand>

      {want !== unit && <ParamNote>{want === 'daily' ? 'Daily' : 'Monthly'} columns aren’t available yet — showing {unit} columns.</ParamNote>}
      <Card
        title="What happens to transparent coins over time?"
        takeaway={<>Transient movement dwarfs the other two buckets every {unitNoun}; the latest full {unitNoun} moved <b>{compact(l7('transient_transparent'), 2)} ZEC</b> transparently, against <b>{compact(l7('shielded_savings'), 1)} ZEC</b> into shielded savings.</>}
        actions={<ChartActions api="activity" name="Classified volume by bucket" />}
        foot={`Classified volume by the ${unitNoun} each coin was spent · the ${unitNoun} in progress is left out · data through ${dateLong(fresh.dataThrough)}`}
      >
        <ActivityChart
          rows={series}
          buckets={BUCKETS.map((k) => ({ ...k, label: k.short }))}
          initialRange={range}
          unit={unit}
          windowSeg={<LinkSeg labelledBy="act-win" active={unit} options={ACTIVITY_WINDOWS.map(([k, l]) => ({ key: k, label: l, href: hrefWith('/activity', sp, { window: k }), disabled: !live }))} />}
          ariaLabel="Stacked columns: transparent volume classified as transient transparent, in exchanges (sweep-shaped) and shielded savings, since 2016."
        />
      </Card>

      <div className="grid2">
        <Card
          title="What sits in long-term storage?"
          takeaway={<><b>{compact(zat(a.storage.long_term_zat), 2)} ZEC</b> of transparent coins haven’t moved in a year or more — {pct((zat(a.storage.long_term_zat) / storTotal) * 100, 0)} of the {compact(storTotal, 2)} transparent ZEC counted.</>}
          foot={`Unspent transparent coins by age, as of ${dateLong(a.storage.date)} · same data as Transparent ZEC by Age`}
        >
          <HBars
            stacked
            label="Unspent transparent ZEC by coin age"
            items={cohorts.map((c) => ({ key: c.cohort, label: <>{COHORT_LABEL[c.cohort] ?? c.cohort} <span className="muted">· {compact(c.utxo_count, 1)} UTXOs</span></>, value: zat(c.total_zat), text: `${fz(zat(c.total_zat))} ZEC`, color: 'var(--s1)', strong: true }))}
          />
        </Card>
        <Card
          title="Which way is value moving?"
          takeaway={<>Net <b>{netNow >= 0 ? 'into' : 'out of'}</b> the shielded pools: <b>{signed(netNow)} ZEC</b> in the last 7 complete days, {netNow < netPrior ? 'less than' : 'more than'} the {signed(netPrior)} the 7 days before. Ironwood took <b>{signed(sw.perPool.ironwood)}</b>; Sprout, Sapling and Orchard together {sw.perPool.sprout + sw.perPool.sapling + sw.perPool.orchard >= 0 ? 'gained' : 'lost'} <b>{num(Math.abs(sw.perPool.sprout + sw.perPool.sapling + sw.perPool.orchard))}</b>.</>}
          foot={`Shield and deshield legs across all four shielded pools; a move between shielded pools is in neither · per-pool rows are each pool's net change, ${num(sw.migration)} ZEC of migration into Ironwood included on both sides, so they add up to the net · ${win7} · ZEC`}
        >
          <Table<{ k: string; now: number; prior: number; strong?: boolean; abs?: boolean; good?: Good; sub?: boolean }>
            caption={`Shielding direction and per-pool net change, last 7 complete days (${win7}) vs the 7 before`}
            rowKey={(r) => r.k}
            cols={[
              { key: 'k', label: 'Flow', render: (r) => (r.strong ? <b>{r.k}</b> : r.sub ? <span className="muted">↳ {r.k}</span> : r.k), className: 'l' },
              { key: 'n', label: 'Last 7d', render: (r) => (r.abs ? signed(r.now) : num(r.now)) },
              { key: 'p', label: 'Prior 7d', render: (r) => (r.abs ? signed(r.prior) : num(r.prior)) },
              { key: 'c', label: 'Change', render: (r) => (r.abs ? <Delta v={r.now - r.prior} digits={0} suffix="" good={r.good} /> : <Delta v={ch(r.now, r.prior)} digits={0} good={r.good} />) },
            ]}
            rows={[
              { k: 'Shielded', now: sw.shield, prior: sp7.shield },
              { k: 'Deshielded', now: sw.deshield, prior: sp7.deshield, good: 'down' },
              { k: 'Net shielding', now: netNow, prior: netPrior, strong: true, abs: true },
              ...POOL_ROWS.map(([k, l]) => ({ k: l, now: sw.perPool[k], prior: sp7.perPool[k], abs: true, sub: true, good: 'neutral' as Good })),
            ]}
          />
        </Card>
      </div>

      <Section id="wallets" title="Which transparent wallets are largest?" aside={<span className="small">refreshed {dateLong(w.updated_at)}</span>}>
        <Card
          title={`The top ${w.wallets.length} addresses by balance`}
          takeaway={<>The top 20 hold <b>{compact(zat(w.top20_zat), 2)} ZEC</b> — about <b>{pct(w.top20_pct_of_transparent_supply)}</b> of current transparent supply. None carries a sourced label yet.</>}
          actions={<ChartActions api="largest-wallets" name="Largest transparent wallets" />}
          foot="Address-level current balance, not entity attribution: an unlabeled row is unresearched, not “probably not an exchange” · addresses link to CipherScan"
        >
          <Table<Wallet & { i: number }>
            caption="Largest transparent addresses by balance"
            maxHeight={520}
            rowKey={(r) => r.address}
            cols={[
              { key: 'i', label: '#', render: (r) => r.i },
              { key: 'b', label: 'Balance', render: (r) => `${num(zat(r.balance_zat))} ZEC` },
              { key: 'u', label: 'UTXOs', render: (r) => num(r.utxo_count) },
              { key: 'a', label: 'Address', align: 'left', render: (r) => <a className={s.addr} href={`https://cipherscan.app/address/${r.address}`} target="_blank" rel="noopener noreferrer" title={r.address} aria-label={`${r.address} on CipherScan`}>{short(r.address)}</a> },
              { key: 't', label: 'Type', align: 'left', render: (r) => typeLab(r.script_type) },
              { key: 'l', label: 'Label', align: 'left', render: (r) => (r.label ? <b>{r.label}</b> : <span className="muted">Unlabeled</span>) },
            ]}
            rows={w.wallets.map((x, i) => ({ ...x, i: i + 1 }))}
          />
        </Card>
      </Section>

      <More summary="How is this built and where does it break?">
        <MoreCols>
          <Prose>
            <p>Every spent transparent coin is classified by a <b>decision tree</b>, using chain shape only — how many inputs and outputs the spending transaction has, and how long the coin sat before it moved. (1) Does the spend shield the value? If yes and the coin dwelled 7+ days first, that’s <b>shielded savings</b>. (2) If it stays transparent, is the spend sweep-shaped (≥15 inputs, ≤2 outputs) — the consolidation signature of a custodial wallet? That’s <b>in exchanges</b>, though a large personal cleanup can look identical. (3) Everything else that moves is <b>transient transparent</b>. (4) Coins never spent at all are <b>long-term storage</b>.</p>
            <p>“In exchanges” is a <b>flow, not a balance</b>: how much ZEC recently moved through a sweep-shaped transaction, never how much sits in an exchange wallet today.</p>
          </Prose>
          <Prose>
            <p><b>Largest wallets.</b> Resolving an owner for every one of the ~27.5M unspent transparent outputs isn’t feasible, so only the top ~2,000 by value are resolved and grouped by address. A label appears only with real, sourced evidence; one address can be one of many an exchange uses.</p>
            <p><b>Thresholds are early, not calibrated.</b> The 15-input sweep floor and the 7-day savings window come from a single ~1,500-block sample and will move as more data comes in. Heuristic inference, not proof.</p>
          </Prose>
        </MoreCols>
      </More>

      <Tiles items={[
        { href: '/shield-hops', title: 'Shield-bound hops', desc: 'How much moves at a time when a coin goes shielded.', value: <>Typical {zamt(zat(hops.summary[hops.class].median_of_daily_medians_zat))} ZEC</> },
        { href: '/chart/utxo-age', title: 'Transparent ZEC by age', desc: 'The age cohorts behind the storage panel.', value: <>{compact(zat(a.storage.long_term_zat), 2)} ZEC 1y+</> },
        { href: '/chart/dormant', title: 'Dormant coins', desc: 'Transparent ZEC that hasn’t moved in years.', value: <>{compact(zat(byC.get('3y+')?.total_zat ?? 0), 2)} ZEC 3y+</> },
        { href: '/chart/shielding-rate', title: 'Shielding rate', desc: 'How fast ZEC moves into the shielded pools.', value: <>{netNow >= 0 ? '+' : '−'}{compact(Math.abs(netNow), 1)} ZEC net, 7d</> },
      ]} />
    </>
  );
}
