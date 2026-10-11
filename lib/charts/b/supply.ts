// Supply & security group: supply, inflation, dev fund lockbox, hashrate, implied mining power.
import type { ChartDef } from '../types';
import { getCompleteDailyStats } from '@/lib/data/snapshot';
import { getDevFund, getMktcapIssuance, type IssuancePoint } from '@/lib/data/charts-b';
import { num, zat, compact, dateLong } from '@/lib/format';
import { C, tint, bars, line, area, panel, rolling, changeOver, changeWords, spark, HALVINGS, UPGRADES } from './util';

const CAP = 21_000_000;

const supply: ChartDef = {
  slug: 'supply',
  title: 'Zcash supply: total ZEC mined',
  short: 'Total supply',
  question: 'How many ZEC exist, and how close is the 21M cap?',
  group: 'supply',
  source: 'onchain',
  sourceNote: 'Consensus chainSupply from our Zebra node, end of each UTC day',
  unit: 'ZEC',
  api: ['daily-stats'],
  explainer: [
    { heading: 'How does Zcash supply actually work?', paragraphs: [
      'Zcash has the same 21 million cap as Bitcoin and reaches it on a different path. The block reward halves every 1,680,000 blocks rather than 840,000, because Blossom halved the block spacing in 2019 and doubled the interval to keep emission on the same calendar.',
      'This is read from the node, not computed from a formula: the consensus-verified chainSupply the network agreed on. A formula would have to model the slow start (the first 20,000 blocks ramped up from nothing), Blossom and NU6 — getting any of them wrong is how supply estimates end up tens of percent out.',
      'Since NU6 a share of each block reward accrues to an on-chain lockbox rather than being paid out, so issuance and what miners receive are no longer the same number. Lockbox ZEC is already counted here.',
    ] },
  ],
  related: ['inflation', 'dev-fund', 'market-cap', 'pools'],
  load: async () => {
    const rows = (await getCompleteDailyStats()).filter((r) => r.end_supply_zat > 0);
    const dates = rows.map((r) => r.date);
    const s = rows.map((r) => zat(r.end_supply_zat));
    const i = rows.length - 1;
    const change = changeOver(dates, s, 28);
    const left = CAP - s[i];
    return {
      panels: [panel({ dates, format: 'zecCompact', zeroBaseline: true, yDomain: [0, 22_000_000], series: [
        area('supply', 'ZEC mined', C.zec, s),
        line('cap', '21M cap', C.muted, rows.map(() => CAP), { dashed: true, width: 1.2 }),
      ] })],
      headline: { label: 'Total supply', value: `${num(s[i])} ZEC`, date: dates[i], change,
        sentence: `${num(s[i])} ZEC had been mined by ${dateLong(dates[i])} — ${((s[i] / CAP) * 100).toFixed(1)}% of the 21M cap, with ${compact(left)} ZEC still to come.` },
      spark: spark(s, 3650), indexValue: `${compact(s[i])} ZEC`,
      defaultRange: 'ALL', events: [...HALVINGS, { date: '2019-12-11', label: 'Blossom' }], dataThrough: dates[i],
    };
  },
};

const inflation: ChartDef = {
  slug: 'inflation',
  title: 'Zcash daily emission and inflation rate',
  short: 'Inflation & emission',
  question: 'How fast is the ZEC supply growing?',
  group: 'supply',
  source: 'onchain',
  sourceNote: 'Coinbase outputs per day from our Zebra node · rate = emission × 365 ÷ supply',
  unit: '%/yr',
  api: ['daily-stats'],
  explainer: [
    { heading: 'What does Zcash inflation tell you?', paragraphs: [
      'The rate is annualised from current emission: what a year would add to supply if issuance stayed at today’s pace (7-day average). It is not a forecast — the next halving cuts it roughly in half overnight, and between halvings it decays as the denominator grows.',
      'Emission is exact: it comes from actual coinbase outputs in real blocks, not from a schedule, so it already reflects variable block times and, since NU6, the share held back in the lockbox. On 24 Nov 2025 NU6.1 released 78,536 ZEC from the lockbox in a single coinbase; those coins were issued when they accrued, so the release is left out of both panels.',
      'Falling inflation is arithmetic rather than news: a fixed reward against a growing supply declines whether or not anything happens. The parts worth watching are the steps, which are halvings.',
    ] },
  ],
  related: ['supply', 'dev-fund', 'total-fees', 'hashrate'],
  load: async () => {
    const [all, fund] = await Promise.all([getCompleteDailyStats(), getDevFund()]);
    const rows = all.filter((r) => r.coinbase_zat > 0);
    const dates = rows.map((r) => r.date);
    // A lockbox release is paid through a coinbase but issues nothing new (NU6.1, 24 Nov 2025: 78,536 ZEC) — take it out.
    const released = new Map<string, number>();
    fund.dates.forEach((t, j) => { const out = j ? fund.cumulative_out[j] - fund.cumulative_out[j - 1] : 0; if (out > 0) released.set(t, out); });
    const em = rows.map((r) => Math.max(0, zat(r.coinbase_zat) - (released.get(r.date) ?? 0)));
    const em7 = rolling(em, 7);
    const rate = rows.map((r, j) => (em7[j] != null ? ((em7[j]! * 365) / zat(r.end_supply_zat)) * 100 : null));
    const i = rows.length - 1;
    return {
      panels: [
        panel({ title: 'Annualised inflation (7-day average emission)', dates, format: 'pct', zeroBaseline: true, logToggle: true, height: 260, series: [line('rate', 'Inflation, % a year', C.zec, rate, { width: 2.2 })] }),
        panel({ title: 'Emission per day', dates, format: 'zec', zeroBaseline: true, height: 200, series: [bars('em', 'ZEC issued', tint(C.gold, 65), em), line('em7', '7-day average', C.gold, em7, { width: 2 })] }),
      ],
      headline: { label: 'Inflation rate', value: `${rate[i]!.toFixed(2)}%/yr`, date: dates[i], change: null,
        sentence: `Supply is growing **${rate[i]!.toFixed(2)}% a year** at the current pace: ${num(em7[i]!)} ZEC issued per day on a 7-day average to ${dateLong(dates[i])}.` },
      spark: spark(rate, 1825), indexValue: `${rate[i]!.toFixed(2)}%/yr`,
      defaultRange: '5Y', events: [...HALVINGS, { date: '2019-12-11', label: 'Blossom' }], dataThrough: dates[i],
      notes: [`Lockbox releases are paid through a coinbase but issue nothing new, so they are left out: ${[...released].map(([t, v]) => `${num(v)} ZEC on ${dateLong(t)}`).join(', ')} (NU6.1). The first years run off the scale on ALL — switch to Log.`],
    };
  },
};

const devFund: ChartDef = {
  slug: 'dev-fund',
  title: 'Zcash dev fund: accrued and paid out',
  short: 'Dev fund lockbox',
  question: 'How much of the dev-fund lockbox has actually been paid out?',
  group: 'supply',
  source: 'onchain',
  sourceNote: 'Lockbox balance from the node’s valuePools, daily; accrual and payout from its changes',
  unit: 'ZEC',
  api: ['dev-fund'],
  explainer: [
    { heading: 'What is the lockbox?', paragraphs: [
      'Zcash has funded development from the block reward for most of its life. The Founders’ Reward paid founders directly until the first halving in 2020; ZIP-1014 then created a Dev Fund paid directly to named recipients. Both were paid as earned, so the schedule was the answer.',
      'NU6 changed the shape. Since 23 Nov 2024 part of each block reward accrues to an on-chain lockbox instead of going to anyone. It is real issued ZEC in a consensus-enforced pool, released only by a later decision — so for the first time “how much has the dev fund actually been paid?” differs from the schedule. That gap is this chart.',
      'Measured, not reconstructed. The balance is read from the node every day; what came in and went out are worked out from the day-to-day change, counted separately so the paid-out share is a ratio of totals. The two bands stack to everything accrued. Lockbox ZEC already counts in total supply from the day it accrued; a release moves coins, it issues none.',
    ] },
  ],
  related: ['supply', 'inflation', 'pools', 'total-fees'],
  load: async () => {
    const [d, daily] = await Promise.all([getDevFund(), getCompleteDailyStats()]);
    const n = d.dates.filter((t) => t <= daily.at(-1)!.date).length; // stop at the last complete day, like the rest
    const dates = d.dates.slice(0, n);
    const i = n - 1;
    const paidPct = (d.cumulative_out[i] / d.cumulative_in[i]) * 100;
    return {
      panels: [panel({ dates, format: 'zecCompact', stacked: true, step: true, series: [
        line('paid', 'Paid out (cumulative)', C.zec, d.cumulative_out.slice(0, n)),
        line('lockbox', 'Still in the lockbox', C.lockbox, d.balance.slice(0, n)),
      ] })],
      headline: { label: 'Paid out of the lockbox', value: `${paidPct.toFixed(1)}%`, date: dates[i], change: null,
        sentence: `${paidPct.toFixed(1)}% of the deferred dev fund has been paid out — ${num(d.cumulative_out[i])} of ${num(d.cumulative_in[i])} ZEC accrued since NU6; ${num(d.balance[i])} ZEC is still locked.` },
      spark: spark(d.balance.slice(0, n)), indexValue: `${paidPct.toFixed(0)}% paid`,
      ranges: ['3M', '6M', '1Y', 'ALL'], defaultRange: 'ALL', events: [{ date: '2025-11-24', label: 'NU6.1 release' }], dataThrough: dates[i],
    };
  },
};

const hashrate: ChartDef = {
  slug: 'hashrate',
  title: 'Zcash hashrate and mining difficulty',
  short: 'Hashrate',
  question: 'Is the mining power securing Zcash growing?',
  group: 'supply',
  source: 'onchain',
  sourceNote: 'Estimated from daily average difficulty: difficulty × 2¹³ ÷ 75 s · our Zebra node',
  unit: 'Sol/s',
  api: ['daily-stats'],
  explainer: [
    { heading: 'What do hashrate and difficulty tell you?', paragraphs: [
      'Neither is measured directly — nobody can count the machines. Hashrate is inferred from difficulty (difficulty × 2¹³ ÷ the 75-second target), and difficulty is set by how fast recent blocks arrived. A run of lucky blocks reads as a hashrate spike that never happened, so treat short moves as noise and the trend as signal.',
      'Difficulty is the thermostat: it retargets every block to hold the 75-second spacing, so it tracks hashrate rather than causing it. The lower panel is its day-over-day change; columns above zero mean more mining joined.',
      'Zcash uses Equihash, which is memory-hard, so its rate is in solutions per second (shown with the usual G/M prefixes) and cannot be compared with Bitcoin’s SHA-256 hashes. For a comparison that does mean something, implied mining power converts both to electricity.',
    ] },
  ],
  related: ['implied-gw', 'inflation', 'total-fees', 'supply'],
  load: async () => {
    const rows = (await getCompleteDailyStats()).filter((r) => r.avg_difficulty > 0);
    const dates = rows.map((r) => r.date);
    const hr = rows.map((r) => (r.avg_difficulty * 8192) / 75);
    const hr7 = rolling(hr, 7);
    const dchg = rows.map((r, j) => (j > 0 && rows[j - 1].avg_difficulty > 0 ? ((r.avg_difficulty - rows[j - 1].avg_difficulty) / rows[j - 1].avg_difficulty) * 100 : null));
    const i = rows.length - 1;
    const change = changeOver(dates, hr7, 28);
    const gs = (v: number) => `${(v / 1e9).toFixed(2)} GSol/s`;
    return {
      panels: [
        panel({ title: 'Estimated hashrate', dates, format: 'hashrate', zeroBaseline: true, logToggle: true, height: 280, series: [
          line('hr', 'Daily estimate', tint(C.zec, 45), hr, { width: 1.1 }), line('hr7', '7-day average', C.zec, hr7, { width: 2.2 })] }),
        panel({ title: 'Difficulty change, day over day', dates, format: 'pct', zeroBaseline: true, height: 170, series: [bars('dchg', 'Difficulty change', C.s2, dchg, { agg: 'mean' })] }),
      ],
      headline: { label: 'Network hashrate', value: gs(hr[i]), date: dates[i], change: changeOver(dates, hr, 28),
        sentence: `The network ran at an estimated ${gs(hr[i])} on ${dateLong(dates[i])}; the 7-day average of ${gs(hr7[i]!)} is ${changeWords(change)}.` },
      spark: spark(hr7), indexValue: gs(hr[i]),
      defaultRange: '1Y', events: [...UPGRADES], dataThrough: dates[i],
      notes: ['Shown as H/s on the axis; for Equihash read each “H” as one solution.'],
    };
  },
};

/** Value of the series at a given coins-issued point (linear interpolation between the bracketing points). */
function atSupply(pts: IssuancePoint[], s: number, k: keyof IssuancePoint): number | null {
  for (let j = 1; j < pts.length; j++) {
    const a = pts[j - 1], b = pts[j];
    if (a.supply <= s && b.supply >= s) { const t = (s - a.supply) / (b.supply - a.supply || 1); return (a[k] as number) + t * ((b[k] as number) - (a[k] as number)); }
  }
  return null;
}
const power = (gw: number) => (gw >= 1 ? `${gw.toFixed(gw < 10 ? 2 : 1)} GW` : gw >= 1e-3 ? `${(gw * 1e3).toFixed(gw < 1e-2 ? 1 : 0)} MW` : gw >= 1e-6 ? `${(gw * 1e6).toFixed(0)} kW` : `${(gw * 1e9).toFixed(0)} W`);

const impliedGw: ChartDef = {
  slug: 'implied-gw',
  title: 'Implied mining power: ZEC vs BTC at equal issuance',
  short: 'Implied mining power',
  question: 'At the same point in issuance, how much power secured Zcash compared with Bitcoin?',
  group: 'supply',
  source: 'external',
  sourceNote: 'Hashrate × current-ASIC efficiency, weekly · BTC hashrate from blockchain.info',
  unit: 'GW',
  api: ['mktcap-issuance'],
  explainer: [
    { heading: 'What does “implied” mean here?', paragraphs: [
      'Nobody meters the Zcash network. This is hashrate converted to electrical demand by assuming every miner runs current-generation hardware at its rated efficiency — 17.5 J/TH for SHA-256 (Antminer S21) and 1.96 mJ/Sol for Equihash 200,9 (Antminer Z15 Pro). No network does that, because old machines stay on while they pay for themselves, so read it as a lower bound on a lower bound.',
      'The x-axis is coins issued, not the date. At the same calendar moment Bitcoin is sixteen years into its schedule and Zcash ten; aligning on supply asks what Bitcoin’s network was drawing when it had mined as many coins as Zcash has now — a question that only means something because both chains cap at 21M.',
      'Early Bitcoin ran on machines orders of magnitude worse, so its real historical draw was far higher than shown; one stated efficiency basis is easier to reason about than a fitted fleet model. It is not an environmental claim either way: energy drawn says nothing about where it came from.',
    ] },
  ],
  related: ['hashrate', 'mktcap-issuance', 'tx-issuance', 'implied-mcap'],
  load: async () => {
    const d = await getMktcapIssuance();
    const zec = d.zec.filter((p) => p.gw > 0), btc = d.btc.filter((p) => p.gw > 0);
    const z = zec.at(-1)!;
    const b = atSupply(btc, z.supply, 'gw');
    const ratio = b ? b / z.gw : null;
    return {
      panels: [{ kind: 'custom', component: 'b-issuance', props: {
        unit: 'power', log: true,
        series: [
          { key: 'zec', label: 'Zcash', color: C.zec, points: zec.map((p) => [p.supply, p.gw, p.date]) },
          { key: 'btc', label: 'Bitcoin', color: C.btc, points: btc.map((p) => [p.supply, p.gw, p.date]) },
        ],
        marker: z.supply,
        ariaLabel: `Implied mining power against coins issued, log scale: Zcash ${power(z.gw)} at ${compact(z.supply)} coins; Bitcoin ${b ? power(b) : 'n/a'} at the same issuance.`,
      } }],
      headline: { label: 'Zcash implied mining draw', value: power(z.gw), date: z.date, change: null,
        sentence: `Zcash’s hashrate implies about ${power(z.gw)} on today’s hardware at ${compact(z.supply)} coins issued; Bitcoin was drawing ${b ? power(b) : 'n/a'} when it had issued as many${ratio ? ` — ${ratio.toFixed(1)}× more` : ''}.` },
      spark: spark(zec.map((p) => p.gw), 120), indexValue: power(z.gw),
      ranges: false, dataThrough: z.date,
      notes: ['Weekly points. Both converted at current-generation ASIC efficiency, so early Bitcoin is understated.'],
    };
  },
};

export const supplyCharts: ChartDef[] = [supply, inflation, devFund, hashrate, impliedGw];
