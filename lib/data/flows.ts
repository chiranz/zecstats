import 'server-only';
import { zat as Z } from '@/lib/format';
import { getCompleteDailyStats, type DailyStat, type Pool } from './snapshot';

// Pool flows from daily-stats: one derivation for every page that quotes them (/activity, /chart/flow-*, the /charts card).

/** Daily flows per pool, as the live site derives them. Transparent runs backwards: its inflow is deshielding. */
export function poolFlows(r: DailyStat, pool: Pool): { inflow: number; outflow: number; balance: number } {
  if (pool === 'transparent') {
    const mig = r.ironwood_inflow_shielded_zat || 0;
    return {
      inflow: Z(r.sprout_outflow_zat + r.sapling_outflow_zat + r.orchard_outflow_zat + r.ironwood_outflow_zat - mig),
      outflow: Z(r.sprout_inflow_zat + r.sapling_inflow_zat + r.orchard_inflow_zat + r.ironwood_inflow_zat - mig),
      balance: Z(r.end_transparent_zat),
    };
  }
  const k = pool as Exclude<Pool, 'transparent'>;
  return { inflow: Z(r[`${k}_inflow_zat`] || 0), outflow: Z(r[`${k}_outflow_zat`] || 0), balance: Z(r[`end_${k}_zat`]) };
}

export const SHIELDED_POOLS = ['sprout', 'sapling', 'orchard', 'ironwood'] as const;
export type ShieldWindow = {
  from: string; to: string;
  /** ZEC shielded (transparent → any shielded pool) and deshielded; migration between shielded pools is in neither */
  shield: number; deshield: number; net: number;
  /** each shielded pool's own net change (in − out); they add up to `net`, migration included on both sides */
  perPool: Record<(typeof SHIELDED_POOLS)[number], number>;
  /** ZEC that moved from another shielded pool into Ironwood */
  migration: number;
};

function windowOf(rows: DailyStat[]): ShieldWindow {
  const perPool = { sprout: 0, sapling: 0, orchard: 0, ironwood: 0 };
  let shield = 0, deshield = 0, migration = 0;
  for (const r of rows) {
    const t = poolFlows(r, 'transparent');
    shield += t.outflow; deshield += t.inflow; migration += Z(r.ironwood_inflow_shielded_zat || 0);
    for (const k of SHIELDED_POOLS) { const f = poolFlows(r, k); perPool[k] += f.inflow - f.outflow; }
  }
  return { from: rows[0]?.date ?? '', to: rows.at(-1)?.date ?? '', shield, deshield, net: shield - deshield, perPool, migration };
}

/** Shielding over the last `days` complete UTC days, and the `days` before them (the partial current day is never in it). */
export async function shieldingWindows(days = 7, rows?: DailyStat[]): Promise<{ now: ShieldWindow; prior: ShieldWindow }> {
  const all = rows ?? (await getCompleteDailyStats());
  return { now: windowOf(all.slice(-days)), prior: windowOf(all.slice(-2 * days, -days)) };
}
