// Holders group (transparent side of the chain): UTXO set, churn, age, depth, survival.
import type { ChartDef } from '../types';
import { getCompleteDailyStats } from '@/lib/data/snapshot';
import { getUtxoCohorts, getUtxoDepth, getUtxoSurvival, type UtxoCohortRow, type UtxoDepthRow } from '@/lib/data/charts-b';
import { num, zat, compact, dateLong } from '@/lib/format';
import { C, tint, ramp, bars, line, panel, rolling, changeOver, changeWords, spark, sum, addDays, UPGRADES } from './util';

const NOT_SOLD = 'A coin leaving is not a coin sold. Transparent ZEC that gets shielded exits this data entirely, and from here that is indistinguishable from a spend — check the shielding rate before reading a fall as distribution.';
const MINORITY = 'It covers the transparent minority. Coins in a shielded pool carry no publicly readable age, so they are not left out by choice — they are uncountable. Nothing here describes how long Zcash holders as a whole have held.';

// ─── UTXO set + churn (from daily-stats) ────────────────────────────────────────────────────────────────
async function utxoDaily() {
  const rows = await getCompleteDailyStats();
  let cum = 0;
  const dates: string[] = [], set: number[] = [], created: number[] = [], spent: number[] = [], net: number[] = [];
  for (const r of rows) {
    cum += (r.transparent_outputs || 0) - (r.transparent_inputs || 0);
    dates.push(r.date); set.push(cum); created.push(r.transparent_outputs); spent.push(r.transparent_inputs); net.push(r.transparent_outputs - r.transparent_inputs);
  }
  return { dates, set, created, spent, net };
}
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`;

const OUTPUT_PARA = 'A UTXO is one unspent transparent output. One wallet can hold hundreds and one output can hold any amount, so this counts pieces: a rise means the transparent set is more fragmented — not that more people arrived, and not that more value did.';

const utxoSet: ChartDef = {
  slug: 'utxo-set',
  title: 'Zcash UTXO set size',
  short: 'UTXO set size',
  question: 'How many unspent transparent outputs exist?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'Cumulative outputs created minus inputs spent · our Zebra node',
  unit: 'outputs',
  pools: ['transparent'],
  api: ['daily-stats'],
  explainer: [
    { heading: 'What is an output actually counting?', paragraphs: [
      OUTPUT_PARA,
      'The level is a stock. It grows when more outputs are created than spent and shrinks on consolidation — a wallet sweeping many small outputs into one makes the set fall while holding exactly the same ZEC. The lower panel is the daily net change that moves it.',
      'It ignores value entirely, which is its point: a chain-wide consolidation and a wave of new small holders look the same on transaction counts and opposite here.',
    ] },
  ],
  related: ['utxo', 'utxo-age', 'new-addresses', 'utxo-depth'],
  load: async () => {
    const { dates, set, net } = await utxoDaily();
    const i = dates.length - 1;
    const change = changeOver(dates, set, 28);
    return {
      panels: [
        panel({ title: 'Unspent transparent outputs', dates, format: 'countCompact', zeroBaseline: false, height: 300, series: [line('set', 'UTXO set', C.zec, set, { width: 2.2 })] }),
        panel({ title: 'Net change per day', dates, format: 'count', zeroBaseline: true, height: 180, series: [bars('net', 'Net change', tint(C.s2, 70), net), line('net7', '7-day average', C.s2, rolling(net, 7), { width: 2 })] }),
      ],
      headline: { label: 'UTXO set', value: num(set[i]), date: dates[i], change,
        sentence: `${num(set[i])} unspent transparent outputs on ${dateLong(dates[i])}, ${changeWords(change)}; the last day added ${signed(net[i])}.` },
      spark: spark(set), indexValue: compact(set[i]),
      defaultRange: '1Y', dataThrough: dates[i],
    };
  },
};

const utxo: ChartDef = {
  slug: 'utxo',
  title: 'Zcash UTXO churn',
  short: 'UTXO churn',
  question: 'Is the transparent UTXO set growing or consolidating?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'Transparent outputs created and inputs spent per day · our Zebra node',
  unit: 'outputs/day',
  pools: ['transparent'],
  api: ['daily-stats'],
  explainer: [
    { heading: 'What is an output actually counting?', paragraphs: [
      OUTPUT_PARA,
      'This is the flow behind the UTXO set: outputs created against inputs consumed, per day. Outputs above inputs is the set growing. The gap — the lower panel — is what moves the set, not either line on its own.',
      'It is a proxy for transparent-layer activity that ignores value, so a consolidation and a wave of new small holders look identical on transaction counts and opposite here.',
    ] },
  ],
  related: ['utxo-set', 'tx', 'utxo-age', 'pool-residency'],
  load: async () => {
    const { dates, created, spent, net } = await utxoDaily();
    const c7 = rolling(created, 7), s7 = rolling(spent, 7), n7 = rolling(net, 7);
    const i = dates.length - 1;
    const week = sum(net.slice(-7));
    return {
      panels: [
        panel({ title: 'Created and spent per day (7-day average)', dates, format: 'count', zeroBaseline: true, height: 280, series: [
          line('created', 'Outputs created', C.s2, c7, { width: 2 }), line('spent', 'Inputs spent', C.s4, s7, { width: 2 })] }),
        panel({ title: 'Net change (created − spent)', dates, format: 'count', zeroBaseline: true, height: 200, series: [
          bars('net', 'Net change', tint(C.zec, 45), net), line('net7', '7-day average', C.zec, n7, { width: 2 })] }),
      ],
      headline: { label: 'Net change, last 7 days', value: signed(week), date: dates[i], change: null,
        sentence: `Over the 7 days to ${dateLong(dates[i])} the transparent set ${week >= 0 ? 'grew' : 'shrank'} by **${num(Math.abs(week))} outputs**: ${num(c7[i]!)} created and ${num(s7[i]!)} spent on an average day.` },
      spark: spark(n7), indexValue: `${signed(week)} / 7d`,
      defaultRange: '3M', dataThrough: dates[i],
    };
  },
};

// ─── age cohorts ─────────────────────────────────────────────────────────────────────────────────────────
const COHORTS: UtxoCohortRow['cohort'][] = ['<30d', '30-180d', '180d-1y', '1-3y', '3y+'];
const COHORT_LABEL: Record<UtxoCohortRow['cohort'], string> = { '<30d': 'Under 30 days', '30-180d': '30 days – 6 months', '180d-1y': '6 months – 1 year', '1-3y': '1 – 3 years', '3y+': '3 years +' };
const AGE_RAMP = ramp(C.zec, 5); // fresh = strongest → dormant = faded
/** Stack the dormant band at the bottom so the long-lived base stays put; fresh coins ride on top. */
const DORMANT_FIRST = [4, 3, 2, 1, 0];

async function cohortTable() {
  const [rows, daily] = await Promise.all([getUtxoCohorts(), getCompleteDailyStats()]);
  const through = daily.at(-1)!.date;
  const by = new Map<string, Record<string, number>>();
  for (const r of rows) {
    if (r.date > through) continue;
    const m = by.get(r.date) ?? {};
    m[r.cohort] = (m[r.cohort] ?? 0) + zat(r.total_zat);
    by.set(r.date, m);
  }
  const dates = [...by.keys()].sort();
  const cols = COHORTS.map((c) => dates.map((d) => by.get(d)![c] ?? 0));
  const total = dates.map((_, j) => sum(cols.map((c) => c[j])));
  return { dates, cols, total };
}
const pctOf = (a: number, b: number) => (b ? (a / b) * 100 : 0);

const utxoAge: ChartDef = {
  slug: 'utxo-age',
  title: 'Transparent ZEC by age',
  short: 'Transparent ZEC by age',
  question: 'How long has transparent ZEC sat unspent?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'UTXO set replayed block by block from genesis, bucketed by age · our node',
  unit: 'ZEC',
  pools: ['transparent'],
  api: ['utxo-cohorts'],
  explainer: [
    { heading: 'Whose coins are these?', paragraphs: [
      'This is the transparent side of Zcash only. Every coin in a shielded pool is absent — not omitted by choice but uncountable, since a shielded note carries no publicly readable age. So it is a picture of how long the transparent minority has sat still, not of how long Zcash holders have held.',
      NOT_SOLD,
      'The axis is ZEC, not outputs: one dormant exchange-era output can outweigh thousands of small fresh ones. The 3-year band is not all conviction — it includes coins whose keys are gone, which never move and so ratchet upward forever. Read it as an upper bound on long-term holding.',
      'Colours run from bright (fresh) to faint (dormant) because the buckets are ordered. Switch to Share % for the same data as proportions; transparent age distribution shows it as cumulative thresholds.',
    ] },
  ],
  related: ['age-pct', 'mean-coin-age', 'survival', 'dormant'],
  load: async () => {
    const { dates, cols, total } = await cohortTable();
    const i = dates.length - 1;
    const old = cols[4], oldShare = dates.map((_, j) => pctOf(old[j], total[j]));
    return {
      panels: [panel({ dates, format: 'zecCompact', stacked: true, shareToggle: true, series: DORMANT_FIRST.map((k) => line(COHORTS[k], COHORT_LABEL[COHORTS[k]], AGE_RAMP[k], cols[k])) })],
      headline: { label: 'Unmoved for 3+ years', value: `${oldShare[i].toFixed(1)}%`, date: dates[i], change: changeOver(dates, old, 28),
        sentence: `${compact(old[i])} ZEC — ${oldShare[i].toFixed(1)}% of the ${compact(total[i])} transparent ZEC — had not moved in over three years on ${dateLong(dates[i])}; ${compact(cols[0][i])} ZEC moved in the last 30 days.` },
      spark: spark(oldShare), indexValue: `${oldShare[i].toFixed(0)}% 3y+`,
      defaultRange: 'ALL', dataThrough: dates[i],
      notes: ['Snapshots are irregular before mid-2026 (every few weeks) and every few days since.'],
    };
  },
};

const agePct: ChartDef = {
  slug: 'age-pct',
  title: 'Transparent ZEC age distribution',
  short: 'Transparent age distribution',
  question: 'How much transparent ZEC is young, and how much has been dormant for years?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'Share of transparent ZEC per age band · UTXO snapshots from our node',
  unit: '% of transparent ZEC',
  pools: ['transparent'],
  api: ['utxo-cohorts'],
  explainer: [
    { heading: 'How do you read the age bands?', paragraphs: [
      'The top panel splits transparent ZEC into five age bands that always add to 100%. The lower panel shows the running share older than six months, one year and three years — a sharp drop in one of those lines is old coins waking up, the most interesting event this data can show.',
      MINORITY,
      NOT_SOLD,
      'Percentages hide the denominator: a band can grow because coins entered it or because the transparent set shrank around it. Read it beside transparent ZEC by age, which is the same data in absolute terms.',
    ] },
  ],
  related: ['utxo-age', 'mean-coin-age', 'survival', 'shielding-rate'],
  load: async () => {
    const { dates, cols, total } = await cohortTable();
    const shares = cols.map((c) => c.map((v, j) => pctOf(v, total[j])));
    const gt6m = dates.map((_, j) => shares[2][j] + shares[3][j] + shares[4][j]);
    const gt1y = dates.map((_, j) => shares[3][j] + shares[4][j]);
    const gt3y = shares[4];
    const i = dates.length - 1;
    return {
      panels: [
        panel({ title: 'Share of transparent ZEC by age band', dates, format: 'pct', stacked: true, yDomain: [0, 100], height: 300, series: DORMANT_FIRST.map((k) => line(COHORTS[k], COHORT_LABEL[COHORTS[k]], AGE_RAMP[k], shares[k])) }),
        panel({ title: 'Share older than…', dates, format: 'pct', yDomain: [0, 100], height: 200, series: [
          line('gt6m', 'Over 6 months', AGE_RAMP[1], gt6m), line('gt1y', 'Over 1 year', AGE_RAMP[2], gt1y, { width: 2.2 }), line('gt3y', 'Over 3 years', AGE_RAMP[4], gt3y)] }),
      ],
      headline: { label: 'Older than 1 year', value: `${gt1y[i].toFixed(1)}%`, date: dates[i], change: changeOver(dates, gt1y, 28),
        sentence: `${gt1y[i].toFixed(1)}% of transparent ZEC had sat for over a year on ${dateLong(dates[i])}; ${shares[0][i].toFixed(1)}% was under 30 days old.` },
      spark: spark(gt1y), indexValue: `${gt1y[i].toFixed(0)}% > 1y`,
      defaultRange: 'ALL', dataThrough: dates[i],
    };
  },
};

const MID_DAYS: Record<UtxoCohortRow['cohort'], number> = { '<30d': 15, '30-180d': 105, '180d-1y': 272, '1-3y': 730, '3y+': 1825 };

const meanCoinAge: ChartDef = {
  slug: 'mean-coin-age',
  title: 'Mean transparent coin age',
  short: 'Mean coin age',
  question: 'Are transparent holders holding longer?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'Value-weighted mean of UTXO age-band midpoints · our node',
  unit: 'days',
  pools: ['transparent'],
  api: ['utxo-cohorts'],
  explainer: [
    { heading: 'What moves the average age?', paragraphs: [
      'One number: the value-weighted average age of transparent ZEC, from real UTXO snapshots bucketed by age. Each band counts at its midpoint (15, 105, 272 and 730 days; 5 years for 3y+, which is conservative), weighted by the ZEC in it.',
      'It rises on its own. Every day nothing moves, every coin gets a day older and the mean drifts up; a flat line means enough turnover to offset that, and only a fall is coins actually moving.',
      MINORITY,
      'Weighted by value, not by output: one dormant exchange-era output outweighs thousands of small fresh ones, so this tracks where the value sits, not where the wallets are.',
    ] },
  ],
  related: ['utxo-age', 'age-pct', 'pool-residency', 'dormant'],
  load: async () => {
    const { dates, cols, total } = await cohortTable();
    const mean = dates.map((_, j) => (total[j] ? sum(COHORTS.map((c, k) => cols[k][j] * MID_DAYS[c])) / total[j] : null));
    const i = dates.length - 1;
    const change = changeOver(dates, mean, 28);
    return {
      panels: [panel({ dates, format: 'days', zeroBaseline: true, series: [line('mean', 'Mean coin age', C.zec, mean, { width: 2.2 })] })],
      headline: { label: 'Mean transparent coin age', value: `${num(mean[i]!)} days`, date: dates[i], change,
        sentence: `The average transparent ZEC on ${dateLong(dates[i])} had sat for ${num(mean[i]!)} days (${(mean[i]! / 365).toFixed(1)} years), ${changeWords(change)}.` },
      spark: spark(mean), indexValue: `${num(mean[i]!)} d`,
      defaultRange: 'ALL', events: [...UPGRADES], dataThrough: dates[i],
    };
  },
};

// ─── depth ───────────────────────────────────────────────────────────────────────────────────────────────
const DEPTHS: UtxoDepthRow['depth_bucket'][] = ['coinbase', '1 hop', '2-3 hops', '4+ hops'];
const DEPTH_LABEL: Record<UtxoDepthRow['depth_bucket'], string> = { coinbase: 'Coinbase (unmoved)', '1 hop': '1 hop', '2-3 hops': '2–3 hops', '4+ hops': '4+ hops' };
const DEPTH_RAMP = ramp(C.s2, 4);

const utxoDepth: ChartDef = {
  slug: 'utxo-depth',
  title: 'Transparent ZEC by depth from mining',
  short: 'Coins by depth',
  question: 'How far has transparent ZEC travelled from the block reward that minted it?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'Hops from coinbase per UTXO, replayed from genesis · our node',
  unit: '% of transparent ZEC',
  pools: ['transparent'],
  api: ['utxo-depth'],
  explainer: [
    { heading: 'What does depth mean here?', paragraphs: [
      'Transparent ZEC grouped by how many transactions separate it from the coinbase that minted it: unmoved coinbase, one hop (the first spend of mined coins), two to three hops, and four or more (well-circulated coins).',
      'Depth is not age. A coin mined in 2017 and never spent stays at depth 0 forever; a coin mined last week and passed along four times is at depth 4. This asks how far value has travelled from mining, not how long it has sat.',
      'Depth 0 and 1 are mostly mining infrastructure: pool payouts are the first hop out of a coinbase, so the shallow bands are largely miners being paid. ' + MINORITY,
    ] },
  ],
  related: ['utxo-age', 'dormant', 'utxo-set', 'hashrate'],
  load: async () => {
    const [rows, daily] = await Promise.all([getUtxoDepth(), getCompleteDailyStats()]);
    const through = daily.at(-1)!.date;
    const by = new Map<string, Record<string, number>>();
    for (const r of rows) {
      if (r.date > through) continue;
      const m = by.get(r.date) ?? {};
      m[r.depth_bucket] = (m[r.depth_bucket] ?? 0) + zat(r.total_zat);
      by.set(r.date, m);
    }
    const dates = [...by.keys()].sort();
    const cols = DEPTHS.map((b) => dates.map((d) => by.get(d)![b] ?? 0));
    const total = dates.map((_, j) => sum(cols.map((c) => c[j])));
    const shares = cols.map((c) => c.map((v, j) => pctOf(v, total[j])));
    const i = dates.length - 1;
    const order = [3, 2, 1, 0];
    const shallow = dates.map((_, j) => shares[0][j] + shares[1][j]);
    return {
      panels: [panel({ dates, format: 'pct', stacked: true, yDomain: [0, 100], series: order.map((k) => line(DEPTHS[k].replace(/\W/g, ''), DEPTH_LABEL[DEPTHS[k]], DEPTH_RAMP[k], shares[k])) })],
      headline: { label: 'Four or more hops from mining', value: `${shares[3][i].toFixed(1)}%`, date: dates[i], change: null,
        sentence: `${shares[3][i].toFixed(1)}% of transparent ZEC (${compact(cols[3][i])}) was four or more transactions from its coinbase on ${dateLong(dates[i])}; ${shallow[i].toFixed(1)}% was unmoved or one hop out.` },
      spark: spark(shallow), indexValue: `${shares[3][i].toFixed(0)}% 4+ hops`,
      defaultRange: 'ALL', dataThrough: dates[i],
    };
  },
};

// ─── survival (weekly cohorts) ───────────────────────────────────────────────────────────────────────────
async function survivalIndex() {
  const rows = await getUtxoSurvival();
  const snaps = [...new Set(rows.map((r) => r.snapshot_week))].sort();
  const weeks = [...new Set(rows.map((r) => r.creation_week))].sort();
  const cell = new Map<string, { o: number; s: number }>();
  for (const r of rows) cell.set(`${r.snapshot_week}|${r.creation_week}`, { o: r.original_zat, s: r.surviving_zat });
  return { snaps, weeks, cell };
}

const dormant: ChartDef = {
  slug: 'dormant',
  title: 'Dormant transparent coins by week created',
  short: 'Dormant coins',
  question: 'How much transparent ZEC created each week has never moved?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'Latest weekly survival snapshot · every transparent output replayed from genesis',
  unit: 'ZEC',
  pools: ['transparent'],
  api: ['utxo-survival'],
  explainer: [
    { heading: 'What do the tall columns mean?', paragraphs: [
      'Each column is transparent ZEC created in that week and never spent since, as of the latest weekly snapshot. It is a snapshot of what is still sitting there, not a flow: a column can only shrink, and it shrinks the moment those coins move. The lower panel is the same thing as a share of everything created that week.',
      'Spikes are usually one event. A single large exchange deposit or a run of coinbase rewards can put a whole week far above its neighbours — read a spike as “something big happened that week and has not moved”, not as thousands of holders deciding to wait.',
      'Old and unspent includes lost. Keys are lost and wallets abandoned, and coins in that state look exactly like patience, so the oldest columns are an upper bound on deliberate holding. ' + NOT_SOLD,
    ] },
  ],
  related: ['survival', 'utxo-age', 'utxo-depth', 'mean-coin-age'],
  load: async () => {
    const { snaps, weeks, cell } = await survivalIndex();
    const snap = snaps.at(-1)!;
    const ws = weeks.filter((w) => w <= snap && (cell.get(`${snap}|${w}`)?.o ?? 0) > 0);
    const surv = ws.map((w) => zat(cell.get(`${snap}|${w}`)!.s));
    const pct = ws.map((w) => { const c = cell.get(`${snap}|${w}`)!; return (c.s / c.o) * 100; });
    const yearAgo = addDays(snap, -365);
    const oldSum = sum(surv.filter((_, j) => ws[j] < yearAgo));
    let big = 0;
    surv.forEach((v, j) => { if (ws[j] < yearAgo && v > surv[big]) big = j; });
    return {
      panels: [
        panel({ title: 'Still unspent, by week created', dates: ws, format: 'zecCompact', zeroBaseline: true, height: 300, series: [bars('surv', 'Still unspent (ZEC)', C.zec, surv, { agg: 'sum' })] }),
        panel({ title: 'Share of that week’s outputs still unspent', dates: ws, format: 'pct', zeroBaseline: true, height: 180, step: true, series: [line('pct', 'Still unspent (%)', C.s2, pct, { width: 1.5 })] }),
      ],
      headline: { label: 'Unmoved for over a year', value: `${compact(oldSum)} ZEC`, date: snap, change: null,
        sentence: `${compact(oldSum)} ZEC created more than a year before the ${dateLong(snap)} snapshot has never moved; the largest single week is ${dateLong(ws[big])}, with ${compact(surv[big])} ZEC still in place.` },
      spark: spark(surv, 520), indexValue: `${compact(oldSum)} > 1y`,
      defaultRange: 'ALL', dataThrough: snap,
      notes: ['Weekly snapshots; the latest is the week of ' + dateLong(snap) + '. On long ranges a column adds up the weeks it covers.'],
    };
  },
};

const survival: ChartDef = {
  slug: 'survival',
  title: 'Transparent coin survival',
  short: 'Coin survival',
  question: 'Of the transparent coins created in a given week, how many are still unspent later?',
  group: 'holders',
  source: 'onchain',
  sourceNote: 'Weekly survival snapshots, 4-week cells · every transparent output replayed from genesis',
  unit: '% surviving',
  pools: ['transparent'],
  api: ['utxo-survival'],
  explainer: [
    { heading: 'How do you read a retention triangle?', paragraphs: [
      'Every column is a point in time; every row is a batch of transparent coins created in the same four weeks, newest at the top. The shade says what share of that batch’s ZEC was still unspent at that time — strong for “still sitting”, fading to the background when fully spent. Reading across a row follows one cohort as it drains.',
      'The triangle shape is not data: a cohort cannot exist before it was created, so the empty corner is arithmetic. What is data is how fast each row fades. Most cohorts are almost entirely spent within weeks, which is the useful baseline — a row that keeps its colour for years is where lost coins and long-term holders live, and the two are indistinguishable from here.',
      'Transparent only, and spending includes shielding: a cohort fading may be coins moving into a shielded pool rather than being sold. The same data as stacked bands is transparent ZEC by age.',
    ] },
  ],
  related: ['dormant', 'utxo-age', 'age-pct', 'shielding-rate'],
  load: async () => {
    const { snaps, weeks, cell } = await survivalIndex();
    const STEP = 4;
    // columns: every 4th snapshot counted back from the latest; rows: 4-week creation groups ending at the latest week
    const colSnaps = snaps.filter((_, j) => (snaps.length - 1 - j) % STEP === 0);
    const groups: string[][] = [];
    for (let end = weeks.length; end > 0; end -= STEP) groups.unshift(weeks.slice(Math.max(0, end - STEP), end));
    const cells: (number | null)[][] = groups.map((g) => colSnaps.map((s) => {
      let o = 0, sv = 0;
      for (const w of g) { if (w > s) continue; const c = cell.get(`${s}|${w}`); if (c) { o += c.o; sv += c.s; } }
      return o > 0 ? Math.round((sv / o) * 10000) / 100 : null;
    }));
    // headline: median share still unspent four weeks after creation (exact weekly data)
    const after4: number[] = [];
    for (const w of weeks) { const c = cell.get(`${addDays(w, 28)}|${w}`); if (c && c.o > 0) after4.push((c.s / c.o) * 100); }
    after4.sort((a, b) => a - b);
    const median = after4[Math.floor(after4.length / 2)];
    const snap = snaps.at(-1)!;
    return {
      panels: [{ kind: 'custom', component: 'b-survival', props: { cols: colSnaps, rows: groups.map((g) => g[0]), cells, ariaLabel: `Retention triangle of transparent ZEC: ${groups.length} four-week cohorts by ${colSnaps.length} snapshot dates; the median cohort keeps ${median.toFixed(1)}% after four weeks.` } }],
      headline: { label: 'Median cohort still unspent after 4 weeks', value: `${median.toFixed(1)}%`, date: snap, change: null,
        sentence: `Four weeks after creation the median weekly cohort of transparent ZEC has ${median.toFixed(1)}% still unspent — most coins move on within a month (${num(after4.length)} cohorts through ${dateLong(snap)}).` },
      indexValue: `${median.toFixed(0)}% at 4 wks`,
      ranges: false, dataThrough: snap,
      notes: ['Cells are 4-week groups of the weekly data; shade follows the share still unspent on a compressed scale so small remainders stay visible.'],
    };
  },
};

export const holdersCharts: ChartDef[] = [utxoSet, utxo, utxoAge, utxoDepth, agePct, meanCoinAge, dormant, survival];
