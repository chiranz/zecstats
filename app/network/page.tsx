import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, Kpi, KpiBand, More, Section, Tiles } from '@/components/ui/blocks';
import { BarList, ShareBar } from '@/components/reports/BarList';
import { NodeMap, type MapBubble } from '@/components/network/NodeMap';
import { NodeDirectory, type DirRow } from '@/components/network/NodeDirectory';
import r from '@/components/reports/report.module.css';
import s from '@/components/network/network.module.css';
import { CLIENT_COLOR, CLIENT_LABEL, NODE_VERSION, STATUS_COPY, clientOfAgent, getCountries, getNetwork, getSyncTotals } from '@/lib/data/network';
import { getLatestBlock, getFreshness } from '@/lib/data/snapshot';
import { WORLD_H, WORLD_W } from '@/components/network/worldDots';
import { num, pct } from '@/lib/format';
import { getHalving } from '@/lib/data/reports';

export const metadata: Metadata = { title: 'Network nodes', description: 'How many Zcash nodes are publicly reachable, where they are, and what software they run.' };

const CLIENT_ORDER = ['Zakura', 'Zebra', 'unknown', 'zcashd'];
const proj = (lat: number, lon: number) => ({ x: ((lon + 180) * WORLD_W) / 360, y: ((75 - lat) * WORLD_H) / 135 });

/** One bubble per country at the mean position of its nodes' city regions, nudged apart so bubbles never overlap. */
function layoutBubbles(b: MapBubble[]): MapBubble[] {
  const rad = (n: number) => (n <= 1 ? 4.6 : 6 + Math.sqrt(n) * 3.4) + 1.5;
  const out = b.map((x) => ({ ...x }));
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], c = out[j];
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = rad(a.nodes) + rad(c.nodes);
      if (d < min) {
        const push = (min - d) / 2, ux = dx / d, uy = dy / d;
        const wa = c.nodes / (a.nodes + c.nodes), wc = 1 - wa; // the bigger bubble moves less
        a.x -= ux * push * 2 * wa; a.y -= uy * push * 2 * wa; c.x += ux * push * 2 * wc; c.y += uy * push * 2 * wc;
      }
    }
  }
  return out.map((x) => ({ ...x, x: Math.round(Math.min(WORLD_W - 12, Math.max(12, x.x)) * 10) / 10, y: Math.round(Math.min(WORLD_H - 12, Math.max(12, x.y)) * 10) / 10 }));
}

export default async function NetworkPage() {
  const [net, countries, sync, lb, fresh, halving] = await Promise.all([getNetwork(), getCountries(), getSyncTotals(), getLatestBlock(), getFreshness(), getHalving()]);
  const reachable = sync.reachable;
  const nCountries = countries.length;
  const top2 = countries[0].nodes + countries[1].nodes;

  // ---- map bubbles from geo points (reachable nodes only) ----
  const byCc = new Map<string, { lat: number; lon: number; k: number; clients: Record<string, number> }>();
  const unreachable: { x: number; y: number }[] = [];
  for (const g of net.geo) {
    if (g.status === 'unreachable') { unreachable.push(proj(g.lat, g.lon)); continue; }
    const e = byCc.get(g.cc) ?? { lat: 0, lon: 0, k: 0, clients: {} };
    e.lat += g.lat; e.lon += g.lon; e.k++;
    const c = CLIENT_LABEL[g.client] ? g.client : 'unknown';
    e.clients[c] = (e.clients[c] ?? 0) + 1;
    byCc.set(g.cc, e);
  }
  const bubbles = layoutBubbles(countries.filter((c) => byCc.has(c.cc)).map((c) => {
    const e = byCc.get(c.cc)!;
    return { cc: c.cc, country: c.country, nodes: c.nodes, ...proj(e.lat / e.k, e.lon / e.k), status: { at_tip: c.at_tip, out_of_sync: c.out_of_sync, unknown_sync: c.unknown_sync }, clients: e.clients };
  }));
  const clientTotals: Record<string, number> = {};
  for (const g of net.geo) if (g.status !== 'unreachable') { const c = CLIENT_LABEL[g.client] ? g.client : 'unknown'; clientTotals[`client:${c}`] = (clientTotals[`client:${c}`] ?? 0) + 1; }
  const mapClients = CLIENT_ORDER.map((k) => ({ key: k, label: CLIENT_LABEL[k], color: CLIENT_COLOR[k] }));

  // ---- software (per reachable address, as the API reports it) ----
  const clientCounts = CLIENT_ORDER.map((k) => ({ key: k, label: CLIENT_LABEL[k], value: net.by_client.find((c) => c.client === k)?.count ?? 0, color: CLIENT_COLOR[k] }));
  const addrTotal = clientCounts.reduce((a, c) => a + c.value, 0);
  const leader = clientCounts[0];
  const zcashd = clientCounts.find((c) => c.key === 'zcashd')!;
  const maxVer = Math.max(...net.by_version.map((v) => v.count));

  // ---- directory ----
  const rows: DirRow[] = net.nodes.map((n) => {
    const c = n.client in CLIENT_LABEL ? n.client : n.user_agent ? clientOfAgent(n.user_agent) : 'unknown';
    return { id: n.id, network: n.network, host: n.host, country: countries.find((x) => x.cc === n.cc)?.country ?? n.country, client: c, clientLabel: CLIENT_LABEL[c], clientColor: CLIENT_COLOR[c], version: n.user_agent, atTip: n.at_tip, behind: n.blocks_behind, firstSeen: n.first_seen, lastSeen: n.last_seen };
  });

  const topN = 10;
  const countryItem = (c: (typeof countries)[number]) => ({
    key: c.cc, name: c.country, value: c.nodes,
    parts: [
      { key: 'tip', value: c.at_tip, color: 'var(--up)', label: `At tip ${c.at_tip}` },
      { key: 'oos', value: c.out_of_sync, color: 'var(--warn)', label: `Out of sync ${c.out_of_sync}` },
      { key: 'unk', value: c.unknown_sync, color: 'var(--unknown)', label: `Height unknown ${c.unknown_sync}` },
    ],
  });
  const rest = countries.slice(topN);
  const m = net.maturity;
  const known = net.known_total;
  const sources = Object.fromEntries(net.known_by_source.map((k) => [k.source, k.count]));

  return (
    <>
      <Masthead
        crumbs={[{ label: 'Tools' }, { label: 'Network' }, { label: 'Network nodes' }]}
        title="Zcash network nodes"
        cadence="crawler runs continuously"
        lede={<><b className="num value">{reachable}</b> nodes answered in the last 24 hours, across <b className="num value">{nCountries}</b> countries.</>}
      >
        <p className={r.mastNote}>These are the nodes that accept connections from outside. Many more run behind home routers and firewalls, so no crawler can see them.</p>
      </Masthead>
      <p className="small" style={{ marginTop: -20 }}>
        Crawler {net.crawl_health.stalled ? 'stalled' : 'active'} · last probe {net.crawl_health.minutes_since_probe} min ago · index {m.complete ? 'complete' : 'still filling'} · crawl running {m.days_running} days
      </p>

      <KpiBand label="Network summary">
        <Kpi k="Reachable nodes" v={reachable} s="answered a handshake in the last 24h" />
        <Kpi k="At chain tip" v={sync.at_tip} s={`${pct((sync.at_tip / reachable) * 100, 0)} of reachable · fully synced`} />
        <Kpi k="Out of sync" v={sync.out_of_sync} s={`${pct((sync.out_of_sync / reachable) * 100, 0)} · behind the latest block`} />
        <Kpi k="Height unknown" v={sync.unknown_sync} s={`${pct((sync.unknown_sync / reachable) * 100, 0)} · live, but did not report a height`} />
        <Kpi k="Known addresses" v={num(known)} s={`${num(m.recent_new)} new in the last ${m.window_hours}h (${pct(m.growth_fraction * 100, 2)})`} />
        <Kpi k="Countries" v={nCountries} s={countries.slice(0, 3).map((c) => `${c.cc === 'US' ? 'US' : c.country} ${c.nodes}`).join(' · ')} />
        <Kpi k="Crawl running" v={m.days_running} unit="days" s={`index complete after ${m.days_required} days`} />
        <Kpi k="Our node" v={fresh.synced ? 'Synced' : 'Catching up'} s={`${NODE_VERSION} · block ${num(lb.height)}`} href="/node" />
      </KpiBand>

      <Card
        title="Where are the nodes?"
        takeaway={<><b>{top2}</b> of the {reachable} reachable nodes are in the {countries[0].cc === 'US' ? 'US' : countries[0].country} and {countries[1].country}; Europe holds the densest cluster.</>}
        actions={<ChartActions api="network" name="node map" />}
        foot={`Bubbles group nodes by country, placed at the average of their city regions — never finer — and nudged apart where they would overlap; small dots are one-node countries. Map crops Antarctica and the far Arctic (60°S–75°N). ${num(net.geo_omitted)} addresses heard of but never located are not drawn.`}
      >
        <NodeMap bubbles={bubbles} unreachable={unreachable} clients={mapClients} totals={{ ...sync, ...clientTotals }} />
      </Card>

      <div className="grid2">
        <Card
          title="Which countries run the most nodes?"
          takeaway={<><b>{countries[0].cc === 'US' ? 'US' : countries[0].country} {countries[0].nodes}</b> and <b>{countries[1].country} {countries[1].nodes}</b> account for {pct((top2 / reachable) * 100, 0)} of all reachable nodes.</>}
          actions={<ChartActions api="network" name="nodes by country" />}
          legend={<div className="legend"><span><i className="sw" style={{ background: 'var(--up)' }} />At tip</span><span><i className="sw" style={{ background: 'var(--warn)' }} />Out of sync</span><span><i className="sw" style={{ background: 'var(--unknown)' }} />Height unknown</span></div>}
          foot="Counts machines, not addresses. “The Netherlands” and “Netherlands” in the crawler’s data are merged into one row."
        >
          <div className={s.countries}>
            <BarList label="Reachable nodes by country" items={countries.slice(0, topN).map(countryItem)} max={countries[0].nodes} />
            <details>
              <summary className={r.moreRow}>
                <span>{rest.length} more countries · {rest.reduce((a, c) => a + c.nodes, 0)} nodes</span>
                <span className="linkish"><span className={s.showAll}>Show all {nCountries}</span><span className={s.hideAll}>Show top {topN}</span></span>
              </summary>
              <div style={{ marginTop: 14 }}><BarList label="Other countries" items={rest.map(countryItem)} max={countries[0].nodes} /></div>
            </details>
          </div>
        </Card>

        <Card
          title="What software do they run?"
          takeaway={<><b>{leader.label}</b> leads with <b>{leader.value}</b> of {addrTotal} reachable addresses ({pct((leader.value / addrTotal) * 100, 0)}); zcashd is down to <b>{zcashd.value}</b>.</>}
          actions={<ChartActions api="network" name="node software" />}
          foot={`Versions with 2 or more nodes. zcashd advertises itself as “MagicBean”. Counts are per reachable address, so a dual-stack node can appear twice (${addrTotal}, not ${reachable}).`}
        >
          <ShareBar label={`Node software: ${clientCounts.map((c) => `${c.label} ${c.value}`).join(', ')}`} parts={clientCounts} />
          <div className="tbl-wrap">
            <table className={`t ${r.compact}`}>
              <caption className="sr-only">Advertised node versions</caption>
              <thead><tr><th scope="col">Advertised version</th><th scope="col" style={{ textAlign: 'left' }}>Client</th><th scope="col">Nodes</th></tr></thead>
              <tbody>
                {net.by_version.map((v) => {
                  const c = clientOfAgent(v.user_agent);
                  return (
                    <tr key={v.user_agent}>
                      <td><i className={r.dotc} style={{ background: CLIENT_COLOR[c] }} />{v.user_agent}</td>
                      <td className="l" style={{ textAlign: 'left' }}>{CLIENT_LABEL[c]}</td>
                      <td><i className={r.minibar} style={{ width: Math.max(4, (v.count / maxVer) * 60), background: CLIENT_COLOR[c] }} />{v.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Section id="directory" title="Which nodes are visible right now?" aside={<span className="small">{num(known)} addresses known · {net.reachable_total} confirmed reachable in the last 24h</span>}>
        <NodeDirectory rows={rows} clients={CLIENT_ORDER.map((k) => ({ key: k, label: CLIENT_LABEL[k] }))} />
        <p className="small">Addresses are masked to the first two octets. Sync is measured when a node is indexed; “behind” counts blocks below that node’s own reported tip and our node’s tip at the time (currently block {num(lb.height)}).</p>
      </Section>

      <details className="more" open>
        <summary>What state is each of the {num(net.status_total)} known addresses in?</summary>
        <div className="stack" style={{ gap: 14 }}>
          <p className="note">Most of an address book never answers — that is the normal shape of this network, not a fault. Failures are retried on an exponential backoff, so nothing is abandoned.</p>
          <div className="tbl-wrap">
            <table className={`t ${r.compact}`}>
              <caption className="sr-only">Crawler status of every known address</caption>
              <thead><tr><th scope="col">Status</th><th scope="col" style={{ textAlign: 'left' }}>What it means</th><th scope="col">Addresses</th><th scope="col">Share</th></tr></thead>
              <tbody>
                {net.status_breakdown.flatMap((g) => {
                  const copy = STATUS_COPY[g.group] ?? { name: g.group, means: g.label };
                  const share = (g.count / net.status_total) * 100;
                  const head = (
                    <tr key={g.group} className={r.rgrp}>
                      <td>{copy.name}</td><td className={r.wrap}>{copy.means}</td><td>{num(g.count)}</td><td>{share < 0.1 ? '<0.1%' : pct(share, 1)}</td>
                    </tr>
                  );
                  const subs = g.reasons.length > 1 ? g.reasons.map((x) => {
                    const c = STATUS_COPY[x.reason] ?? { name: x.reason, means: x.label };
                    return <tr key={`${g.group}-${x.reason}`} className={r.sub}><td>{c.name}</td><td className={r.wrap}>{c.means}</td><td>{num(x.count)}</td><td /></tr>;
                  }) : [];
                  return [head, ...subs];
                })}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <More summary="How the crawl works, and why addresses are hidden">
        <div className={s.crawl}>
          <div><b>{num(net.crawl_health.probes_last_hour)} probes</b>in the last hour, {num(net.crawl_health.successes_last_hour)} answered, {num(net.crawl_health.new_addresses_last_hour)} new addresses heard of</div>
          <div><b>{num(sources.gossip ?? 0)} from gossip</b>plus {num(sources.rpc ?? 0)} from our node’s own peers and {num(sources.dns ?? 0)} from DNS seeders</div>
          <div><b>Complete after {m.days_required} days</b>and under 10% new addresses a day; now {m.days_running} days running, {pct(m.growth_fraction * 100, 2)} new</div>
        </div>
        <div className={r.moreCols}>
          <div className={r.prose}>
            <p><b>How we find nodes.</b> The crawl starts from the peers our own node is already talking to, plus the standard list of seed servers. It then asks each peer for the peers it knows, and walks outward from there. It paces itself: it speeds up when peers answer and slows down when they do not.</p>
            <p>We record an address the moment we hear of one, and track separately whether it ever answered. Hearing about a node is cheap; confirming one is not. Most addresses we are told about never answer, and a peer that already has a connection from us will refuse a second one.</p>
          </div>
          <div className={r.prose}>
            <p><b>Addresses are hidden on purpose.</b> Running a node is not consent to being listed by address. A public table of every node and where it sits is a targeting list. Each node gets a fixed nickname and a rough network area instead; the real address never reaches your browser.</p>
            <p><b>Tor nodes cannot be found.</b> zcashd and Zebra both share peer addresses in a format that cannot carry an onion address, so the Tor count stays at zero even though Tor nodes exist.</p>
          </div>
        </div>
      </More>

      <Tiles items={[
        { href: '/node', title: 'Node status', desc: 'Is the node behind these numbers healthy?', value: <>{NODE_VERSION} · {fresh.synced ? 'synced' : 'catching up'}</> },
        { href: '/chart/hashrate', title: 'Hashrate + difficulty', desc: 'How much mining power secures the chain.' },
        { href: '/chart/block-size', title: 'Average block size', desc: 'How full blocks are, day by day.', value: <>Block {num(lb.height)}</> },
        { href: '/halving', title: 'Halving', desc: 'When the block reward next drops to 0.78125 ZEC.', value: <>~{num(halving.daysLeft)} days</> },
      ]} />
    </>
  );
}
