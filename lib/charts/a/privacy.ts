import 'server-only';
import type { ChartDef } from '../types';
import { POOL_COLOR, POOL_LABEL, POOLS, poolsFromRow, type DailyStat, type Pool } from '@/lib/data/snapshot';
import { api } from '@/lib/data/core';
import { dateLong, num, zat as Z } from '@/lib/format';
import { NU_EVENTS, changePct, changeWords, completeDaily, dataThrough, fmt, headline, lastIdx, sma, spark } from './common';

const POOL_META = {
  transparent: { status: 'Not private · public balances', launched: 'Oct 2016' },
  sprout: { status: 'Deprecated · withdraw only', launched: 'Oct 2016' },
  sapling: { status: 'Active · older generation', launched: 'Oct 2018' },
  orchard: { status: 'Draining into Ironwood', launched: 'May 2022' },
  ironwood: { status: 'Active · newest pool', launched: 'Jul 2026' },
} as const;

export const pools: ChartDef = {
  slug: 'pools',
  title: 'Zcash shielded pool balances',
  short: 'Shielded pool balances',
  question: 'How much ZEC sits in each shielded pool?',
  group: 'privacy',
  source: 'onchain',
  sourceNote: 'Daily balance at end of UTC day · our Zebra node (consensus value pools)',
  unit: 'ZEC (or share of shielded ZEC with “Share %”)',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['daily-stats', 'pool-balances'],
  related: ['shielding-rate', 'flow-compare', 'flow-ironwood', 'anonymity'],
  explainer: [
    {
      heading: 'How do you read the shielded pools?',
      paragraphs: [
        'Zcash has had four shielded pools, and they are **generations, not alternatives**. Sprout (2016) was the original and is deprecated; Sapling (2018) made shielded transactions practical; Orchard (NU5, 2022) replaced it; Ironwood is the newest. Value moves forward through them, so a falling Sapling line is usually migration, not people giving up on privacy.',
        '**Every crossing is visible even though the contents are not.** A shielded pool’s total is enforced by consensus: value entering or leaving crosses the transparent turnstile and is counted, so these balances are exact rather than estimated. What stays hidden is everything inside — who holds it, in what amounts, and who it moves to.',
        '**The handover at the right edge is Ironwood.** Since it went live on 28 Jul 2026 (block 3,428,143), most of what Orchard held at activation has crossed into it.',
        '**What this is not:** a measure of how much Zcash activity is private. A balance is a stock and an upper bound on shielded value; coins can rest in a pool for years without a single private payment. For activity, see transaction types and the shielded share of transactions.',
      ],
    },
    {
      heading: 'Methodology',
      paragraphs: [
        'Balances are the consensus value-pool totals at the end of each complete UTC day, read from our Zebra node. The current partial day is left out.',
        'Transparent is available as a chip but starts hidden: at ~12M ZEC it would bury the shielded pools beneath it.',
        'Share % divides each visible pool by the total of the visible pools, so it answers “where does shielded ZEC sit?” when Transparent is off.',
      ],
    },
  ],
  async load() {
    const rows = await completeDaily();
    const dates = rows.map((r) => r.date);
    const snap = rows.map(poolsFromRow);
    const last = snap[snap.length - 1];
    const keys = POOLS;
    const shielded = snap.map((p) => p.shielded);
    const ch = changePct(shielded, 28);
    const v = `${(last.shielded / 1e6).toFixed(2)}M ZEC`;
    const ironShare = (last.ironwood / last.shielded) * 100;
    const tableRows = keys.map((k) => ({
      key: k, label: POOL_LABEL[k], color: POOL_COLOR[k], ...POOL_META[k],
      balance: last[k], shareShielded: k === 'transparent' ? null : (last[k] / last.shielded) * 100, shareSupply: (last[k] / last.supply) * 100,
    }));
    return {
      panels: [
        {
          kind: 'timeseries', dates, format: 'zec', stacked: true, shareToggle: true, height: 380,
          series: keys.map((k) => ({ key: k, label: POOL_LABEL[k], color: POOL_COLOR[k], values: snap.map((p) => (k === 'ironwood' && p[k] === 0 ? null : p[k])), type: 'area' as const, hidden: k === 'transparent' })),
        },
        { kind: 'custom', title: 'Pool balances today', component: 'a-pool-table', props: { rows: tableRows, shieldedTotal: last.shielded, shieldedShare: last.shieldedPct, supply: last.supply, date: dateLong(last.date) } },
      ],
      headline: headline('Shielded supply', v, last.date, `**${v}** sits in shielded pools on ${dateLong(last.date)}; **Ironwood holds ${ironShare.toFixed(0)}%** of it${ch == null ? '' : ` — the total is ${changeWords(ch).replace(/\*\*/g, '')}`}.`, ch),
      spark: spark(shielded),
      indexValue: `${(last.shielded / 1e6).toFixed(2)}M ZEC`,
      defaultRange: '5Y',
      events: NU_EVENTS.filter((e) => e.date >= '2020-01-01'),
      dataThrough: await dataThrough(),
    };
  },
};

/* ------------------------------------------------------------ flows (shared) */
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
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${num(Math.abs(v), 0)} ZEC`;

const FLOW_INTRO = (name: string) => ({
  heading: 'What is the difference between a balance and a flow?',
  paragraphs: [
    `The upper panel is how much ZEC sits in the ${name} pool; the lower is how much moved in and out each day. A balance is a stock and a flow is a rate. **A falling balance with healthy flow in both directions is turnover; a falling balance with no flow is abandonment.** They look the same on the top panel alone.`,
    '**Both sides are exact, not estimated.** Value entering or leaving a shielded pool crosses the transparent turnstile and is counted by consensus, which is why these numbers can be stated precisely while nothing about the holders can be.',
  ],
});

function flowDef(pool: Pool, o: { title: string; question: string; note: string; inLabel: string; outLabel: string; related: string[]; defaultRange: '1Y' | '5Y' | 'ALL' | '3M'; from?: string; extra: string }): ChartDef {
  const name = POOL_LABEL[pool];
  return {
    slug: `flow-${pool}`, title: o.title, short: `${name} flows + balance`, question: o.question, group: 'privacy', source: 'onchain',
    sourceNote: 'End-of-day balance + daily pool flows · our Zebra node', unit: 'ZEC; ZEC per day', pools: [pool], api: ['daily-stats'], related: o.related,
    explainer: [
      { ...FLOW_INTRO(name), paragraphs: [...FLOW_INTRO(name).paragraphs, o.extra] },
      { heading: 'Methodology', paragraphs: ['The balance is the consensus value-pool total at the end of each complete UTC day. Flows are the day’s value entering and leaving the pool; outflows are drawn below zero so a mirrored day reads as turnover at a glance. On long ranges the bars are summed into multi-day columns (the tooltip says how many days).', o.note] },
    ],
    async load() {
      const all = await completeDaily();
      const rows = o.from ? all.filter((r) => r.date >= o.from!) : all;
      const f = rows.map((r) => poolFlows(r, pool));
      const dates = rows.map((r) => r.date);
      const bal = f.map((x) => x.balance);
      const i = rows.length - 1;
      const in7 = sum(f.slice(-7).map((x) => x.inflow)), out7 = sum(f.slice(-7).map((x) => x.outflow));
      const v = `${num(bal[i], 0)} ZEC`;
      return {
        panels: [
          { kind: 'timeseries', title: `${name} balance`, dates, format: 'zec', height: 260, series: [{ key: 'bal', label: 'Balance', color: POOL_COLOR[pool], values: bal, type: 'area' }] },
          { kind: 'timeseries', title: 'Daily flows', dates, format: 'zec', height: 220, zeroBaseline: true, series: [
            { key: 'in', label: o.inLabel, color: pool === 'transparent' || pool === 'sprout' ? 'var(--s2)' : POOL_COLOR[pool], values: f.map((x) => x.inflow), type: 'bar' },
            { key: 'out', label: o.outLabel, color: 'var(--s4)', values: f.map((x) => -x.outflow), type: 'bar' },
          ] },
        ],
        headline: headline(`${name} balance`, v, dates[i], `The ${name} pool held **${v}** at the end of ${dateLong(dates[i])}; over the last 7 days **${signed(in7 - out7)}** net (${num(in7, 0)} in, ${num(out7, 0)} out).`, changePct(bal, 28)),
        spark: spark(bal),
        indexValue: bal[i] >= 1e6 ? `${(bal[i] / 1e6).toFixed(2)}M ZEC` : v,
        defaultRange: o.defaultRange,
        ranges: o.from ? ['1M', '3M', 'ALL'] : undefined,
        events: NU_EVENTS.filter((e) => e.date >= (o.from ?? '2018-01-01')),
        dataThrough: dates[i],
      };
    },
  };
}

export const flowTransparent = flowDef('transparent', {
  title: 'Transparent flows + balance', question: 'Is ZEC leaving the transparent pool for the shielded ones?', defaultRange: '1Y',
  inLabel: 'In (deshielded)', outLabel: 'Out (shielded)', related: ['flow-compare', 'shielding-rate', 'pools', 'flow-orchard'],
  extra: '**This one runs backwards.** Its inflow is deshielding — value coming out of a shielded pool — and its outflow is shielding. A rising transparent balance is the shielded set losing ground: the mirror image of the pool balances.',
  note: 'Transparent flows are the sum of every shielded pool’s flows, minus Orchard → Ironwood migration, which never touches the transparent pool.',
});
export const flowSprout = flowDef('sprout', {
  title: 'Sprout flows + balance', question: 'Is anything still leaving Sprout, the original shielded pool?', defaultRange: '5Y',
  inLabel: 'Inflow', outLabel: 'Outflow', related: ['flow-sapling', 'pools', 'flow-compare', 'pool-residency'],
  extra: '**Sprout is deprecated and one-directional in practice.** It was the original shielded pool (2016, JoinSplits); nothing new enters, and the balance only falls as the last holders move out. The remainder is coins whose owners have not moved them — almost certainly including coins whose owners no longer can.',
  note: 'Sprout flows are JoinSplit vpub_old / vpub_new totals per day.',
});
export const flowSapling = flowDef('sapling', {
  title: 'Sapling flows + balance', question: 'Is Sapling draining, and where is it going?', defaultRange: '5Y',
  inLabel: 'Inflow', outLabel: 'Outflow', related: ['flow-orchard', 'pools', 'flow-compare', 'shielding-rate'],
  extra: '**Sapling’s decline is mostly migration, not exit.** It activated at block 419,200 and carried shielded Zcash until Orchard; value leaving it has largely gone to Orchard rather than to transparent addresses. Check the two charts together before reading a fall as people giving up on privacy.',
  note: 'Sapling flows are the day’s net value balance of Sapling spends and outputs, as reported by consensus.',
});
export const flowOrchard = flowDef('orchard', {
  title: 'Orchard flows + balance', question: 'How fast is Orchard emptying into Ironwood?', defaultRange: '1Y', from: '2022-05-31',
  inLabel: 'Inflow', outLabel: 'Outflow', related: ['flow-ironwood', 'pools', 'orchard-internal', 'flow-compare'],
  extra: '**Orchard was where new shielded activity went** (NU5, block 1,687,104, Halo 2) until Ironwood. Its outflow since 28 Jul 2026 is dominated by the migration into Ironwood, tracked on the Ironwood migration page.',
  note: 'Orchard activated with NU5 on 31 May 2022; the chart starts there.',
});
export const flowIronwood = flowDef('ironwood', {
  title: 'Ironwood flows + balance', question: 'How is the Ironwood pool filling?', defaultRange: 'ALL', from: '2026-07-14',
  inLabel: 'Inflow', outLabel: 'Outflow', related: ['flow-orchard', 'pools', 'shielding-rate', 'anonymity'],
  extra: '**The flat zero at the left is not missing data.** Ironwood activated on 28 Jul 2026 (block 3,428,143) and holds nothing before that. Its inflow so far is dominated by migration from Orchard.',
  note: 'Ironwood inflow includes Orchard → Ironwood migration; the transparent-flows chart subtracts it.',
});

/* ------------------------------------------------------------- flow-compare */
export const flowCompare: ChartDef = {
  slug: 'flow-compare',
  title: 'Net pool flows comparison',
  short: 'Net pool flows comparison',
  question: 'When one pool loses ZEC, does another gain it?',
  group: 'privacy',
  source: 'onchain',
  sourceNote: 'Daily net flow per pool · our Zebra node',
  unit: 'ZEC per day (net)',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['daily-stats'],
  related: ['pools', 'flow-transparent', 'flow-ironwood', 'shielding-rate'],
  explainer: [
    {
      heading: 'When one pool loses, does another gain?',
      paragraphs: [
        'Daily **net** flow per pool — inflow minus outflow — one row per pool on the same dates. Above zero the pool grew that day; below, it shrank. Read down a column: **a mirrored pair is migration; every pool falling except transparent is value leaving the shielded set**.',
        '**Net hides gross.** A quiet day and a day with large equal flows both plot as zero, and they are not the same day. The per-pool flow charts show both sides; this one is for direction.',
        '**The pools are different ages.** Sprout and Sapling mostly drain; Orchard and Ironwood mostly fill. Much of what looks like sentiment is the generational hand-off described on shielded pool balances.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Small multiples instead of five overlaid lines, so mirrored moves line up vertically and no pool hides another. Each row has its own y-scale; compare shapes and signs across rows, magnitudes within one. Long ranges sum days into columns.'] },
  ],
  async load() {
    const rows = await completeDaily();
    const dates = rows.map((r) => r.date);
    const net = (k: Pool) => rows.map((r) => { const f = poolFlows(r, k); return f.inflow - f.outflow; });
    const shieldNet7 = -sum(net('transparent').slice(-7));
    const prior7 = -sum(net('transparent').slice(-14, -7));
    return {
      panels: POOLS.map((k, i) => ({ kind: 'timeseries' as const, title: `${POOL_LABEL[k]} · net ZEC/day`, dates, format: 'zecCompact' as const, height: i === 0 ? 200 : 150, zeroBaseline: true, series: [{ key: k, label: POOL_LABEL[k], color: POOL_COLOR[k], values: net(k), type: 'bar' as const }] })),
      headline: headline('Net shielding, 7 days', signed(shieldNet7), dates[dates.length - 1], `Shielded pools gained **${signed(shieldNet7)}** net from transparent in the 7 days to ${dateLong(dates[dates.length - 1])}, against ${signed(prior7)} the week before.`),
      spark: spark(sma(net('transparent').map((v) => -v), 7), 180),
      indexValue: `${signed(shieldNet7).replace(' ZEC', '')} ZEC 7d`,
      defaultRange: '3M',
      dataThrough: dates[dates.length - 1],
    };
  },
};

/* ----------------------------------------------------------- shielding-rate */
export const shieldingRate: ChartDef = {
  slug: 'shielding-rate',
  title: 'Shielding rate',
  short: 'Shielding rate',
  question: 'What share of all ZEC sits in shielded pools?',
  group: 'privacy',
  source: 'onchain',
  sourceNote: 'Pool balances at end of UTC day · our Zebra node',
  unit: '% of supply; ZEC per day',
  pools: ['sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['daily-stats'],
  related: ['pools', 'anonymity', 'flow-compare', 'tx-types'],
  explainer: [
    {
      heading: 'What does the shielding rate tell you?',
      paragraphs: [
        'This is the share of all mined ZEC sitting in shielded pools (Sprout + Sapling + Orchard + Ironwood). It is exact: every coin entering or leaving a pool crosses the transparent turnstile and is counted by consensus.',
        '**It is an upper bound on shielded value, not a measure of how much Zcash use is private.** A coin can rest in a pool for years without a private payment, and a coin shielded on arrival from an exchange and deshielded soon after can be linked by anyone watching both ends. Read it as capacity, not activity.',
        '**It moves for reasons that are not adoption.** A pool migration shifts value between pools without changing the total; one large holder moves the percentage more than thousands of ordinary users. For whether a deshield is covered, the anonymity set is the honest number.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Shielded share = (Sprout + Sapling + Orchard + Ironwood) ÷ consensus supply at the end of each complete UTC day, drawn on a fixed 0–100% axis. Net shielding = value shielded − value deshielded that day, excluding Orchard → Ironwood migration (which is shielded on both sides).'] },
  ],
  async load() {
    const rows = await completeDaily();
    const dates = rows.map((r) => r.date);
    const pct = rows.map((r) => poolsFromRow(r).shieldedPct);
    const netSh = rows.map((r) => { const f = poolFlows(r, 'transparent'); return f.outflow - f.inflow; });
    const i = lastIdx(pct);
    const ch = changePct(pct, 28);
    const v = `${pct[i]!.toFixed(2)}%`;
    const pts = pct[i]! - pct[i - 28]!;
    return {
      panels: [
        { kind: 'timeseries', title: '% of supply shielded', dates, format: 'pct', yDomain: [0, 100], height: 300, series: [{ key: 'pct', label: 'Shielded share', color: 'var(--p-ironwood)', values: pct, type: 'area' }] },
        { kind: 'timeseries', title: 'Net shielding per day', dates, format: 'zec', zeroBaseline: true, height: 200, series: [
          { key: 'net', label: 'Net shielded', color: 'var(--s2)', values: netSh, type: 'bar', agg: 'mean' },
          { key: 'avg', label: '7-day average', color: 'var(--value)', values: sma(netSh, 7), type: 'line', width: 1.6 },
        ] },
      ],
      headline: headline('Shielded share', v, dates[i], `**${v}** of all mined ZEC sits in shielded pools on ${dateLong(dates[i])} — ${pts >= 0 ? '▲' : '▼'} ${Math.abs(pts).toFixed(2)} points in 28 days.`, ch),
      spark: spark(pct, 1827),
      indexValue: v,
      defaultRange: '5Y',
      events: NU_EVENTS,
      dataThrough: dates[i],
    };
  },
};

/* ---------------------------------------------------------------- anonymity */
type Hist = { pool: string; bucket: string; direction: 'shield' | 'deshield'; cumulative_tx_count: number }[];
const BUCKETS: [string, number, number, number][] = [
  ['<0.01', 0.001, 0.01, 0.005], ['0.01-0.1', 0.01, 0.1, 0.05], ['0.1-0.5', 0.1, 0.5, 0.25], ['0.5-1', 0.5, 1, 0.75], ['1-2', 1, 2, 1.5], ['2-5', 2, 5, 3.5],
  ['5-10', 5, 10, 7.5], ['10-25', 10, 25, 17], ['25-50', 25, 50, 37], ['50-100', 50, 100, 75], ['100-500', 100, 500, 250], ['500-1K', 500, 1000, 750], ['1K-10K', 1000, 10000, 5000], ['10K+', 10000, 1e12, 50000],
];
export const anonymity: ChartDef = {
  slug: 'anonymity',
  title: 'Shielded anonymity set',
  short: 'Shielded anonymity set',
  question: 'If you deshield an amount, how many shielding transactions could be its source?',
  group: 'privacy',
  source: 'onchain',
  sourceNote: 'All-time shielding / deshielding transactions into Orchard + Ironwood · our node',
  unit: 'transactions (cumulative, by amount)',
  pools: ['orchard', 'ironwood'],
  api: ['shielding-histogram', 'backfill-status'],
  related: ['shielding-rate', 'pools', 'orchard-internal', 'flow-ironwood'],
  explainer: [
    {
      heading: 'What does an anonymity set tell you?',
      paragraphs: [
        'For any amount, this counts how many shielding transactions into Orchard or Ironwood have ever moved at least that much. That count is your **cover**: when you deshield, an observer sees the amount, and your transaction is indistinguishable only from the shields that could plausibly have produced it.',
        '**Bigger is better, and the curve falls fast.** Small, round amounts have many thousands of companions. Large or unusual amounts have very few — and an amount with a handful of possible sources is not private in any useful sense: the maths held, the crowd was too small to hide in.',
        'That is why amount choice matters: shielding 1,000 ZEC and later deshielding exactly 1,000 ZEC links the two ends whatever the cryptography does. The Wall of Shame shows people doing precisely that.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Counts are cumulative over all time and only grow, so the range control does not apply. Ironwood counts every inflow since activation, Orchard migrations included: a coin that arrived that way is a plausible source for a later Ironwood deshield. This is a worst-case lower bound — mixing inside the pool adds cover the chain cannot measure. Amounts are bucketed, so the chart is drawn as steps.'] },
  ],
  async load() {
    const [h, through] = await Promise.all([api<Hist>('shielding-histogram'), dataThrough()]);
    const rows = h.filter((r) => r.pool === 'orchard' || r.pool === 'ironwood');
    const cnt = (b: string, d: 'shield' | 'deshield') => rows.filter((r) => r.bucket === b && r.direction === d).reduce((a, r) => a + r.cumulative_tx_count, 0);
    let s = 0, dsh = 0;
    const buckets = BUCKETS.map(([label, lo, hi, mid]) => ({ label, lo, hi, mid })).reverse().map((b) => { s += cnt(b.label, 'shield'); dsh += cnt(b.label, 'deshield'); return { ...b, shieldCum: s, deshieldCum: dsh }; }).reverse();
    const at = (a: number) => buckets.find((b) => a >= b.lo && a < b.hi)!;
    return {
      panels: [{ kind: 'custom', component: 'a-anonymity', props: { buckets } }],
      headline: headline('Anonymity set at 1 ZEC', num(at(1).shieldCum, 0), through, `Deshield 1 ZEC and **${num(at(1).shieldCum, 0)}** past shields could be your source; at 1,000 ZEC only **${num(at(1000).shieldCum, 0)}**.`),
      spark: buckets.map((b) => Math.log10(Math.max(1, b.shieldCum))),
      indexValue: 'by amount',
      ranges: false,
      dataThrough: through,
      notes: ['Orchard + Ironwood, all time. Type an amount to read your crowd size.'],
    };
  },
};

/* --------------------------------------------------------- orchard-internal */
export const orchardInternal: ChartDef = {
  slug: 'orchard-internal',
  title: 'Orchard internal activity',
  short: 'Orchard internal activity',
  question: 'How much Orchard activity stays fully shielded (z-to-z)?',
  group: 'privacy',
  source: 'onchain',
  sourceNote: 'Orchard actions in fully shielded transactions · our Zebra node',
  unit: 'actions per day',
  pools: ['orchard'],
  api: ['daily-stats', 'backfill-status'],
  related: ['anonymity', 'density', 'flow-orchard', 'tx-types'],
  explainer: [
    {
      heading: 'Is this a count of private payments?',
      paragraphs: [
        'Orchard actions in **fully shielded** transactions — no transparent inputs or outputs on either side. These neither enter nor leave the pool: value moving privately within it. Everything else Orchard does crosses the turnstile and is visible as a flow.',
        '**It still is not a payment count.** One transaction can carry many actions, and a wallet consolidating its own notes looks identical to a payment. Read it as private activity, not private payments.',
        '**The gap against total Orchard actions is the point.** A rising internal share means the pool is being used to transact rather than to park — the behaviour the anonymity set depends on. Since 28 Jul 2026 activity has been moving to Ironwood, so Orchard’s counts fall.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['From NU5 (31 May 2022). Columns are z-to-z actions per day (averaged per day when several days share a column); the lines are 7-day averages of z-to-z and of all Orchard actions.'] },
  ],
  async load() {
    const rows = (await completeDaily()).filter((r) => r.date >= '2022-05-31');
    const dates = rows.map((r) => r.date);
    const sh = rows.map((r) => r.orchard_actions_shielded || 0);
    const tot = rows.map((r) => r.orchard_actions || 0);
    const i = rows.length - 1;
    const a7 = sma(sh, 7), t7 = sma(tot, 7);
    const share = t7[i] ? (a7[i]! / t7[i]!) * 100 : null;
    return {
      panels: [{ kind: 'timeseries', dates, format: 'count', zeroBaseline: true, series: [
        { key: 'zz', label: 'z-to-z actions', color: 'var(--p-orchard)', values: sh, type: 'bar', agg: 'mean' },
        { key: 'zz7', label: 'z-to-z, 7-day avg', color: 'var(--value)', values: a7, type: 'line', width: 1.8 },
        { key: 'tot7', label: 'All Orchard actions, 7-day avg', color: 'var(--text-2)', values: t7, type: 'line', dashed: true, width: 1.4 },
      ] }],
      headline: headline('z-to-z actions, 7-day avg', num(a7[i], 0), dates[i], `Orchard carried **${num(a7[i], 0)} fully shielded actions a day** (7-day average to ${dateLong(dates[i])})${share == null ? '' : ` — **${share.toFixed(0)}%** of all Orchard actions`}.`, changePct(a7, 28)),
      spark: spark(a7),
      indexValue: `${num(a7[i], 0)} / day`,
      defaultRange: '1Y',
      events: NU_EVENTS.filter((e) => e.date >= '2022-05-31'),
      dataThrough: dates[i],
    };
  },
};

/* ----------------------------------------------------------- pool-residency */
type Age = { date: string; pool: Pool; avg_age_days: number };
export const poolResidency: ChartDef = {
  slug: 'pool-residency',
  title: 'Pool residency time',
  short: 'Pool residency time',
  question: 'How long has ZEC sat in each pool without crossing a boundary?',
  group: 'privacy',
  source: 'onchain',
  sourceNote: 'Coin-days per pool · our Zebra node',
  unit: 'days',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['coin-age'],
  related: ['mean-coin-age', 'pools', 'orchard-internal', 'dormant'],
  explainer: [
    {
      heading: 'Does this say how old the coins are?',
      paragraphs: [
        'It is how long ZEC has sat in a pool **without crossing a pool boundary**. A coin can be transacted daily inside Orchard — real payments, real activity — and its residency keeps climbing, because nothing it did was a crossing.',
        '**Only shielding and deshielding reset it.** A payment inside a shielded pool is private by construction, so no metric can know it happened; residency measures the one movement consensus exposes.',
        '**So rising residency is not dormancy.** It is consistent with a pool nobody touches, and equally with a pool used heavily by people who never take value out — on a privacy chain, the healthier outcome. For transparent coins, where real age is visible, see mean transparent coin age.',
      ],
    },
    { heading: 'Methodology', paragraphs: ['Cumulative coin-days per pool: each ZEC accrues one coin-day per day in the pool; outflows remove coin-days in proportion to the average. Average residency = coin-days ÷ pool balance.'] },
  ],
  async load() {
    const [ages, through] = await Promise.all([api<Age[]>('coin-age'), dataThrough()]);
    const rows = ages.filter((r) => r.date <= through);
    const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
    const idx = new Map(dates.map((d, i) => [d, i]));
    const per = Object.fromEntries(POOLS.map((k) => [k, new Array(dates.length).fill(null)])) as Record<Pool, (number | null)[]>;
    for (const r of rows) if (r.avg_age_days > 0 && per[r.pool]) per[r.pool][idx.get(r.date)!] = r.avg_age_days;
    const last = (k: Pool) => per[k][lastIdx(per[k])] ?? null;
    return {
      panels: [{ kind: 'timeseries', dates, format: 'days', zeroBaseline: true, series: POOLS.map((k) => ({ key: k, label: POOL_LABEL[k], color: POOL_COLOR[k], values: per[k], type: 'line' as const, width: k === 'transparent' ? 1.4 : 1.8 })) }],
      headline: headline('Sapling residency', fmt(last('sapling'), 'days'), dates[dates.length - 1], `Sapling ZEC has gone **${num(last('sapling'), 0)} days** on average without crossing a pool boundary, Orchard **${num(last('orchard'), 0)}** and Ironwood **${num(last('ironwood'), 0)}** (${dateLong(dates[dates.length - 1])}).`),
      spark: spark(per.sapling),
      indexValue: '5 pools',
      defaultRange: '5Y',
      events: NU_EVENTS.filter((e) => e.date >= '2018-01-01'),
      dataThrough: dates[dates.length - 1],
    };
  },
};


