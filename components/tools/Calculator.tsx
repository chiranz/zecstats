'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TimeSeriesChart, type Series } from '@/components/charts/TimeSeriesChart';
import { Icon } from '@/components/ui/Icon';
import { dateLong, delta, num, usd } from '@/lib/format';
import type { PriceArrays } from '@/lib/data/tools';
import { CopyButton } from './CopyButton';
import { runDca, yearsBefore, type DcaResult, type Freq } from './dca';
import s from './calc.module.css';
import { replaceQuery } from '@/components/tools/browser';

const FREQS: { key: Freq; label: string; noun: string; per: string }[] = [
  { key: 'daily', label: 'Day', noun: 'daily', per: 'a day' },
  { key: 'weekly', label: 'Week', noun: 'weekly', per: 'a week' },
  { key: 'monthly', label: 'Month', noun: 'monthly', per: 'a month' },
  { key: 'quarterly', label: 'Quarter', noun: 'quarterly', per: 'a quarter' },
];
type AssetKey = 'zec' | 'btc';
const ASSET: Record<AssetKey, { label: string; color: string }> = { zec: { label: 'Zcash', color: 'var(--zec)' }, btc: { label: 'Bitcoin', color: 'var(--btc)' } };
// On the live site, but their prices are not part of this snapshot (the live /api/dca fetches them per request).

/** A return as a signed change (▲ / ▼, or flat), its colour class in `.cls`. */
const ret = (v: number | null, d = 1) => delta(v == null ? null : v * 100, d);
const pctTxt = (v: number | null, d = 1) => ret(v, d).text;
const isoOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** Scale max = 4 equal, round steps (25K, 50K, 100K …) so every tick label is a clean number. */
function niceMax(v: number) {
  const q = (v || 1) / 4, p = 10 ** Math.floor(Math.log10(q));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10]) if (m * p >= q) return 4 * m * p;
  return 40 * p;
}
const runBoth = (p: PriceArrays, start: string, end: string, freq: Freq, amount: number): Record<AssetKey, DcaResult> => ({
  zec: runDca({ dates: p.dates, prices: p.zec, start, end, freq, amount }),
  btc: runDca({ dates: p.dates, prices: p.btc, start, end, freq, amount }),
});
const kUsd = (v: number) => (v >= 1e6 ? `$${num(v / 1e6, 1)}M` : v >= 1000 ? `$${num(v / 1000, 0)}K` : `$${num(v, 0)}`);

export function Calculator({ prices }: { prices: PriceArrays }) {
  const minStart = prices.dates[1]; // 28 Oct 2016 is the launch-day print; the live calculator starts the day after
  const end = prices.lastComplete;
  const [start, setStart] = useState(minStart);
  const [draft, setDraft] = useState(minStart);
  const [freq, setFreq] = useState<Freq>('monthly');
  const [amount, setAmount] = useState(100);
  const [amountDraft, setAmountDraft] = useState('100');
  const [withBtc, setWithBtc] = useState(true);
  const [open, setOpen] = useState(true);
  const ready = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const st = q.get('start'), f = q.get('freq') as Freq | null, a = Number(q.get('amount'));
    if (st && isoOk(st) && st >= minStart && st <= end) { setStart(st); setDraft(st); }
    if (f && FREQS.some((x) => x.key === f)) setFreq(f);
    if (a > 0 && a <= 1e7) { setAmount(a); setAmountDraft(String(a)); }
    if (q.get('btc') === '0') setWithBtc(false);
    if (window.matchMedia('(max-width: 560px)').matches) setOpen(false);
    ready.current = true;
  }, [minStart, end]);
  useEffect(() => {
    if (!ready.current) return;
    const q = new URLSearchParams();
    if (start !== minStart) q.set('start', start);
    if (freq !== 'monthly') q.set('freq', freq);
    if (amount !== 100) q.set('amount', String(amount));
    if (!withBtc) q.set('btc', '0');
    replaceQuery(q);
  }, [start, freq, amount, withBtc, minStart]);

  const res = useMemo(() => runBoth(prices, start, end, freq, amount), [prices, start, end, freq, amount]);
  const windows = useMemo(() => {
    const w = (from: string) => { const r = runBoth(prices, from, end, freq, amount); return { zec: r.zec.xirr, btc: r.btc.xirr }; };
    return { inception: w(minStart), five: w(yearsBefore(end, 5)), one: w(yearsBefore(end, 1)) };
  }, [prices, minStart, end, freq, amount]);

  const z = res.zec, b = res.btc;
  const f = FREQS.find((x) => x.key === freq)!;
  const shown: AssetKey[] = withBtc ? ['zec', 'btc'] : ['zec'];
  const max = niceMax(Math.max(z.finalValue, withBtc ? b.finalValue : 0, z.invested));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];

  const applyDraft = () => {
    if (isoOk(draft)) {
      const v = draft < minStart ? minStart : draft > end ? end : draft;
      setStart(v); setDraft(v);
    } else setDraft(start);
  };
  const preset = (years: number | null) => { const v = years == null ? minStart : yearsBefore(end, years) < minStart ? minStart : yearsBefore(end, years); setStart(v); setDraft(v); };
  const applyAmount = () => { const a = Math.round(Number(amountDraft) * 100) / 100; if (a > 0 && a <= 1e7) setAmount(a); else setAmountDraft(String(amount)); };

  const series: Series[] = [
    ...(withBtc ? [{ key: 'btc', label: 'Bitcoin', color: ASSET.btc.color, values: b.value.map((v) => Math.round(v)) }] : []),
    { key: 'zec', label: 'Zcash', color: ASSET.zec.color, values: z.value.map((v) => Math.round(v)) },
    { key: 'inv', label: 'Invested', color: 'var(--text-2)', dashed: true, width: 1.4, values: z.investedSeries },
  ];
  // who led, and for how long — the chart's takeaway
  const btcLeadDays = withBtc ? b.value.filter((v, i) => v > z.value[i]).length : 0;
  const lastBtcLead = withBtc ? b.value.reduce((acc, v, i) => (v > z.value[i] ? i : acc), -1) : -1;
  const takeaway = !withBtc
    ? <>{usd(amount, amount % 1 ? 2 : 0)} {f.per} in Zcash ends at <b>{usd(z.finalValue, 0)}</b>, against {usd(z.invested, 0)} put in.</>
    : btcLeadDays > z.value.length / 2
      ? <>Bitcoin led for most of the stretch ({num((btcLeadDays / z.value.length) * 100, 0)}% of days); Zcash {z.finalValue > b.finalValue ? <>only pulled ahead in {z.dates[Math.min(z.dates.length - 1, lastBtcLead + 1)].slice(0, 4)} and</> : null} ends at <b>{usd(z.finalValue, 0)}</b>.</>
      : <>Zcash led on {num(100 - (btcLeadDays / z.value.length) * 100, 0)}% of days and ends at <b>{usd(z.finalValue, 0)}</b>; Bitcoin ends at {usd(b.finalValue, 0)}.</>;

  const amt = usd(amount, amount % 1 ? 2 : 0);
  const summary = `${amt} ${f.noun} · since ${dateLong(start)}${withBtc ? ' · vs Bitcoin' : ''}`;

  return (
    <>
      <section className="hero" aria-label="Result">
        <div className={s.res}>
          <div className={s.resL}>
            <p className={s.resH}><b>{amt} {f.per}</b> since {dateLong(start)} →</p>
            <p className="figure">{usd(z.finalValue, 0)}</p>
            <p className={s.resSub}>
              {(() => { const flat = num(z.multiple, 1) === '1.0'; return <span className={`delta${flat ? ' flat' : z.multiple < 1 ? ' dn' : ''}`}>{flat ? '' : z.multiple > 1 ? '▲ ' : '▼ '}{num(z.multiple, 1)}×</span>; })()}
              <span>on <b>{usd(z.invested, 0)}</b> invested over <b>{num(z.purchases)}</b> {f.noun} purchases</span>
            </p>
            <p className="note">That is a money-weighted return of <b className="mono">{pctTxt(z.xirr)}</b> a year.{withBtc && <> The same {amt} {f.per} in Bitcoin would be worth {usd(b.finalValue, 0)}.</>}</p>
          </div>
          <div className={s.bars} role="table" aria-label="Value today of each asset bought on the same days">
            <div className={s.barsH} role="row"><span role="columnheader">Asset</span><span role="columnheader">Value today, one scale</span><span role="columnheader">Value</span><span role="columnheader">×</span><span role="columnheader" className={s.xh}>Per year</span></div>
            {shown.map((k) => {
              const r = res[k];
              return (
                <div key={k} className={s.barRow} role="row">
                  <span className={s.nm} role="cell"><i className={s.dot} style={{ background: ASSET[k].color }} />{ASSET[k].label}</span>
                  <span className={s.track} role="cell" aria-hidden="true"><i style={{ width: `${(r.finalValue / max) * 100}%`, background: ASSET[k].color }} /></span>
                  <span className="num" role="cell">{usd(r.finalValue, 0)}</span>
                  <span className={`num ${s.mult}`} role="cell">{num(r.multiple, 1)}×</span>
                  <span className={`num ${s.xirr}${(r.xirr ?? 0) < 0 ? ` ${s.neg}` : ''}`} role="cell">{pctTxt(r.xirr)}</span>
                </div>
              );
            })}
            <div className={s.barRow} role="row">
              <span className={s.nm} role="cell"><i className={s.dotInv} />Invested</span>
              <span className={s.track} role="cell" aria-hidden="true"><i className={s.inv} style={{ width: `${(z.invested / max) * 100}%` }} /></span>
              <span className="num" role="cell">{usd(z.invested, 0)}</span>
              <span className={`num ${s.mult}`} role="cell">1.0×</span>
              <span className={`num ${s.xirr}`} role="cell" style={{ color: 'var(--muted)' }}>—</span>
            </div>
            <div className={s.scale} aria-hidden="true"><span /><span className={s.sc}>{ticks.map((t) => <span key={t}>{kUsd(t)}</span>)}</span><span /><span /><span /></div>
            <p className={s.barsNote}>Per year = money-weighted return (XIRR), explained below the chart.</p>
          </div>
        </div>
      </section>

      <div className={s.calc}>
        <details className={s.inputs} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary onClick={(e) => { if (!window.matchMedia('(max-width: 560px)').matches) e.preventDefault(); }}>
            <span><span className="h3">Your inputs</span><span className={s.cur}>{summary}</span></span>
            <span className={s.tog}>Change inputs <Icon name="chevron-down" size={14} /></span>
          </summary>
          <div className={s.inBody}>
            <div className={s.fg}>
              <label className={s.flbl} htmlFor="dca-start">Start date</label>
              <div className="field">
                <input id="dca-start" value={draft} inputMode="numeric" placeholder="YYYY-MM-DD" aria-describedby="dca-start-h" onChange={(e) => setDraft(e.target.value)} onBlur={applyDraft} onKeyDown={(e) => { if (e.key === 'Enter') applyDraft(); }} />
                <Icon name="clock" size={15} />
              </div>
              <div className={`seg ${s.segFull}`} role="group" aria-label="Start presets">
                <button type="button" aria-pressed={start === yearsBefore(end, 1)} onClick={() => preset(1)}>1Y</button>
                <button type="button" aria-pressed={start === yearsBefore(end, 5)} onClick={() => preset(5)}>5Y</button>
                <button type="button" aria-pressed={start === minStart} onClick={() => preset(null)}>Max</button>
              </div>
              <p className={s.fh} id="dca-start-h">Year-month-day, from {minStart}. Max is the first full day of ZEC trading.</p>
            </div>
            <div className={s.fg} role="group" aria-labelledby="dca-freq">
              <span className={s.flbl} id="dca-freq">Buy every</span>
              <div className={`seg ${s.segFull}`}>
                {FREQS.map((x) => <button key={x.key} type="button" aria-pressed={freq === x.key} onClick={() => setFreq(x.key)}>{x.label}</button>)}
              </div>
            </div>
            <div className={s.fg}>
              <label className={s.flbl} htmlFor="dca-amt">Amount per purchase</label>
              <div className="field">
                <span className={s.pre}>$</span>
                <input id="dca-amt" value={amountDraft} inputMode="decimal" onChange={(e) => setAmountDraft(e.target.value.replace(/[^\d.]/g, ''))} onBlur={applyAmount} onKeyDown={(e) => { if (e.key === 'Enter') applyAmount(); }} />
                <span className={s.suf}>USD</span>
              </div>
            </div>
            <div className={s.fg} role="group" aria-labelledby="dca-cmp">
              <div className="spread"><span className={s.flbl} id="dca-cmp">Compare with</span><span className="small mono">{withBtc ? 1 : 0} selected</span></div>
              <span className={s.fh}>Zcash is always shown.</span>
              <span className={s.cgL}>Crypto</span>
              <div className={s.chips}>
                <button type="button" className="chip" aria-pressed={withBtc} onClick={() => setWithBtc((v) => !v)}><i className="sw" style={{ background: 'var(--btc)', borderRadius: '50%', width: 8, height: 8 }} />Bitcoin</button>
              </div>
            </div>
            <div className={s.share}>
              <CopyButton label="Share this result" done="Link copied" />
              <p className={s.fh}>The link keeps your date, frequency, amount and comparison, so others see exactly this.</p>
            </div>
          </div>
        </details>

        <div className={s.calcMain}>
          <div className="card">
            <div className="card-head">
              <div className="stack" style={{ gap: 6, minWidth: 0, flex: '1 1 320px' }}>
                <h2 className="h3">How did {amt} {f.per} grow?</h2>
                <p className="takeaway">{takeaway}</p>
              </div>
            </div>
            {z.dates.length > 1 ? (
              <TimeSeriesChart dates={z.dates} series={series} format="usd0" ranges={false} logToggle zeroBaseline height={380} ariaLabel={`Value of ${amt} ${f.per} in Zcash${withBtc ? ' and Bitcoin' : ''} from ${dateLong(start)} to ${dateLong(end)}, with the dashed line showing the dollars put in`} />
            ) : <p className="note">Pick a start date at least a day before {dateLong(end)}.</p>}
            <div className="callout">
              <span className="ic"><Icon name="info" size={18} /></span>
              <b style={{ color: 'var(--value)', font: '600 13px var(--mono)' }}>Same days for every asset.</b>
              <div className="note">Each line buys on the same dates as Zcash, so all of them get the same {num(z.purchases)} purchases and the same {usd(z.invested, 0)}.</div>
            </div>
            <div className={`small ${s.cap}`}>
              {z.first && <span>First buy: {amt} at {usd(z.first.price, 2)} per ZEC = {num(z.first.coins, 4)} ZEC, on {dateLong(z.first.date)}.</span>}
              <span>Daily closes through {dateLong(end)}</span>
            </div>
          </div>

          <ReturnsCard res={res} windows={windows} start={start} shown={shown} invested={z.invested} />
        </div>
      </div>
    </>
  );
}

function ReturnsCard({ res, windows, start, shown, invested }: { res: Record<AssetKey, DcaResult>; windows: Record<'inception' | 'five' | 'one', Record<AssetKey, number | null>>; start: string; shown: AssetKey[]; invested: number }) {
  const z = res.zec.xirr, b = res.btc.xirr;
  return (
    <div className="card">
      <div className="stack" style={{ gap: 6 }}>
        <h2 className="h3">What did each return per year?</h2>
        <p className="takeaway">Since {dateLong(start).slice(-4)}, Zcash returned <b>{pctTxt(z)} a year</b>{shown.includes('btc') ? <>, against {pctTxt(b)} for Bitcoin</> : null}.</p>
      </div>
      <p className="note">These are money-weighted returns (XIRR): each purchase only counts for the time it was actually invested, so a purchase made last month weighs far less than one made years ago. Three windows are fixed and end on the last complete day; <b>Selected</b> follows your start date.</p>
      <div className="tbl-wrap">
        <table className={`t ${s.ret}`}>
          <caption className="sr-only">Annual money-weighted return by window</caption>
          <thead><tr><th scope="col">Asset</th><th scope="col">Since inception</th><th scope="col">5-year</th><th scope="col" className={s.hideMob}>1-year</th><th scope="col" className={s.hideMob}>Selected<span className="small" style={{ display: 'block' }}>from {dateLong(start)}</span></th><th scope="col" className={s.hideMob}>Value now</th></tr></thead>
          <tbody>
            {shown.map((k) => (
              <tr key={k} className={k === 'zec' ? s.sel : undefined}>
                <td><i className={s.dot} style={{ background: ASSET[k].color, display: 'inline-block', marginRight: 8 }} />{ASSET[k].label}</td>
                {[windows.inception[k], windows.five[k], windows.one[k], res[k].xirr].map((v, i) => <td key={i} className={i >= 2 ? s.hideMob : undefined}><span className={ret(v).cls}>{pctTxt(v)}</span></td>)}
                <td className={s.hideMob}><b className="value">{usd(res[k].finalValue, 0)}</b></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Invested</td><td>—</td><td>—</td><td className={s.hideMob} /><td className={s.hideMob} /><td className={s.hideMob}>{usd(invested, 0)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
