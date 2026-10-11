'use client';

// The interactive half of /chart/[slug]: one range control shared by every time-series panel (presets, or a custom
// window kept in the link as ?from=&to= like the live site), the Linear/Log switch, the annotations toggle, the
// share/download actions, the panels themselves and the "selected range" KPI band (which follows the range).
import { useEffect, useMemo, useRef, useState } from 'react';
import { canLog as logOk, LOG_WHY, TimeSeriesChart, type ChartEvent } from '@/components/charts/TimeSeriesChart';
import { CustomPanelView } from '@/components/charts/custom';
import { formatValue } from '@/components/charts/valueFormat';
import { customWindow, isRangeKey, presetFrom, windowIndex, withLivePresets, type DateWindow, type RangeKey } from '@/components/charts/range';
import { AnnToggle, CustomRange, RangeSeg, useCustomRange } from '@/components/charts/RangeControl';
import { customPanelCsv, findChartSvg, saveBlob, saveCsv, svgToPng, timeSeriesCsv } from '@/components/charts/exportChart';
import { Icon } from '@/components/ui/Icon';
import { dateLong, delta } from '@/lib/format';
import type { ChartPanel, TimeSeriesPanel } from '@/lib/charts/types';
import s from './chart-page.module.css';

const DEFAULT_RANGES: RangeKey[] = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'];

/** The live site's legend-hide URL keys (?phide=Sprout,Sapling…), so its links keep their hidden series here. */
const HIDE_KEYS: Record<string, string> = {
  'tx-types': 'thide', fees: 'feehide', 'new-addresses': 'nahide', pools: 'phide', 'pool-usd': 'usdhide', volatility: 'volhide',
  'flow-compare': 'fchide', 'shielding-rate': 'srhide', 'hl-funding': 'hlfhide', 'hl-volume': 'hlvhide', 'hl-oi': 'hlohide',
  'near-vol-mcap': 'nvmhide', 'dev-fund': 'dfhide', 'implied-mcap': 'nimhide', 'utxo-age': 'cahide', 'age-pct': 'aphide',
  'utxo-depth': 'dphide', dormant: 'dhide', utxo: 'uhide', 'orchard-internal': 'oihide', 'cost-basis': 'cbhide',
  'near-flow': 'nfhide', 'near-bridge': 'nhide', velocity: 'vhide', 'pool-residency': 'cahide',
};
const norm = (x: string) => x.trim().toLowerCase();
/** How a series is named in the hide list: its label, or its key when the label itself contains a comma. */
const hideName = (x: { key: string; label: string }) => (x.label.includes(',') ? x.key : x.label);

export type ChartBodyProps = {
  slug: string;
  title: string;
  question: string;
  panels: ChartPanel[];
  ranges?: RangeKey[] | false;
  defaultRange?: RangeKey;
  events?: ChartEvent[];
  dataThrough: string;
  sourceNote: string;
  api?: string;
  notes?: string[];
};

/** Cut a panel to a preset (relative to its own last date) or to the custom window shared by every panel. */
function slicePanel(p: TimeSeriesPanel, range: RangeKey, win: DateWindow | null): TimeSeriesPanel {
  if (!p.dates.length || (!win && range === 'ALL')) return p;
  const last = p.dates[p.dates.length - 1];
  const [a, b] = windowIndex(p.dates, win ?? { from: presetFrom(range, p.dates[0], last), to: last });
  if (a === 0 && b === p.dates.length) return p;
  return { ...p, dates: p.dates.slice(a, b), series: p.series.map((x) => ({ ...x, values: x.values.slice(a, b) })) };
}

/**
 * Apply a hide list (names or keys, any case). A listed series is hidden; "+name" shows a series that is hidden by
 * default; unlisted series keep their default. A list that would hide every series leaves the panel as it is.
 */
function applyHide(p: TimeSeriesPanel, hide: string[] | null): TimeSeriesPanel {
  if (!hide) return p;
  const set = new Set(hide.map(norm));
  const has = (x: { key: string; label: string }, pre = '') => set.has(pre + norm(x.label)) || set.has(pre + norm(x.key));
  const series = p.series.map((x) => ({ ...x, hidden: has(x) ? true : has(x, '+') ? false : !!x.hidden }));
  return series.every((x) => x.hidden) ? p : { ...p, series };
}

const isTs = (p: ChartPanel): p is TimeSeriesPanel => p.kind === 'timeseries';

/** Panels marked `sharedY` get one y-domain (over what is visible in the window), so their magnitudes compare. */
function shareY(ps: ChartPanel[]): ChartPanel[] {
  let lo = 0, hi = 0, any = false;
  for (const p of ps) if (isTs(p) && p.sharedY) for (const x of p.series) if (!x.hidden) for (const v of x.values) if (v != null && Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); any = true; }
  return any && hi > lo ? ps.map((p) => (isTs(p) && p.sharedY ? { ...p, yDomain: [lo, hi] as [number, number] } : p)) : ps;
}

/** Keep a control's state in the link without adding history entries. */
const setQuery = (edit: (q: URLSearchParams) => void) => {
  const q = new URLSearchParams(window.location.search);
  edit(q);
  const qs = q.toString().replace(/%2C/gi, ','); // hide lists stay readable: ?phide=Sprout,Sapling
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
};

export function ChartBody(props: ChartBodyProps) {
  const { slug, title, question, panels, events, dataThrough, sourceNote, api, notes } = props;
  const tsPanels = useMemo(() => panels.filter(isTs), [panels]);
  const hasTs = tsPanels.length > 0;
  // the data's first and last dates across the dated panels (the custom range is clamped to them)
  const bounds: DateWindow = useMemo(() => {
    const firsts = tsPanels.filter((p) => p.dates.length).map((p) => p.dates[0]).sort();
    const lasts = tsPanels.filter((p) => p.dates.length).map((p) => p.dates[p.dates.length - 1]).sort();
    return { from: firsts[0] ?? '', to: lasts[lasts.length - 1] ?? '' };
  }, [tsPanels]);
  // A chart whose first panel isn't dated (x = amount, coins issued…) has no range control.
  const declared = props.ranges === false || !hasTs || !bounds.to ? false : props.ranges ?? DEFAULT_RANGES;
  const ranges = declared ? withLivePresets(declared, bounds.from, bounds.to) : false;
  const defaultRange: RangeKey = ranges ? (props.defaultRange && ranges.includes(props.defaultRange) ? props.defaultRange : ranges.includes('1Y') ? '1Y' : ranges[ranges.length - 1]) : 'ALL';
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [win, setWin] = useState<DateWindow | null>(null); // a custom window replaces the preset
  const hasLog = tsPanels.some((p) => p.logToggle);
  const defaultLog = tsPanels.some((p) => p.logToggle && p.defaultLog);
  const [log, setLog] = useState(defaultLog);
  const hasEvents = hasTs && !!events?.length;
  const [ann, setAnn] = useState(true);
  const hideKey = HIDE_KEYS[slug];
  const [hide, setHide] = useState<string[] | null>(null); // null = each series' default
  const [fromUrl, setFromUrl] = useState(0); // bumped when the link sets hidden series, so the charts remount with them
  const [msg, setMsg] = useState('');
  const cardRef = useRef<HTMLElement>(null);
  const custom = useCustomRange();

  // Permalink state is read after hydration so the page itself stays static. Live names and meanings:
  // ?from=&to= (custom window, wins over ?range=), ?range=5Y, ?scale=log|linear, ?ann=1|0, ?<chart>hide=a,b.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const cw = ranges ? customWindow(q.get('from'), q.get('to'), bounds.from, bounds.to) : null;
    const r = q.get('range')?.toUpperCase();
    if (cw) setWin(cw);
    else if (ranges && isRangeKey(r) && ranges.includes(r)) setRange(r);
    if (hasLog && q.get('scale') === 'log') setLog(true);
    if (hasLog && q.get('scale') === 'linear') setLog(false);
    if (hasEvents && q.get('ann') === '0') setAnn(false);
    if (hideKey && q.has(hideKey)) { setHide((q.get(hideKey) ?? '').split(',').map((x) => x.trim()).filter(Boolean)); setFromUrl(1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sliced = useMemo(() => shareY(panels.map((p) => (isTs(p) ? applyHide(slicePanel(p, range, win), hide) : p))), [panels, range, win, hide]);
  // log needs every visible value above zero in every log-capable panel of this window; otherwise the switch is off
  const logAllowed = sliced.every((p) => !isTs(p) || !p.logToggle || logOk(p.series));
  const logOn = log && logAllowed;
  const logPanels = sliced.filter((p) => isTs(p) && p.logToggle).length;
  const tsCount = sliced.filter(isTs).length;
  const first = sliced.find(isTs);
  const span = first && first.dates.length ? `${dateLong(first.dates[0])} – ${dateLong(first.dates[first.dates.length - 1])}` : null;
  const rangeName = win ? 'Custom' : range;
  // non-dated charts: CSV from the first custom panel whose data is a table
  const customCsv = useMemo(() => {
    if (hasTs) return null;
    for (const p of panels) if (p.kind === 'custom') { const c = customPanelCsv(p.props); if (c) return c; }
    return null;
  }, [panels, hasTs]);

  const pickPreset = (r: RangeKey) => {
    setWin(null); setRange(r); custom.setOpen(false);
    setQuery((q) => { q.delete('from'); q.delete('to'); if (r === defaultRange) q.delete('range'); else q.set('range', r); });
  };
  const applyCustom = (w: DateWindow) => {
    setWin(w); custom.close();
    setQuery((q) => { q.delete('range'); q.set('from', w.from); q.set('to', w.to); });
  };
  const pickLog = (v: boolean) => {
    setLog(v);
    setQuery((q) => { if (v === defaultLog) q.delete('scale'); else q.set('scale', v ? 'log' : 'linear'); });
  };
  const pickAnn = (v: boolean) => { setAnn(v); setQuery((q) => { if (v) q.delete('ann'); else q.set('ann', '0'); }); };
  // the link lists only differences from the defaults: "Sprout" = hidden, "+Transparent" = shown though hidden by default
  const onHidden = (pi: number, keys: string[]) => {
    const names = [...new Set(sliced.flatMap((p, i) => {
      const orig = panels[i];
      if (!isTs(p) || !isTs(orig)) return [];
      return p.series.flatMap((x, j) => {
        const h = i === pi ? keys.includes(x.key) : !!x.hidden, d = !!orig.series[j]?.hidden;
        return h === d ? [] : [`${h ? '' : '+'}${hideName(x)}`];
      });
    }))];
    setHide(names.length ? names : null);
    if (hideKey) setQuery((q) => { if (names.length) q.set(hideKey, names.join(',')); else q.delete(hideKey); });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMsg('Link copied');
    } catch { setMsg('Could not copy the link'); }
    window.setTimeout(() => setMsg(''), 2200);
  };

  const downloadCsv = () => {
    const rows = hasTs ? timeSeriesCsv(sliced.filter(isTs)) : customCsv;
    if (!rows) { setMsg('Nothing to export yet'); return; }
    saveCsv(rows, `zecstats-${slug}${hasTs ? `-${win ? `${win.from}_${win.to}` : range.toLowerCase()}` : ''}.csv`);
  };

  const downloadPng = async () => {
    const svg = findChartSvg(cardRef.current);
    if (!svg) { setMsg('Nothing to export yet'); return; }
    try { saveBlob(await svgToPng(svg, title, `${span ?? ''} · zecstats.com/chart/${slug}`), `zecstats-${slug}.png`); }
    catch { setMsg('PNG export failed'); }
  };

  return (
    <>
      <section className={s.ccard} ref={cardRef} aria-label={`${title} chart`}>
        <div className={s.head}>
          <h2 className={s.q}>{question}</h2>
          <div className={s.btnGroup} role="group" aria-label={`Share and download: ${title}`}>
            <button className="btn" type="button" onClick={copyLink} aria-label="Copy permalink to this view" title="Copy link"><Icon name="link" size={16} /></button>
            <button className="btn" type="button" onClick={downloadPng} aria-label="Download chart as PNG" title="Download PNG"><Icon name="image" size={16} /></button>
            {hasTs || customCsv ? (
              <button className="btn" type="button" onClick={downloadCsv} aria-label="Download data as CSV" title="Download CSV"><Icon name="download" size={16} /></button>
            ) : api ? (
              <a className="btn" href={`/api/${api}`} aria-label="Download data (JSON)" title="Download data"><Icon name="download" size={16} /></a>
            ) : null}
            <a className="btn" href={`/compare?charts=${slug}`} aria-label="Compare with another chart" title="Compare"><Icon name="compare" size={16} /></a>
          </div>
          <span className="sr-only" aria-live="polite">{msg}</span>
          {msg && <span className={s.toast} aria-hidden="true">{msg}</span>}
        </div>

        {(ranges || hasLog || hasEvents) && (
          <div className={s.ctl}>
            {ranges && <RangeSeg ranges={ranges} active={win ? null : range} onPreset={pickPreset} custom={{ ...custom, window: win }} />}
            {ranges && hasLog && <span className={s.vsep} aria-hidden="true" />}
            {hasLog && (
              <div className="seg" role="group" aria-label="Scale" title={logAllowed ? undefined : LOG_WHY}>
                <button type="button" aria-pressed={!logOn} onClick={() => pickLog(false)}>Linear</button>
                <button type="button" aria-pressed={logOn} disabled={!logAllowed} aria-describedby={logAllowed ? undefined : 'log-why'} onClick={() => pickLog(true)}>Log</button>
                {!logAllowed && <span className="sr-only" id="log-why">{LOG_WHY}</span>}
              </div>
            )}
            {hasEvents && (ranges || hasLog) && <span className={s.vsep} aria-hidden="true" />}
            {hasEvents && <AnnToggle on={ann} onChange={pickAnn} />}
          </div>
        )}
        {ranges && custom.open && (
          <CustomRange id={custom.id} bounds={bounds} value={win ?? { from: presetFrom(range, bounds.from, bounds.to), to: bounds.to }} onApply={applyCustom} onClose={custom.close} />
        )}

        {sliced.map((p, i) => {
          if (!isTs(p)) {
            // A titled custom panel after the first one is rendered by the page as its own section.
            if (i > 0 && p.title) return null;
            return (
              <div key={i} className={s.panel}>
                {p.title && <h3 className={s.pt}>{p.title}</h3>}
                <CustomPanelView component={p.component} props={p.props} />
              </div>
            );
          }
          const tsIndex = tsPanels.indexOf(panels[i] as TimeSeriesPanel);
          const useLog = !!p.logToggle && logOn;
          // name the scale on the panel when only some panels are on log
          const scaleTag = useLog && logPanels < tsCount ? ' · log scale' : '';
          return (
            <div key={i} className={s.panel}>
              {(p.title || scaleTag) && <h3 className={s.pt}>{p.title ?? 'Log scale'}{p.title && scaleTag}</h3>}
              <TimeSeriesChart
                key={`${win ? `${win.from}_${win.to}` : range}-${useLog}-${fromUrl}`}
                dates={p.dates}
                series={p.series}
                format={p.format}
                stacked={p.stacked}
                shareToggle={p.shareToggle}
                yDomain={p.yDomain}
                zeroBaseline={p.zeroBaseline}
                step={p.step}
                unit={p.unit}
                endLabel={p.endLabel}
                ranges={false}
                logToggle={false}
                defaultLog={useLog}
                height={p.height ?? (tsIndex === 0 ? 360 : 220)}
                events={tsIndex === 0 && ann ? events : []}
                ariaLabel={ariaFor(title, p)}
                onHiddenChange={(keys) => onHidden(i, keys)}
              />
            </div>
          );
        })}

        {notes && notes.length > 0 && (
          <ul className={s.notes}>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        )}
        <div className={s.cap}>
          <span>Data through {dateLong(dataThrough)} · {sourceNote}</span>
          {span && <span>{span}{logOn && logPanels === tsCount ? ' · log' : ''}</span>}
        </div>
      </section>
      {first && <RangeStats panel={first} range={ranges ? rangeName : 'ALL'} span={span} />}
    </>
  );
}

function ariaFor(title: string, p: TimeSeriesPanel) {
  const names = p.series.filter((x) => !x.hidden).map((x) => x.label).join(', ');
  const d0 = p.dates[0], d1 = p.dates[p.dates.length - 1];
  return `${p.title ?? title}${p.stacked ? ' (stacked)' : ''}: ${names}, ${d0 ? dateLong(d0) : ''} to ${d1 ? dateLong(d1) : ''}.`;
}

/* ---------- KPI band for the selected range ---------- */
/** "day" | "week" | "month" | "period" from the median gap between points, so the Average tile names the bar's unit. */
function cadence(dates: string[]) {
  const gaps = dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(dates[i])) / 86400000).sort((a, b) => a - b);
  const g = gaps[Math.floor(gaps.length / 2)] ?? 1;
  return g <= 1.5 ? 'day' : g <= 8 ? 'week' : g <= 32 ? 'month' : 'period';
}

function RangeStats({ panel, range, span }: { panel: TimeSeriesPanel; range: string; span: string | null }) {
  const st = useMemo(() => {
    const shown = panel.series.filter((x) => !x.hidden);
    const primary = panel.stacked ? null : shown[0] ?? panel.series[0];
    const vals: (number | null)[] = panel.stacked
      ? panel.dates.map((_, i) => { let a = 0, any = false; for (const x of shown) { const v = x.values[i]; if (v != null) { a += v; any = true; } } return any ? a : null; })
      : primary!.values;
    const pts = vals.map((v, i) => ({ v, d: panel.dates[i] })).filter((p): p is { v: number; d: string } => p.v != null && Number.isFinite(p.v));
    if (pts.length < 2) return null;
    const firstP = pts[0], last = pts[pts.length - 1];
    let hi = firstP, lo = firstP, sum = 0;
    for (const p of pts) { if (p.v > hi.v) hi = p; if (p.v < lo.v) lo = p; sum += p.v; }
    const label = panel.stacked ? (shown.length === panel.series.length ? 'Total' : 'Total shown') : primary!.label;
    const bars = !panel.stacked && primary!.type === 'bar';
    const extras = !panel.stacked && shown.length >= 3 ? shown.slice(1, 3).map((x) => {
      const lv = [...x.values].reverse().find((v) => v != null) ?? null;
      return { label: x.label, v: lv, ratio: lv && last.v && lv > 0 ? last.v / lv : null };
    }) : [];
    return { firstP, last, hi, lo, avg: sum / pts.length, label, bars, extras, per: cadence(pts.map((p) => p.d)) };
  }, [panel]);
  if (!st) return null;
  // counts carry the panel's unit ("5,707 transactions"); other formats name their own unit
  const u = panel.unit && (panel.format === 'count' || panel.format === 'countCompact') ? panel.unit : undefined;
  const f = (v: number) => formatValue(v, panel.format);
  // Change: percentage points for % series, relative % otherwise (none when the start is 0, under 1% of the end — a
  // series that started near zero, like supply in 2016 — or the sign flips)
  const diff = st.last.v - st.firstP.v;
  const pts = panel.format.startsWith('pct');
  const rel = st.firstP.v > 0 && st.last.v >= 0 && st.firstP.v >= Math.abs(st.last.v) * 0.01 ? (diff / st.firstP.v) * 100 : null;
  const dv = pts ? diff : rel;
  const d = delta(dv, pts ? 2 : dv != null && Math.abs(dv) >= 100 ? 0 : 1, pts ? ' pts' : '%');
  return (
    <section className={s.band} aria-label="Selected range statistics">
      <div className={s.bandH}><h2 className="kicker">Selected range · {range}</h2>{span && <span className="small mono">{span}</span>}</div>
      <div className={`kpis${st.extras.length === 2 ? ' six' : ''}`} role="list">
        <Tile k="Latest" v={f(st.last.v)} u={u} s={`${st.label === 'Total' ? 'total' : st.label}, ${dateLong(st.last.d)}`} />
        {st.bars
          ? <Tile k="Average" v={f(st.avg)} u={u} s={`per ${st.per} over the range`} />
          : <Tile k="Change" v={d.text} cls={d.cls === 'muted' ? '' : d.cls} s={`from ${f(st.firstP.v)} on ${dateLong(st.firstP.d)}`} />}
        <Tile k="Range high" v={f(st.hi.v)} u={u} s={dateLong(st.hi.d)} />
        <Tile k="Range low" v={f(st.lo.v)} u={u} s={dateLong(st.lo.d)} />
        {st.extras.map((x) => <Tile key={x.label} k={x.label} v={x.v == null ? '—' : f(x.v)} u={x.v == null ? undefined : u} s={x.ratio ? `${st.label} is ${x.ratio.toFixed(2)}× this` : 'latest'} />)}
      </div>
    </section>
  );
}

function Tile({ k, v, u, s: sub, cls = '' }: { k: string; v: string; u?: string; s: string; cls?: string }) {
  return <div className="kpi" role="listitem"><span className="k">{k}</span><span className={`v ${cls}`}>{v}{u && <span className="u">{u}</span>}</span><span className="s">{sub}</span></div>;
}
