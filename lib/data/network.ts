import 'server-only';
import { cache } from 'react';
import { api } from './core';

// /network, /node — the crawler's view of the peer-to-peer network, and our own node's state.

export type SyncStatus = 'at_tip' | 'out_of_sync' | 'unknown_sync' | 'unreachable';
export type NetNode = {
  id: string; cc: string; country: string; client: string; user_agent: string | null; network: 'ipv4' | 'ipv6' | 'onion'; networks: string[];
  host: string; port: number; at_tip: boolean | null; blocks_behind: number | null; first_seen: string; last_seen: string; tip_height: number | null;
};
export type GeoPoint = { cc: string; client: string; lat: number; lon: number; status: SyncStatus };
export type CountryRow = { cc: string; country: string; nodes: number; at_tip: number; out_of_sync: number; unknown_sync: number };
export type StatusGroup = { group: string; label: string; count: number; reasons: { reason: string; label: string; count: number }[] };
export type NetworkWeek = { date: string; ipv4_count: number; ipv6_count: number; onion_count: number; node_count: number; known_count: number; unreachable_count: number };
export type Network = {
  by_client: { client: string; count: number }[];
  by_version: { user_agent: string; count: number }[];
  by_country: CountryRow[];
  crawl_health: { last_probe_at: string; minutes_since_probe: number; probes_last_hour: number; successes_last_hour: number; new_addresses_last_hour: number; stalled: boolean; ema_success: number };
  geo: GeoPoint[];
  geo_omitted: number;
  history: NetworkWeek[];
  known_by_source: { source: string; count: number }[];
  known_total: number;
  maturity: { complete: boolean; days_required: number; days_running: number; growth_fraction: number; recent_new: number; window_hours: number };
  nodes: NetNode[];
  reachable_total: number;
  status_breakdown: StatusGroup[];
  status_total: number;
};

export const getNetwork = () => api<Network>('network');

/** Countries merged by ISO code (the API lists "The Netherlands" and "Netherlands" separately). */
export const getCountries = cache(async (): Promise<CountryRow[]> => {
  const n = await getNetwork();
  const by = new Map<string, CountryRow>();
  for (const r of n.by_country) {
    const c = by.get(r.cc);
    if (c) { c.nodes += r.nodes; c.at_tip += r.at_tip; c.out_of_sync += r.out_of_sync; c.unknown_sync += r.unknown_sync; if (r.country.length < c.country.length) c.country = r.country; }
    else by.set(r.cc, { ...r });
  }
  return [...by.values()].sort((a, b) => b.nodes - a.nodes || a.country.localeCompare(b.country));
});

/** Reachable-node totals by sync status (one per node; the map's geo list, which de-duplicates our own dual-stack nodes). */
export const getSyncTotals = cache(async () => {
  const n = await getNetwork();
  const t = { at_tip: 0, out_of_sync: 0, unknown_sync: 0, unreachable: 0 } as Record<SyncStatus, number>;
  for (const g of n.geo) t[g.status]++;
  return { ...t, reachable: t.at_tip + t.out_of_sync + t.unknown_sync };
});

// Client display names + colours: one palette for this page (map, share bar, version table, directory). Generic
// categorical hues — never a pool colour, and none near --warn/--up, which the sync-status view uses.
export const CLIENT_LABEL: Record<string, string> = { Zakura: 'Zakura', Zebra: 'Zebra', zcashd: 'zcashd', unknown: 'Not reported' };
export const CLIENT_COLOR: Record<string, string> = { Zakura: 'var(--s5)', Zebra: 'var(--s1)', zcashd: 'var(--s4)', unknown: 'var(--other)' };
export const clientOfAgent = (ua: string) => (/Zakura/i.test(ua) ? 'Zakura' : /Zebra/i.test(ua) ? 'Zebra' : /MagicBean/i.test(ua) ? 'zcashd' : 'unknown');

/** Plain-language status labels (the API's own labels, de-jargoned). */
export const STATUS_COPY: Record<string, { name: string; means: string }> = {
  reachable: { name: 'Reachable', means: 'Answered a Zcash handshake within the last 24 hours' },
  not_attempted: { name: 'Not tried yet', means: 'We have heard of it, but the crawler has not dialled it yet' },
  no_connection: { name: 'No connection', means: 'No connection could be opened at all' },
  host_silent: { name: 'Nothing answers', means: 'No reply on any common port — the machine looks gone' },
  port_closed: { name: 'Zcash port closed', means: 'The host is up, but its Zcash port is shut or filtered' },
  refused: { name: 'Connection refused', means: 'Host reachable, nothing listening on the port' },
  host_unreachable: { name: 'No route to host', means: 'Our network cannot find a path to it' },
  network_unreachable: { name: 'Network unreachable', means: 'The whole network is unreachable from here' },
  failed_handshake: { name: 'Handshake failed', means: 'Something is listening, but the Zcash handshake did not finish' },
  eof: { name: 'Hung up mid-handshake', means: 'The peer closed the connection during the handshake' },
  reset: { name: 'Connection reset', means: 'Accepted, then dropped — usually its per-IP slot is taken' },
  not_zcash: { name: 'Not a Zcash node', means: 'Wrong network magic bytes' },
  not_mainnet: { name: 'Different network', means: 'Answered a Zcash handshake but follows a different chain' },
  foreign_chain: { name: 'Different chain', means: 'Speaks Zcash on Zcash’s magic, but follows another chain' },
  proxy_error: { name: 'Our Tor proxy failed', means: 'Our own proxy could not open the circuit — says nothing about the node' },
  tor_socks: { name: 'Tor circuit failed', means: 'Our Tor proxy could not open the circuit' },
  unclassified: { name: 'Other network error', means: 'An error we could not classify' },
  other_io: { name: 'Network error', means: 'An input/output error with no clearer cause' },
};

// ─── Our own node (/node) ──────────────────────────────────────────────────────
export type BackfillStatus = {
  backfill_pct: number; chain_height: number; depth_height: number; depth_pct: number; fee_backfill_height: number; fee_backfill_pct: number;
  survival_height: number; survival_pct: number; t_addr_backfill_height: number; t_addr_backfill_pct: number; utxo_backfill_height: number;
  orchard_shielded_pct: number; histogram_days: number; fee_days: number; t_addr_days: number;
};
export const getBackfill = () => api<BackfillStatus>('backfill-status');

/** Only in the server-rendered /node page at capture (not in any API route): the node's software version. */
export const NODE_VERSION = 'Zebra v6.3.0';
