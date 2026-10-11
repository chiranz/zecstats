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

/** Same bands and wording as the live gauge. */
export const isiLabel = (v: number) => (v < 25 ? 'No detectable signature' : v < 55 ? 'Inconclusive' : v < 80 ? 'Elevated — investigate' : 'Hard evidence');

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
