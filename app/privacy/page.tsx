import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { ChartActions, Kpi, KpiBand, Legend, More, Section, Tiles } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { Gate } from '@/components/ironwood/Gate';
import { Spark } from '@/components/home/Spark';
import { AmountLookup } from '@/components/privacy/AmountLookup';
import { getHopMedian, getPrivacy, getTurnstileIndex, ROUND_AMOUNTS, ROUND_TRIPS } from '@/lib/data/privacy';
import { getIronwood } from '@/lib/data/ironwood';
import { getChartIndex } from '@/lib/data/home';
import { POOL_COLOR, POOL_LABEL } from '@/lib/data/snapshot';
import { compact, dateLong, dateShort, delta, num, pct, usd } from '@/lib/format';
import s from './page.module.css';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const pv = await getPrivacy();
  const iwShare = (pv.now.ironwood / pv.now.shielded) * 100;
  return pageMetadata('/privacy', { description: `${num(pv.now.shieldedPct, 1)}% of all ZEC is shielded, ${pv.now.shieldedPct >= pv.yearAgo.shieldedPct ? 'up' : 'down'} from ${num(pv.yearAgo.shieldedPct, 1)}% a year ago; ${num(iwShare, 0)}% of it is in Ironwood. Pools, daily flows, integrity checks and privacy hygiene.` });
}


const POOL_META = {
  transparent: { tag: 'Not private', tone: '', desc: 'Public balances and amounts, like Bitcoin.' },
  sprout: { tag: 'Legacy', tone: '', desc: 'The 2016 original; deprecated, slowly emptying.' },
  sapling: { tag: 'Active', tone: 'info', desc: '2018: made shielded transactions practical.' },
  orchard: { tag: 'Draining → Ironwood', tone: 'warn', desc: 'NU5, 2022. Its coins are crossing the turnstile.' },
  ironwood: { tag: 'Newest · active', tone: 'ok', desc: 'Live since 28 Jul 2026, block 3,428,143.' },
} as const;

const PRIVACY_CHARTS = ['pools', 'shielding-rate', 'flow-transparent', 'flow-sprout', 'flow-sapling', 'flow-orchard', 'flow-ironwood', 'flow-compare', 'anonymity', 'orchard-internal'];

const Arrow = () => <Icon name="arrow-right" size={12} />;
const money = (v: number) => (Math.abs(v) >= 1e9 ? `$${num(v / 1e9, 2)}B` : `$${num(v / 1e6, 2)}M`);
const short = (v: number) => (v >= 1e6 ? `${num(v / 1e6, 1)}M` : v >= 1e3 ? `${num(v / 1e3, v >= 1e5 ? 0 : 1)}k` : num(v));

/** Semicircle gauge for the turnstile suspicion index: four equal bands, the current one solid. */
function Gauge({ value, band }: { value: number; band: number }) {
  const cx = 120, cy = 122, r = 96;
  const pt = (deg: number) => { const a = Math.PI - (deg / 180) * Math.PI; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const arc = (a: number, b: number) => { const [x1, y1] = pt(a); const [x2, y2] = pt(b); return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`; };
  const colors = ['var(--accent)', 'var(--warn)', 'var(--s4)', 'var(--down)'];
  const needle = pt((value / 100) * 180);
  const nx = cx + (needle[0] - cx) * 0.75, ny = cy + (needle[1] - cy) * 0.75;
  return (
    <svg viewBox="0 0 240 168" role="img" aria-label={`Inflation suspicion index gauge reading ${Math.round(value)} out of 100.`}>
      {colors.map((c, i) => <path key={c} d={arc(i * 45 + 1.5, (i + 1) * 45 - 1.5)} fill="none" stroke={c} strokeWidth="16" opacity={i === band ? 1 : 0.35} />)}
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="var(--value)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="7" fill="var(--value)" />
      <text x="24" y="142" textAnchor="middle">0</text>
      <text x="216" y="142" textAnchor="middle">100</text>
      <text x="126" y="164" textAnchor="end" className={s.gv}>{Math.round(value)}</text>
      <text x="129" y="164" textAnchor="start" className={s.gs}>/100</text>
    </svg>
  );
}

export default async function PrivacyPage() {
  const [p, iw, ti, hop, index] = await Promise.all([getPrivacy(), getIronwood(), getTurnstileIndex(), getHopMedian(), getChartIndex()]);
  const { now } = p;
  const share = (v: number) => (v / now.supply) * 100;
  const supplyParts = (['transparent', 'sprout', 'sapling', 'orchard', 'ironwood', 'lockbox'] as const).map((k) => ({ k, v: now[k] }));
  const fivePts = now.shieldedPct - p.fiveAgo.shieldedPct;
  const yrPts = now.shieldedPct - p.yearAgo.shieldedPct;
  const rows = new Map(index.flatMap((g) => g.rows).map((r) => [r.slug, r]));
  const fallback: Record<string, string> = {
    pools: `${compact(now.shielded)} ZEC`, 'shielding-rate': pct(now.shieldedPct),
    'flow-transparent': `${compact(now.transparent)} ZEC`, 'flow-sprout': `${num(now.sprout)} ZEC`, 'flow-sapling': `${num(now.sapling)} ZEC`,
    'flow-orchard': `${num(now.orchard)} ZEC`, 'flow-ironwood': `${compact(now.ironwood)} ZEC`,
    'flow-compare': `${p.net7.net >= 0 ? '+' : '−'}${num(Math.abs(p.net7.net))} ZEC · 7d`, 'orchard-internal': `${num(p.orchardZzPerDay)} z→z / day`,
  };
  const BK = { exchanges: { n: 'In exchanges', c: 'var(--s2)', note: (k: number) => `${num(k)} coins swept into an exchange-shaped consolidation` }, shielded_savings: { n: 'Shielded savings', c: 'var(--p-ironwood)', note: (k: number) => `${num(k)} coins that sat 7+ days, then were voluntarily shielded` }, transient_transparent: { n: 'Transient transparent', c: 'var(--p-transparent)', note: (k: number) => `${num(k)} coins of ordinary transparent movement, not parked anywhere` } } as const;
  const sav = p.buckets.find((b) => b.key === 'shielded_savings')!;
  const exb = p.buckets.find((b) => b.key === 'exchanges')!;
  const comps = ti.components.filter((c) => typeof c.weight === 'number');
  const dis = ti.disclosure;
  const accel = dis.post_deshield_rate_zec_day / dis.pre_deshield_rate_zec_day;
  const k = (v: number) => `${num(v / 1000)}k`;
  const iwShare = (now.ironwood / now.shielded) * 100;
  const shieldedParts = (['sprout', 'sapling', 'orchard', 'ironwood'] as const).map((k2) => ({ k: k2, v: now[k2] }));

  return (
    <div className={`stack ${s.page}`} style={{ gap: 32 }}>
      <Masthead title="How private is Zcash right now?" cadence="balances every block · flows daily"
        lede={<><b>{pct(now.shieldedPct)} of all ZEC is shielded</b>, up from {pct(p.yearAgo.shieldedPct)} a year ago. Most of it now lives in Ironwood: <b>{compact(now.ironwood)} ZEC</b> — {num(iwShare)}% of all shielded ZEC — in the pool that went live {iw.liveDays} days ago.</>} />

      {/* ---------- ironwood: the current shielded pool leads the hub ---------- */}
      <section className="hero" id="ironwood" aria-label="Ironwood, the current shielded pool">
        <div className={`${s.iwGrid} ${s.iwHero}`}>
          <div className="stack" style={{ gap: 8 }}>
            <span className={`kicker ${s.accentKicker}`}>Ironwood · the current shielded pool · live since {dateLong(iw.activationTime * 1000)}</span>
            <div className={`figure num ${s.iwFig}`}>{num(now.ironwood / 1e6, 2)}<small>M ZEC</small></div>
            <p className={s.hsub}><b>{num(iwShare)}%</b> of all shielded ZEC · <b>{pct(share(now.ironwood))}</b> of supply · <b>{money(now.ironwood * p.price)}</b></p>
            <p className="note">Orchard, its predecessor, is draining into it through the turnstile, and coins from Sapling and transparent addresses shield straight in.</p>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Link className="btn primary" href="/ironwood">Open the Ironwood tracker <Arrow /></Link>
              <Link className="btn" href="/orchard-turnstile">Is the turnstile sound?</Link>
            </div>
          </div>
          <div className="stack" style={{ gap: 16, minWidth: 0 }}>
            <Gate size="sm" pct={iw.pct} pinLabel={`${num(iw.pct, 2)}%`} label={`${num(iw.pct, 2)} percent of Orchard's activation balance has crossed into Ironwood`}>
              <p className={s.gateCap}><span className="kicker">Orchard → Ironwood migration</span> · <b>{num(iw.fromOrchard)} ZEC</b> of <b>{num(iw.base)} ZEC</b> in Orchard at activation have crossed</p>
            </Gate>
            <div className="stack" style={{ gap: 8 }}>
              <span className="kicker">Shielded ZEC by pool · {compact(now.shielded)}</span>
              <div className={s.stackbar} role="img" aria-label={`Of ${compact(now.shielded)} shielded ZEC: ${shieldedParts.map((x) => `${POOL_LABEL[x.k]} ${pct((x.v / now.shielded) * 100)}`).join(', ')}`}>
                {shieldedParts.map((x) => <i key={x.k} style={{ flex: x.v, background: POOL_COLOR[x.k] }} />)}
              </div>
            </div>
            <dl className={s.mini}>
              <div><dt>Orchard still to cross</dt><dd>{num(iw.orchardNow)} ZEC</dd></div>
              <div><dt>Live for</dt><dd>{iw.liveDays} days</dd></div>
              <div><dt>Busiest day</dt><dd>{dateShort(iw.busiest.date)} · {num(iw.busiest.orchard / 1000, 1)}k</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- overview ---------- */}
      <section className="hero" id="overview" aria-label="Shielded share of supply">
        <div className={s.heroGrid}>
          <div className={s.hl}>
            <span className="kicker">Shielded share of all ZEC · {dateLong(now.date)}</span>
            <div className={`figure num ${s.shareFig}`}>{num(now.shieldedPct, 1)}<small>%</small></div>
            <p className={s.hsub}><b>{num(now.shielded)} ZEC</b> shielded · <b>{money(p.shieldedUsd)}</b></p>
            <div className={s.deltas}>
              <span className={`delta${yrPts < 0 ? ' dn' : ''}`}>{delta(yrPts, 1, ' pts').text} vs a year ago</span>
              <span className={`delta${fivePts < 0 ? ' dn' : ''}`}>{delta(fivePts, 1, ' pts').text} in five years</span>
            </div>
          </div>
          <div className={s.hchart}>
            <div className="card-head" style={{ alignItems: 'baseline' }}>
              <h2 className="h3">Is more ZEC shielded than before?</h2>
              <span className={s.axnote}>Share of supply · axis 0–40%, not 0–100%</span>
            </div>
            <TimeSeriesChart dates={p.shareSeries.dates} series={[{ key: 'sh', label: 'Shielded share', color: 'var(--p-ironwood)', type: 'area', values: p.shareSeries.values }]}
              format="pct" yDomain={[0, 40]} ranges={false} showLegend={false} height={230}
              ariaLabel={`Shielded share of supply over five years, from ${pct(p.fiveAgo.shieldedPct)} to ${pct(now.shieldedPct)}`} />
          </div>
        </div>
        <div className={s.supply}>
          <div className={s.supH}><span>Where all {num(now.supply)} ZEC sit, by pool</span><Link className={s.lnk} href="/chart/pools">Pool balances chart <Arrow /></Link></div>
          <div className={s.bracket} aria-hidden="true"><span style={{ left: `${share(now.transparent)}%`, width: `${share(now.shielded)}%` }} /><b>Shielded {pct(now.shieldedPct)}</b></div>
          <div className={`${s.stackbar} ${s.lg}`} role="img" aria-label={supplyParts.map((x) => `${POOL_LABEL[x.k]} ${pct(share(x.v))}`).join(', ')}>
            {supplyParts.map((x) => <i key={x.k} style={{ flex: share(x.v), background: POOL_COLOR[x.k] }} />)}
          </div>
          <ul className={s.skey}>
            {supplyParts.map((x) => <li key={x.k}><span className="sw" style={{ background: POOL_COLOR[x.k] }} /><span>{POOL_LABEL[x.k]}</span><b>{pct(share(x.v))}<em>{short(x.v)}</em></b></li>)}
          </ul>
        </div>
      </section>

      <KpiBand label="Privacy key figures">
        <Kpi href="/chart/pools" k="Shielded supply" v={compact(now.shielded)} unit="ZEC" s={`${num(now.shielded)} ZEC in Sprout, Sapling, Orchard and Ironwood`} />
        <Kpi k="Shielded value" v={money(p.shieldedUsd)} s={`At ${usd(p.price)} (${pct(now.shieldedPct)} of the ${money(p.marketCap)} market cap)`} />
        <Kpi href="/chart/tx-types" k="Shielded share of txs" v={pct(p.txShareLast)} s={`On ${dateShort(p.last.date)}, the last full day; ${pct(p.txShareFourWeeks)} four weeks earlier`} />
        <Kpi href="/chart/flow-compare" k="Net shielding, 7 days" v={<span className={p.net7.net >= 0 ? s.up : 'dn'}>{p.net7.net >= 0 ? '▲ +' : '▼ −'}{num(Math.abs(p.net7.net))}</span>} unit="ZEC" s={`${num(p.net7.in)} in − ${num(p.net7.out)} out · prior week ${p.net7.prior >= 0 ? '+' : '−'}${num(Math.abs(p.net7.prior))}`} />
        <Kpi href="/ironwood" k="Shielded into Ironwood" v={compact(iw.fromTransparent)} unit="ZEC" s={`Straight from transparent addresses since launch; ${compact(iw.fromSapling)} more came from Sapling`} />
        <Kpi href="/ironwood" k="Orchard still to cross" v={num(iw.orchardNow)} unit="ZEC" s={`Orchard's live balance, i.e. what can still cross — not activation − crossed (${num(iw.base - iw.fromOrchard)})`} />
        <Kpi href="/shield-hops" k="Shield-bound hop" v={num(hop.median, 2)} unit="ZEC" s={`Median of daily medians, last ${hop.days} days, sweeps removed`} />
        <Kpi href="/orchard-turnstile" k="Turnstile suspicion" v={Math.round(ti.isi)} unit="/100" s={`${ti.verdict} — signals confounded`} />
      </KpiBand>

      {/* ---------- pools ---------- */}
      <Section id="pools" title="Pools" aside={<p className="small">Canonical order, oldest to newest · balances at the chain tip, {dateLong(now.date)}</p>}>
        <div className={s.poolgrid}>
          {(['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'] as const).map((k2) => {
            const m = POOL_META[k2];
            return (
              <article className={s.pcard} aria-label={`${POOL_LABEL[k2]} pool`} key={k2}>
                <div className={s.pcH}><span><i className="sw" style={{ background: POOL_COLOR[k2] }} />{POOL_LABEL[k2]}</span></div>
                <div className={s.pcV}>{now[k2] >= 1e6 ? `${num(now[k2] / 1e6, 2)}M` : num(now[k2])}<span>ZEC</span></div>
                <div className={s.pcS}>{pct(share(now[k2]))} of supply · 1y</div>
                <Spark className={s.spark} values={p.year.map((r) => r[k2])} color={POOL_COLOR[k2]} area h={44} />
                <div><span className={`${s.tag}${m.tone ? ` ${s[m.tone]}` : ''}`}>{m.tag}</span></div>
                <p className={s.pcD}>{m.desc}</p>
              </article>
            );
          })}
        </div>
        <article className="card">
          <div className="card-head">
            <div className={s.chHead}>
              <h3 className="h3">How has shielded ZEC moved between pool generations?</h3>
              <p className="takeaway">Ironwood holds <b>{compact(now.ironwood)} ZEC — {num((now.ironwood / now.shielded) * 100)}% of all shielded ZEC</b> — {iw.liveDays} days after launch. Each new pool drains the one before it.</p>
            </div>
            <ChartActions api="daily-stats" name="Shielded ZEC by pool" />
          </div>
          <Legend items={[...(['sprout', 'sapling', 'orchard', 'ironwood'] as const).map((k2) => ({ label: POOL_LABEL[k2], color: POOL_COLOR[k2] })), { label: <span className="muted">Transparent ({compact(now.transparent)}) left out so the shielded layers stay readable</span>, color: 'transparent' }]} />
          <TimeSeriesChart
            dates={p.weekly.map((r) => r.date)}
            series={(['sprout', 'sapling', 'orchard', 'ironwood'] as const).map((k2) => ({ key: k2, label: POOL_LABEL[k2], color: POOL_COLOR[k2], values: p.weekly.map((r) => r[k2]) }))}
            stacked shareToggle ranges={false} showLegend={false} format="zecCompact" height={300}
            events={[{ date: '2022-05-31', label: 'NU5 · Orchard' }, { date: '2026-07-28', label: 'Ironwood launches' }]}
            ariaLabel={`Stacked area of shielded ZEC by pool over five years; Ironwood now holds ${compact(now.ironwood)} ZEC`} />
          <p className="small">Source: per-block pool totals, Zebra full node · last 5 years, weekly · data through {dateLong(p.dataThrough)}</p>
        </article>
      </Section>

      {/* ---------- flows ---------- */}
      <Section id="flows" title="Flows" aside={<p className="small">Every coin entering or leaving a shielded pool crosses the turnstile and is counted exactly</p>}>
        <div className={s.g75}>
          <article className="card">
            <div className="card-head">
              <div className={s.chHead}>
                <h3 className="h3">Is ZEC flowing into shielded pools or out?</h3>
                <p className="takeaway">{p.net7.net >= 0 ? 'In' : 'Out'}: for the last 7 days <b>{num(p.net7.in)} ZEC</b> was shielded and only <b>{num(p.net7.out)}</b> deshielded — net <b>{p.net7.net >= 0 ? '+' : '−'}{num(Math.abs(p.net7.net))} ZEC</b> (prior week {p.net7.prior >= 0 ? '+' : '−'}{num(Math.abs(p.net7.prior))}).</p>
              </div>
              <ChartActions api="daily-stats" name="Shielding flows" />
            </div>
            <Legend items={[{ label: 'Shielded in', color: 'var(--zec)' }, { label: 'Deshielded out', color: 'var(--p-transparent)' }, { label: '7-day average, net', color: 'var(--text)', line: true }]} />
            <TimeSeriesChart
              dates={p.flows.dates}
              series={[
                { key: 'in', label: 'Shielded in', color: 'var(--zec)', type: 'bar', agg: 'mean', values: p.flows.in },
                { key: 'out', label: 'Deshielded out', color: 'var(--p-transparent)', type: 'bar', agg: 'mean', values: p.flows.out },
                { key: 'net', label: '7-day average, net', color: 'var(--text)', values: p.flows.net7 },
              ]}
              format="zecCompact" ranges={false} showLegend={false} zeroBaseline height={260}
              ariaLabel="Daily ZEC shielded (above zero) and deshielded (below zero) over the last 90 days, with the 7-day average net flow" />
            <p className="small">ZEC per day, last 90 days · shielding = transparent → any shielded pool; pool-to-pool migration excluded · data through {dateLong(p.dataThrough)}</p>
          </article>
          <article className="card">
            <div className={s.chHead}>
              <h3 className="h3">What happens to a new transparent coin?</h3>
              <p className="takeaway">Shielded-savings flow is <b>{sav.trend >= 0 ? 'up' : 'down'} {num(Math.abs(sav.trend))}%</b> on the week while exchange-shaped flow is <b>{exb.trend >= 0 ? 'up' : 'down'} {num(Math.abs(exb.trend))}%</b>. Not a signal on its own.</p>
            </div>
            <Legend items={[{ label: 'Last 7 days', color: 'var(--text-2)' }, { label: '7 days before', color: 'transparent' }]} />
            <div>
              {p.buckets.map((b) => {
                const m = BK[b.key];
                const max = Math.max(b.now, b.prev) || 1;
                const d = delta(b.trend, 0);
                return (
                  <div className={s.bk} key={b.key}>
                    <div className={s.bkH}><span className={s.bkN}>{m.n}</span><span className={s.bkV}>{b.now >= 1e6 ? `${num(b.now / 1e6, 2)}M` : num(b.now)} ZEC</span><span className={`delta${d.dir === 'dn' ? ' dn' : ''}`}>{d.text}</span></div>
                    <div className={s.bars} role="img" aria-label={`${num(b.now)} ZEC this week versus ${num(b.prev)} the week before`}>
                      <i style={{ width: `${(b.now / max) * 100}%`, background: m.c }} /><i className={s.prev} style={{ width: `${(b.prev / max) * 100}%` }} />
                    </div>
                    <p className="small">{m.note(b.count)}</p>
                  </div>
                );
              })}
            </div>
            <p className="small">Each row on its own scale. Buckets come from chain shape only (inputs, outputs, dwell time) — no address data. Heuristic, not proof.</p>
            <Link className={s.lnk} href="/activity">Open the transparent activity report <Arrow /></Link>
          </article>
        </div>
      </Section>

      {/* ---------- integrity ---------- */}
      <Section id="integrity" title="Integrity" aside={<p className="small">Turnstile watch: was the 2026 Orchard soundness bug used to mint counterfeit ZEC?</p>}>
        <article className="card">
          <div className={s.intGrid}>
            <div className={s.gwrap}>
              <Gauge value={ti.isi} band={ti.band} />
              <span className={s.verdict}>{ti.verdict} — signals confounded</span>
              <p className="small">Composite inflation suspicion index. Only a turnstile breach is hard proof and would pin it to 100.</p>
              <ul className={s.comp}>
                {comps.map((c) => <li key={c.key}><span>{c.label} · weight {c.weight}</span><b>{num(c.score * 100)}%</b><i style={{ ['--w' as string]: `${c.score * 100}%` }} /></li>)}
              </ul>
            </div>
            <div className="stack" style={{ gap: 16, minWidth: 0 }}>
              <h3 className="h3">Three checks anyone can verify</h3>
              <ul className={s.checks}>
                <li><span className={s.ci}><Icon name="check" size={16} /></span><span className={s.ct}>Pool balance never negative</span><span className={s.cv}>{ti.turnstile.ever_negative ? 'Fail' : 'Pass'}</span><p>Orchard&apos;s balance bottomed out at {num(ti.turnstile.min_balance_zec)} ZEC and never went below zero, so the pool never paid out more than it held.</p></li>
                <li><span className={s.ci}><Icon name="check" size={16} /></span><span className={s.ct}>Flow ↔ balance gap</span><span className={s.cv}>{num(ti.turnstile.reconcile_gap_zec, 2)} ZEC</span><p>Summed shield and deshield flows match the consensus pool balance exactly.</p></li>
                <li><span className={`${s.ci} ${s.n}`}><Icon name={accel < 1 ? 'chevron-down' : 'chevron-up'} size={16} /></span><span className={s.ct}>Deshield rate after disclosure</span><span className={s.cv}>{k(dis.pre_deshield_rate_zec_day)} → {k(dis.post_deshield_rate_zec_day)}/day</span><p>{num(accel, 1)}× the pre-disclosure rate: deshielding <b>{accel < 1 ? 'fell' : 'rose'}</b> after the bug was disclosed on {dateLong(dis.date)}.</p></li>
              </ul>
              <Link className={s.lnk} href="/orchard-turnstile">Read the full Turnstile watch <Arrow /></Link>
            </div>
          </div>
        </article>
      </Section>

      {/* ---------- hygiene ---------- */}
      <Section id="hygiene" title="Privacy hygiene" aside={<p className="small">Practical habits, drawn from {num(ROUND_AMOUNTS.shieldTx)} shielding and {num(ROUND_AMOUNTS.deshieldTx)} deshielding transactions</p>}>
        <div className={s.hyGrid}>
          <article className="card">
            <div className={s.chHead}>
              <span className="kicker">Recommendation</span>
              <h3 className="h3" style={{ fontSize: 17, color: 'var(--value)' }}>Shield in round amounts other people use</h3>
              <p className="takeaway"><b>{ROUND_AMOUNTS.bands.map((b) => num(b.shield[0], b.shield[0] < 1 ? 1 : b.shield[0] % 1 ? 1 : 0)).join(', ').replace(/, ([^,]*)$/, ' and $1')} ZEC</b> are the most-used shielding amounts in their size bands. Using one puts you among tens of thousands of identical transactions.</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={s.amt}>
                <caption className="sr-only">Most-used round amounts per size band</caption>
                <thead><tr><th scope="col">Band, ZEC</th><th scope="col">Shield with</th><th scope="col" className={s.n}>Times used</th><th scope="col" className={s.bar}><span className="sr-only">Compared with runner-up</span></th><th scope="col" className={`${s.n} ${s.ru}`}>Runner-up</th><th scope="col">Deshield with</th></tr></thead>
                <tbody>
                  {ROUND_AMOUNTS.bands.map((b) => (
                    <tr key={b.band}>
                      <td className={s.band}>{b.band}</td>
                      <td className={s.top}>{num(b.shield[0], b.shield[0] % 1 ? 1 : 0)} ZEC</td>
                      <td className={s.n}>{num(b.shield[1])}</td>
                      <td className={s.bar}><i style={{ width: '100%' }} /><i style={{ width: `${(b.runner[1] / b.shield[1]) * 100}%` }} /></td>
                      <td className={`${s.n} ${s.ru}`}>{num(b.runner[0], b.runner[0] % 1 ? 1 : 0)} ZEC · {num(b.runner[1])}</td>
                      <td className={s.top}>{num(b.deshield, b.deshield % 1 ? 1 : 0)} ZEC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AmountLookup />
            <p className="small">Counts: transactions nearest each round amount · generated {dateLong(ROUND_AMOUNTS.generated)} · <Link href="/privacy-suggestions">Privacy tips</Link></p>
          </article>
          <article className="card">
            <div className={s.chHead}>
              <h3 className="h3">How do round trips give people away?</h3>
              <p className="takeaway"><b>{ROUND_TRIPS.total} round trips</b> shielded an unusual amount, then deshielded a near-identical one within 7 days — enough to link both transparent ends.</p>
            </div>
            <div className={s.leakbar} role="img" aria-label={`Of ${ROUND_TRIPS.total} matched round trips: ${ROUND_TRIPS.zec} matched on ZEC amount, ${ROUND_TRIPS.usd} on dollar value, ${ROUND_TRIPS.both} on both`}>
              <i style={{ flex: ROUND_TRIPS.zec, background: 'var(--s2)' }} /><i style={{ flex: ROUND_TRIPS.usd, background: 'var(--s4)' }} /><i style={{ flex: ROUND_TRIPS.both, background: 'var(--s5)' }} />
            </div>
            <ul className={s.lkey}>
              <li><span><i className="sw" style={{ background: 'var(--s2)' }} />ZEC match</span><b>{ROUND_TRIPS.zec}</b></li>
              <li><span><i className="sw" style={{ background: 'var(--s4)' }} />USD match</span><b>{ROUND_TRIPS.usd}</b></li>
              <li><span><i className="sw" style={{ background: 'var(--s5)' }} />Both</span><b>{ROUND_TRIPS.both}</b></li>
            </ul>
            <h4 className="kicker" style={{ margin: '4px 0 0' }}>How to avoid it</h4>
            <ul className={s.dos}>
              <li><span>1</span><span>Shield a common round amount from the table, not an odd one like 546.3379.</span></li>
              <li><span>2</span><span>Don&apos;t deshield the same amount, or the same dollar value, you shielded.</span></li>
              <li><span>3</span><span>Let time pass and spend in different-sized pieces.</span></li>
            </ul>
            <p className="small">Heuristic matches (within 0.5%, $1,000 floor) from pool-level flows — strongly suggestive, not proof of ownership.</p>
            <Link className={s.lnk} href="/wall-of-shame">See the {ROUND_TRIPS.total} matched round trips on the Wall of Shame <Arrow /></Link>
          </article>
        </div>
      </Section>

      {/* ---------- usage ---------- */}
      <Section id="usage" title="Usage" aside={<p className="small">Is shielded Zcash actually being used, not just held?</p>}>
        <div className={`grid2 ${s.grid2}`}>
          <article className="card">
            <div className="card-head">
              <div className={s.chHead}>
                <h3 className="h3">What share of transactions is shielded?</h3>
                <p className="takeaway">{p.txShareLast > 52 ? 'More than half' : p.txShareLast >= 48 ? 'About half' : 'Under half'}: <b>{pct(p.txShareLast)}</b> of transactions on {dateShort(p.last.date)} touched a shielded pool, {p.txShareLast < p.txShareFourWeeks ? 'down' : 'up'} from {pct(p.txShareFourWeeks)} four weeks earlier.</p>
              </div>
              <ChartActions api="daily-stats" name="Shielded share of transactions" />
            </div>
            <Legend items={[{ label: 'Share of daily transactions touching a shielded pool', color: 'var(--zec)', line: true }]} />
            <TimeSeriesChart dates={p.usage.dates} series={[{ key: 'sh', label: 'Shielded share', color: 'var(--zec)', values: p.usage.txShare }]} format="pct" yDomain={[0, 100]} ranges={false} showLegend={false} height={220}
              ariaLabel={`Share of daily transactions touching a shielded pool, last three months; ${pct(p.txShareLast)} on the last full day`} />
            <p className="small">Last 3 months · fixed 0–100% axis · last full day {dateLong(p.last.date)}</p>
          </article>
          <article className="card">
            <div className="card-head">
              <div className={s.chHead}>
                <h3 className="h3">How much Orchard activity stays fully shielded?</h3>
                <p className="takeaway"><b>{pct(p.orchardZzPct)}</b> of Orchard actions on {dateShort(p.orchardZzDate)} were z→z, never touching transparent — though the pool itself is winding down.</p>
              </div>
              <ChartActions api="daily-stats" name="Orchard internal activity" />
            </div>
            <Legend items={[{ label: 'Fully shielded (z→z)', color: 'var(--p-orchard)' }, { label: 'Crossing the turnstile', color: 'var(--p-transparent)' }]} />
            <TimeSeriesChart dates={p.usage.dates} series={[
              { key: 'zz', label: 'Fully shielded (z→z)', color: 'var(--p-orchard)', type: 'bar', values: p.usage.orchardZz },
              { key: 'x', label: 'Crossing the turnstile', color: 'var(--p-transparent)', type: 'bar', values: p.usage.orchardCross },
            ]} stacked format="count" ranges={false} showLegend={false} height={220}
              ariaLabel="Orchard actions per day over the last three months, split into fully shielded and crossing the turnstile" />
            <p className="small">Orchard actions per day, last 3 months · Ironwood internal activity is not published</p>
          </article>
        </div>
        <article className="card">
          <div className="card-head">
            <div className={s.chHead}><h3 className="h3">Every privacy chart</h3><p className="note">Ten charts, each with full history, range control and CSV.</p></div>
            <Link className={s.lnk} href="/charts">All charts <Arrow /></Link>
          </div>
          <div className={s.rows}>
            {PRIVACY_CHARTS.map((slug) => {
              const r = rows.get(slug);
              const v = r?.value ?? fallback[slug];
              return (
                <Link className={s.row} href={`/chart/${slug}`} key={slug}>
                  <span className={s.n}>{r?.title ?? slug}</span>
                  <span className={`${s.v}${v ? '' : ` ${s.na}`}`}>{v ?? 'unavailable'}</span>
                  <span className={s.go} aria-hidden="true">→</span>
                </Link>
              );
            })}
          </div>
        </article>
      </Section>

      <More summary="How these privacy numbers are computed">
        <p className="note">Pool balances and every shield/deshield flow are exact: they come from consensus-enforced per-block pool totals on our Zebra node. What stays hidden is everything inside a pool — who holds what, and who pays whom. Transparent-activity buckets, round-trip matches and the suspicion index are heuristics built on top of those exact totals, and are labelled as such. Dollar values use {usd(p.price)} ({dateLong(now.date)}).</p>
        <p className="note">Shielding counts value moving from transparent into any shielded pool; value moving straight from Orchard into Ironwood is pool-to-pool and is left out of both sides. The round-amount table and the round-trip counts are taken from the Privacy tips and Wall of Shame pages, generated {dateLong(ROUND_AMOUNTS.generated)}.</p>
      </More>

      <div className={s.readNext}>
        <Tiles items={[
          { href: '/ironwood', title: 'Ironwood tracker', desc: 'Daily crossings, sizes and sources', value: <>{num(iw.pct, 2)}% <span className={s.unit}>crossed</span></> },
          { href: '/chart/pools', title: 'Shielded pool balances', desc: 'Full history with a share toggle', value: <>{compact(now.shielded)} <span className={s.unit}>ZEC</span></> },
          { href: '/shield-hops', title: 'Shield-bound hop sizes', desc: 'How much moves when a coin shields', value: <>{num(hop.median, 2)} <span className={s.unit}>ZEC median</span></> },
          { href: '/orchard-turnstile', title: 'Turnstile watch', desc: 'The full five-test investigation', value: <>{Math.round(ti.isi)}/100 <span className={s.unit}>{ti.verdict.toLowerCase()}</span></> },
        ]} />
      </div>
    </div>
  );
}
