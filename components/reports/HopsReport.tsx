'use client';

import { useMemo, useState } from 'react';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { Card, ChartActions, Kpi } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import type { HopDay, ShieldHops } from '@/lib/data/privacy-tools';
import { dateLong, num } from '@/lib/format';
import { zamt } from '@/components/privacy-tools/fmt';
import ui from '@/components/privacy-tools/ui.module.css';
import { CsvButton } from './CsvButton';
import { HOP_CLASSES, HOP_RANGES, type HopClass } from './views';
import { setQuery } from './params';

// Shield-bound hop sizes: controls + hero + KPI band + four charts. Views come from /api/shield-hops; the range is
// sliced here, and the hero/KPIs are recomputed from the visible days with the live page's own definitions.
// State lives in the URL with the live names: ?class=all|single|sweep&days=90|365|1200|4000&repeat=drop|keep. The page
// reads them on the server (initial view + days), and each control writes its own key back without a history entry.

type Cls = HopClass;
const CLASSES = HOP_CLASSES, RANGES = HOP_RANGES;
const Z = 1e8;
const z = (v: number) => v / Z;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };

/** `fixed`: only the initial view has data, so the other views are disabled. `initialDays` is ?days=. */
export function HopsReport({ initial, fixed = false, initialDays = 365 }: { initial: ShieldHops; fixed?: boolean; initialDays?: number }) {
  const [data, setData] = useState(initial);
  const [cls, setCls] = useState<Cls>(initial.class);
  const [drop, setDrop] = useState(initial.repeat === 'drop');
  const [days, setDays] = useState(initialDays);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async (c: Cls, d: number, dr: boolean) => {
    setBusy(true); setNotice(null);
    try {
      const r = await fetch(`/api/shield-hops?class=${c}&days=${d}&repeat=${dr ? 'drop' : 'keep'}`);
      const j = (await r.json()) as ShieldHops;
      if (!j || !Array.isArray(j.days)) throw new Error('bad reply');
      setData(j);
      const gotCls = j.class as Cls, gotDrop = j.repeat === 'drop';
      if (gotCls !== c || gotDrop !== dr) {
        setCls(gotCls); setDrop(gotDrop);
      }
    } catch {
      setNotice('Could not load /api/shield-hops — showing the last view.');
    }
    setBusy(false);
  };

  const all = data.days;
  const rows: HopDay[] = useMemo(() => all.slice(-days), [all, days]);
  const spanNote = days > all.length + 7 ? `This view holds ${num(all.length)} days, so ${RANGES.find((r) => r[0] === days)?.[1]} shows all of them.` : null;
  const last = rows.at(-1);
  const hops = rows.reduce((a, r) => a + r.count, 0);
  const total = rows.reduce((a, r) => a + r.total_zat, 0);
  const meanZ = hops ? total / hops : 0;
  const medZ = median(rows.map((r) => r.p50_zat));
  const ratio = medZ ? meanZ / medZ : 0;
  const clsLabel = CLASSES.find((c) => c[0] === cls)![1].toLowerCase();
  const p50s = rows.map((r) => z(r.p50_zat));
  const lo = rows.reduce((a, r) => (r.p50_zat < a.p50_zat ? r : a), rows[0]);
  const hi = rows.reduce((a, r) => (r.p50_zat > a.p50_zat ? r : a), rows[0]);
  const heavy = rows.filter((r) => r.top_value_share >= 0.5).length;
  const modeTop = useMemo(() => {
    const c = new Map<number, number>();
    rows.forEach((r) => c.set(r.top_value_zat, (c.get(r.top_value_zat) ?? 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [rows]);
  const dates = rows.map((r) => r.date);
  const first = rows[0]?.date;

  return (
    <>
      <div className={ui.ctrl} role="region" aria-label="View controls">
        <div className={ui.grp}>
          <span className={ui.glbl} id="hv">Which hops</span>
          <div className="seg" role="group" aria-labelledby="hv">
            {CLASSES.map(([k, l]) => <button key={k} type="button" aria-pressed={cls === k} disabled={busy || (fixed && k !== cls)} onClick={() => { setCls(k); setQuery({ class: k }); void load(k, days, drop); }}>{l}</button>)}
          </div>
        </div>
        <div className={ui.grp}>
          <span className={ui.glbl}>Robots</span>
          <label className="check" style={{ height: 34 }}><input type="checkbox" checked={drop} disabled={busy || fixed} onChange={(e) => { setDrop(e.target.checked); setQuery({ repeat: e.target.checked ? 'drop' : 'keep' }); void load(cls, days, e.target.checked); }} />Drop the repeated amount</label>
        </div>
        <div className={ui.grp}>
          <span className={ui.glbl} id="hr">Range</span>
          <div className="seg" role="group" aria-labelledby="hr">
            {RANGES.map(([d, l]) => <button key={d} type="button" aria-pressed={days === d} onClick={() => { setDays(d); setQuery({ days: d }); }}>{l}</button>)}
          </div>
        </div>
        <div className={ui.end}>
          <span className="small">Through {last ? dateLong(last.date) : '—'}</span>
          <CsvButton rows={rows} slug="shield-hops" />
        </div>
      </div>
      {(notice || spanNote) && <p className="small" role="status" style={{ marginTop: -18 }}><Icon name="info" size={13} /> {notice ?? spanNote}</p>}

      <section className="hero" aria-labelledby="h-typ">
        <div className={ui.heroSplit}>
          <div className="stack" style={{ gap: 10 }}>
            <span className={ui.heroK}>Typical hop · {clsLabel}{drop ? ' · repeated amount dropped' : ''} · median of {num(rows.length)} daily medians</span>
            <h2 className={ui.heroLead} id="h-typ">A typical shield-bound hop moves</h2>
            <div className="figure">{zamt(z(medZ))}<small>ZEC</small></div>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <p className="note" style={{ fontSize: 15 }}>On a typical day, half of all shield-bound hops in this view were smaller than <b className="value">{zamt(z(medZ))} ZEC</b> and half were larger.</p>
            <p className="note" style={{ fontSize: 15 }}>The <b className="value">mean</b> over the same window is <b className="value">{zamt(z(meanZ))} ZEC</b>{ratio >= 2 ? <> — {num(ratio, 0)}× the median, which is what a long tail of a few very large hops does to an average. The median is the one to quote.</> : '.'}</p>
            {heavy > 0 && <p className="small">{num(heavy)} of {num(rows.length)} days shown are at least half one repeated amount — see the last chart.</p>}
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-dist">
        <div className="sec-h"><h2 className="h2" id="h-dist">Across the selected range</h2><span className="small">{first ? `${dateLong(first)} – ${dateLong(last!.date)}` : ''}</span></div>
        <div className="kpis six" role="list" aria-label="Distribution">
          <Kpi k="Median hop" v={zamt(z(medZ))} unit="ZEC" s="median of daily medians" />
          <Kpi k="Mean hop" v={zamt(z(meanZ))} unit="ZEC" s="total ZEC ÷ total hops" />
          <Kpi k="p10 (latest day)" v={last ? zamt(z(last.p10_zat)) : '—'} unit="ZEC" s="9 in 10 hops were larger" />
          <Kpi k="p90 (latest day)" v={last ? zamt(z(last.p90_zat)) : '—'} unit="ZEC" s="9 in 10 hops were smaller" />
          <Kpi k="Hops in range" v={num(hops)} s={`${num(hops / Math.max(1, rows.length), 0)} per day`} />
          {drop && last
            ? <Kpi k="Dropped (latest day)" v={num(last.removed_count)} unit="hops" s={`all at exactly ${zamt(z(last.removed_zat))} ZEC — ${num(last.removed_share * 100, 0)}% of that day`} />
            : <Kpi k="ZEC in range" v={zamt(z(total))} unit="ZEC" s="shielded through these hops" />}
        </div>
      </section>

      <section className="sec" aria-labelledby="h-charts">
        <div className="sec-h"><h2 className="h2" id="h-charts">The distribution</h2><span className="small">log scale where sizes span orders of magnitude</span></div>
        <Card
          title="Has the typical hop size changed?"
          actions={<ChartActions api="shield-hops" name="Hop size over time" />}
          takeaway={<>The daily median ranged from <b>{zamt(Math.min(...p50s))}</b> ({lo ? dateLong(lo.date) : ''}) to <b>{zamt(Math.max(...p50s))} ZEC</b> ({hi ? dateLong(hi.date) : ''}), and was <b>{last ? zamt(z(last.p50_zat)) : '—'} ZEC</b> on the latest day.</>}
          foot={`Daily median with the p10 and p90 hop sizes and the daily mean · ${clsLabel} · log scale · data through ${last ? dateLong(last.date) : '—'}`}
        >
          <TimeSeriesChart
            dates={dates}
            series={[
              { key: 'p90', label: 'p90', color: 'var(--p-transparent)', values: rows.map((r) => z(r.p90_zat)), width: 1.2 },
              { key: 'p50', label: 'Median', color: 'var(--accent)', values: p50s, width: 2.2 },
              { key: 'p10', label: 'p10', color: 'var(--p-transparent)', values: rows.map((r) => z(r.p10_zat)), width: 1.2 },
              { key: 'mean', label: 'Mean', color: 'var(--s4)', values: rows.map((r) => z(r.mean_zat)), dashed: true, width: 1.4 },
            ]}
            format="zecCompact"
            ranges={false}
            logToggle
            defaultLog
            height={320}
            ariaLabel={`Daily median shield-bound hop size with p10, p90 and mean, log scale, ${dateLong(first ?? '')} to ${dateLong(last?.date ?? '')}.`}
          />
        </Card>

        <Card
          title="How many hops a day, and how much ZEC?"
          actions={<ChartActions api="shield-hops" name="Hops and ZEC per day" />}
          takeaway={<>An average day carried <b>{num(hops / Math.max(1, rows.length), 0)} hops</b> moving <b>{zamt(z(total / Math.max(1, rows.length)))} ZEC</b>.</>}
          foot="Two panels instead of two y-axes: a count and a volume are different quantities · bucketed bars show the daily average"
        >
          <span className="small">Hops per day</span>
          <TimeSeriesChart dates={dates} series={[{ key: 'c', label: 'Hops', color: 'var(--s2)', values: rows.map((r) => r.count), type: 'bar', agg: 'mean' }]} format="count" ranges={false} height={170} showLegend={false} ariaLabel="Columns: shield-bound hops per day." />
          <span className="small">ZEC per day</span>
          <TimeSeriesChart dates={dates} series={[{ key: 'v', label: 'ZEC', color: 'var(--accent)', values: rows.map((r) => z(r.total_zat)), type: 'bar', agg: 'mean' }]} format="zecCompact" ranges={false} height={170} showLegend={false} ariaLabel="Columns: ZEC shielded through hops per day." />
        </Card>

        <Card
          title="Is this a distribution, or one robot?"
          actions={<ChartActions api="shield-hops" name="Share at one exact amount" />}
          takeaway={heavy
            ? <><b>{num(heavy)} of {num(rows.length)} days</b> were at least half one repeated amount — most often exactly <b>{zamt(z(modeTop[0]))} ZEC</b>. On those days the median describes one automated process, not many people.</>
            : <>No day in this range was dominated by one repeated amount; the most common top amount was <b>{zamt(z(modeTop?.[0] ?? 0))} ZEC</b>.</>}
          foot={drop ? 'Share of each day’s hops at the single most common exact amount, after the biggest repeat was dropped — the runner-up' : 'Share of each day’s hops that were all exactly the same amount · fixed 0–100% axis'}
        >
          <TimeSeriesChart dates={dates} series={[{ key: 's', label: 'Share at one amount', color: 'var(--p-transparent)', values: rows.map((r) => r.top_value_share * 100), type: 'bar', agg: 'mean' }]} format="pct0" ranges={false} yDomain={[0, 100]} height={180} showLegend={false} ariaLabel="Columns: share of each day's hops at one exact amount, 0 to 100%." />
        </Card>
      </section>
    </>
  );
}
