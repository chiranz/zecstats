import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { Pill } from '@/components/reports/BarList';
import r from '@/components/reports/report.module.css';
import { NODE_VERSION, getBackfill } from '@/lib/data/network';
import { getCompleteDailyStats, getFreshness, getLatestBlock } from '@/lib/data/snapshot';
import { manifest } from '@/lib/data/core';
import { dateLong, num, pct } from '@/lib/format';

export const metadata: Metadata = { title: 'Node status', description: 'Is the Zebra node behind every ZEC Stats number healthy and in sync?' };

const TARGET = 1152; // blocks per day at the 75-second target

export default async function NodePage() {
  const [lb, bf, stats, fresh, m] = await Promise.all([getLatestBlock(), getBackfill(), getCompleteDailyStats(), getFreshness(), manifest()]);
  const captured = Date.parse(m.capturedAt);
  const lastBlockAgo = Math.max(0, Math.round(captured / 1000 - lb.time));
  const behind = lb.node_estimated_height - lb.height;
  const recent = stats.slice(-90);
  const last30 = stats.slice(-30);
  const avg30 = last30.reduce((a, s) => a + s.block_count, 0) / last30.length;
  const roll = recent.map((_, i) => { const w = recent.slice(Math.max(0, i - 6), i + 1); return w.reduce((a, s) => a + s.block_count, 0) / w.length; });
  const slowDays = last30.filter((s) => s.block_count < TARGET * 0.9).length;
  const ago = lastBlockAgo < 120 ? `${lastBlockAgo} s` : `${Math.round(lastBlockAgo / 60)} min`;

  const indexes = [
    { name: 'Block index (pools, flows, supply)', height: lb.height, pct: (lb.height / lb.node_estimated_height) * 100 },
    { name: 'UTXO set', height: bf.utxo_backfill_height, pct: (bf.utxo_backfill_height / bf.chain_height) * 100 },
    { name: 'Fees', height: bf.fee_backfill_height, pct: bf.fee_backfill_pct },
    { name: 'Transparent addresses', height: bf.t_addr_backfill_height, pct: bf.t_addr_backfill_pct },
    { name: 'UTXO depth snapshots', height: bf.depth_height, pct: bf.depth_pct },
    { name: 'Coin survival snapshots', height: bf.survival_height, pct: bf.survival_pct },
  ];
  const tone = (lag: number) => (lag <= 120 ? 'ok' : lag <= 2000 ? 'lag' : 'bad') as 'ok' | 'lag' | 'bad';

  return (
    <>
      <Masthead
        title="Is our Zcash node healthy?"
        lede={<>{fresh.synced ? 'Yes' : 'Not quite'}: our Zebra node is <b className="value">{fresh.synced ? 'fully synced' : 'catching up'}</b> at block <b className="num value">{num(lb.height)}</b>, {behind <= 0 ? 'level with' : `${behind} block${behind === 1 ? '' : 's'} behind`} the network’s tip, and the last block arrived {ago} ago.</>}
      />

      <section className="hero" aria-label="Answer">
        <div className={r.heroGrid}>
          <div className="stack" style={{ gap: 14 }}>
            <p className="kicker">Node state · checked {dateLong(captured)} {new Date(captured).toISOString().slice(11, 16)} UTC</p>
            <p className="figure md" style={{ color: fresh.synced ? 'var(--up)' : 'var(--warn)' }}>{fresh.synced ? 'Synced' : 'Catching up'}</p>
            <p className="note">Every chain figure on this site is read from this node. It is a Zebra full node — one of the two independent Zcash implementations — and it validates every block against the consensus rules itself rather than accepting anyone’s word for them.</p>
          </div>
          <dl className={r.kv}>
            <dt>Node software</dt><dd>{NODE_VERSION}</dd>
            <dt>Latest indexed block</dt><dd>{num(lb.height)} / {num(lb.node_estimated_height)}<small>{pct((lb.height / lb.node_estimated_height) * 100, 1)} of the network tip</small></dd>
            <dt>Latest indexed day</dt><dd>{dateLong(lb.time * 1000)}<small>UTC, the day of the latest block</small></dd>
            <dt>Last block seen</dt><dd>{ago} ago</dd>
            <dt>Indexing rate</dt><dd>{num(lb.indexing_rate_per_min, 1)} blocks/min<small>the chain makes 0.8 a minute at target</small></dd>
            <dt>Blocks remaining to sync</dt><dd>{num(Math.max(0, behind))}</dd>
            <dt>UTXO backfill height</dt><dd>{num(bf.utxo_backfill_height)}</dd>
          </dl>
        </div>
      </section>

      <KpiBand label="Node summary">
        <Kpi k="Status" v={fresh.synced ? 'Synced' : 'Catching up'} s={NODE_VERSION} />
        <Kpi k="Indexed height" v={num(lb.height)} s={`${behind <= 0 ? 'at' : `${behind} below`} the network tip`} />
        <Kpi k="Blocks per day (30d)" v={num(avg30)} s={`target ${num(TARGET)} · ${pct((avg30 / TARGET) * 100, 1)} of target`} />
        <Kpi k="Slowest indexes" v={pct(Math.min(...indexes.map((i) => i.pct)), 2)} s="every backfill above 99.9%" />
      </KpiBand>

      <Card
        title="Is the chain producing blocks on schedule?"
        takeaway={<>Over the last 30 complete days the chain averaged <b>{num(avg30)}</b> blocks a day against a target of {num(TARGET)}; {slowDays ? <><b>{slowDays}</b> day{slowDays === 1 ? '' : 's'} came in more than 10% short.</> : <>no day came in more than 10% short.</>}</>}
        actions={<ChartActions api="daily-stats" name="blocks per day" />}
        legend={<Legend items={[{ label: 'Blocks per day', color: 'var(--s2)' }, { label: '7-day average', color: 'var(--value)', line: true }]} />}
        foot={`Blocks counted per UTC day from our node · target ${num(TARGET)} = 86,400 s ÷ 75 s · data through ${dateLong(fresh.dataThrough)}`}
      >
        <TimeSeriesChart
          dates={recent.map((s) => s.date)} format="count" ranges={['1M', '3M']} defaultRange="3M" height={260} showLegend={false}
          series={[{ key: 'b', label: 'Blocks', color: 'var(--s2)', type: 'bar', values: recent.map((s) => s.block_count), agg: 'mean' }, { key: 'avg', label: '7-day average', color: 'var(--value)', values: roll, width: 1.6 }]}
          events={[]}
          ariaLabel={`Blocks per day for the last 90 days, averaging ${num(avg30)} over the last 30 against a target of ${TARGET}.`}
        />
      </Card>

      <Section title="How far has each index caught up?" aside={<span className="small">chain height {num(bf.chain_height)}</span>}>
        <div className="tbl-wrap">
          <table className="t">
            <caption className="sr-only">Index backfill status</caption>
            <thead><tr><th scope="col">Index</th><th scope="col">Height</th><th scope="col">Behind tip</th><th scope="col">Complete</th><th scope="col" style={{ textAlign: 'left' }}>State</th></tr></thead>
            <tbody>
              {indexes.map((i) => {
                const lag = Math.max(0, bf.chain_height - i.height);
                const t = tone(lag);
                return (
                  <tr key={i.name}>
                    <td className="l">{i.name}</td>
                    <td>{num(i.height)}</td>
                    <td>{num(lag)} blocks</td>
                    <td>{pct(Math.min(100, i.pct), 2)}</td>
                    <td style={{ textAlign: 'left' }}><Pill tone={t}>{t === 'ok' ? 'Current' : t === 'lag' ? 'Hours behind' : 'Days behind'}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small">“Current” = within 120 blocks (about 2.5 hours) of the tip. Snapshot-based indexes (depth, survival) refresh in batches of about 1,000 blocks, so a small lag there is normal.</p>
      </Section>

      <More summary="Why read from our own node at all?">
        <p>That is the difference between verified and trusted. A site reading from an exchange API is repeating what that exchange says the supply is; this one is repeating what the Zcash network agreed it is. Supply and shielded pool balances in particular are read from the node’s own per-block snapshots rather than reconstructed from a block-reward formula — a formula gets slow start, Blossom and NU6 wrong, and consensus cannot.</p>
        <p>When indexing falls behind, the charts say so rather than quietly showing stale numbers.</p>
      </More>

      <Tiles items={[
        { href: '/network', title: 'Network nodes', desc: 'Every reachable node, by country and client.' },
        { href: '/chart/hashrate', title: 'Hashrate + difficulty', desc: 'How much mining power secures the chain.' },
        { href: '/chart/block-size', title: 'Average block size', desc: 'How full blocks are, day by day.' },
        { href: '/chart/tx', title: 'Transactions per day', desc: 'How much the chain is used.', value: <>{num(stats.at(-1)!.tx_count - stats.at(-1)!.block_count)} / day</> },
      ]} />
    </>
  );
}
