'use client';

// The interactive half of /chart/[slug]: one range control shared by every time-series panel, the Linear/Log switch,
// the share/download actions, the panels themselves and the "selected range" KPI band (which follows the range).
import { useEffect, useMemo, useRef, useState } from 'react';
import { TimeSeriesChart, type ChartEvent, type RangeKey } from '@/components/charts/TimeSeriesChart';
import { CustomPanelView } from '@/components/charts/custom';
import { formatValue } from '@/components/charts/valueFormat';
import { Icon } from '@/components/ui/Icon';
import { dateLong } from '@/lib/format';
import type { ChartPanel, TimeSeriesPanel } from '@/lib/charts/types';
import s from './chart-page.module.css';

const RANGE_DAYS: Record<RangeKey, number> = { '1M': 31, '3M': 92, '6M': 183, '1Y': 366, '2Y': 731, '5Y': 1827, ALL: Infinity };
const DEFAULT_RANGES: RangeKey[] = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'];

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

function startIndex(dates: string[], range: RangeKey) {
  const days = RANGE_DAYS[range];
  if (!Number.isFinite(days) || !dates.length) return 0;
  const cutoff = Date.parse(dates[dates.length - 1]) - days * 86400000;
  let i = 0;
  while (i < dates.length && Date.parse(dates[i]) < cutoff) i++;
  return Math.min(i, Math.max(0, dates.length - 2));
}

function slicePanel(p: TimeSeriesPanel, range: RangeKey): TimeSeriesPanel {
  const i = startIndex(p.dates, range);
  if (i === 0) return p;
  return { ...p, dates: p.dates.slice(i), series: p.series.map((x) => ({ ...x, values: x.values.slice(i) })) };
}

const isTs = (p: ChartPanel): p is TimeSeriesPanel => p.kind === 'timeseries';

export function ChartBody(props: ChartBodyProps) {
  const { slug, title, question, panels, events, dataThrough, sourceNote, api, notes } = props;
  const tsPanels = panels.filter(isTs);
  const hasTs = tsPanels.length > 0;
  // A chart whose first panel isn't dated (x = amount, coins issued…) has no range control.
  const ranges = props.ranges === false || !hasTs ? false : props.ranges ?? DEFAULT_RANGES;
  const [range, setRange] = useState<RangeKey>(ranges ? (props.defaultRange && ranges.includes(props.defaultRange) ? props.defaultRange : ranges.includes('1Y') ? '1Y' : ranges[ranges.length - 1]) : 'ALL');
  const canLog = tsPanels.some((p) => p.logToggle);
  const [log, setLog] = useState(() => tsPanels.some((p) => p.logToggle && p.defaultLog));
  const [msg, setMsg] = useState('');
  const cardRef = useRef<HTMLElement>(null);

  // Permalink state (?range=5Y&scale=log) is read after hydration so the page itself stays static.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get('range')?.toUpperCase() as RangeKey | undefined;
    if (ranges && r && ranges.includes(r)) setRange(r);
    if (canLog && q.get('scale') === 'log') setLog(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sliced = useMemo(() => panels.map((p) => (isTs(p) ? slicePanel(p, range) : p)), [panels, range]);
  const first = sliced.find(isTs);
  const span = first && first.dates.length ? `${dateLong(first.dates[0])} – ${dateLong(first.dates[first.dates.length - 1])}` : null;

  const copyLink = async () => {
    try {
      const u = new URL(window.location.href);
      if (ranges) u.searchParams.set('range', range); else u.searchParams.delete('range');
      if (canLog) { if (log) u.searchParams.set('scale', 'log'); else u.searchParams.delete('scale'); }
      await navigator.clipboard.writeText(u.toString());
      setMsg('Link copied');
    } catch { setMsg('Could not copy the link'); }
    window.setTimeout(() => setMsg(''), 2200);
  };

  const downloadCsv = () => {
    const rows = csvRows(sliced.filter(isTs));
    if (!rows) return;
    save(new Blob([rows], { type: 'text/csv;charset=utf-8' }), `zecstats-${slug}-${range.toLowerCase()}.csv`);
  };

  const downloadPng = async () => {
    const svg = cardRef.current?.querySelector<SVGSVGElement>('.chart svg, svg[data-export]');
    if (!svg) { setMsg('Nothing to export yet'); return; }
    try { save(await svgToPng(svg, title, `${span ?? ''} · zecstats.com/chart/${slug}`), `zecstats-${slug}.png`); }
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
            {hasTs ? (
              <button className="btn" type="button" onClick={downloadCsv} aria-label="Download data as CSV" title="Download CSV"><Icon name="download" size={16} /></button>
            ) : api ? (
              <a className="btn" href={`/api/${api}`} aria-label="Download data (JSON)" title="Download data"><Icon name="download" size={16} /></a>
            ) : null}
            <a className="btn" href={`/compare?charts=${slug}`} aria-label="Compare with another chart" title="Compare"><Icon name="compare" size={16} /></a>
          </div>
          <span className="sr-only" aria-live="polite">{msg}</span>
          {msg && <span className={s.toast} aria-hidden="true">{msg}</span>}
        </div>

        {(ranges || canLog) && (
          <div className={s.ctl}>
            {ranges && (
              <div className="seg" role="group" aria-label="Range">
                {ranges.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
              </div>
            )}
            {ranges && canLog && <span className={s.vsep} aria-hidden="true" />}
            {canLog && (
              <div className="seg" role="group" aria-label="Scale">
                <button type="button" aria-pressed={!log} onClick={() => setLog(false)}>Linear</button>
                <button type="button" aria-pressed={log} onClick={() => setLog(true)}>Log</button>
              </div>
            )}
          </div>
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
          const useLog = !!p.logToggle && log;
          return (
            <div key={i} className={s.panel}>
              {p.title && <h3 className={s.pt}>{p.title}</h3>}
              <TimeSeriesChart
                key={`${range}-${useLog}`}
                dates={p.dates}
                series={p.series}
                format={p.format}
                stacked={p.stacked}
                shareToggle={p.shareToggle}
                yDomain={p.yDomain}
                zeroBaseline={p.zeroBaseline}
                step={p.step}
                ranges={false}
                logToggle={false}
                defaultLog={useLog}
                height={p.height ?? (tsIndex === 0 ? 360 : 220)}
                events={tsIndex === 0 ? events : []}
                ariaLabel={ariaFor(title, p)}
              />
            </div>
          );
        })}

        {notes && notes.length > 0 && (
          <ul className={s.notes}>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        )}
        <div className={s.cap}>
          <span>Data through {dateLong(dataThrough)} · {sourceNote}</span>
          {span && <span>{span}{canLog ? ` · ${log ? 'log' : 'linear'}` : ''}</span>}
        </div>
      </section>
      {first && <RangeStats panel={first} range={ranges ? range : 'ALL'} span={span} />}
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

function RangeStats({ panel, range, span }: { panel: TimeSeriesPanel; range: RangeKey; span: string | null }) {
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
  const f = (v: number) => formatValue(v, panel.format);
  // Change: percentage points for % series, relative % otherwise
  const diff = st.last.v - st.firstP.v;
  const pts = panel.format.startsWith('pct');
  const rel = st.firstP.v !== 0 ? (diff / Math.abs(st.firstP.v)) * 100 : null;
  const dv = pts ? diff : rel;
  const arrow = dv == null ? '' : dv > 0 ? '▲' : dv < 0 ? '▼' : '';
  const chgText = dv == null ? '—' : pts ? `${arrow} ${Math.abs(dv).toFixed(2)} pts` : `${arrow} ${Math.abs(dv) >= 100 ? Math.round(Math.abs(dv)).toLocaleString('en-US') : Math.abs(dv).toFixed(1)}%`;
  return (
    <section className={s.band} aria-label="Selected range statistics">
      <div className={s.bandH}><h2 className="kicker">Selected range · {range}</h2>{span && <span className="small mono">{span}</span>}</div>
      <div className={`kpis${st.extras.length === 2 ? ' six' : ''}`} role="list">
        <Tile k="Latest" v={f(st.last.v)} s={`${st.label === 'Total' ? 'total' : st.label}, ${dateLong(st.last.d)}`} />
        {st.bars
          ? <Tile k="Average" v={f(st.avg)} s={`per ${st.per} over the range`} />
          : <Tile k="Change" v={chgText} cls={dv != null && dv > 0 ? 'up' : dv != null && dv < 0 ? 'dn' : ''} s={`from ${f(st.firstP.v)} on ${dateLong(st.firstP.d)}`} />}
        <Tile k="Range high" v={f(st.hi.v)} s={dateLong(st.hi.d)} />
        <Tile k="Range low" v={f(st.lo.v)} s={dateLong(st.lo.d)} />
        {st.extras.map((x) => <Tile key={x.label} k={x.label} v={x.v == null ? '—' : f(x.v)} s={x.ratio ? `${st.label} is ${x.ratio.toFixed(2)}× this` : 'latest'} />)}
      </div>
    </section>
  );
}

function Tile({ k, v, s: sub, cls = '' }: { k: string; v: string; s: string; cls?: string }) {
  return <div className="kpi" role="listitem"><span className="k">{k}</span><span className={`v ${cls}`}>{v}</span><span className="s">{sub}</span></div>;
}

/* ---------- export helpers ---------- */
function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function csvRows(ps: TimeSeriesPanel[]): string | null {
  if (!ps.length) return null;
  const dates = Array.from(new Set(ps.flatMap((p) => p.dates))).sort();
  const cols = ps.flatMap((p) => {
    const idx = new Map(p.dates.map((d, i) => [d, i]));
    return p.series.map((x) => ({ name: (p.title ? `${p.title} · ${x.label}` : x.label).replace(/"/g, "'"), get: (d: string) => { const i = idx.get(d); return i == null ? null : x.values[i]; } }));
  });
  const head = ['date', ...cols.map((c) => `"${c.name}"`)].join(',');
  const body = dates.map((d) => [d, ...cols.map((c) => { const v = c.get(d); return v == null ? '' : String(v); })].join(','));
  return [head, ...body].join('\n');
}

const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight'];
function inline(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  for (const p of STYLE_PROPS) (dst as SVGElement).style.setProperty(p, cs.getPropertyValue(p));
  for (let i = 0; i < src.children.length; i++) if (dst.children[i]) inline(src.children[i], dst.children[i]);
}

async function svgToPng(svg: SVGSVGElement, title: string, caption: string): Promise<Blob> {
  const box = svg.getBoundingClientRect();
  const w = Math.round(box.width), h = Math.round(box.height);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inline(svg, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url; });
  const scale = 2, pad = 24, top = 52, bottom = 34;
  const c = document.createElement('canvas');
  c.width = (w + pad * 2) * scale; c.height = (h + top + bottom) * scale;
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  const root = getComputedStyle(document.documentElement);
  g.fillStyle = root.getPropertyValue('--card').trim() || '#0b140e';
  g.fillRect(0, 0, w + pad * 2, h + top + bottom);
  g.fillStyle = root.getPropertyValue('--value').trim() || '#ecf8ef';
  g.font = '600 16px ui-monospace, monospace';
  g.fillText(title, pad, 32);
  g.drawImage(img, pad, top, w, h);
  g.fillStyle = root.getPropertyValue('--muted').trim() || '#7f9c89';
  g.font = '400 11px ui-monospace, monospace';
  g.fillText(caption, pad, top + h + 22);
  URL.revokeObjectURL(url);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}
