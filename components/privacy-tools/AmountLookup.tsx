'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Card } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import { num } from '@/lib/format';
import { ColumnChart } from './ColumnChart';
import { ramt } from './fmt';
import ui from './ui.module.css';
import s from './amount.module.css';

// Amount lookup. Asks /api/amount-suggest (the live index: exact-amount counts + nearby used amounts). When that
// answer is not available — the snapshot only holds the endpoint's "enter an amount" reply — it falls back to what
// the snapshot does hold: the bucket counts of /api/shielding-histogram and the ranked round amounts behind Privacy tips.

type Dir = 'shield' | 'deshield';
export type LookupBucket = { bucket: string; lo: number; hi: number | null; shield: number; deshield: number };
export type LookupRound = { dir: Dir; items: [number, number][] };
type LiveOption = { amount: number; count: number; matched: boolean; delta_pct: number };
type Live = { rounded_to: number; yours?: { count: number; matched: boolean } | null; options: LiveOption[] };
type Result = { kind: 'live'; amount: number; dir: Dir; d: Live } | { kind: 'snap'; amount: number; dir: Dir; why: string } | { kind: 'err'; msg: string };

const EXAMPLES = ['0.1', '2.5', '10', '546.3379'];
const verb = (d: Dir) => (d === 'shield' ? 'shielded' : 'deshielded');
const noun = (d: Dir, n = 2) => (d === 'shield' ? (n === 1 ? 'shield' : 'shields') : n === 1 ? 'deshield' : 'deshields');

function MatchBadge({ m }: { m: boolean }) {
  return <span className={`${ui.pill}${m ? ` ${ui.warn}` : ''}`}><i aria-hidden="true" />{m ? 'matched' : 'unmatched'}</span>;
}

export function AmountLookup({ initialAmount, initialDir, buckets, rounds }: { initialAmount?: string; initialDir?: Dir; buckets: LookupBucket[]; rounds: LookupRound[] }) {
  const [amount, setAmount] = useState(initialAmount ?? '');
  const [dir, setDir] = useState<Dir>(initialDir ?? 'shield');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [sortUsed, setSortUsed] = useState(false);

  const run = useCallback(async (raw: string, d: Dir) => {
    const a = parseFloat(raw.replace(/,/g, ''));
    if (!(a > 0) || a > 1e9) { setRes({ kind: 'err', msg: 'Enter an amount between 0 and 1,000,000,000 ZEC.' }); return; }
    setBusy(true);
    try { history.replaceState(null, '', `?amount=${encodeURIComponent(String(a))}&dir=${d}`); } catch { /* ignore */ }
    let why = 'The exact-amount index is not part of this snapshot.';
    try {
      const r = await fetch(`/api/amount-suggest?amount=${encodeURIComponent(String(a))}&dir=${d}`);
      const j = await r.json();
      if (j && Array.isArray(j.options)) { setRes({ kind: 'live', amount: a, dir: d, d: j as Live }); setBusy(false); return; }
      if (j?.status) why = String(j.status);
    } catch { why = 'The lookup service did not answer.'; }
    setRes({ kind: 'snap', amount: a, dir: d, why });
    setBusy(false);
  }, []);

  useEffect(() => { if (initialAmount) void run(initialAmount, initialDir ?? 'shield'); }, [initialAmount, initialDir, run]);

  const submit = (e: FormEvent) => { e.preventDefault(); void run(amount, dir); };
  const curDir = res && res.kind !== 'err' ? res.dir : dir;
  const curAmt = res && res.kind !== 'err' ? res.amount : null;
  const hitIdx = curAmt == null ? -1 : buckets.findIndex((b) => curAmt >= b.lo && (b.hi == null || curAmt < b.hi));
  const hit = hitIdx >= 0 ? buckets[hitIdx] : null;

  // nearest ranked round amounts (by ratio distance)
  const near = curAmt == null ? [] : (rounds.find((r) => r.dir === curDir)?.items ?? [])
    .map(([x, c]) => ({ amount: x, count: c, delta: ((x - curAmt) / curAmt) * 100, dist: Math.abs(Math.log(x / curAmt)) }))
    .sort((p, q) => p.dist - q.dist).slice(0, 6);
  const best = near.length ? near.reduce((p, q) => (q.count > p.count && q.dist < 0.7 ? q : p), near[0]) : null;
  const isRound = near[0] && Math.abs(near[0].delta) < 0.01;

  const opts = res?.kind === 'live' ? [...res.d.options].sort((p, q) => (sortUsed ? q.count - p.count : Math.abs(p.delta_pct) - Math.abs(q.delta_pct))) : [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="hero" aria-labelledby="h-lookup">
        <h2 className="sr-only" id="h-lookup">Look up an amount</h2>
        <form className={s.form} onSubmit={submit}>
          <div className={s.fld}>
            <label htmlFor="as-amt">Amount</label>
            <span className={s.inp}><input id="as-amt" type="text" inputMode="decimal" autoComplete="off" placeholder="e.g. 12.5" value={amount} onChange={(e) => setAmount(e.target.value)} /><span className={s.unit}>ZEC</span></span>
          </div>
          <div className={s.fld}>
            <span className={s.lb} id="as-dir">Direction</span>
            <div className="seg" role="group" aria-labelledby="as-dir">
              <button type="button" aria-pressed={dir === 'shield'} onClick={() => setDir('shield')}>Shield t→z</button>
              <button type="button" aria-pressed={dir === 'deshield'} onClick={() => setDir('deshield')}>Deshield z→t</button>
            </div>
          </div>
          <button className={`btn primary ${s.go}`} type="submit" disabled={busy}>{busy ? 'Checking…' : 'Check'}</button>
          <div className={s.try}>
            <span className="small">Try</span>
            {EXAMPLES.map((x) => <button key={x} type="button" className="chip" onClick={() => { setAmount(x); void run(x, dir); }}>{x}</button>)}
          </div>
        </form>

        <div aria-live="polite" className={s.out}>
          {!res && (
            <p className="note">Enter the amount you plan to {dir === 'shield' ? 'shield' : 'deshield'}. You will see how many past transactions share it, and which nearby round amount has the biggest crowd.</p>
          )}
          {res?.kind === 'err' && <p className="note" role="alert">{res.msg}</p>}

          {res?.kind === 'live' && (
            <div className={ui.heroSplit}>
              <div className="stack" style={{ gap: 10 }}>
                <span className={ui.heroK}>{ramt(res.d.rounded_to)} ZEC · {verb(res.dir)}</span>
                <div className="figure md">{num(res.d.yours?.count ?? 0)}<small>{res.d.yours?.count === 1 ? 'time' : 'times'}</small></div>
                <p className="note" style={{ fontSize: 15 }}>
                  {res.d.yours && res.d.yours.count > 0
                    ? <>Your amount has been {verb(res.dir)} <b className="value">{num(res.d.yours.count)}</b> {res.d.yours.count === 1 ? 'time' : 'times'} · <MatchBadge m={res.d.yours.matched} /></>
                    : <>Nobody has {verb(res.dir)} exactly this amount — you would stand out. Pick a nearby amount with more cover.</>}
                </p>
              </div>
              <div className="tbl-wrap">
                <table className="t">
                  <caption className="sr-only">Nearby amounts used for {res.dir === 'shield' ? 'shielding' : 'deshielding'}</caption>
                  <thead><tr><th scope="col">Amount</th><th scope="col" aria-sort={sortUsed ? 'descending' : undefined}><button type="button" className="linkish" style={{ color: 'inherit' }} onClick={() => setSortUsed((v) => !v)}>Used {sortUsed ? '▼' : ''}</button></th><th scope="col" style={{ textAlign: 'left' }}>Both sides?</th><th scope="col">vs yours</th></tr></thead>
                  <tbody>
                    {opts.map((o) => (
                      <tr key={o.amount} style={Math.abs(o.amount - res.d.rounded_to) < 1e-9 ? { background: 'var(--accent-wash)' } : undefined}>
                        <td>{ramt(o.amount)} ZEC</td><td>{num(o.count)}</td><td style={{ textAlign: 'left' }}><MatchBadge m={o.matched} /></td><td>{o.delta_pct > 0 ? '+' : ''}{o.delta_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {res?.kind === 'snap' && (
            <div className={ui.heroSplit}>
              <div className="stack" style={{ gap: 10 }}>
                <span className={ui.heroK}>{ramt(res.amount)} ZEC · {res.dir === 'shield' ? 'shielding' : 'deshielding'} · bucket {hit?.bucket ?? '—'} ZEC</span>
                <div className="figure md">{hit ? num(hit[res.dir]) : '—'}<small>{noun(res.dir)}</small></div>
                <p className="note" style={{ fontSize: 15 }}>
                  {hit ? <>moved between <b className="value">{ramt(hit.lo)}</b> and <b className="value">{hit.hi == null ? 'any size' : `${ramt(hit.hi)} ZEC`}</b> — the band your amount falls in. </> : null}
                  {isRound
                    ? <>{ramt(near[0].amount)} ZEC is itself one of the most-used round amounts: <b className="value">{num(near[0].count)}</b> {noun(res.dir)} sit nearest it.</>
                    : best ? <>The biggest nearby crowd is <b className="value">{ramt(best.amount)} ZEC</b> ({num(best.count)} {noun(res.dir)}, {best.delta > 0 ? '+' : ''}{best.delta.toFixed(1)}% from yours).</> : null}
                </p>
                <p className="small"><Icon name="info" size={13} /> {res.why} Exact counts for {ramt(res.amount)} ZEC come from the live index; the figure above is the size of its amount band.</p>
              </div>
              <div className="tbl-wrap">
                <table className="t">
                  <caption className="sr-only">Nearest popular round amounts</caption>
                  <thead><tr><th scope="col">Nearest round amounts</th><th scope="col">Nearby {noun(res.dir)}</th><th scope="col">vs yours</th></tr></thead>
                  <tbody>
                    {near.map((o) => (
                      <tr key={o.amount} style={best && o.amount === best.amount ? { background: 'var(--accent-wash)' } : undefined}>
                        <td>{ramt(o.amount)} ZEC{best && o.amount === best.amount ? <span className="muted" style={{ marginLeft: 8 }}>biggest crowd</span> : null}</td>
                        <td>{num(o.count)}</td>
                        <td>{Math.abs(o.delta) < 0.01 ? 'same' : `${o.delta > 0 ? '+' : '−'}${Math.abs(o.delta) >= 100 ? num(Math.abs(o.delta), 0) : Math.abs(o.delta).toFixed(1)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      <Card
        title={`Where does your amount sit among all ${noun(curDir)}?`}
        takeaway={hit
          ? <>Your amount falls in the <b>{hit.bucket} ZEC</b> band, which holds <b>{num(hit[curDir])}</b> {noun(curDir)} — {((hit[curDir] / buckets.reduce((a, b) => a + b[curDir], 0)) * 100).toFixed(1)}% of all.</>
          : <>Most shields and deshields move between <b>2 and 25 ZEC</b>; amounts above 1,000 ZEC are rare and easy to spot.</>}
        foot="All-time transactions per amount band, Sprout + Sapling + Orchard + Ironwood · from /api/shielding-histogram"
      >
        <ColumnChart
          categories={buckets.map((b) => b.bucket)}
          series={curDir === 'shield'
            ? [{ key: 's', label: 'Shields', color: 'var(--s2)', values: buckets.map((b) => b.shield) }, { key: 'd', label: 'Deshields', color: 'var(--p-transparent)', values: buckets.map((b) => b.deshield) }]
            : [{ key: 'd', label: 'Deshields', color: 'var(--s2)', values: buckets.map((b) => b.deshield) }, { key: 's', label: 'Shields', color: 'var(--p-transparent)', values: buckets.map((b) => b.shield) }]}
          highlight={hitIdx >= 0 ? [{ index: hitIdx, color: 'var(--accent)' }] : []}
          format="countCompact"
          height={260}
          tipTitle={{ suffix: ' ZEC' }}
          ariaLabel="Columns: cumulative count of shielding and deshielding transactions by amount band, from under 0.01 ZEC to over 10,000 ZEC, all pools combined."
        />
        <div className="legend" aria-hidden="true">
          <span><i className="sw" style={{ background: 'var(--s2)' }} />{curDir === 'shield' ? 'Shields' : 'Deshields'}</span>
          <span><i className="sw" style={{ background: 'var(--p-transparent)' }} />{curDir === 'shield' ? 'Deshields' : 'Shields'}</span>
          {hitIdx >= 0 && <span><i className="sw" style={{ background: 'var(--accent)' }} />Your band</span>}
        </div>
      </Card>
    </div>
  );
}
