// /btc-bull-run alignment, following the live page's method: day 0 is the day after each asset's last daily close
// below the anchor, found by walking back from the latest close at or above it. Bitcoin is searched only inside its
// 2015–2018 cycle. Pure, so the anchor control can re-align in the browser.

export type RunPoint = { d: number; date: string; usd: number; mult: number };
export type Run = { anchorDate: string; anchorUsd: number; points: RunPoint[] } | { unavailable: string };
export const BTC_CYCLE = { from: '2015-01-01', to: '2018-12-31' };
const DAY = 86400000;
const t = (d: string) => Date.parse(`${d}T00:00:00Z`);

export function alignRun(dates: string[], closes: number[], anchor: number, window: { from: string; to: string } | null, maxDays = 1000): Run {
  const lo = window ? dates.findIndex((d) => d >= window.from) : 0;
  let hi = window ? dates.findIndex((d) => d > window.to) - 1 : dates.length - 1;
  if (hi < 0) hi = dates.length - 1;
  if (lo < 0) return { unavailable: 'no prices in the window' };
  let L = -1;
  for (let i = hi; i >= lo; i--) if (closes[i] >= anchor) { L = i; break; }
  if (L < 0) return { unavailable: `never closed at or above $${anchor.toLocaleString('en-US')}` };
  let k = -1;
  for (let i = L; i >= lo; i--) if (closes[i] < anchor) { k = i; break; }
  if (k < 0) return { unavailable: `its last close under $${anchor.toLocaleString('en-US')} is before ${dates[lo]}, where this price series starts` };
  const i0 = k + 1;
  const t0 = t(dates[i0]);
  const base = closes[i0];
  const points: RunPoint[] = [];
  for (let i = i0; i <= hi; i++) {
    const d = Math.round((t(dates[i]) - t0) / DAY);
    if (d > maxDays) break;
    points.push({ d, date: dates[i], usd: closes[i], mult: closes[i] / base });
  }
  return { anchorDate: dates[i0], anchorUsd: base, points };
}

export const isRun = (r: Run): r is Extract<Run, { points: RunPoint[] }> => 'points' in r;

export function peakAndTrough(points: RunPoint[]) {
  let p = 0;
  points.forEach((x, i) => { if (x.usd > points[p].usd) p = i; });
  let tr = p;
  for (let i = p; i < points.length; i++) if (points[i].usd < points[tr].usd) tr = i;
  return { peak: points[p], trough: points[tr] };
}

export const atDay = (points: RunPoint[], d: number) => {
  // exact day, else the closest earlier one (a feed gap leaves a gap, it does not shift days)
  let best: RunPoint | undefined;
  for (const x of points) { if (x.d <= d) best = x; else break; }
  return best;
};
