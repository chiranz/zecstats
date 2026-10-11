import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, Legend, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { BarList } from '@/components/reports/BarList';
import { LinkSeg, ParamNote } from '@/components/reports/LinkSeg';
import { hrefWith, one, pick } from '@/components/reports/params';
import r from '@/components/reports/report.module.css';
import { getNearNetwork, getNearStats, getZecFlows, type NearNetwork } from '@/lib/data/crosschain';
import { api, DATA_SOURCE } from '@/lib/data/core';
import { dateLong, delta, num, pct, usdCompact } from '@/lib/format';
import { getDailyStats } from '@/lib/data/snapshot';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/swaps');

const NAME: Record<string, string> = { USD: 'USD stablecoins', btc: 'BTC', eth: 'ETH', zec: 'ZEC', near: 'NEAR', sol: 'SOL', hypercore: 'Hypercore', xrp: 'XRP', base: 'Base', tron: 'TRON', ltc: 'LTC', arb: 'Arbitrum', bsc: 'BNB Chain', doge: 'DOGE', wbtc: 'WBTC', sui: 'SUI' };
const nm = (id: string) => NAME[id] ?? id.toUpperCase();
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${usdCompact(Math.abs(v), 1)}`;
/** Net flow as "▲ $1.2M" / "▼ $1.2M" with its colour class (into the asset = up); flat when it rounds to $0. */
const netFlow = (v: number) => { const d = delta(v, 0, '', 'up'); return { cls: d.cls, text: d.dir === 'flat' ? usdCompact(0) : `${d.dir === 'up' ? '▲' : '▼'} ${usdCompact(Math.abs(v), 1)}` }; };
const IN = 'var(--s1)', OUT = 'var(--s2)'; // the site-wide in/out pair

// Live's link state: ?days=7|14|30 (window) &gran=asset|token|chain (what a node is)
const WINS = ['7', '14', '30'] as const;
const GRANS = [['asset', 'Asset'], ['token', 'Token'], ['chain', 'Chain']] as const;
type Net = NearNetwork & { days_requested?: number };
const zecNode = (n: Net) => n.nodes.find((x) => x.id === 'zec') ?? n.nodes.find((x) => /zec|zcash/i.test(x.id));

export default async function SwapsPage({ searchParams }: PageProps<'/swaps'>) {
  const sp = await searchParams;
  const live = DATA_SOURCE === 'live';
  const wantDays = pick(one(sp.days), WINS, '' as (typeof WINS)[number]) || null;
  const wantGran = pick(one(sp.gran), GRANS.map((g) => g[0]), 'asset');
  const base = await getNearNetwork();
  // a variant only when the data source is live and the link asks for one; the default view otherwise
  let net: Net = base, gran = 'asset';
  if (live && (wantDays || wantGran !== 'asset')) {
    const v = await api<Net>('near-network', { days: wantDays ?? undefined, gran: wantGran });
    if (zecNode(v) && (!wantDays || v.days_requested === Number(wantDays))) { net = v; gran = wantGran; }
  }
  const gotDays = net.days_requested ?? net.days_covered;
  const unmet = (wantDays != null && Number(wantDays) !== gotDays) || gran !== wantGran;
  const [allFlows, wrapped, stats] = await Promise.all([getZecFlows(), getNearStats(), getDailyStats()]);
  // the last daily-stats row is today, so far: daily flows stop the day before, and a window that ends today says so
  const today = stats.at(-1)!.date;
  const flows = allFlows.filter((f) => f.date < today);
  const nodes = [...net.nodes].sort((a, b) => a.rank - b.rank);
  const zec = zecNode(net)!;
  const partial = net.to >= today;
  const window = `${dateLong(net.from)} – ${dateLong(net.to)}${partial ? ' (so far)' : ''}`;

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
      <SectionLd path="/swaps" />
      <Masthead
        title="Where does ZEC sit in cross-chain swaps?"
        lede={<>Over {partial ? `the ${net.days_covered} days to today` : `the last ${net.days_covered} days`} on NEAR Intents, ZEC ranked <b className="num value">#{zec.rank} of {net.node_count}</b> assets by PageRank — <b className="num value">{num(zec.weight, 2)}×</b> its weight by market cap.</>}
      >
        <p className={r.mastNote}>NEAR Intents is a cross-chain swap protocol. Treat every asset as a node and every swap as a link weighted by dollars, and PageRank — the method that ranks web pages by what links to them — says how central each asset is.</p>
      </Masthead>

      <div className={r.fbar} role="region" aria-label="Report filters">
        <div className={r.grp}>
          <span className={r.glbl} id="g-win">Window</span>
          <div className={r.grpRow}>
            <LinkSeg labelledBy="g-win" active={String(gotDays)} options={WINS.map((d) => ({ key: d, label: `${d}d`, href: hrefWith('/swaps', sp, { days: d }), disabled: !live }))} />
            <span className={r.count}><b>{window}</b> · {num(net.sync.total_rows)} swap rows · {usdCompact(net.sync.total_volume_usd, 1)} volume</span>
          </div>
        </div>
        <div className={r.grp}>
          <span className={r.glbl} id="g-grp">Group by</span>
          <LinkSeg labelledBy="g-grp" active={gran} options={GRANS.map(([k, l]) => ({ key: k, label: l, href: hrefWith('/swaps', sp, { gran: k }), disabled: !live }))} />
        </div>
        <div className={r.end}><a className="btn" href="/api/near-network" download="zec-near-network.json">Download data</a></div>
      </div>
      {unmet && <ParamNote>The {wantDays ?? gotDays}-day view grouped by {wantGran} isn’t available yet — showing {gotDays} days grouped by {gran}.</ParamNote>}

      <Card
        title="Which assets are most central to the swap network?"
        takeaway={<>ZEC holds <b>{pct(zec.pagerank * 100, 2)}</b> of the network’s PageRank, behind {nodes.slice(0, zec.rank - 1).map((n) => nm(n.id)).join(', ')} — against just <b>{pct((zec.mcap_share ?? 0) * 100, 2)}</b> of the priced assets’ combined market cap.</>}
        actions={<ChartActions api="near-network" name="PageRank by asset" />}
        legend={<Legend items={[{ label: 'ZEC', color: 'var(--zec)' }, { label: 'Other assets', color: 'var(--other)' }]} />}
        foot={`PageRank over ${net.days_covered} days of NEAR Intents swaps, weighted by dollar volume · ${window}${partial ? ', the last day still arriving' : ''} · top 12 of ${net.node_count}`}
      >
        <BarList label="PageRank share by asset" max={nodes[0].pagerank} items={nodes.slice(0, 12).map((n) => ({
          key: n.id, name: <>{n.rank}. {nm(n.id)}</>, value: pct(n.pagerank * 100, 2), sub: `${usdCompact(n.total_usd, 1)} volume`, highlight: n.id === 'zec',
          parts: [{ key: 'pr', value: n.pagerank, color: n.id === 'zec' ? 'var(--zec)' : 'var(--other)' }],
        }))} />
      </Card>

      <KpiBand label="ZEC on NEAR Intents">
        <Kpi k="ZEC rank" v={`#${zec.rank}`} unit={`of ${net.node_count}`} s="by PageRank over swap volume" />
        <Kpi k="ZEC swap volume" v={usdCompact(zec.total_usd, 1)} s={`${pct((zec.total_usd / net.sync.total_volume_usd) * 100, 0)} of all ${usdCompact(net.sync.total_volume_usd, 1)} in ${net.days_covered} days`} />
        <Kpi k="Net flow" v={<span className={netFlow(zec.net_usd).cls}>{netFlow(zec.net_usd).text}</span>} s={`in ${usdCompact(zec.in_usd, 1)} · out ${usdCompact(zec.out_usd, 1)} · ▲ = more in than out`} />
        <Kpi k="Over-weight" v={`${num(zec.weight, 2)}×`} s="PageRank share ÷ market-cap share" />
      </KpiBand>

      <div className="grid2">
        <Card
          title="What does ZEC get swapped with?"
          takeaway={<>Stablecoins dominate both ways: <b>{usdCompact(usdPair?.out ?? 0, 1)}</b> of ZEC went out to USD stablecoins and <b>{usdCompact(usdPair?.into ?? 0, 1)}</b> came in from them.</>}
          actions={<ChartActions api="near-network" name="ZEC swap pairs" />}
          legend={<Legend items={[{ label: 'Into ZEC', color: IN }, { label: 'Out of ZEC', color: OUT }]} />}
          foot={`Dollar volume per counter-asset, ${window}. Hover or focus a bar for the split.`}
        >
          <BarList label="ZEC swap volume by counter-asset" max={pairMax} items={topPairs.map((p) => ({
            key: p.id, name: nm(p.id), value: usdCompact(p.total, 1), sub: `in ${usdCompact(p.into, 1)} · out ${usdCompact(p.out, 1)}`,
            parts: [{ key: 'in', value: p.into, color: IN, label: 'Into ZEC', display: usdCompact(p.into, 1) }, { key: 'out', value: p.out, color: OUT, label: 'Out of ZEC', display: usdCompact(p.out, 1) }],
          }))} />
        </Card>
        <Card
          title="Is ZEC flowing in or out each day?"
          takeaway={<>Over the 30 days to {dateLong(dates.at(-1)!)}, <b className={netFlow(net30).cls}>{netFlow(net30).text}</b> net {net30 >= 0 ? 'flowed into' : 'left'} ZEC on this route. Columns above zero are swaps into ZEC; below zero, swaps out.</>}
          actions={<ChartActions api="near-swaps" name="daily ZEC flow" />}
          legend={<Legend items={[{ label: 'Into ZEC', color: IN }, { label: 'Out of ZEC', color: OUT }]} />}
          foot={`Every ZEC swap on NEAR Intents since ${dateLong(dates[0])}, by UTC day; ZEC↔ZEC chain moves count both ways · data through ${dateLong(dates.at(-1)!)}`}
        >
          <TimeSeriesChart
            dates={dates} format="usdCompact" ranges={['1M', '3M', '6M', '1Y', 'ALL']} defaultRange="3M" height={260} showLegend={false} zeroBaseline
            series={[{ key: 'in', label: 'Into ZEC', color: IN, type: 'bar', values: inbound }, { key: 'out', label: 'Out of ZEC', color: OUT, type: 'bar', values: outbound }]}
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
                  <td><span className={netFlow(n.net_usd).cls}>{netFlow(n.net_usd).text}</span></td>
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
