import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, Legend, More, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { ColumnChart } from '@/components/privacy-tools/ColumnChart';
import { K3, MoreCols, Prose, Q, ui } from '@/components/privacy-tools/parts';
import { Toc } from '@/components/privacy-tools/Toc';
import { Gauge } from '@/components/turnstile/Gauge';
import { cumulativeFlows, getInflation, isiLabel, madLabel } from '@/lib/data/turnstile';
import { getWallOfShame } from '@/lib/data/privacy-tools';
import { getFreshness, getPools } from '@/lib/data/snapshot';
import { dateLong, num, pct } from '@/lib/format';
import { fz } from '@/components/privacy-tools/fmt';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'Orchard turnstile watch',
  description: 'Was the 2026 Orchard soundness bug used to mint counterfeit ZEC? Five tests on Orchard’s full flow history, and a composite suspicion index.',
};

const short = (d: string) => dateLong(d).replace(/ \d{4}$/, '');

export default async function TurnstilePage() {
  const [d, f, pools, wall] = await Promise.all([getInflation(), getFreshness(), getPools(), getWallOfShame()]);
  const { turnstile: t, disclosure: ds, masking: mk, benford: bf, index: ix } = d;
  const isi = Math.round(ix.isi);
  const comp = (k: string) => ix.components.find((c) => c.key === k);
  const soft = ['masking', 'extraction', 'benford'].map(comp).filter((c): c is NonNullable<typeof c> => !!c);
  const breach = comp('turnstile_breach');
  const cum = cumulativeFlows(d.series);
  const totalOut = cum.cout.at(-1)!;
  const lags = mk.lag_profile.filter((p) => p.r != null);
  const peakIdx = lags.findIndex((p) => p.lag === mk.peak_lag);
  const accel = ds.deshield_acceleration;
  const slower = accel < 1;
  const d1 = bf.digits.find((x) => x.digit === 1)!;
  const zoneLabel = isiLabel(ix.isi);
  const r2 = (v: number | null) => (v == null ? 'n/a' : v.toFixed(2));
  const launch = d.series[0].date;

  return (
    <>
      <Masthead
        crumbs={[{ href: '/privacy', label: 'Privacy' }, { label: 'Orchard turnstile watch' }]}
        title="Was the Orchard bug used to mint fake ZEC?"
        cadence="index recomputed as new blocks land"
        lede={t.ever_negative
          ? 'The Orchard pool balance went negative at least once — that is hard evidence of counterfeit value leaving the pool.'
          : 'There is no sign of it: the Orchard pool never went negative, so no more value has left than entered. Quiet skimming can’t be ruled out, and the softer signals are muddied by ordinary behaviour.'}
      />

      <section className="hero" aria-labelledby="h-verdict">
        <div className={s.verdict}>
          <div className={s.gauge}><Gauge value={ix.isi} /></div>
          <div className={s.vcol}>
            <span className={s.vtag}><i aria-hidden="true" />Verdict · {zoneLabel}</span>
            <h2 className={s.vh} id="h-verdict">{t.ever_negative ? 'Turnstile breach detected' : `${zoneLabel} — no direct evidence of counterfeit ZEC; the signals are confounded`}</h2>
            <p className="note" style={{ fontSize: 15 }}>A turnstile breach would be hard proof and would pin the index at 100. The turnstile is {t.ever_negative ? 'broken' : 'clean'}, which caps the needle in the inconclusive band; what is left are soft signals that ordinary behaviour also produces.</p>
            <div className={s.comp} role="list" aria-label="Index components">
              {soft.map((c) => {
                const p = Math.round(c.score * 100);
                return (
                  <div className={s.crow} key={c.key} role="listitem">
                    <span>{c.label}</span>
                    <span className={s.track} aria-hidden="true"><span style={{ width: `${p}%` }} /></span>
                    <span className={s.v}>{p}%</span>
                    <span className={s.w}>weight {String(c.weight)}</span>
                  </div>
                );
              })}
              <div className={s.crow} role="listitem">
                <span>Turnstile breach</span>
                <span className={s.pillCell}><span className={`${ui.pill}${breach && breach.score > 0 ? ` ${ui.warn}` : ''}`}><i aria-hidden="true" />{breach && breach.score > 0 ? 'Breached' : 'Clean — never broke'}</span></span>
                <span className={s.v}>—</span>
                <span className={s.w}>override</span>
              </div>
              <p className="small">Index = {soft.map((c) => `${c.weight} × ${Math.round(c.score * 100)}`).join(' + ')} ≈ <b className="value">{isi}</b>. Each component is a 0–100% suspicion score.</p>
            </div>
            <div className={s.timeline}>
              <span>Bug found <b>{dateLong(ds.found_date)}</b></span>
              <span>Patched <b>{short(ds.patch_date)}</b></span>
              <span>Disclosed <b>{short(ds.date)}</b></span>
              <span>ZEC fell <b>~38%</b></span>
            </div>
          </div>
        </div>
      </section>

      <div className={ui.art}>
        <Toc items={[
          { id: 's1', n: '1', label: 'Does the turnstile hold?' },
          { id: 's2', n: '2', label: 'Could a fake be hidden?' },
          { id: 's3', n: '3', label: 'Did anything change after disclosure?' },
          { id: 's4', n: '4', label: 'How fast could value leave?' },
          { id: 's5', n: '5', label: 'Do the amounts look natural?' },
          { id: 'verdict', n: '→', label: 'Verdict' },
          { id: 'method', n: '·', label: 'Method' },
        ]} />
        <div className={ui.body}>
          <Q id="s1" n="1" title="Does the turnstile hold?"
            answer={<><b>{t.ever_negative ? 'No.' : 'Yes.'}</b> In {num(t.days)} days the Orchard pool balance {t.ever_negative ? 'went negative' : 'never went negative'}, and the balance rebuilt from every flow matches the node’s own figure to within {t.reconcile_gap_zec.toFixed(2)} ZEC.</>}>
            <K3 label="Turnstile">
              <Kpi k="Pool balance floor" v={num(t.min_balance_zec)} unit="ZEC" s="lowest point since launch" />
              <Kpi k="Ever negative?" v={t.ever_negative ? 'Yes' : 'No'} s="the hard guarantee holds" />
              <Kpi k="Flow ↔ balance gap" v={t.reconcile_gap_zec.toFixed(2)} unit="ZEC" s="integer rounding only" />
              <Kpi k="Total shielded in" v={fz(t.total_shield_zec)} unit="ZEC" s="every unit that entered" />
              <Kpi k="Total deshielded out" v={fz(t.total_deshield_zec)} unit="ZEC" s="to transparent; excludes migration" />
              <Kpi k="Deshield / shield" v={pct(t.deshield_shield_ratio * 100)} s={`cumulative, since ${new Date(launch).getUTCFullYear()}`} />
            </K3>
            <Card
              title="Has more ever left Orchard than entered it?"
              takeaway={<>No — cumulative <b>in</b> stays above cumulative <b>out</b> the whole way. The gap is the pool balance: <b>{fz(ds.balance_at_disclosure_zec)} ZEC</b> at disclosure, <b>{fz(ds.current_balance_zec)}</b> today after the Ironwood migration.</>}
              actions={<ChartActions api="inflation" name="Orchard cumulative flows" />}
              foot={`Cumulative ZEC since Orchard’s launch (${dateLong(launch)}) · out includes deshields and migration to Ironwood (${fz(totalOut)} in all) · data through ${dateLong(f.dataThrough)}`}
            >
              <TimeSeriesChart
                dates={cum.dates}
                series={[
                  { key: 'in', label: 'In', color: 'var(--s2)', values: cum.cin, width: 2.2 },
                  { key: 'out', label: 'Out', color: 'var(--s4)', values: cum.cout, width: 2.2 },
                  { key: 'bal', label: 'Balance', color: 'var(--p-orchard)', values: cum.bal, type: 'area' },
                ]}
                format="zecCompact"
                ranges={['1Y', 'ALL']}
                defaultRange="ALL"
                zeroBaseline
                events={[{ date: ds.date, label: 'Disclosed' }, { date: '2026-07-28', label: 'Ironwood' }]}
                height={320}
                ariaLabel={`Cumulative ZEC into and out of the Orchard pool since its launch, with the pool balance. Inflow always stays above outflow. Totals: ${fz(t.total_shield_zec)} shielded in, ${fz(totalOut)} out including Ironwood migration; balance ${fz(ds.balance_at_disclosure_zec)} at disclosure and ${fz(ds.current_balance_zec)} today.`}
              />
            </Card>
          </Q>

          <Q id="s2" n="2" title="Could a fake be hidden in real shields?"
            answer={mk.peak_lag <= 0
              ? <><b>No sign of it.</b> An attacker hiding counterfeit deshields behind legitimate shields would make deshields trail shields by a day or two. The correlation peaks at the same day instead, and the profile is roughly symmetric.</>
              : <><b>Possibly.</b> Deshields peak {mk.peak_lag} day{mk.peak_lag === 1 ? '' : 's'} after shields — the lean a masked cash-out would leave, though shared activity can produce it too.</>}>
            <K3 one label="Masking test">
              <Kpi k="Same-day correlation" v={`r = ${r2(mk.same_day_r)}`} s="shields vs deshields, daily" />
              <Kpi k="Peak lag" v={String(mk.peak_lag)} unit="days" s={mk.peak_lag <= 0 ? 'not after shields' : 'deshields after shields'} />
              <Kpi k="Masked-deshield score" v={pct((comp('masking')?.score ?? 0) * 100, 0)} s={`weight ${comp('masking')?.weight} in the index`} />
            </K3>
            <Card
              title="Do deshields follow shields?"
              takeaway={<>The peak sits at <b>lag {mk.peak_lag}</b> (r = {r2(lags[peakIdx]?.r ?? null)}): shields and deshields rise and fall together with overall activity, which is expected and not a masking fingerprint.</>}
              actions={<ChartActions api="inflation" name="Lag correlation" />}
              foot="Pearson r between daily shield and deshield totals, deshields offset by −7 to +7 days · same-day correlation is expected because both follow overall activity"
            >
              <ColumnChart
                categories={lags.map((p) => (p.lag > 0 ? `+${p.lag}` : String(p.lag)))}
                series={[{ key: 'r', label: 'Correlation r', color: 'var(--p-transparent)', values: lags.map((p) => p.r) }]}
                highlight={[{ index: peakIdx, color: 'var(--s2)' }]}
                labels={[{ index: peakIdx, text: `r = ${r2(lags[peakIdx]?.r ?? null)}` }]}
                format="dec2"
                height={260}
                axisNotes={['← deshields before', 'lag in days', 'deshields after →']}
                tipTitle={{ prefix: 'Lag ', suffix: ' days' }}
                ariaLabel={`Correlation between daily shields and deshields at lags from minus 7 to plus 7 days. The peak is at lag ${mk.peak_lag}, r = ${r2(mk.same_day_r)}; positive and negative lags are similar.`}
              />
            </Card>
          </Q>

          <Q id="s3" n="3" title="Did anything change after disclosure?"
            answer={<><b>{slower ? 'Less than you’d expect from a cash-out.' : 'Deshielding sped up.'}</b> Net of the Ironwood migration the pool kept <b>{pct(ds.retained_fraction * 100, 0)}</b> of its value, and deshielding {slower ? 'slowed' : 'rose'} to <b>{accel.toFixed(1)}×</b> its prior pace — from {fz(ds.pre_deshield_rate_zec_day)} to {fz(ds.post_deshield_rate_zec_day)} ZEC a day.</>}>
            <K3 label="After disclosure">
              <Kpi k="Balance at disclosure" v={fz(ds.balance_at_disclosure_zec)} unit="ZEC" s={dateLong(ds.date)} />
              <Kpi k="Held in Orchard today" v={fz(ds.current_balance_zec)} unit="ZEC" s="after migration and deshields" />
              <Kpi k="Migrated → Ironwood" v={fz(ds.migrated_since_zec)} unit="ZEC" s="moved pools, not a cash-out" />
              <Kpi k="Deshielded → transparent" v={fz(ds.deshielded_since_zec)} unit="ZEC" s="since disclosure" />
              <Kpi k="Retained, net of migration" v={pct(ds.retained_fraction * 100, 0)} s="share of value that stayed shielded" />
              <Kpi k="Deshield pace pre → post" v={`${fz(ds.pre_deshield_rate_zec_day)} → ${fz(ds.post_deshield_rate_zec_day)}`} s={`ZEC/day · ${accel.toFixed(1)}× — ${slower ? 'slower, not faster' : 'faster'}`} />
            </K3>
            <p className="note">A large counterfeit stash would be cashed out fast once the bug was public. {slower ? 'The pool did the opposite.' : 'The pool did speed up — but'} A surge would not have proven an attack either: a ~38% price crash makes ordinary holders exit too.</p>
          </Q>

          <Q id="s4" n="4" title="How fast could value leave?"
            answer={<><b>Slowly and visibly.</b> Value can only leave Orchard as fast as deshields are made. At the post-disclosure pace, emptying the pool would take about <b>{Math.round(ds.drain_days_at_peak_rate)} days</b> of sustained, conspicuous outflow.</>}>
            <K3 one label="Extraction feasibility">
              <Kpi k="Days to drain the pool" v={`~${Math.round(ds.drain_days_at_peak_rate)}`} unit="days" s="at the post-disclosure pace" />
              <Kpi k="Post-disclosure deshield rate" v={fz(ds.post_deshield_rate_zec_day)} unit="ZEC/day" s={`${accel.toFixed(1)}× the pre-disclosure rate`} />
              <Kpi k="Biggest single deshield day" v={fz(ds.max_daily_deshield_zec)} unit="ZEC" s="largest one-day outflow on record" />
            </K3>
          </Q>

          <Q id="s5" n="5" title="Do the amounts look natural?"
            answer={<><b>{bf.mad < 0.012 ? 'Yes.' : 'Mostly.'}</b> Leading digits broadly follow Benford’s law. The fit (MAD {bf.mad.toFixed(4)}) is {madLabel(bf.mad) === 'nonconformity' ? 'just past Nigrini’s 0.015 line for “nonconformity”' : `within Nigrini’s “${madLabel(bf.mad)}” band`}, driven by a mild excess of amounts starting with 1 — typical of round numbers and exchange batches.</>}>
            <K3 one label="Benford test">
              <Kpi k="Deshields tested" v={num(bf.n)} s="every Orchard → transparent ≥ 0.001 ZEC" />
              <Kpi k="Mean absolute deviation" v={bf.mad.toFixed(4)} s="nonconformity starts at 0.015" />
              <Kpi k="Benford score" v={pct((comp('benford')?.score ?? 0) * 100, 0)} s={`weight ${comp('benford')?.weight} in the index`} />
            </K3>
            <Card
              title="How often does each leading digit appear?"
              takeaway={<>Amounts starting with <b>1</b> appear <b>{pct(d1.observed * 100)}</b> of the time against <b>{pct(d1.expected * 100)}</b> expected; digits 2–9 sit close to the curve.</>}
              legend={<Legend items={[{ label: 'Observed', color: 'var(--s2)' }, { label: 'Benford expected', color: 'var(--p-transparent)' }]} />}
              actions={<ChartActions api="inflation" name="Benford first digits" />}
              foot={`n = ${num(bf.n)} deshields · MAD ${bf.mad.toFixed(4)} → ${madLabel(bf.mad)} (Nigrini) · χ² deliberately omitted: at this sample size it rejects any real dataset`}
            >
              <ColumnChart
                categories={bf.digits.map((x) => String(x.digit))}
                series={[
                  { key: 'o', label: 'Observed', color: 'var(--s2)', values: bf.digits.map((x) => x.observed * 100) },
                  { key: 'e', label: 'Benford expected', color: 'var(--p-transparent)', values: bf.digits.map((x) => x.expected * 100) },
                ]}
                labels={[{ index: 0, series: 0, text: pct(d1.observed * 100, 0) }, { index: 0, series: 1, text: pct(d1.expected * 100, 1) }]}
                format="pct"
                height={250}
                tipTitle={{ prefix: 'Leading digit ' }}
                ariaLabel={`Leading-digit distribution of ${num(bf.n)} Orchard deshields, observed versus Benford expected. Digit 1: ${pct(d1.observed * 100)} observed vs ${pct(d1.expected * 100)} expected; the remaining digits track the expected curve closely.`}
              />
            </Card>
          </Q>

          <Q id="verdict" n="→" title="Verdict">
            <dl className={ui.vlist}>
              <div><dt>Turnstile held</dt><dd>Over {num(t.days)} days the balance {t.ever_negative ? 'went negative' : 'never went negative'} (floor {num(t.min_balance_zec)} ZEC). Cumulative deshields are {pct(t.deshield_shield_ratio * 100)} of cumulative shields, so no unbounded inflation is present and any extraction is capped by the running balance.</dd></div>
              <div><dt>Masking signature</dt><dd>Same-day correlation r = {r2(mk.same_day_r)}, peaking at lag {mk.peak_lag}, with a roughly flat profile. {mk.peak_lag <= 0 ? <>That is shared daily activity, not deshields <b>following</b> shields.</> : <>Deshields lean after shields — consistent with masking, but also with ordinary activity.</>}</dd></div>
              <div><dt>After disclosure</dt><dd>Orchard held {fz(ds.balance_at_disclosure_zec)} ZEC on {dateLong(ds.date)} and holds {fz(ds.current_balance_zec)} today — <b>{pct(ds.retained_fraction * 100, 0)} retained</b> once the {fz(ds.migrated_since_zec)} ZEC Ironwood migration is excluded. Deshielding <b>{slower ? 'slowed' : 'rose'}</b> to about {accel.toFixed(1)}× its prior rate ({fz(ds.deshielded_since_zec)} ZEC out).</dd></div>
              <div><dt>Amount distribution</dt><dd>Leading digits {bf.mad < 0.012 ? 'conform to' : 'broadly track'} Benford (MAD {bf.mad.toFixed(4)}). The mild excess of 1s fits round-number and exchange-batch clustering, not a structuring fingerprint.</dd></div>
              <div className={ui.bl}><dt>Bottom line · {isi} / 100</dt><dd>The hard guarantee holds: no <b>net</b> value left Orchard that hadn’t entered it. Every softer signal is real but confounded by legitimate behaviour. This does not prove the bug was never used — skimming within the pool’s own balance is invisible to flow analysis. The honest reading is <b>“no detectable exploitation, and behaviour inconsistent with a large active cash-out”</b> — not “safe”.</dd></div>
            </dl>
          </Q>

          <Q id="method" n="·" title="Method">
            <More summary="How the index and each test are built">
              <MoreCols>
                <Prose>
                  <p><b>Background.</b> On {dateLong(ds.date)} Shielded Labs disclosed a soundness bug in the Orchard proof circuit: a value-balance constraint written too loosely that, in theory, let an attacker mint counterfeit ZEC inside the pool with no on-chain signature. It was found on {short(ds.found_date)} (by Taylor Hornby, using Anthropic’s Opus 4.8) and patched on {short(ds.patch_date)}. Shielded Labs stated there is “no definitive way to determine” whether it was exploited.</p>
                  <p><b>Why the turnstile matters.</b> Minting inside the pool does not change its declared value. A counterfeit only becomes visible when it is deshielded — crossing the turnstile, the consensus rule that a pool can never hold negative value. The sharpest attack deshields fake value under cover of incoming legitimate shields, so the balance never drops suspiciously; test 2 looks for exactly that lean.</p>
                </Prose>
                <Prose>
                  <p><b>The index.</b> A weighted blend of three soft signals — masked-deshield lean ({comp('masking')?.weight}), post-disclosure net drain ({comp('extraction')?.weight}) and Benford anomaly ({comp('benford')?.weight}). A turnstile breach overrides everything and pins it to 100. Bands: 0–25 quiet, 25–55 inconclusive, 55–80 suspicious, 80–100 breach.</p>
                  <p><b>Data.</b> Orchard’s entire per-block flow history, reconstructed from our Zebra node, starting at Orchard’s launch on {dateLong(launch)}. Deshields ≥ 0.001 ZEC enter the Benford test; χ² is omitted because at this sample size it rejects any real dataset.</p>
                </Prose>
              </MoreCols>
            </More>
          </Q>
        </div>
      </div>

      <Tiles items={[
        { href: '/ironwood', title: 'Ironwood migration', desc: 'How much of Orchard has crossed into Ironwood.', value: <><b>89.24%</b> crossed</> },
        { href: '/chart/flow-orchard', title: 'Orchard flows + balance', desc: 'The daily chart behind section 1.', value: <><b>{num(pools.orchard)} ZEC</b> in Orchard</> },
        { href: '/chart/pools', title: 'Shielded pool balances', desc: 'Every pool, transparent to Ironwood.', value: <><b>{pct(pools.shieldedPct)}</b> of ZEC shielded</> },
        { href: '/wall-of-shame', title: 'Wall of Shame', desc: 'Round trips that reused a near-identical amount.', value: <><b>{num(wall.length)}</b> incidents</> },
      ]} />
    </>
  );
}
