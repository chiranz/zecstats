import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

// ─── Data source adapter ──────────────────────────────────────────────────────
// The live site's front end reads JSON from https://zecstats.com/api/<name>. Every one of those routes was captured
// into data/api/<name>.json (scripts/extract-snapshot.mjs). This module is the single seam between pages and data:
//
//   ZECSTATS_DATA_SOURCE=snapshot (default)  read data/api/<name>.json
//   ZECSTATS_DATA_SOURCE=live                fetch ZECSTATS_UPSTREAM/api/<name>?<params> (cached 60s),
//                                            falling back to the snapshot if the upstream refuses or errors
//
// The same switch drives app/api/[...path]/route.ts, which serves these routes at the same paths as the live site.

export const DATA_SOURCE = (process.env.ZECSTATS_DATA_SOURCE ?? 'snapshot') as 'snapshot' | 'live';
export const UPSTREAM = (process.env.ZECSTATS_UPSTREAM ?? 'https://zecstats.com').replace(/\/$/, '');
const API_DIR = path.join(process.cwd(), 'data', 'api');

export type Params = Record<string, string | number | boolean | undefined>;

const fileName = (name: string) => `${name.replace(/^\/?api\//, '').replace(/\//g, '_')}.json`;

const readSnapshot = cache(async (name: string): Promise<unknown> => JSON.parse(await fs.readFile(path.join(API_DIR, fileName(name)), 'utf8')));

export type Upstream = { ok: true; body: unknown } | { ok: false; reason: string };

/** Fetch one route from the live site. JSON only: a Cloudflare challenge page (HTML) counts as a refusal. */
export async function fetchUpstream(name: string, params?: Params, revalidate = 60): Promise<Upstream> {
  const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  const url = `${UPSTREAM}/api/${name.replace(/^\/?api\//, '')}${qs ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' }, next: { revalidate }, signal: AbortSignal.timeout(8000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('json')) return { ok: false, reason: `${res.status} ${type.split(';')[0] || 'no content-type'}` };
    return { ok: true, body: await res.json() };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Read an endpoint. Pages call this (or the typed helpers in ./snapshot and siblings), never fs or fetch directly. */
export const api = cache(async <T = unknown>(name: string, params?: Params): Promise<T> => {
  if (DATA_SOURCE === 'live') {
    const up = await fetchUpstream(name, params);
    if (up.ok) return up.body as T;
    console.warn(`[data] live ${name} unavailable (${up.reason}); using snapshot`);
  }
  return (await readSnapshot(name)) as T;
});

export async function hasSnapshot(name: string): Promise<boolean> {
  try { await fs.access(path.join(API_DIR, fileName(name))); return true; } catch { return false; }
}

export type Manifest = { source: string; capturedAt: string; endpoints: Record<string, { route: string; bytes: number }> };
export const manifest = () => readSnapshot('_manifest') as Promise<Manifest>;
