'use client';

import { useMemo, useState } from 'react';
import { Kpi, KpiBand, Legend } from '@/components/ui/blocks';
import { dateLong, num, usd } from '@/lib/format';
import type { PriceArrays } from '@/lib/data/tools';
import { alignRun, atDay, BTC_CYCLE, isRun, peakAndTrough } from './runAlign';
import { DayChart } from './DayChart';

const ANCHORS = [500, 800, 1000];
const WINDOWS: { key: string; days: number | 'zec' | 'full' }[] = [{ key: '60', days: 60 }, { key: '90', days: 90 }, { key: '180', days: 180 }, { key: '365', days: 365 }, { key: 'Full cycle', days: 'full' }];
const usdAx = (v: number) => (v >= 1000 ? `$${num(v / 1000, v >= 10000 ? 0 : 1)}K` : `$${num(v, 0)}`);

export function BullRun({ prices }: { prices: PriceArrays }) {
  const [anchor, setAnchor] = useState(800);
  const [win, setWin] = useState('90');
  const [log, setLog] = useState(false);

  const runs = useMemo(() => ({
    zec: alignRun(prices.dates, prices.zec, anchor, null),
    btc: alignRun(prices.dates, prices.btc, anchor, BTC_CYCLE),
  }), [prices, anchor]);

  const anchorSeg = (
    <div className="toolbar">
      <span className="lbl" id="anc-l">Aligned at</span>
      <div className="seg" role="group" aria-labelledby="anc-l">
        {ANCHORS.map((a) => <button key={a} type="button" aria-pressed={anchor === a} onClick={() => setAnchor(a)}>${num(a)}</button>)}
      </div>
    </div>
  );

  if (!isRun(runs.zec) || !isRun(runs.btc)) {
    const which = !isRun(runs.btc) ? `Bitcoin: ${runs.btc.unavailable}` : !isRun(runs.zec) ? `Zcash: ${runs.zec.unavailable}` : '';
    return (
      <section className="hero" aria-label="Run comparison">
        {anchorSeg}
        <p className="figure md">Not available at ${num(anchor)}</p>
        <p className="note">{which}. Daily prices here start on {dateLong(prices.dates[0])}, so pick another anchor.</p>
      </section>
    );
  }
  const zec = runs.zec, btc = runs.btc;
  const today = zec.points.at(-1)!;
  const btcSame = atDay(btc.points, today.d);
  const pace = btcSame ? today.mult / btcSame.mult : null;
  const { peak, trough } = peakAndTrough(btc.points);
  const fall = (trough.usd / peak.usd - 1) * 100;
  const xMax = win === 'Full cycle' ? btc.points.at(-1)!.d : Number(win);
  const paceSeries = zec.points.map((p) => { const b = atDay(btc.points, p.d); return b ? { x: p.d, y: p.mult / b.mult } : null; }).filter((v): v is { x: number; y: number } => v != null);
  const hotter = pace != null ? (pace - 1) * 100 : 0;
  const rows = [0, 30, today.d, 60, 90, 180, 270, peak.d, trough.d].filter((d, i, a) => a.indexOf(d) === i).sort((a, b) => a - b);

  return (
    <>
      <section className="hero" aria-label="Where Zcash's run stands">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 10 }}>
            <span className="kicker">Day {today.d} of Zcash&apos;s run</span>
            <p className="figure md">{usd(today.usd, 0)} <small>· {num(today.mult, 2)}× its {usd(zec.anchorUsd, 0)}</small></p>
            <p className="lede">On its own day {today.d}, Bitcoin was at <b className="mono value">{btcSame ? usd(btcSame.usd, 0) : '—'}</b>{btcSame ? <> — {num(btcSame.mult, 2)}×</> : null}. {pace != null && <>Zcash is running <b className={`mono ${hotter >= 0 ? 'up' : 'dn'}`}>{hotter >= 0 ? '▲' : '▼'} {num(Math.abs(hotter), 0)}%</b> {hotter >= 0 ? 'hotter' : 'cooler'}.</>}</p>
          </div>
          <div className="stack" style={{ gap: 8, alignItems: 'flex-start' }}>
            {anchorSeg}
            <p className="small mono">ZEC day 0 = {dateLong(zec.anchorDate)} ({usd(zec.anchorUsd, 0)})<br />BTC day 0 = {dateLong(btc.anchorDate)} ({usd(btc.anchorUsd, 0)})</p>
          </div>
        </div>
      </section>

      <KpiBand label="The two runs in four numbers">
        <Kpi k="Days into the run" v={num(today.d)} s={`since ${dateLong(zec.anchorDate)} · Bitcoin's line runs ${num(btc.points.at(-1)!.d)} days`} />
        <Kpi k="Relative pace" v={pace != null ? `${num(pace, 2)}×` : '—'} s="Zcash multiple ÷ Bitcoin multiple, same day" />
        <Kpi k="Bitcoin's peak" v={usd(peak.usd, 0)} s={`day ${peak.d}, ${dateLong(peak.date)} · ${num(peak.mult, 0)}× anchor`} />
        <Kpi k="And then" v={usd(trough.usd, 0)} s={<>day {trough.d}, {dateLong(trough.date)} · <span className="dn">▼ {num(Math.abs(fall), 0)}%</span> from the peak</>} />
      </KpiBand>

      <div className="card">
        <div className="card-head">
          <div className="stack" style={{ gap: 6, minWidth: 0, flex: '1 1 320px' }}>
            <h2 className="h3">How do the two runs line up day for day?</h2>
            <p className="takeaway">Zcash is <b>{today.d} days</b> into its run; Bitcoin&apos;s peaked on <b>day {peak.d}</b> at {num(peak.mult, 0)}× and then fell {num(Math.abs(fall), 0)}%.</p>
          </div>
        </div>
        <Legend items={[{ label: 'Zcash 2026', color: 'var(--zec)', line: true }, { label: 'Bitcoin 2017', color: 'var(--btc)', line: true }, { label: `$${num(anchor)} anchor`, color: 'var(--axis)', line: true, dashed: true }]} />
        <div className="toolbar">
          <span className="lbl" id="days-l">Days</span>
          <div className="seg" role="group" aria-labelledby="days-l">{WINDOWS.map((w) => <button key={w.key} type="button" aria-pressed={win === w.key} onClick={() => setWin(w.key)}>{w.key}</button>)}</div>
          <div className="seg" role="group" aria-label="Scale"><button type="button" aria-pressed={!log} onClick={() => setLog(false)}>Linear</button><button type="button" aria-pressed={log} onClick={() => setLog(true)}>Log</button></div>
        </div>
        <DayChart
          ariaLabel={`Zcash from ${dateLong(zec.anchorDate)} and Bitcoin from ${dateLong(btc.anchorDate)}, in dollars by day since each crossed $${anchor}, first ${xMax} days`}
          series={[
            { key: 'btc', label: 'BTC', color: 'var(--btc)', points: btc.points.map((p) => ({ x: p.d, y: p.usd, date: p.date })) },
            { key: 'zec', label: 'ZEC', color: 'var(--zec)', points: zec.points.map((p) => ({ x: p.d, y: p.usd, date: p.date })) },
          ]}
          xMax={xMax} log={log} zero={false} yFmt={usdAx} refY={anchor} refLabel={`$${num(anchor)}`}
          tipFmt={(_, p) => `${usd(p.y, 0)} · ${p.date ? dateLong(p.date) : ''}`}
          markers={[{ x: peak.d, y: peak.usd, label: `peak ${usd(peak.usd, 0)}`, color: 'var(--btc)', anchor: 'end' }, { x: trough.d, y: trough.usd, label: `then ${usd(trough.usd, 0)}`, color: 'var(--btc)', anchor: 'end' }]}
        />
        <p className="small">Daily USD closes · Bitcoin searched inside its {BTC_CYCLE.from.slice(0, 4)}–{BTC_CYCLE.to.slice(0, 4)} cycle · data through {dateLong(prices.lastComplete)}. Day 0 is the day after each last closed below the anchor.</p>
      </div>

      <div className="card">
        <div className="stack" style={{ gap: 6 }}>
          <h2 className="h3">Is Zcash running hotter or cooler than Bitcoin did?</h2>
          <p className="takeaway">On day {today.d}, Zcash&apos;s multiple is <b>{pace != null ? `${num(pace, 2)}×` : '—'}</b> Bitcoin&apos;s: {hotter >= 0 ? 'ahead of' : 'behind'} the 2017 pace. 1.0 is the same point on the same day.</p>
        </div>
        <DayChart
          ariaLabel={`Zcash's multiple of its anchor divided by Bitcoin's, for each of the ${today.d} days of Zcash's run`}
          series={[{ key: 'pace', label: 'Pace', color: 'var(--zec)', points: paceSeries }]}
          xMax={Math.max(10, today.d)} yFmt={(v) => `${num(v, 2)}×`} refY={1} refLabel="same pace" height={240} zero={false} endLabels={false}
        />
        <p className="small">Multiples rather than prices, because the two anchors sit a few dollars apart. The x axis stops where Zcash&apos;s run does.</p>
      </div>

      <div className="card">
        <div className="stack" style={{ gap: 6 }}>
          <h2 className="h3">Where was Bitcoin day by day?</h2>
          <p className="takeaway">Bitcoin was at <b>{btcSame ? `${num(btcSame.mult, 2)}×` : '—'}</b> on the day Zcash has reached; it did not peak until <b>day {peak.d}</b>.</p>
        </div>
        <div className="tbl-wrap">
          <table className="t">
            <caption className="sr-only">Bitcoin 2017 and Zcash 2026 by day since the ${anchor} anchor</caption>
            <thead><tr><th scope="col">Day</th><th scope="col">Bitcoin 2017</th><th scope="col">× anchor</th><th scope="col">Zcash 2026</th><th scope="col">× anchor</th></tr></thead>
            <tbody>
              {rows.map((d) => {
                const b = atDay(btc.points, d), z = d <= today.d ? atDay(zec.points, d) : undefined;
                const here = d === today.d, isPeak = d === peak.d, isTrough = d === trough.d;
                return (
                  <tr key={d} style={here ? { background: 'var(--accent-wash)' } : undefined}>
                    <td>{d}{here ? <span className="badge" style={{ marginLeft: 8 }}>Zcash is here</span> : isPeak ? <span className="badge" style={{ marginLeft: 8 }}>Bitcoin&apos;s peak</span> : isTrough ? <span className="badge" style={{ marginLeft: 8 }}>Bitcoin&apos;s low after</span> : null}</td>
                    <td>{b ? usd(b.usd, 0) : '—'}</td><td>{b ? `${num(b.mult, 2)}×` : '—'}</td>
                    <td>{z ? usd(z.usd, 0) : <span className="muted" title="Zcash has not reached this day yet">not yet</span>}</td><td>{z ? `${num(z.mult, 2)}×` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
