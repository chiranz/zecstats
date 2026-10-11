// Shared time-window model for /chart/<slug>, /compare and TimeSeriesChart: presets, the custom ?from=&to= window
// (same names and meaning as the live site) and the URL helpers. Pure functions, safe on the server.

export type RangeKey = '1M' | '3M' | '6M' | '9M' | '1Y' | '2Y' | '5Y' | 'YTD' | 'ALL';
/** Days back from the last date. YTD has no fixed length (it starts on 1 January of the last date's year). */
export const RANGE_DAYS: Record<RangeKey, number> = { '1M': 31, '3M': 92, '6M': 183, '9M': 275, '1Y': 366, '2Y': 731, '5Y': 1827, YTD: NaN, ALL: Infinity };
export const RANGE_NAME: Record<RangeKey, string> = { '1M': 'Last month', '3M': 'Last 3 months', '6M': 'Last 6 months', '9M': 'Last 9 months', '1Y': 'Last year', '2Y': 'Last 2 years', '5Y': 'Last 5 years', YTD: 'Year to date', ALL: 'All history' };
export const RANGE_ORDER: RangeKey[] = ['1M', '3M', '6M', '9M', '1Y', '2Y', '5Y', 'YTD', 'ALL'];

/** An inclusive date window, YYYY-MM-DD at both ends. */
export type DateWindow = { from: string; to: string };

export const isRangeKey = (v: unknown): v is RangeKey => typeof v === 'string' && v in RANGE_DAYS;

/** A real calendar date in YYYY-MM-DD (rejects 2025-02-31 and the like). */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v;
}

const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);

/** First date a preset keeps, given the data's first and last dates. */
export function presetFrom(r: RangeKey, first: string, last: string): string {
  const days = RANGE_DAYS[r];
  const from = r === 'YTD' ? `${last.slice(0, 4)}-01-01` : Number.isFinite(days) ? shift(last, days) : first;
  return from < first ? first : from;
}

/**
 * The ?from=&to= window clamped to the data's [first, last]; either end may be left out (it then runs to the edge).
 * Returns null when neither end is a valid date. Reversed ends are swapped.
 */
export function customWindow(from: unknown, to: unknown, first: string, last: string): DateWindow | null {
  const f = isIsoDate(from) ? from : null;
  const t = isIsoDate(to) ? to : null;
  if ((!f && !t) || !first || !last) return null;
  let a = f ?? first, b = t ?? last;
  if (a > b) [a, b] = [b, a];
  const clamp = (d: string) => (d < first ? first : d > last ? last : d);
  return { from: clamp(a), to: clamp(b) };
}

/** Index range [a, b) of `dates` inside the window, widened to at least two points so a line can still be drawn. */
export function windowIndex(dates: string[], w: DateWindow): [number, number] {
  let a = dates.findIndex((d) => d >= w.from);
  if (a < 0) a = dates.length;
  let b = dates.length;
  while (b > a && dates[b - 1] > w.to) b--;
  if (dates.length >= 2 && b - a < 2) {
    b = Math.max(b, Math.min(dates.length, a + 2));
    a = Math.max(0, Math.min(a, b - 2));
  }
  return [a, b];
}

/**
 * The preset list a chart offers: the declared one plus 9M (between 6M and 1Y) and YTD (before ALL), as on the
 * live site, when they would show something the other presets don't.
 */
export function withLivePresets(ranges: RangeKey[], first: string, last: string): RangeKey[] {
  const out = new Set(ranges);
  if (out.has('6M') && out.has('1Y')) out.add('9M');
  // YTD only when the data starts before 1 January and the year so far is longer than a month
  const jan1 = `${last.slice(0, 4)}-01-01`;
  if (first && first <= jan1 && shift(last, 31) >= jan1) out.add('YTD');
  return RANGE_ORDER.filter((r) => out.has(r));
}

/** /compare link state: the chart list, a preset or custom window, and the annotations flag (live: ?ann=1). */
export type CompareState = { range: RangeKey; win: DateWindow | null; ann: boolean };
export function compareHref(charts: string[], st: CompareState) {
  const q = new URLSearchParams();
  if (charts.length) q.set('charts', charts.join(','));
  if (st.win) { q.set('from', st.win.from); q.set('to', st.win.to); }
  else if (st.range !== '1Y') q.set('range', st.range);
  if (st.ann) q.set('ann', '1');
  const qs = q.toString().replace(/%2C/gi, ','); // keep the chart list readable: ?charts=price,pools
  return `/compare${qs ? `?${qs}` : ''}`;
}
