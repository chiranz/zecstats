// Dollar-cost-averaging engine for /savings. Pure functions over daily closes, so it runs in the browser.
// Schedule (matches the live /api/dca): the first buy is on the start date; later buys fall on the 1st of each month
// (monthly) or of each quarter (quarterly), every 7 days (weekly) or every day (daily).

export type Freq = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type DcaInput = { dates: string[]; prices: number[]; start: string; end: string; freq: Freq; amount: number };
export type DcaResult = {
  purchases: number; invested: number; finalValue: number; multiple: number; xirr: number | null;
  first: { date: string; price: number; coins: number } | null;
  /** daily series from the first purchase to the end */
  dates: string[]; value: number[]; investedSeries: number[];
};

const DAY = 86400000;
const t = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function schedule(start: string, end: string, freq: Freq): string[] {
  const out: string[] = [];
  const s = t(start), e = t(end);
  if (!(s <= e)) return out;
  if (freq === 'daily' || freq === 'weekly') {
    const step = freq === 'daily' ? 1 : 7;
    for (let x = s; x <= e; x += step * DAY) out.push(iso(x));
    return out;
  }
  out.push(start);
  const d = new Date(s);
  let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (freq === 'quarterly') while (m % 3 !== 0) m++;
  for (;;) {
    if (m > 11) { y += Math.floor(m / 12); m %= 12; }
    const x = Date.UTC(y, m, 1);
    if (x > e) break;
    if (x > s) out.push(iso(x));
    m += freq === 'quarterly' ? 3 : 1;
  }
  return out;
}

/** Money-weighted annual return: the rate r at which the purchases, compounded to the end date, equal the final value. */
export function xirr(flows: { at: number; v: number }[]): number | null {
  if (flows.length < 2) return null;
  const t0 = flows[0].at;
  const npv = (r: number) => flows.reduce((a, f) => a + f.v / Math.pow(1 + r, (f.at - t0) / (365 * DAY)), 0);
  let lo = -0.9999, hi = 100;
  let flo = npv(lo), fhi = npv(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = npv(mid);
    if (Math.abs(fm) < 1e-7 || hi - lo < 1e-10) return mid;
    if (fm * flo < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

export function runDca({ dates, prices, start, end, freq, amount }: DcaInput): DcaResult {
  const idx = new Map(dates.map((d, i) => [d, i]));
  const buys = schedule(start, end, freq).filter((d) => idx.has(d) && prices[idx.get(d)!] > 0);
  const empty: DcaResult = { purchases: 0, invested: 0, finalValue: 0, multiple: 0, xirr: null, first: null, dates: [], value: [], investedSeries: [] };
  if (!buys.length || !idx.has(end)) return empty;
  const i0 = idx.get(buys[0])!, i1 = idx.get(end)!;
  const buyAt = new Set(buys);
  let coins = 0, invested = 0;
  const outDates: string[] = [], value: number[] = [], inv: number[] = [];
  for (let i = i0; i <= i1; i++) {
    const d = dates[i];
    if (buyAt.has(d)) { coins += amount / prices[i]; invested += amount; }
    outDates.push(d); value.push(coins * prices[i]); inv.push(invested);
  }
  const finalValue = coins * prices[i1];
  const flows = buys.map((d) => ({ at: t(d), v: -amount }));
  flows.push({ at: t(end), v: finalValue });
  const p0 = prices[i0];
  return { purchases: buys.length, invested, finalValue, multiple: invested ? finalValue / invested : 0, xirr: xirr(flows), first: { date: buys[0], price: p0, coins: amount / p0 }, dates: outDates, value, investedSeries: inv };
}

/** Same calendar date N years earlier (29 Feb → 28 Feb). */
export function yearsBefore(d: string, n: number): string {
  const x = new Date(t(d));
  const y = x.getUTCFullYear() - n, m = x.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return iso(Date.UTC(y, m, Math.min(x.getUTCDate(), last)));
}
