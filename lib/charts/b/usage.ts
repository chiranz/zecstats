// Usage group: transactions, types, new addresses, activity per ZEC, density, block size, fees.
import type { ChartDef } from '../types';
import { getCompleteDailyStats, type DailyStat } from '@/lib/data/snapshot';
import { getFeeStats, getNewAddresses } from '@/lib/data/charts-b';
import { num, usd, zat, dateLong } from '@/lib/format';
import { C, tint, bars, line, panel, rolling, wma, lastIndex, changeOver, changeWords, spark, sum, UPGRADES, IRONWOOD } from './util';

const userTx = (r: DailyStat) => Math.max(0, r.tx_count - (r.block_count || 0));

const tx: ChartDef = {
  slug: 'tx',
  title: 'Zcash transactions per day',
  short: 'Transactions per day',
  question: 'How much is the Zcash chain actually used?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'Daily count from our Zebra node · coinbase transactions excluded',
  unit: 'tx/day',
  api: ['daily-stats'],
  explainer: [
    { heading: 'What counts as a transaction here?', paragraphs: [
      'Every user-initiated transaction in every pool — transparent, Sprout, Sapling, Orchard, Ironwood and mixed. Coinbase transactions are left out: each block has exactly one, so counting them would add a constant floor that measures block production, not use.',
      'A transaction is not a payment and an address is not a person. One transaction can carry many outputs and wallets derive a fresh address per payment, so neither count maps cleanly onto people. What the series does show reliably is the shape of demand for block space over time.',
      'The columns are single days; the green line is a 7-day average and the dashed line a 50-week weighted moving average, which shows the long-run trend under the daily noise. For the split between transparent, shielding, deshielding and fully shielded activity, see transaction types.',
    ] },
  ],
  related: ['tx-types', 'total-fees', 'velocity', 'tx-issuance'],
  load: async () => {
    const rows = await getCompleteDailyStats();
    const dates = rows.map((r) => r.date);
    const v = rows.map(userTx);
    const avg = rolling(v, 7);
    const w50 = wma(v, 350);
    const i = v.length - 1;
    const change = changeOver(dates, v, 28);
    return {
      panels: [panel({ dates, format: 'count', zeroBaseline: true, series: [
        bars('tx', 'Transactions', tint(C.zec, 42), v),
        line('avg7', '7-day average', C.zec, avg, { width: 2.2 }),
        line('w50', '50-week WMA', C.text2, w50, { dashed: true, width: 1.5 }),
      ] })],
      headline: { label: 'Transactions per day', value: num(v[i]), date: dates[i], change,
        sentence: `${num(v[i])} user transactions on ${dateLong(dates[i])}, ${changeWords(change)}; the 7-day average is ${num(avg[i])}.` },
      spark: spark(avg), indexValue: `${num(v[i])}/day`,
      ranges: ['1M', '3M', '6M', '1Y', '5Y', 'ALL'], defaultRange: '1Y', events: [...UPGRADES], dataThrough: dates[i],
    };
  },
};

const TX_TYPES = [
  { key: 'transparent', label: 'Transparent only', color: C.transparent, f: (r: DailyStat) => Math.max(0, r.tx_transparent_only - (r.block_count || 0)) },
  { key: 'shielding', label: 'Shielding (t→z)', color: C.s2, f: (r: DailyStat) => r.tx_shielding },
  { key: 'deshielding', label: 'Deshielding (z→t)', color: C.s4, f: (r: DailyStat) => r.tx_deshielding },
  { key: 'mixed', label: 'Mixed', color: C.s3, f: (r: DailyStat) => r.tx_mixed },
  { key: 'shielded', label: 'Fully shielded (z→z)', color: C.zec, f: (r: DailyStat) => r.tx_fully_shielded },
];

const txTypes: ChartDef = {
  slug: 'tx-types',
  title: 'Zcash transaction types',
  short: 'Transaction types',
  question: 'What kind of transactions does Zcash carry — and how many touch a shielded pool?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'Daily count by kind from our Zebra node · coinbase excluded',
  unit: 'tx/day',
  pools: ['transparent', 'sapling', 'orchard', 'ironwood'],
  api: ['daily-stats'],
  explainer: [
    { heading: 'What does the shielded split really say?', paragraphs: [
      'Five buckets, by what a transaction did with the pools: transparent-only, shielding (t→z), deshielding (z→t), mixed, and fully shielded (z→z). Only the last two are private payments; the first three are visible in whole or in part.',
      'The transparent band is inflated by mining. Pool payouts are bulk distributions to thousands of miners and a large share of transparent activity every day — real transactions, but one operator paying wages rather than users choosing transparency. Coinbase transactions themselves are left out here, one per block, so the total matches transactions per day.',
      'Fully shielded is a floor, not a count of private users: a z→z transaction can carry many payments or one, and it cannot be told apart from a wallet reshuffling its own notes. Cross-pool movements under 0.001 ZEC are not counted as deshields — at that size they are fee change, not a user taking value out.',
    ] },
  ],
  related: ['tx', 'shielding-rate', 'density', 'total-fees'],
  load: async () => {
    const rows = await getCompleteDailyStats();
    const dates = rows.map((r) => r.date);
    const cols = TX_TYPES.map((t) => rows.map(t.f));
    const total = rows.map((_, j) => sum(cols.map((c) => c[j])));
    const shieldedShare = rows.map((_, j) => (total[j] ? ((total[j] - cols[0][j]) / total[j]) * 100 : null));
    const share7 = rolling(shieldedShare, 7);
    const i = rows.length - 1;
    return {
      panels: [panel({ dates, format: 'count', stacked: true, shareToggle: true, series: TX_TYPES.map((t, k) => bars(t.key, t.label, t.color, cols[k])) })],
      headline: { label: 'Touched a shielded pool', value: `${shieldedShare[i]!.toFixed(1)}%`, date: dates[i], change: null,
        sentence: `${shieldedShare[i]!.toFixed(1)}% of ${num(total[i])} user transactions on ${dateLong(dates[i])} touched a shielded pool; ${num(cols[4][i])} were fully shielded (z→z).` },
      spark: spark(share7), indexValue: `${shieldedShare[i]!.toFixed(0)}% shielded`,
      defaultRange: '3M', events: [IRONWOOD], dataThrough: dates[i],
      notes: ['Transparent-only excludes the one coinbase transaction per block; mining-pool payouts are still in it.'],
    };
  },
};

const newAddresses: ChartDef = {
  slug: 'new-addresses',
  title: 'New transparent addresses per day',
  short: 'New addresses',
  question: 'How many never-seen transparent addresses receive coins each day?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'First-ever output per address, replayed from block 1 by our node',
  unit: 'addresses/day',
  pools: ['transparent'],
  api: ['new-addresses'],
  explainer: [
    { heading: 'Does one address mean one person?', paragraphs: [
      'These are transparent addresses receiving their first ever output, per day. It is tempting to read that as new users, and it is not: wallets derive a fresh address per receive, exchanges hand every customer their own deposit address, and change can land on an address never seen before. One person can create hundreds in a week; a returning one creates none.',
      'What it does track is transparent-layer surface area — how much new, distinct space the visible side of the chain is using. A sustained rise means more separate destinations, whoever is behind them. Mining payouts are counted separately because they create addresses without anyone being onboarded.',
      'It is transparent only. A shielded address is never announced on-chain, so growth in shielded use is invisible here by construction — this line can fall while private activity rises.',
    ] },
  ],
  related: ['tx', 'utxo-set', 'tx-types', 'shielding-rate'],
  load: async () => {
    const rows = (await getNewAddresses()).filter((d) => d.complete);
    const dates = rows.map((r) => r.date);
    const excl = rows.map((r) => r.new_non_coinbase);
    const mining = rows.map((r) => r.new_coinbase);
    const total = rows.map((r) => r.new_total);
    const avg = rolling(total, 7);
    const i = rows.length - 1;
    const change = changeOver(dates, total, 28);
    return {
      panels: [panel({ dates, format: 'count', zeroBaseline: true, series: [
        bars('excl', 'New addresses (excl. mining)', tint(C.zec, 42), excl),
        line('avg7', '7-day average (all)', C.zec, avg, { width: 2.2 }),
        line('mining', 'Mining payouts', C.s4, mining, { hidden: true, width: 1.4 }),
      ] })],
      headline: { label: 'New transparent addresses', value: num(total[i]), date: dates[i], change,
        sentence: `${num(total[i])} transparent addresses received coins for the first time on ${dateLong(dates[i])}, ${changeWords(change)}; the 7-day average is ${num(avg[i])}.` },
      spark: spark(avg), indexValue: `${num(total[i])}/day`,
      defaultRange: '1Y', dataThrough: dates[i],
      notes: [`Mining payouts created ${num(mining[i])} new addresses on the last day — switch the series on to see them.`],
    };
  },
};

// Ironwood actions are not a field of daily-stats: they are what is left of total_shielded_actions after the
// other pools' counts (exactly zero before Ironwood activated).
const ironwoodActions = (r: DailyStat) => Math.max(0, r.total_shielded_actions - r.orchard_actions - r.sapling_spends - r.sapling_outputs - r.joinsplit_count);
const VELOCITY = [
  { key: 'transparent', label: 'Transparent', color: C.transparent, act: (r: DailyStat) => r.transparent_inputs + r.transparent_outputs, bal: (r: DailyStat) => r.end_transparent_zat },
  { key: 'sprout', label: 'Sprout', color: C.sprout, act: (r: DailyStat) => r.joinsplit_count, bal: (r: DailyStat) => r.end_sprout_zat, hidden: true },
  { key: 'sapling', label: 'Sapling', color: C.sapling, act: (r: DailyStat) => r.sapling_spends + r.sapling_outputs, bal: (r: DailyStat) => r.end_sapling_zat },
  { key: 'orchard', label: 'Orchard', color: C.orchard, act: (r: DailyStat) => r.orchard_actions, bal: (r: DailyStat) => r.end_orchard_zat },
  { key: 'ironwood', label: 'Ironwood', color: C.ironwood, act: ironwoodActions, bal: (r: DailyStat) => r.end_ironwood_zat },
];

const velocity: ChartDef = {
  slug: 'velocity',
  title: 'Zcash activity per ZEC, by pool',
  short: 'Activity per ZEC',
  question: 'How hard is the ZEC in each pool working?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'Daily actions ÷ pool balance · 7-day average · our Zebra node',
  unit: 'actions per 1,000 ZEC per day',
  pools: ['transparent', 'sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['daily-stats'],
  explainer: [
    { heading: 'Are the pools comparable?', paragraphs: [
      'On-chain actions per 1,000 ZEC held, per pool, per day — how hard each pool’s value is working. High means the coins there are moving; low means they are sitting. Each line is a 7-day average, and a pool holding under 1,000 ZEC is left out.',
      'An action is not the same unit in every pool. Transparent counts inputs plus outputs, so a simple transfer is two; Sapling counts spends plus outputs, also two; Orchard and Ironwood count actions, where one action is a spend–output pair, so the same payment scores one. Orchard and Ironwood therefore read about half as active as Sapling or transparent for identical use — an artefact of the accounting, not behaviour.',
      'So compare a pool with its own history, where the unit is constant, and treat gaps between pools as directional at best. What this chart is good at is a single pool waking up or going quiet.',
    ] },
  ],
  related: ['density', 'tx', 'pools', 'pool-residency'],
  load: async () => {
    const rows = await getCompleteDailyStats();
    const dates = rows.map((r) => r.date);
    const series = VELOCITY.map((p) => {
      const daily = rows.map((r) => { const b = zat(p.bal(r)); return b >= 1000 ? (p.act(r) / b) * 1000 : null; });
      return line(p.key, p.label, p.color, rolling(daily, 7, 4), { hidden: p.hidden, width: p.key === 'ironwood' ? 2.2 : 1.7 });
    });
    const iw = series[4].values, tr = series[0].values;
    const i = lastIndex(iw);
    return {
      panels: [panel({ dates, format: 'countCompact', zeroBaseline: true, series })],
      headline: { label: 'Ironwood actions per 1,000 ZEC', value: (iw[i] ?? 0).toFixed(2), date: dates[i], change: changeOver(dates, iw, 28),
        sentence: `Each 1,000 ZEC in Ironwood saw ${(iw[i] ?? 0).toFixed(2)} actions a day over the week to ${dateLong(dates[i])}, against ${(tr[i] ?? 0).toFixed(2)} for transparent ZEC.` },
      spark: spark(iw), indexValue: `${(iw[i] ?? 0).toFixed(2)} / 1K ZEC`,
      defaultRange: '1Y', events: [IRONWOOD], dataThrough: dates[dates.length - 1],
      notes: ['Ironwood actions are derived: total shielded actions minus the Sapling, Orchard and Sprout counts.'],
    };
  },
};

const density: ChartDef = {
  slug: 'density',
  title: 'Zcash shielded action density',
  short: 'Shielded action density',
  question: 'How many actions does a shielded transaction carry?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'Shielded actions ÷ shielded transactions, per day · our Zebra node',
  unit: 'actions per shielded tx',
  pools: ['sprout', 'sapling', 'orchard', 'ironwood'],
  api: ['daily-stats'],
  explainer: [
    { heading: 'What does an action count?', paragraphs: [
      'Shielded actions — Sapling spends and outputs, Orchard and Ironwood actions, Sprout JoinSplits — per shielded transaction. One action is roughly one note spent or created, so a simple payment is a couple and a consolidation sweeping many notes is many. A rising line means transactions are doing more work each, not that there are more of them.',
      'It is a privacy signal only indirectly. More actions per transaction makes one payment harder to pick apart, but a wallet consolidating its own notes raises the number without anyone gaining privacy. Check the anonymity set before reading a rise as more than heavier transactions.',
      'The unit differs across pools (Sapling counts spends plus outputs, Orchard one action per spend–output pair), and it drives the fee: ZIP-317, the Zcash Improvement Proposal that sets fees, prices a transaction by its actions.',
    ] },
  ],
  related: ['velocity', 'fees', 'tx-types', 'anonymity'],
  load: async () => {
    const rows = await getCompleteDailyStats();
    const dates = rows.map((r) => r.date);
    const v = rows.map((r) => (r.shielded_tx_count > 0 ? r.total_shielded_actions / r.shielded_tx_count : null));
    const avg = rolling(v, 7, 4);
    const i = rows.length - 1;
    return {
      panels: [panel({ dates, format: 'countCompact', zeroBaseline: true, series: [
        line('daily', 'Daily', tint(C.zec, 45), v, { width: 1.1 }),
        line('avg7', '7-day average', C.zec, avg, { width: 2.2 }),
      ] })],
      headline: { label: 'Actions per shielded tx', value: (v[i] ?? 0).toFixed(2), date: dates[i], change: changeOver(dates, avg, 28),
        sentence: `The average shielded transaction on ${dateLong(dates[i])} carried ${(v[i] ?? 0).toFixed(2)} actions (${num(rows[i].total_shielded_actions)} actions across ${num(rows[i].shielded_tx_count)} transactions).` },
      spark: spark(avg), indexValue: `${(v[i] ?? 0).toFixed(2)} / tx`,
      defaultRange: '1Y', events: [...UPGRADES], dataThrough: dates[i],
    };
  },
};

const blockSize: ChartDef = {
  slug: 'block-size',
  title: 'Zcash average block size',
  short: 'Average block size',
  question: 'How heavy are Zcash blocks?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'Bytes per block, averaged per day · our Zebra node',
  unit: 'bytes',
  api: ['daily-stats'],
  explainer: [
    { heading: 'Does block size measure demand?', paragraphs: [
      'Average bytes per block, per day. On a transparent chain that tracks how many payments were made; on Zcash it mostly tracks what kind. A shielded transaction carries a zero-knowledge proof and a transparent one does not, and that difference is large enough that the mix moves this line more than the count does.',
      'So a rising line can mean more activity, or the same activity moving into the shielded pools. Read it beside transactions per day: size up with the count flat is a shift toward privacy; both up together is real growth. The 2022–23 spam wave dominates the full history — use the log scale to see the rest.',
      'It is also the supply side of the fee market. ZIP-317 prices a transaction by its logical actions rather than its bytes, so bytes and fees answer related questions in different units.',
    ] },
  ],
  related: ['tx', 'density', 'total-fees', 'tx-types'],
  load: async () => {
    const rows = await getCompleteDailyStats();
    const dates = rows.map((r) => r.date);
    const v = rows.map((r) => (r.block_count > 0 ? r.total_block_bytes / r.block_count : null));
    const avg = rolling(v, 7, 4);
    const i = rows.length - 1;
    return {
      panels: [panel({ dates, format: 'bytes', logToggle: true, zeroBaseline: true, series: [
        line('daily', 'Daily average', tint(C.zec, 45), v, { width: 1.1 }),
        line('avg7', '7-day average', C.zec, avg, { width: 2.2 }),
      ] })],
      headline: { label: 'Average block size', value: `${((v[i] ?? 0) / 1000).toFixed(1)} KB`, date: dates[i], change: changeOver(dates, avg, 28),
        sentence: `Blocks averaged ${((v[i] ?? 0) / 1000).toFixed(1)} KB on ${dateLong(dates[i])} across ${num(rows[i].block_count)} blocks; the 7-day average is ${((avg[i] ?? 0) / 1000).toFixed(1)} KB.` },
      spark: spark(avg), indexValue: `${((v[i] ?? 0) / 1000).toFixed(1)} KB`,
      defaultRange: '1Y', events: [...UPGRADES], dataThrough: dates[i],
    };
  },
};

const totalFees: ChartDef = {
  slug: 'total-fees',
  title: 'Zcash total fees paid',
  short: 'Total fees paid',
  question: 'What is the Zcash network’s total fee bill?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'Mean fee × fee-paying transactions, per day · USD at each day’s close',
  unit: 'USD/day',
  api: ['fee-stats'],
  explainer: [
    { heading: 'Why does the fee bill matter?', paragraphs: [
      'Every fee paid to Zcash miners, added up per day. This is the whole network’s fee bill; what one transaction cost is a different question, answered by fee distribution.',
      'Each day is that day’s mean fee times the number of transactions that paid one. In dollars, each day is priced at its own ZEC close, so an old month is worth what it was worth then, not what those coins would fetch today. On long ranges a column is the average day in its bucket, so it stays comparable with the 7-day line.',
      'Fees are the part of the miner’s reward that does not halve. As the block subsidy falls, this is the line that has to replace it.',
    ] },
  ],
  related: ['fees', 'tx', 'inflation', 'hashrate'],
  load: async () => {
    const rows = (await getFeeStats()).filter((d) => d.complete && d.zec_usd > 0);
    const dates = rows.map((r) => r.date);
    const zecFees = rows.map((r) => (r.mean_fee_zat * r.tx_count) / 1e8);
    const usdFees = rows.map((r, j) => zecFees[j] * r.zec_usd);
    const usd7 = rolling(usdFees, 7);
    const i = rows.length - 1;
    const usd30 = sum(usdFees.slice(-30)), zec30 = sum(zecFees.slice(-30));
    return {
      panels: [
        panel({ title: 'In dollars', dates, format: 'usd', zeroBaseline: true, height: 300, series: [
          bars('usd', 'Fees (USD)', tint(C.zec, 42), usdFees), line('usd7', '7-day average', C.zec, usd7, { width: 2.2 })] }),
        panel({ title: 'In ZEC', dates, format: 'zec', zeroBaseline: true, height: 200, series: [
          bars('zec', 'Fees (ZEC)', tint(C.gold, 60), zecFees), line('zec7', '7-day average', C.gold, rolling(zecFees, 7), { width: 2 })] }),
      ],
      headline: { label: 'Fees, last 30 days', value: usd(usd30, 0), date: dates[i], change: null,
        sentence: `Users paid ${usd(usd30, 0)} (${num(zec30, 0)} ZEC) in fees over the 30 days to ${dateLong(dates[i])}; ${usd(usdFees[i], 0)} on the last day.` },
      spark: spark(usd7), indexValue: `${usd(usdFees[i], 0)}/day`,
      defaultRange: '1Y', dataThrough: dates[i],
      notes: ['The day in progress is left out — a part-day total would read as a collapse.'],
    };
  },
};

const fees: ChartDef = {
  slug: 'fees',
  title: 'Zcash fee distribution',
  short: 'Fee distribution',
  question: 'What does a typical Zcash transaction pay in fees?',
  group: 'usage',
  source: 'onchain',
  sourceNote: 'Per-transaction fee percentiles, per day, in zatoshi · derived by our node',
  unit: 'zatoshi',
  api: ['fee-stats'],
  explainer: [
    { heading: 'How do you read a Zcash fee?', paragraphs: [
      'Fees are quoted in zatoshi — 100,000,000 zat make one ZEC — because a typical fee is a few thousand of them. The green line is the median transaction; the blue pair brackets the middle half (25th–75th percentile) and the grey pair the middle 80% (10th–90th). The log scale is on by default because fees span orders of magnitude.',
      'Mean above median is the signal, not noise. ZIP-317 prices a transaction by how many logical actions it contains, so a handful of many-action transactions drag the mean up while the median stays where an ordinary payment sits.',
      'The node reports no fee field. Each fee is derived from the identity consensus enforces — transparent inputs plus value released by shielded bundles equals transparent outputs plus value absorbed plus the fee — which makes these exact rather than estimated.',
    ] },
  ],
  related: ['total-fees', 'density', 'tx', 'block-size'],
  load: async () => {
    const rows = (await getFeeStats()).filter((d) => d.complete);
    const dates = rows.map((r) => r.date);
    const raw = (f: keyof (typeof rows)[number]) => rows.map((r) => (r[f] as number) || null);
    // percentiles sit on round fee levels and jump day to day; a 7-day average of each keeps the fan readable
    const k = (f: keyof (typeof rows)[number]) => rolling(raw(f), 7, 4);
    const i = rows.length - 1;
    const r = rows[i];
    const median = r.median_fee_zat;
    return {
      panels: [panel({ dates, format: 'count', logToggle: true, defaultLog: true, series: [
        line('median', 'Median', C.zec, k('median_fee_zat'), { width: 2.4 }),
        line('mean', 'Mean', C.text, k('mean_fee_zat'), { dashed: true, width: 1.5 }),
        line('p25', '25th pct', C.s2, k('p25_fee_zat'), { width: 1.5 }),
        line('p75', '75th pct', C.s2, k('p75_fee_zat'), { width: 1.5 }),
        line('p10', '10th pct', C.muted, k('p10_fee_zat'), { width: 1.3 }),
        line('p90', '90th pct', C.muted, k('p90_fee_zat'), { width: 1.3 }),
        line('p99', '99th pct', C.s4, k('p99_fee_zat'), { hidden: true, width: 1.3 }),
      ] })],
      headline: { label: 'Median fee', value: `${num(median)} zat`, date: dates[i], change: changeOver(dates, raw('median_fee_zat'), 28),
        sentence: `The median transaction on ${dateLong(dates[i])} paid ${num(median)} zat (${usd((median / 1e8) * r.zec_usd, 2)} at that day’s close); the mean was ${num(r.mean_fee_zat)} zat.` },
      spark: spark(k('median_fee_zat')), indexValue: `${num(median)} zat`,
      defaultRange: '1Y', events: [{ date: '2024-11-23', label: 'NU6' }], dataThrough: dates[i],
      notes: ['Each line is a 7-day average of that day’s percentile, in zatoshi (1 ZEC = 100,000,000 zat). Min and max are left out: single outliers.'],
    };
  },
};

export const usageCharts: ChartDef[] = [tx, txTypes, newAddresses, velocity, density, blockSize, totalFees, fees];
