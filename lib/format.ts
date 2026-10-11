// Number and date formatting shared by every page. One place, so "1.2M", "$1.6K" and "11 Oct 2026" look the same everywhere.

export const ZAT = 1e8;
export const zat = (v: number) => v / ZAT;

const nf = (min = 0, max = min) => new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

/** 1234.5 -> "1,235"; digits controls decimals. */
export function num(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return nf(digits).format(v);
}

/** Compact: 1_234_567 -> "1.23M", 950 -> "950". */
export function compact(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  const units: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [d, u] of units) {
    if (a >= d) {
      const x = v / d;
      return `${nf(0, Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? Math.min(1, digits) : digits).format(x)}${u}`;
    }
  }
  return nf(0, a < 1 ? 4 : a < 10 ? 2 : 0).format(v);
}

export const usd = (v: number | null | undefined, digits = 2) => (v == null || !Number.isFinite(v) ? '—' : `${v < 0 ? '−' : ''}$${nf(digits).format(Math.abs(v))}`);
export const usdCompact = (v: number | null | undefined, digits = 2) => (v == null || !Number.isFinite(v) ? '—' : `${v < 0 ? '−' : ''}$${compact(Math.abs(v), digits)}`);
export const zec = (v: number | null | undefined, digits = 0) => `${num(v, digits)} ZEC`;
export const zecCompact = (v: number | null | undefined, digits = 2) => `${compact(v, digits)} ZEC`;
export const pct = (v: number | null | undefined, digits = 1) => (v == null || !Number.isFinite(v) ? '—' : `${nf(digits).format(v)}%`);

/** Signed change with arrow glyph — never colour alone. */
export function delta(v: number | null | undefined, digits = 1, suffix = '%'): { text: string; dir: 'up' | 'dn' | 'flat' } {
  if (v == null || !Number.isFinite(v)) return { text: '—', dir: 'flat' };
  if (Math.abs(v) < 10 ** -digits / 2) return { text: `0${suffix}`, dir: 'flat' };
  return { text: `${v > 0 ? '▲' : '▼'} ${nf(digits).format(Math.abs(v))}${suffix}`, dir: v > 0 ? 'up' : 'dn' };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toDate = (d: string | Date | number) => (d instanceof Date ? d : new Date(typeof d === 'string' && d.length === 10 ? `${d}T00:00:00Z` : d));

/** "11 Oct 2026" — the prose format. */
export function dateLong(d: string | Date | number): string {
  const x = toDate(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}
/** "Oct 11" — short axis format. */
export const dateShort = (d: string | Date | number) => { const x = toDate(d); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}`; };
/** "Oct '26" — month axis format. */
export const monthYear = (d: string | Date | number) => { const x = toDate(d); return `${MONTHS[x.getUTCMonth()]} '${String(x.getUTCFullYear()).slice(2)}`; };
export const year = (d: string | Date | number) => String(toDate(d).getUTCFullYear());
export const iso = (d: Date) => d.toISOString().slice(0, 10);
