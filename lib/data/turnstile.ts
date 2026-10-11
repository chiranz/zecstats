import 'server-only';
import { api } from './core';

// /api/inflation — the Orchard turnstile watch. The live page fetches this and draws everything from it client-side;
// here the same object feeds a server-rendered page.

export type InflationComponent = { key: 'turnstile_breach' | 'masking' | 'extraction' | 'benford' | string; label: string; score: number; weight: number | 'override' };

export type Inflation = {
  benford: { digits: { digit: number; expected: number; observed: number }[]; mad: number; n: number };
  disclosure: {
    balance_at_disclosure_zec: number; current_balance_zec: number; date: string; deshield_acceleration: number; deshielded_since_zec: number;
    drain_days_at_peak_rate: number; extraction_fraction: number; found_date: string; max_daily_deshield_zec: number; migrated_since_zec: number;
    net_drain_fraction: number; patch_date: string; post_deshield_rate_zec_day: number; pre_deshield_rate_zec_day: number; retained_fraction: number;
  };
  index: { components: InflationComponent[]; isi: number };
  masking: { lag_profile: { lag: number; r: number | null }[]; peak_lag: number; same_day_r: number | null };
  /** One row per day since Orchard's launch. in/out are ZEC entering/leaving (out includes migration to Ironwood). */
  series: { balance: number; date: string; deshield: number; in: number; out: number; shield: number }[];
  turnstile: {
    days: number; days_deshield_gt_shield: number; deshield_shield_ratio: number; ever_negative: boolean;
    min_balance_zec: number; min_reconstructed_zec: number; reconcile_gap_zec: number; total_deshield_zec: number; total_shield_zec: number;
  };
};

export const getInflation = () => api<Inflation>('inflation');

/**
 * The one band scheme for the Inflation Suspicion Index, used by every gauge and verdict label. Thresholds are the live
 * gauge's (25 / 55 / 80) and suit the method: ordinary activity alone scores each soft signal at about 0.3, so
 * 25–55 is the range normal behaviour produces (inconclusive); below 25 the signals are quieter than that; above 55
 * they are stronger than confounding explains; 80+ needs every soft signal near its maximum, or a turnstile breach,
 * which pins the index at 100.
 */
export const ISI_BANDS = [
  { from: 0, to: 25, name: 'Quiet', verdict: 'No detectable signature', color: 'var(--up)' },
  { from: 25, to: 55, name: 'Inconclusive', verdict: 'Inconclusive — signals confounded', color: 'var(--warn)' },
  { from: 55, to: 80, name: 'Elevated', verdict: 'Elevated — investigate', color: 'color-mix(in oklab, var(--warn), var(--down))' },
  { from: 80, to: 100, name: 'Severe', verdict: 'Severe — breach-level signal', color: 'var(--down)' },
] as const;
export type IsiBand = (typeof ISI_BANDS)[number];
export const isiBand = (v: number): IsiBand => ISI_BANDS.find((b) => v < b.to) ?? ISI_BANDS[ISI_BANDS.length - 1];
export const isiLabel = (v: number) => isiBand(v).verdict;

/** Nigrini's MAD bands for first-digit tests. */
export const madLabel = (v: number) => (v < 0.006 ? 'close conformity' : v < 0.012 ? 'acceptable conformity' : v < 0.015 ? 'marginal conformity' : 'nonconformity');

/** Cumulative in / out / balance, for the "has more ever left than entered" chart. */
export function cumulativeFlows(s: Inflation['series']) {
  let ci = 0, co = 0;
  const dates: string[] = [], cin: number[] = [], cout: number[] = [], bal: number[] = [];
  for (const r of s) {
    ci += r.in; co += r.out;
    dates.push(r.date); cin.push(ci); cout.push(co); bal.push(r.balance);
  }
  return { dates, cin, cout, bal };
}
