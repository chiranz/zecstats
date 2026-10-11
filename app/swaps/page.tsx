import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { BarList } from '@/components/reports/BarList';
import { FixedSeg } from '@/components/reports/FixedSeg';
import r from '@/components/reports/report.module.css';
import { getNearNetwork, getNearStats, getZecFlows } from '@/lib/data/crosschain';
import { dateLong, num, pct, usdCompact } from '@/lib/format';

export const metadata: Metadata = { title: 'Swaps', description: 'How central ZEC is in the NEAR Intents cross-chain swap network, and what flows in and out.' };

const NAME: Record<string, string> = { USD: 'USD stablecoins', btc: 'BTC', eth: 'ETH', zec: 'ZEC', near: 'NEAR', sol: 'SOL', hypercore: 'Hypercore', xrp: 'XRP', base: 'Base', tron: 'TRON', ltc: 'LTC', arb: 'Arbitrum', bsc: 'BNB Chain', doge: 'DOGE', wbtc: 'WBTC', sui: 'SUI' };
const nm = (id: string) => NAME[id] ?? id.toUpperCase();
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${usdCompact(Math.abs(v), 1)}`;

export default async function SwapsPage() {
  const [net, flows, wrapped] = await Promise.all([getNearNetwork(), getZecFlows(), getNearStats()]);
  const nodes = [...net.nodes].sort((a, b) => a.rank - b.rank);
  const zec = nodes.find((n) => n.id === 'zec')!;
  const window = `${dateLong(net.from)} – ${dateLong(net.to)}`;

  // ZEC's counterparties in the window, from the edge list
  const pairs = new Map<string, { into: number; out: number }>();
  for (const e of net.edges) {
    if (e.to === 'zec' && e.from !== 'zec') { const p = pairs.get(e.from) ?? { into: 0, out: 0 }; p.into += e.usd; pairs.set(e.from, p); }
    if (e.from === 'zec' && e.to !== 'zec') { const p = pairs.get(e.to) ?? { into: 0, out: 0 }; p.out += e.usd; pairs.set(e.to, p); }
  }
  const pairRows = [...pairs.entries()].map(([id, p]) => ({ id, ...p, total: p.into + p.out })).sort((a, b) => b.total - a.total);
  const topPairs = pairRows.slice(0, 8);
  const pairMax = topPairs[0].total;
  const usdPair = pairs.get('USD');

  // Daily flows (all history), inbound up / outbound down
  const dates = flows.map((f) => f.date);
  const inbound = flows.map((f) => f.btc_in + f.eth_in + f.other_in);
  const outbound = flows.map((f) => -(f.btc_out + f.eth_out + f.other_out));
  const last30 = flows.slice(-30);
  const net30 = last30.reduce((a, f) => a + f.btc_in + f.eth_in + f.other_in - f.btc_out - f.eth_out - f.other_out, 0);
  const wrappedNow = wrapped.at(-1)!;

  return (
    <>
      <Masthead
        title="Where does ZEC sit in cross-chain swaps?"
        lede={<>Over the last {net.days_covered} days on NEAR Intents, ZEC ranked <b className="num value">#{zec.rank} of {net.node_count}</b> assets by PageRank — <b className="num value">{num(zec.weight, 2)}×</b> its weight by market cap.</>}
      >
        <p className={r.mastNote}>NEAR Intents is a cross-chain swap protocol. Treat every asset as a node and every swap as a link weighted by dollars, and PageRank — the method that ranks web pages by what links to them — says how central each asset is.</p>
      </Masthead>

      <div className={r.fbar} role="region" aria-label="Report filters">
        <div className={r.grp}>
          <span className={r.glbl} id="g-win">Window</span>
          <div className={r.grpRow}>
            <FixedSeg labelledBy="g-win" options={['7d', '14d', '30d']} active="14d" />
            <span className={r.count}><b>{window}</b> · {num(net.sync.total_rows)} swap rows · {usdCompact(net.sync.total_volume_usd, 1)} volume</span>
          </div>
        </div>
        <div className={r.grp}>
          <span className={r.glbl} id="g-grp">Group by</span>
          <FixedSeg labelledBy="g-grp" options={['Asset', 'Token', 'Chain']} active="Asset" />
        </div>
        <div className={r.end}><a className="btn" href="/api/near-network" download="zec-near-network.json">Download data</a></div>
      </div>

      <Card
        title="Which assets are most central to the swap network?"
        takeaway={<>ZEC holds <b>{pct(zec.pagerank * 100, 2)}</b> of the network’s PageRank, behind {nodes.slice(0, zec.rank - 1).map((n) => nm(n.id)).join(', ')} — against just <b>{pct((zec.mcap_share ?? 0) * 100, 2)}</b> of their combined market cap.</>}
        actions={<ChartActions api="near-network" name="PageRank by asset" />}
        legend={<Legend items={[{ label: 'ZEC', color: 'var(--zec)' }, { label: 'Other assets', color: 'var(--p-transparent)' }]} />}
        foot={`PageRank over ${net.days_covered} days of NEAR Intents swaps, weighted by dollar volume · ${window} · top 12 of ${net.node_count}`}
      >
        <BarList label="PageRank share by asset" max={nodes[0].pagerank} items={nodes.slice(0, 12).map((n) => ({
          key: n.id, name: <>{n.rank}. {nm(n.id)}</>, value: pct(n.pagerank * 100, 2), sub: `${usdCompact(n.total_usd, 1)} volume`, highlight: n.id === 'zec',
          parts: [{ key: 'pr', value: n.pagerank, color: n.id === 'zec' ? 'var(--zec)' : 'var(--p-transparent)' }],
        }))} />
      </Card>

      <KpiBand label="ZEC on NEAR Intents">
        <Kpi k="ZEC rank" v={`#${zec.rank}`} unit={`of ${net.node_count}`} s="by PageRank over swap volume" />
        <Kpi k="ZEC swap volume" v={usdCompact(zec.total_usd, 1)} s={`${pct((zec.total_usd / net.sync.total_volume_usd) * 100, 0)} of all ${usdCompact(net.sync.total_volume_usd, 1)} in ${net.days_covered} days`} />
        <Kpi k="Net flow" v={<span className={zec.net_usd >= 0 ? 'up' : 'dn'}>{zec.net_usd >= 0 ? '▲' : '▼'} {usdCompact(Math.abs(zec.net_usd), 1)}</span>} s={`in ${usdCompact(zec.in_usd, 1)} · out ${usdCompact(zec.out_usd, 1)}`} />
        <Kpi k="Over-weight" v={`${num(zec.weight, 2)}×`} s="PageRank share ÷ market-cap share" />
      </KpiBand>

      <div className="grid2">
        <Card
          title="What does ZEC get swapped with?"
          takeaway={<>Stablecoins dominate both ways: <b>{usdCompact(usdPair?.out ?? 0, 1)}</b> of ZEC went out to USD stablecoins and <b>{usdCompact(usdPair?.into ?? 0, 1)}</b> came in from them.</>}
          actions={<ChartActions api="near-network" name="ZEC swap pairs" />}
          legend={<Legend items={[{ label: 'Into ZEC', color: 'var(--s2)' }, { label: 'Out of ZEC', color: 'var(--s4)' }]} />}
          foot={`Dollar volume per counter-asset, ${window}.`}
        >
          <BarList label="ZEC swap volume by counter-asset" max={pairMax} items={topPairs.map((p) => ({
            key: p.id, name: nm(p.id), value: usdCompact(p.total, 1), sub: `in ${usdCompact(p.into, 1)} · out ${usdCompact(p.out, 1)}`,
            parts: [{ key: 'in', value: p.into, color: 'var(--s2)', label: `Into ZEC ${usdCompact(p.into, 1)}` }, { key: 'out', value: p.out, color: 'var(--s4)', label: `Out of ZEC ${usdCompact(p.out, 1)}` }],
          }))} />
        </Card>
        <Card
          title="Is ZEC flowing in or out each day?"
          takeaway={<>Over the last 30 days, <b>{signed(net30)}</b> net {net30 >= 0 ? 'flowed into' : 'left'} ZEC on this route. Columns above zero are swaps into ZEC; below zero, swaps out.</>}
          actions={<ChartActions api="near-swaps" name="daily ZEC flow" />}
          legend={<Legend items={[{ label: 'Into ZEC', color: 'var(--s2)' }, { label: 'Out of ZEC', color: 'var(--s4)' }]} />}
          foot={`Every ZEC swap on NEAR Intents since ${dateLong(dates[0])}, by UTC day; ZEC↔ZEC chain moves count both ways · data through ${dateLong(dates.at(-2)!)}`}
        >
          <TimeSeriesChart
            dates={dates} format="usdCompact" ranges={['1M', '3M', '6M', '1Y', 'ALL']} defaultRange="3M" height={260} showLegend={false} zeroBaseline
            series={[{ key: 'in', label: 'Into ZEC', color: 'var(--s2)', type: 'bar', values: inbound }, { key: 'out', label: 'Out of ZEC', color: 'var(--s4)', type: 'bar', values: outbound }]}
            ariaLabel={`Daily dollar volume swapped into ZEC (above zero) and out of ZEC (below zero) on NEAR Intents; ${signed(net30)} net over 30 days.`}
          />
        </Card>
      </div>

      <Section title="Every asset in the swap network" aside={<span className="small">{net.node_count} assets · {window}</span>}>
        <div className="tbl-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
          <table className="t">
            <caption className="sr-only">Assets on NEAR Intents ranked by PageRank</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col" style={{ textAlign: 'left' }}>Asset</th><th scope="col">PageRank</th><th scope="col">Volume</th><th scope="col">Net flow</th><th scope="col">Market cap</th><th scope="col">vs market cap</th><th scope="col">Swaps</th></tr></thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.id} className={n.id === 'zec' ? r.focusRow : undefined}>
                  <td>{n.rank}</td>
                  <td style={{ textAlign: 'left' }}>{n.id === 'zec' ? <b className="value">{nm(n.id)}</b> : nm(n.id)}</td>
                  <td>{pct(n.pagerank * 100, 2)}</td>
                  <td>{usdCompact(n.total_usd, 1)}</td>
                  <td className={n.net_usd >= 0 ? 'up' : 'dn'}>{n.net_usd >= 0 ? '▲' : '▼'} {usdCompact(Math.abs(n.net_usd), 1)}</td>
                  <td>{n.market_cap ? usdCompact(n.market_cap, 1) : <span className="muted" title="No market cap: a chain or a basket, not one coin">—</span>}</td>
                  <td>{n.weight ? `${num(n.weight, 2)}×` : <span className="muted">—</span>}</td>
                  <td>{num(n.swaps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">Net flow ▲ = more dollars swapped into the asset than out of it. “—” market cap: a chain or a basket of tokens (e.g. Hypercore, Base), which has no single coin to price. “vs market cap” = PageRank share ÷ market-cap share; above 1× means the asset is swapped more than its size suggests.</p>
      </Section>

      <More summary="What PageRank adds here, and what it cannot">
        <p>On this window PageRank and raw volume rank the assets almost identically, so read the rank as “how much flows through it”, not as a hidden measure of influence. The useful part is the ratio to market cap: ZEC moves through this protocol far out of proportion to its size.</p>
        <p>NEAR Intents is one route among many; centralised exchanges are not in this data. Bridged ZEC on NEAR stood at {num(wrappedNow.wrapped_supply)} ZEC on {dateLong(wrappedNow.date)}.</p>
      </More>

      <Tiles items={[
        { href: '/wallet-apps', title: 'Wallet apps', desc: 'Which apps send these swaps.' },
        { href: '/btc-migration', title: 'Bitcoin → Zcash', desc: 'BTC swapped into ZEC, and how long it sat still.' },
        { href: '/chart/near-flow', title: 'NEAR Intents ZEC flow', desc: 'Inbound vs outbound, split by BTC and ETH.' },
        { href: '/chart/near-bridge', title: 'NEAR bridge (ZEC)', desc: 'ZEC locked on NEAR.', value: <>{num(wrappedNow.wrapped_supply)} ZEC</> },
      ]} />
    </>
  );
}
