'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { scaleLinear, scaleLog, scaleUtc } from 'd3-scale';
import { area as d3area, line as d3line, curveLinear, curveStepAfter } from 'd3-shape';
import { axisLabels, formatValue, type ValueFormat } from './valueFormat';
import { presetFrom, type RangeKey } from './range';
import { dateLong, dateShort, monthYear, num, year } from '@/lib/format';

export type Series = {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  type?: 'line' | 'area' | 'bar';
  dashed?: boolean;
  /** stroke-dasharray, e.g. '2 3' (wins over `dashed`): tells same-hue lines apart, in the legend too */
  dash?: string;
  hidden?: boolean; // initially hidden (toggle with its chip)
  width?: number;
  /** How bars combine when days are bucketed on long ranges: the mean per day (default), or 'sum' for the bucket
   *  total (opt-in; the axis and tooltip then say "total per N days"). */
  agg?: 'sum' | 'mean';
};

export type { RangeKey } from './range';

export type ChartEvent = { date: string; label: string };

export type TimeSeriesChartProps = {
  dates: string[]; // YYYY-MM-DD, ascending
  series: Series[];
  format: ValueFormat;
  stacked?: boolean;
  ranges?: RangeKey[] | false;
  defaultRange?: RangeKey;
  logToggle?: boolean;
  defaultLog?: boolean;
  shareToggle?: boolean; // stacked only: ZEC | Share %
  height?: number;
  yDomain?: [number, number];
  zeroBaseline?: boolean;
  events?: ChartEvent[];
  step?: boolean;
  ariaLabel: string;
  showLegend?: boolean;
  compactControls?: boolean;
  /** Called with the hidden series keys after a legend chip is toggled (pages that keep legend state in the URL). */
  onHiddenChange?: (hiddenKeys: string[]) => void;
  /** Y-axis title, shown once above the ticks. Defaults from the format (ZEC, BTC, KB…); counts need one ("transactions"). */
  unit?: string;
  /** Name each line at its right end (multi-line charts), instead of relying on the legend alone. */
  endLabel?: boolean;
};

const M = { top: 14, right: 16, bottom: 28, left: 58 };
const FS = 12, CW = 7.3, DAY = 86400000;
const T = (d: string) => Date.parse(d.length === 10 ? `${d}T00:00:00Z` : d);
const dashOf = (s: Series) => s.dash ?? (s.dashed ? '5 4' : undefined);
const isLine = (s: Series) => s.type === 'line' || !s.type;
const TXT: CSSProperties = { fontSize: FS };
const HALO: CSSProperties = { fontSize: FS, fill: 'var(--text-2)', paintOrder: 'stroke', stroke: 'var(--card)', strokeWidth: 3, strokeLinejoin: 'round' };
const fit = (s: string, px: number) => { const n = Math.max(3, Math.floor(px / CW)); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };

export const LOG_WHY = 'Log scale needs every value above zero, and this view has zero or negative values.';
/** Whether a log scale can show these series: every visible value is above zero. */
export const canLog = (series: Series[]) => series.every((s) => s.hidden || s.values.every((v) => v == null || !Number.isFinite(v) || v > 0));
/** A series drawn entirely below zero (outflows): its name carries the direction, so values are shown as magnitudes. */
const allNeg = (vs: (number | null)[]) => vs.some((v) => v != null && v < 0) && vs.every((v) => v == null || v <= 0);

/** Indices to draw for a long line: first/min/max/last per pixel-sized bucket, so peaks survive (gaps kept as is). */
function thin(vs: (number | null)[], target: number): number[] {
  const n = vs.length;
  if (n <= target * 4) return vs.map((_, i) => i);
  const size = Math.ceil(n / target), out: number[] = [];
  for (let a = 0; a < n; a += size) {
    const b = Math.min(n, a + size);
    let lo = -1, hi = -1, gap = false;
    for (let i = a; i < b; i++) {
      const v = vs[i];
      if (v == null || !Number.isFinite(v)) { gap = true; continue; }
      if (lo < 0 || v < vs[lo]!) lo = i;
      if (hi < 0 || v > vs[hi]!) hi = i;
    }
    if (gap) { for (let i = a; i < b; i++) out.push(i); continue; }
    out.push(...[...new Set([a, lo, hi, b - 1])].sort((p, q) => p - q));
  }
  return out;
}

function Swatch({ s }: { s: Series }) {
  if (isLine(s)) return <svg width={18} height={8} aria-hidden="true" style={{ flex: 'none' }}><line x1={1} x2={17} y1={4} y2={4} stroke={s.color} strokeWidth={2.5} strokeDasharray={dashOf(s)} /></svg>;
  return <i className="sw" style={{ background: s.color }} />;
}

export function TimeSeriesChart(props: TimeSeriesChartProps) {
  const { dates, series, format, stacked = false, ranges = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'], defaultRange = '1Y', logToggle = false, defaultLog = false, shareToggle = false, height = 360, yDomain, zeroBaseline, events = [], step = false, ariaLabel, showLegend = true, onHiddenChange, unit, endLabel = false } = props;
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [range, setRange] = useState<RangeKey>(ranges ? defaultRange : 'ALL');
  const [log, setLog] = useState(defaultLog);
  const [share, setShare] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(series.filter((s) => s.hidden).map((s) => s.key)));
  const [hover, setHover] = useState<number | null>(null);
  const [kbd, setKbd] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 520;
  const h = narrow ? Math.max(220, Math.min(height, Math.round(width * 0.7))) : height;
  const hasBars = series.some((s) => s.type === 'bar');
  const iw0 = width - (narrow ? 54 : 74); // plot width estimate for bucketing (the real left margin follows the ticks)

  // ---- range slice, then (bars only) buckets of k days that end on the last date; a partial first bucket is dropped ----
  const view = useMemo(() => {
    let start = 0;
    if (range !== 'ALL' && dates.length) {
      const from = presetFrom(range, dates[0], dates[dates.length - 1]);
      const i = dates.findIndex((d) => d >= from);
      start = i < 0 ? 0 : i;
    }
    const n0 = dates.length - start;
    const maxBars = Math.max(30, Math.floor(iw0 / 4));
    const k = hasBars && n0 > maxBars ? Math.ceil(n0 / maxBars) : 1;
    const s0 = start + (k > 1 ? n0 % k : 0);
    const ds = dates.slice(s0), ts = ds.map(T);
    const cols = series.map((s) => s.values.slice(s0));
    const n = ds.length;
    const stepMs = n > 1 ? (ts[n - 1] - ts[0]) / (n - 1) : DAY;
    // hover points: [a, b) index ranges into ds (one day each unless bucketed)
    const np = Math.floor(n / k);
    const pa = Array.from({ length: np }, (_, j) => j * k);
    const vcols = cols.map((c, si) => pa.map((a) => {
      const b = a + k;
      if (series[si].type !== 'bar' || k === 1) return c[b - 1] ?? null;
      let sum = 0, m = 0;
      for (let j = a; j < b; j++) if (c[j] != null && Number.isFinite(c[j])) { sum += c[j]!; m++; }
      return m ? (series[si].agg === 'sum' ? sum : sum / m) : null;
    }));
    return { ds, ts, cols, vcols, pa, k, stepMs };
  }, [dates, series, range, hasBars, iw0]);
  const { ds, ts, cols, vcols, pa, k, stepMs } = view;
  const n = ds.length, np = pa.length;
  const stepDays = Math.max(1, Math.round(stepMs / DAY));
  const per = stepDays >= 25 ? 'month' : stepDays >= 6 ? 'week' : 'day';
  const visible = series.filter((s) => !hidden.has(s.key));
  const visBars = visible.filter((s) => s.type === 'bar');
  const sumAgg = k > 1 && visBars.length > 0 && visBars.every((s) => s.agg === 'sum');
  const aggWord = k > 1 && visBars.length ? (sumAgg ? `total per ${k * stepDays} days` : `avg/${per}`) : '';

  // ---- stacking / share (share = of all series, so hiding one never rescales the rest) ----
  const layers = useMemo(() => {
    const vis = series.map((s, i) => ({ s, i })).filter(({ s }) => !hidden.has(s.key));
    if (!stacked) return vis.map(({ s, i }) => ({ s, i, lo: null as (number | null)[] | null, hi: vcols[i] }));
    const tot = new Array(np).fill(0);
    if (share) vcols.forEach((c) => c.forEach((v, j) => (tot[j] += v != null && Number.isFinite(v) ? v : 0)));
    const base = new Array(np).fill(0);
    return vis.map(({ s, i }) => {
      const lo = base.slice();
      // a missing value (a pool before it existed) breaks this layer instead of drawing it along the stack top
      const hi = vcols[i].map((v, j) => {
        if (v == null || !Number.isFinite(v)) return null;
        base[j] += share ? (tot[j] ? (v * 100) / tot[j] : 0) : v;
        return base[j];
      });
      return { s, i, lo, hi };
    });
  }, [series, hidden, vcols, np, stacked, share]);

  // ---- y scale (ticks first: the left margin is as wide as the longest label) ----
  const yInfo = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const L of layers) {
      const vs = stacked || L.s.type === 'bar' ? L.hi : cols[L.i]; // lines: every raw day, so peaks set the scale
      for (const v of vs) if (v != null && Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      if (L.lo) for (const v of L.lo) if (v != null) lo = Math.min(lo, v);
    }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    const logOk = lo > 0 && !share;
    if (share) { lo = 0; hi = 100; }
    if (yDomain && !share) { lo = yDomain[0]; hi = yDomain[1]; }
    const zero = zeroBaseline ?? (stacked || hasBars || series.every((s) => s.type === 'area'));
    const useLog = log && logOk && lo > 0;
    if (zero && !useLog && lo > 0) lo = 0;
    if (!yDomain && !share && !useLog) { const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.1 || 1; const wasPositive = lo >= 0; hi += pad; if (!zero) lo -= pad; if (wasPositive && lo < 0) lo = 0; }
    return { lo, hi, useLog, logOk };
  }, [layers, cols, share, yDomain, zeroBaseline, stacked, hasBars, series, log]);
  const { useLog, logOk } = yInfo;
  const fmtAxis: ValueFormat = share ? 'pct0' : format;
  const axisUnit = share ? undefined : (unit ?? axisLabels([yInfo.hi], format).unit);
  const yTitle = [axisUnit, aggWord].filter(Boolean).join(' · ');
  const top = M.top + (yTitle ? 14 : 0);
  const ih = h - top - M.bottom;
  const y = useMemo(() => {
    const { lo, hi } = yInfo;
    return useLog ? scaleLog().domain([lo * 0.9, hi * 1.1]).range([ih, 0]) : scaleLinear().domain([lo, hi]).range([ih, 0]).nice(5);
  }, [yInfo, useLog, ih]);
  const yTicks = useMemo(() => {
    if (useLog) {
      // decades, or 1-2-5 steps when the range is under three decades; never d3's uneven 1…9 run
      const all = (y as ReturnType<typeof scaleLog>).ticks();
      const lead = (t: number) => Math.round(t / 10 ** Math.floor(Math.log10(t) + 1e-9));
      let ts = all.filter((t) => lead(t) === 1);
      if (ts.length < 3) ts = all.filter((t) => [1, 2, 5].includes(lead(t)));
      if (ts.length < 3) ts = all;
      const every = Math.ceil(ts.length / 6);
      return ts.filter((_, i) => i % every === 0);
    }
    const [d0, d1] = y.domain();
    if (fmtAxis === 'days' && Math.max(Math.abs(d0), Math.abs(d1)) >= 730) return scaleLinear().domain([d0 / 365.25, d1 / 365.25]).ticks(5).map((t) => t * 365.25);
    return (y as ReturnType<typeof scaleLinear>).ticks(5);
  }, [y, useLog, fmtAxis]);
  const yLab = useMemo(() => {
    const { labels } = axisLabels(yTicks, fmtAxis, useLog);
    return yTicks.map((v, i) => ({ v, label: labels[i] })).filter((t, i, a) => i === 0 || t.label !== a[i - 1].label);
  }, [yTicks, fmtAxis, useLog]);

  const endLines = endLabel && !stacked ? layers.filter((L) => isLine(L.s)) : [];
  const left = Math.max(narrow ? 36 : 46, Math.ceil(Math.max(0, ...yLab.map((t) => t.label.length)) * CW) + 12);
  const endW = endLines.length ? Math.min(narrow ? 92 : 150, Math.ceil(Math.max(...endLines.map((L) => L.s.label.length)) * CW) + 10) : 0;
  const m = { top, bottom: M.bottom, left, right: (narrow ? 8 : M.right) + endW };
  const iw = Math.max(40, width - m.left - m.right);

  // ---- x scale: bars get half a slot of padding at each end so the edge bars aren't clipped ----
  const x = useMemo(() => {
    const t0 = ts[0] ?? 0, t1 = ts[n - 1] ?? t0;
    const pad = hasBars ? stepMs / 2 : 0;
    return scaleUtc().domain([new Date(t0 - pad), new Date(t1 === t0 && !pad ? t0 + DAY : t1 + pad)]).range([0, iw]);
  }, [ts, n, hasBars, stepMs, iw]);
  const X = (t: number) => x(new Date(t));
  const ptX = pa.map((a) => X((ts[a] + ts[a + k - 1]) / 2)); // centre of each point's days (bars, hover)
  const endX = pa.map((a) => X(ts[a + k - 1])); // its last day (line values)
  const slot = n ? X(ts[0] + k * stepMs) - X(ts[0]) : iw;
  const barW = slot >= 3 ? slot * 0.72 : Math.max(0.8, slot);
  const curve = step ? curveStepAfter : curveLinear;

  const spanDays = n ? (ts[n - 1] - ts[0]) / DAY : 0;
  const tickFmt = (d: Date) => (spanDays > 900 ? year(d) : spanDays > 120 ? monthYear(d) : dateShort(d));
  // keep ticks at least ~64px from the last kept one so labels never collide
  const xTicks = x.ticks(narrow ? 4 : 6).reduce<Date[]>((kept, t) => {
    const px = x(t);
    if (px >= 0 && px <= iw - 18 && (!kept.length || px - x(kept[kept.length - 1]) >= (narrow ? 70 : 64))) kept.push(t);
    return kept;
  }, []);

  // ---- paths (memoised so hovering doesn't rebuild them) ----
  const paths = useMemo(() => {
    const defined = (d: readonly [number, number | null]) => d[1] != null && Number.isFinite(d[1]) && (!useLog || d[1]! > 0);
    const ln = d3line<readonly [number, number | null]>().defined(defined).x((d) => d[0]).y((d) => y(d[1]!)).curve(curve);
    const xAt = ts.map(X);
    return layers.map((L) => {
      if (L.s.type === 'bar') return null;
      if (stacked) {
        const pts = L.hi.map((v, j) => [endX[j], v] as const);
        const lo = L.lo!;
        const ar = d3area<readonly [number, number | null]>().defined(defined).x((d) => d[0]).y1((d) => y(d[1]!)).y0((_, j) => y(lo[j] ?? 0)).curve(curve);
        // the edge line only where this layer has something: an empty pool draws no line along the stack top
        const edge = pts.map((d, j) => (vcols[L.i][j] ? d : ([d[0], null] as const)));
        return { area: ar(pts) ?? '', line: ln(edge) ?? '' };
      }
      const vs = cols[L.i];
      const pts = thin(vs, Math.max(60, Math.round(iw))).map((i) => [xAt[i], vs[i]] as const);
      const ar = L.s.type === 'area' ? d3area<readonly [number, number | null]>().defined(defined).x((d) => d[0]).y1((d) => y(d[1]!)).y0(useLog ? ih : Math.min(ih, Math.max(0, y(0)))).curve(curve)(pts) ?? '' : '';
      return { area: ar, line: ln(pts) ?? '' };
    });
  }, [layers, cols, ts, x, y, useLog, curve, stacked, iw, ih, k]);

  // ---- event labels: 12px, staggered into rows; numbered markers with a key below when they still don't fit ----
  const evs = useMemo(() => {
    if (!n) return { list: [], numbered: false };
    const inView = events.map((e) => ({ ...e, t: T(e.date) })).filter((e) => e.t >= ts[0] && e.t <= ts[n - 1]).sort((a, b) => a.t - b.t);
    const place = (txt: (e: (typeof inView)[number], i: number) => string, rows: number) => {
      const ends: number[] = [];
      let ok = true;
      const list = inView.map((e, i) => {
        const ex = X(e.t), text = txt(e, i), w = text.length * CW;
        const right = ex + 5 + w > iw;
        const l0 = right ? ex - 5 - w : ex + 5;
        let row = ends.findIndex((end) => l0 >= end + 8);
        if (row < 0) { row = ends.length; if (row >= rows) { ok = false; row = rows - 1; } }
        ends[row] = Math.max(ends[row] ?? -Infinity, l0 + w);
        return { ...e, ex, text, right, row };
      });
      return { list, ok };
    };
    const named = place((e) => e.label, narrow ? 2 : 3);
    if (named.ok) return { list: named.list, numbered: false };
    return { list: place((_, i) => String(i + 1), 3).list, numbered: true };
  }, [events, ts, n, x, iw, narrow]);

  // ---- end-of-line labels, pushed apart vertically ----
  const ends = useMemo(() => {
    const out = endLines.flatMap((L) => {
      const vs = cols[L.i];
      let li = vs.length - 1;
      while (li >= 0 && (vs[li] == null || !Number.isFinite(vs[li]))) li--;
      return li < 0 ? [] : [{ s: L.s, x: X(ts[li]), y: y(vs[li]!) }];
    }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < out.length; i++) if (out[i].y - out[i - 1].y < 14) out[i].y = out[i - 1].y + 14;
    return out;
  }, [endLines.map((L) => L.s.key).join(), cols, ts, x, y]);

  const hi = hover != null && hover < np ? hover : null;

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || !np) return;
    const px = clientX - el.getBoundingClientRect().left - m.left;
    let a = 0, b = np - 1;
    while (b - a > 1) { const c = (a + b) >> 1; if (ptX[c] < px) a = c; else b = c; }
    setKbd(false);
    setHover(Math.abs(ptX[a] - px) <= Math.abs(ptX[b] - px) ? a : b);
  };

  const toggle = (key: string) => {
    const nx = new Set(hidden);
    if (nx.has(key)) nx.delete(key); else if (series.length - nx.size > 1) nx.add(key);
    setHidden(nx);
    onHiddenChange?.([...nx]);
  };

  // legend and tooltip list the top of a stack first
  const order = stacked ? series.map((_, i) => i).reverse() : series.map((_, i) => i);
  const negs = useMemo(() => series.map((s) => allNeg(s.values)), [series]);
  const show = (v: number, si: number, f: ValueFormat = format) => formatValue(negs[si] ? Math.abs(v) : v, f);

  // tooltip rows, also mirrored into a polite live region for keyboard users
  const tip = hi == null ? null : (() => {
    const a = pa[hi], b = a + k;
    const head = k > 1 ? `${dateShort(ds[a])} – ${dateLong(ds[b - 1])}` : dateLong(ds[a]);
    const rows = order.flatMap((si) => {
      const s = series[si];
      if (hidden.has(s.key)) return [];
      const raw = vcols[si][hi];
      if (raw == null || !Number.isFinite(raw) || (stacked && raw === 0)) return [];
      const L = layers.find((l) => l.s.key === s.key);
      const val = share && L && L.hi[hi] != null ? formatValue(L.hi[hi]! - (L.lo?.[hi] ?? 0), 'pct') : show(raw, si);
      const note = k > 1 && s.type !== 'bar' ? dateShort(ds[b - 1]) : k > 1 && !sumAgg && s.agg === 'sum' ? 'total' : '';
      return [{ s, label: s.label, note, val }];
    });
    const shownSum = series.reduce((acc, s, si) => acc + (hidden.has(s.key) ? 0 : vcols[si][hi] ?? 0), 0);
    const allSum = series.reduce((acc, _, si) => acc + (vcols[si][hi] ?? 0), 0);
    const total = !stacked || visible.length < 2 ? null
      : share ? (hidden.size && allSum ? { label: 'Total shown', val: formatValue((shownSum * 100) / allSum, 'pct') } : null)
      : { label: hidden.size ? 'Total shown' : 'Total', val: formatValue(shownSum, format) };
    return { head, rows, total };
  })();
  const tipText = tip ? [`${tip.head}${aggWord ? `, ${aggWord}` : ''}`, ...tip.rows.map((r) => `${r.label}${r.note ? ` (${r.note})` : ''}: ${r.val}`), ...(tip.total ? [`${tip.total.label}: ${tip.total.val}`] : [])].join('; ') : '';

  const tipLeft = hi != null ? Math.min(Math.max(0, ptX[hi] + m.left + 14), width - 210) : 0;
  const flip = hi != null && ptX[hi] + m.left + 230 > width;
  const legendData = JSON.stringify(order.filter((si) => !hidden.has(series[si].key)).map((si) => ({ label: series[si].label, color: series[si].color, dash: dashOf(series[si]) ?? null, line: isLine(series[si]) })));

  return (
    <div className="stack" style={{ gap: 12 }}>
      {(ranges || logToggle || (stacked && shareToggle)) && (
        <div className="toolbar">
          {ranges && (
            <div className="seg" role="group" aria-label="Range">
              {ranges.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
            </div>
          )}
          {logToggle && (
            <div className="seg" role="group" aria-label="Scale">
              <button type="button" aria-pressed={!useLog} onClick={() => setLog(false)}>Linear</button>
              <button type="button" aria-pressed={useLog} aria-disabled={!logOk || undefined} title={logOk ? undefined : LOG_WHY} aria-description={logOk ? undefined : LOG_WHY}
                style={logOk ? undefined : { opacity: 0.5, cursor: 'not-allowed' }} onClick={() => logOk && setLog(true)}>Log</button>
            </div>
          )}
          {stacked && shareToggle && (
            <div className="seg" role="group" aria-label="Units">
              <button type="button" aria-pressed={!share} onClick={() => setShare(false)}>{format.startsWith('usd') ? 'USD' : format.startsWith('zec') ? 'ZEC' : 'Value'}</button>
              <button type="button" aria-pressed={share} title="Share of all series, hidden ones included" onClick={() => setShare(true)}>Share %</button>
            </div>
          )}
        </div>
      )}
      {showLegend && series.length > 1 && (
        <div className="row" style={{ gap: 6 }} role="group" aria-label="Series">
          {order.map((si) => {
            const s = series[si];
            const on = !hidden.has(s.key);
            const vs = cols[si] ?? [];
            let li = vs.length - 1;
            while (li >= 0 && (vs[li] == null || !Number.isFinite(vs[li]))) li--;
            let val = '';
            if (li >= 0) {
              if (share) { const tot = cols.reduce((acc, c) => acc + (c[li] != null && Number.isFinite(c[li]) ? c[li]! : 0), 0); val = tot ? `${num((vs[li]! * 100) / tot, 1)}%` : ''; }
              else val = show(vs[li]!, si);
            }
            return (
              <button key={s.key} type="button" className="chip" aria-pressed={on} onClick={() => toggle(s.key)} title={on ? `Hide ${s.label}` : `Show ${s.label}`} style={{ maxWidth: '100%', height: 'auto', minHeight: 28, whiteSpace: 'normal', flexWrap: 'wrap', rowGap: 0, ...(on ? null : { opacity: 0.55 }) }}>
                <Swatch s={s} />
                {s.label}
                {val && <span className="muted" style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>{val} · {dateShort(ds[li])}</span>}
              </button>
            );
          })}
        </div>
      )}
      {/* the box's height comes from CSS (.chart-h, the same rule as `h`), so the server-rendered page already has the
          phone height and nothing below it moves when the chart measures itself and redraws */}
      <div className="chart-box">
      <div
        ref={wrapRef}
        className="chart chart-h"
        style={{ '--h': `${height}px`, touchAction: 'pan-y' } as CSSProperties}
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setKbd(true); setHover((v) => Math.max(0, (v ?? np) - 1)); }
          if (e.key === 'ArrowRight') { e.preventDefault(); setKbd(true); setHover((v) => Math.min(np - 1, (v ?? -1) + 1)); }
          if (e.key === 'Escape') setHover(null);
        }}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true" data-legend={legendData} data-unit={yTitle || undefined}
          data-range={n ? `${dateLong(ds[0])} – ${dateLong(ds[n - 1])}${share ? ' · share %' : ''}` : undefined}>
          <defs><clipPath id={`clip-${uid}`}><rect x={0} y={-2} width={iw} height={ih + 4} /></clipPath></defs>
          <g transform={`translate(${m.left},${m.top})`}>
            {yTitle && <text x={-m.left + 2} y={-14} style={TXT}>{yTitle}</text>}
            {yLab.map((t) => (
              <g key={`y${t.v}`}>
                <line className="gl" x1={0} x2={iw} y1={y(t.v)} y2={y(t.v)} />
                <text x={-8} y={y(t.v)} dy="0.32em" textAnchor="end" style={TXT}>{t.label}</text>
              </g>
            ))}
            <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
            {xTicks.map((t, i) => (
              <text key={`x${i}`} x={x(t)} y={ih + 18} textAnchor={i === 0 && x(t) < 20 ? 'start' : 'middle'} style={TXT}>{tickFmt(t)}</text>
            ))}
            {hi != null && k > 1 && <rect data-noexport="" x={ptX[hi] - slot / 2} y={0} width={slot} height={ih} fill="var(--axis)" opacity={0.18} />}
            <g clipPath={`url(#clip-${uid})`}>
              {layers.map((L, li) => {
                const { s, lo, hi: topV } = L;
                if (s.type === 'bar') {
                  return (
                    <g key={s.key} fill={s.color}>
                      {topV.map((v, j) => {
                        if (v == null || !Number.isFinite(v)) return null;
                        const b = lo ? lo[j] ?? 0 : 0;
                        const y0 = y(Math.max(b, useLog ? 1e-9 : -Infinity)), y1 = y(v);
                        return <rect key={j} x={ptX[j] - barW / 2} y={Math.min(y0, y1)} width={barW} height={Math.max(0.5, Math.abs(y0 - y1))} rx={barW > 4 ? 1.5 : 0} opacity={hi != null && hi !== j ? 0.55 : 1} />;
                      })}
                    </g>
                  );
                }
                const p = paths[li];
                if (!p) return null;
                if (s.type === 'area' || stacked) {
                  return (
                    <g key={s.key}>
                      <path d={p.area} fill={s.color} opacity={stacked ? 0.78 : 0.14} />
                      <path d={p.line} fill="none" stroke={s.color} strokeWidth={stacked ? 1 : 1.8} strokeDasharray={dashOf(s)} />
                    </g>
                  );
                }
                return <path key={s.key} d={p.line} fill="none" stroke={s.color} strokeWidth={s.width ?? 1.9} strokeDasharray={dashOf(s)} strokeLinejoin="round" />;
              })}
            </g>
            {evs.list.map((ev, i) => (
              <g key={i}>
                <line x1={ev.ex} x2={ev.ex} y1={0} y2={ih} stroke="var(--axis)" strokeDasharray="2 4" />
                {/* near the right edge the label goes left of its line so it stays inside the plot */}
                <text x={ev.right ? ev.ex - 5 : ev.ex + 5} textAnchor={ev.right ? 'end' : 'start'} y={12 + ev.row * 16} style={HALO}>{ev.text}</text>
              </g>
            ))}
            {ends.map((e) => (
              <text key={e.s.key} x={iw + 6} y={e.y} dy="0.32em" style={{ ...HALO, fill: 'var(--text-2)' }}>{fit(e.s.label, endW - 8)}</text>
            ))}
            {hi != null && (
              <g data-noexport="">
                {k === 1 && <line x1={ptX[hi]} x2={ptX[hi]} y1={0} y2={ih} stroke="var(--axis)" />}
                {layers.map(({ s, i, hi: topV }) => {
                  if (s.type === 'bar') return null;
                  const v = stacked ? (vcols[i][hi] ? topV[hi] : null) : cols[i][pa[hi] + k - 1];
                  if (v == null || !Number.isFinite(v) || (useLog && v <= 0)) return null;
                  return <circle key={s.key} cx={endX[hi]} cy={y(v)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={1.5} />;
                })}
              </g>
            )}
          </g>
        </svg>
        {tip && (
          <div className="tip" style={{ top: 8, left: flip ? undefined : tipLeft, right: flip ? width - (ptX[hi!] + m.left) + 14 : undefined, pointerEvents: 'none' }}>
            <b>{tip.head}{aggWord ? <span className="muted"> · {aggWord}</span> : null}</b>
            {tip.rows.map((r) => (
              <span key={r.s.key} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 8, alignItems: 'center' }}>
                <Swatch s={r.s} />
                <span>{r.label}{r.note && <span className="muted"> · {r.note}</span>}</span>
                <b>{r.val}</b>
              </span>
            ))}
            {tip.total && (
              <span style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 5 }}>
                <i /> <span>{tip.total.label}</span>
                <b>{tip.total.val}</b>
              </span>
            )}
          </div>
        )}
      </div>
      </div>
      {evs.numbered && (
        <ol className="row" style={{ gap: '4px 14px', margin: 0, padding: 0, listStyle: 'none', font: '400 12px var(--mono)', color: 'var(--text-2)' }} aria-label="Events marked on the chart">
          {evs.list.map((ev, i) => <li key={i}><b style={{ color: 'var(--value)' }}>{i + 1}</b> {ev.label} <span className="muted">{dateShort(ev.date)}</span></li>)}
        </ol>
      )}
      <div className="sr-only" aria-live="polite">{kbd ? tipText : ''}</div>
    </div>
  );
}
