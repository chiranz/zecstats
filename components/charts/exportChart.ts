// Chart downloads shared by the /chart/<slug> card and the ChartActions icon group: CSV built from the same panel
// data the chart draws, and a PNG of the plotted SVG with a title and caption. Call from event handlers only.

type CsvSeries = { label: string; values: (number | null)[] };
/** A dated panel as far as CSV needs it (TimeSeriesPanel fits). */
export type CsvPanel = { title?: string; dates: string[]; series: CsvSeries[] };

const cell = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (xs: unknown[]) => xs.map(cell).join(',');

/** Dated panels → one table: a date column, then one column per series (joined on date). */
export function timeSeriesCsv(ps: CsvPanel[]): string | null {
  if (!ps.length) return null;
  const dates = Array.from(new Set(ps.flatMap((p) => p.dates))).sort();
  const cols = ps.flatMap((p) => {
    const idx = new Map(p.dates.map((d, i) => [d, i]));
    return p.series.map((x) => ({ name: p.title ? `${p.title} · ${x.label}` : x.label, get: (d: string) => { const i = idx.get(d); return i == null ? null : x.values[i]; } }));
  });
  if (!dates.length || !cols.length) return null;
  return [line(['date', ...cols.map((c) => c.name)]), ...dates.map((d) => line([d, ...cols.map((c) => c.get(d))]))].join('\n');
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isScalar = (v: unknown) => v == null || ['string', 'number', 'boolean'].includes(typeof v);
// colours, labels for screen readers and layout knobs are presentation, not data
const SKIP = new Set(['color', 'ariaLabel', 'height', 'width']);

/** Rows of objects → a table; a nested list of objects (a histogram per pool…) is expanded into one row per item. */
function rowsCsv(rows: Obj[]): string | null {
  const nestedKey = Object.keys(rows[0] ?? {}).find((k) => Array.isArray(rows[0][k]) && (rows[0][k] as unknown[]).every(isObj));
  const flat: Obj[] = [];
  for (const r of rows) {
    const base: Obj = {};
    for (const [k, v] of Object.entries(r)) if (!SKIP.has(k) && isScalar(v)) base[k] = v;
    const kids = nestedKey ? (r[nestedKey] as Obj[]) : [];
    if (!kids.length) { flat.push(base); continue; }
    for (const kid of kids) {
      const row = { ...base };
      for (const [k, v] of Object.entries(kid)) if (!SKIP.has(k) && isScalar(v)) row[`${nestedKey}.${k}`] = v;
      flat.push(row);
    }
  }
  const cols = Array.from(new Set(flat.flatMap((r) => Object.keys(r))));
  if (!flat.length || !cols.length) return null;
  return [line(cols), ...flat.map((r) => line(cols.map((c) => r[c])))].join('\n');
}

/**
 * A non-dated custom panel's props → CSV, or null when the shape isn't a table. Handles x/y series (charts plotted
 * against coins issued), a row × column grid (the survival triangle) and lists of rows (buckets, rankings, pools).
 */
export function customPanelCsv(props: Obj): string | null {
  // x/y series: [{ label, points: [x, y, date?][] }]
  const series = props.series;
  if (Array.isArray(series) && series.length && series.every((s) => isObj(s) && Array.isArray(s.points))) {
    const ss = series as { label?: string; key?: string; points: unknown[][] }[];
    const xName = /coin|issu/i.test(String(props.xLabel ?? '')) || 'marker' in props || 'markX' in props ? 'coins_issued' : 'x';
    const dated = ss.some((s) => s.points.some((p) => p[2] != null));
    const out = [line(['series', xName, 'value', ...(dated ? ['date'] : [])])];
    for (const s of ss) for (const p of s.points) out.push(line([s.label ?? s.key, p[0], p[1], ...(dated ? [p[2]] : [])]));
    return out.length > 1 ? out.join('\n') : null;
  }
  // grid: rows × cols with cells[row][col]
  if (Array.isArray(props.rows) && Array.isArray(props.cols) && Array.isArray(props.cells)) {
    const rows = props.rows as unknown[], cols = props.cols as unknown[], cells = props.cells as unknown[][];
    return [line(['row', ...cols]), ...rows.map((r, i) => line([r, ...cols.map((_, j) => cells[i]?.[j])]))].join('\n');
  }
  // the first list of row objects among the props
  for (const v of Object.values(props)) {
    if (Array.isArray(v) && v.length && v.every(isObj)) return rowsCsv(v as Obj[]);
  }
  // columns: { labels: [...], a: [...], b: [...] }, at the top level or one or two levels down
  const cols = findColumns(props, 0);
  return cols ? rowsCsv(cols) : null;
}

function findColumns(o: Obj, depth: number): Obj[] | null {
  const labels = o.labels;
  if (Array.isArray(labels) && labels.length) {
    const keys = Object.keys(o).filter((k) => !SKIP.has(k) && k !== 'colors' && Array.isArray(o[k]) && (o[k] as unknown[]).length === labels.length && (o[k] as unknown[]).every(isScalar));
    if (keys.length > 1) return labels.map((_, i) => Object.fromEntries(keys.map((k) => [k === 'labels' ? 'label' : k, (o[k] as unknown[])[i]])));
  }
  if (depth >= 2) return null;
  for (const v of Object.values(o)) if (isObj(v)) { const r = findColumns(v, depth + 1); if (r) return r; }
  return null;
}

export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const saveCsv = (text: string, name: string) => saveBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), name);

/** The plotted SVG inside a card: the TimeSeriesChart plot, a marked export SVG, or else the largest non-icon SVG. */
export function findChartSvg(root: Element | null): SVGSVGElement | null {
  if (!root) return null;
  const marked = root.querySelector<SVGSVGElement>('.chart svg, svg[data-export]');
  if (marked) return marked;
  let best: SVGSVGElement | null = null, area = 0;
  root.querySelectorAll<SVGSVGElement>('svg').forEach((el) => {
    if (el.closest('button, a, .btn')) return;
    const b = el.getBoundingClientRect();
    if (b.width * b.height > area && b.width > 120) { best = el; area = b.width * b.height; }
  });
  return best;
}

const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight'];
function inline(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  for (const p of STYLE_PROPS) (dst as SVGElement).style.setProperty(p, cs.getPropertyValue(p));
  for (let i = 0; i < src.children.length; i++) if (dst.children[i]) inline(src.children[i], dst.children[i]);
}

type LegendItem = { label: string; color: string; dash?: string | null; line?: boolean };
/** A colour as canvas understands it: CSS variables are resolved; patterns and gradients fall back to `fb`. */
function paint(c: string, fb: string): string {
  const v = c.match(/^var\((--[\w-]+)/);
  const out = v ? getComputedStyle(document.documentElement).getPropertyValue(v[1]).trim() : c;
  return !out || /url\(|gradient/.test(out) ? fb : out;
}

/**
 * The plotted SVG as a PNG: title, then a key row (one swatch + label per visible series, the axis unit and the date
 * range, read from the chart's data-legend / data-unit / data-range), the plot, and the caption.
 * Charts that don't publish a legend export without the key row.
 */
export async function svgToPng(svg: SVGSVGElement, title: string, caption: string, legend?: LegendItem[]): Promise<Blob> {
  const box = svg.getBoundingClientRect();
  const w = Math.round(box.width), h = Math.round(box.height);
  let items: LegendItem[] = legend ?? [];
  if (!legend) try { items = JSON.parse(svg.dataset.legend ?? '[]'); } catch { items = []; }
  const meta = [svg.dataset.unit, svg.dataset.range].filter(Boolean).join(' · ');
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inline(svg, clone);
  clone.querySelectorAll('[data-noexport]').forEach((el) => el.remove()); // hover line and dots
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url; });
  const root = getComputedStyle(document.documentElement);
  const tok = (n: string, fb: string) => root.getPropertyValue(n).trim() || fb;
  const muted = tok('--muted', '#7f9c89'), text2 = tok('--text-2', '#b9cfc0');
  const scale = 2, pad = 24, W = w + pad * 2;
  // lay the key out first (it wraps), so the canvas is tall enough
  const g0 = document.createElement('canvas').getContext('2d')!;
  g0.font = '400 12px ui-monospace, monospace';
  const rows: { x: number; it: LegendItem | null; text: string }[][] = [[]];
  let cx = 0;
  const add = (it: LegendItem | null, text: string) => {
    const wd = (it ? 22 : 0) + g0.measureText(text).width + 18;
    if (cx && cx + wd > w) { rows.push([]); cx = 0; }
    rows.at(-1)!.push({ x: cx, it, text });
    cx += wd;
  };
  items.forEach((it) => add(it, it.label));
  if (meta) add(null, meta);
  const keyH = items.length || meta ? rows.length * 20 + 6 : 0;
  const top = 46 + keyH, bottom = 34;
  const c = document.createElement('canvas');
  c.width = W * scale; c.height = (h + top + bottom) * scale;
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  g.fillStyle = tok('--card', '#0b140e');
  g.fillRect(0, 0, W, h + top + bottom);
  g.fillStyle = tok('--value', '#ecf8ef');
  g.font = '600 16px ui-monospace, monospace';
  g.fillText(title, pad, 30);
  g.font = '400 12px ui-monospace, monospace';
  rows.forEach((r, ri) => {
    const yy = 46 + ri * 20 + 10;
    for (const { x, it, text } of r) {
      const px = pad + x;
      if (it) {
        const col = paint(it.color, muted);
        if (it.line) {
          g.strokeStyle = col; g.lineWidth = 2.5;
          g.setLineDash(it.dash ? it.dash.split(/[\s,]+/).map(Number).filter((v) => v > 0) : []);
          g.beginPath(); g.moveTo(px, yy); g.lineTo(px + 16, yy); g.stroke(); g.setLineDash([]);
        } else { g.fillStyle = col; g.fillRect(px + 3, yy - 5, 10, 10); }
      }
      g.fillStyle = it ? text2 : muted;
      g.fillText(text, px + (it ? 22 : 0), yy + 4);
    }
  });
  g.drawImage(img, pad, top, w, h);
  g.fillStyle = muted;
  g.fillText(caption, pad, top + h + 22);
  URL.revokeObjectURL(url);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
}

/** File-name friendly slug. */
export const fileSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart';
