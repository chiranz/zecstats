// Number and date formatting shared by every page. One place, so "1.2M", "$1.6K" and "11 Oct 2026" look the same everywhere.
// Negative numbers use the minus sign "−" (U+2212), never "-"; a value that rounds to zero never shows a sign.

export const ZAT = 1e8;
export const zat = (v: number) => v / ZAT;
export const MINUS = '−';

const cache = new Map<string, Intl.NumberFormat>();
const nf = (min = 0, max = min) => {
  const k = `${min}:${max}`;
  let f = cache.get(k);
  if (!f) cache.set(k, (f = new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max })));
  return f;
};
const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);
/** Format |v| with `f` and prefix "−" only when the rounded text is not zero. */
const signed = (v: number, f: (a: number) => string) => { const t = f(Math.abs(v)); return v < 0 && /[1-9]/.test(t) ? `${MINUS}${t}` : t; };

/** 1234.5 -> "1,235"; digits controls decimals. */
export function num(v: number | null | undefined, digits = 0): string {
  return ok(v) ? signed(v, (a) => nf(digits).format(a)) : '—';
}

const UNITS: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
const places = (x: number, digits: number) => (x >= 100 ? 0 : x >= 10 ? Math.min(1, digits) : digits);
function compactAbs(a: number, digits: number): string {
  const i = UNITS.findIndex(([d]) => a >= d);
  if (i < 0) {
    const t = nf(0, a < 1 ? 4 : a < 10 ? 2 : 0).format(a);
    if (t === '1,000') return '1K';
    // tiny but non-zero keeps two significant digits, so a log axis never reads "0"
    return a > 0 && !/[1-9]/.test(t) ? new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(a) : t;
  }
  const [d, u] = UNITS[i];
  const x = a / d;
  // 999,950 would round to "1,000K": say "1M" instead
  if (i > 0 && Number(x.toFixed(places(x, digits))) >= 1000) { const [d2, u2] = UNITS[i - 1]; const y = a / d2; return `${nf(0, places(y, digits)).format(y)}${u2}`; }
  return `${nf(0, places(x, digits)).format(x)}${u}`;
}

/** Compact: 1_234_567 -> "1.23M", 950 -> "950", 999_950 -> "1M", 0.00012 -> "0.00012". Suffixes are always K/M/B/T. */
export function compact(v: number | null | undefined, digits = 2): string {
  return ok(v) ? signed(v, (a) => compactAbs(a, digits)) : '—';
}

export const usd = (v: number | null | undefined, digits = 2) => (ok(v) ? signed(v, (a) => `$${nf(digits).format(a)}`) : '—');
export const usdCompact = (v: number | null | undefined, digits = 2) => (ok(v) ? signed(v, (a) => `$${compactAbs(a, digits)}`) : '—');
export const zec = (v: number | null | undefined, digits = 0) => (ok(v) ? `${num(v, digits)} ZEC` : '—');
export const zecCompact = (v: number | null | undefined, digits = 2) => (ok(v) ? `${compact(v, digits)} ZEC` : '—');
export const pct = (v: number | null | undefined, digits = 1) => (ok(v) ? `${num(v, digits)}%` : '—');

/** Which way is good for a change: 'up' (default), 'down' (deshielded, fees, drain) or 'neutral' (muted either way). */
export type Good = 'up' | 'down' | 'neutral';
export type DeltaInfo = { text: string; dir: 'up' | 'dn' | 'flat'; tone: 'good' | 'bad' | 'neutral'; cls: 'up' | 'dn' | 'muted' };

/**
 * Signed change: the arrow shows direction, `tone`/`cls` the colour (good/bad). A change that rounds to 0 at `digits` is
 * flat: no arrow, muted, never "−0". `cls` is the colour class ('up' green, 'dn' red, 'muted').
 */
export function delta(v: number | null | undefined, digits = 1, suffix = '%', good: Good = 'up'): DeltaInfo {
  if (!ok(v)) return { text: '—', dir: 'flat', tone: 'neutral', cls: 'muted' };
  const t = nf(digits).format(Math.abs(v));
  if (!/[1-9]/.test(t)) return { text: `${t}${suffix}`, dir: 'flat', tone: 'neutral', cls: 'muted' };
  const dir = v > 0 ? 'up' : 'dn';
  const tone = good === 'neutral' ? 'neutral' : (dir === 'up') === (good === 'up') ? 'good' : 'bad';
  return { text: `${dir === 'up' ? '▲' : '▼'} ${t}${suffix}`, dir, tone, cls: tone === 'good' ? 'up' : tone === 'bad' ? 'dn' : 'muted' };
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toDate = (d: string | Date | number) => (d instanceof Date ? d : new Date(typeof d === 'string' && d.length === 10 ? `${d}T00:00:00Z` : d));

/** "11 Oct 2026" — the prose format. */
export function dateLong(d: string | Date | number): string {
  const x = toDate(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}
/** "11 Oct" — short format (axes, tape), day first like dateLong. */
export const dateShort = (d: string | Date | number) => { const x = toDate(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`; };
/** "Oct '26" — month axis format. */
export const monthYear = (d: string | Date | number) => { const x = toDate(d); return `${MONTHS[x.getUTCMonth()]} '${String(x.getUTCFullYear()).slice(2)}`; };
export const year = (d: string | Date | number) => String(toDate(d).getUTCFullYear());
export const iso = (d: Date) => d.toISOString().slice(0, 10);
