# ZEC Stats — redesign

A redesign of [zecstats.com](https://zecstats.com): every Zcash number, from a Zebra full node. Same pages and paths as
the live site, with clearer hierarchy, an Ironwood-led Privacy hub, and question-first charts.

Built with Next.js 16 (App Router), React 19 and TypeScript. Design source of truth: the
[design canvas](https://claude.ai/artifact/14NxTBtnDk6j4hyhMxHzqd), mirrored in `docs/design/artboards/`.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Node 20.9+ and pnpm 10.

## Data

Pages read data through one seam (`lib/data/core.ts`), so the source is a switch, not a rewrite.

| Mode | Set | Reads |
|---|---|---|
| Saved data (default) | nothing | `data/api/<endpoint>.json`, a capture of the live site's JSON API (data through 10 Oct 2026) |
| Live | `ZECSTATS_DATA_SOURCE=live` | `ZECSTATS_UPSTREAM/api/<endpoint>` (default `https://zecstats.com`), cached 60 s; any endpoint that fails falls back to saved data |

```bash
ZECSTATS_DATA_SOURCE=live ZECSTATS_UPSTREAM=http://localhost:8080 pnpm dev
```

All upstream calls are made by the Next.js server, and the browser only calls this app's own `/api/*`, so CORS never
applies. The live site sits behind a Cloudflare challenge that refuses server requests. To use it, run against a backend
directly (e.g. on localhost) or allow the server's IP in Cloudflare. Each `/api/*` response carries an
`x-zecstats-source` header saying which source answered.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Develop, build, serve |
| `pnpm typecheck` | Route types + `tsc` |
| `pnpm check:api` | Checks every typed read against the saved data |
| `pnpm extract-data` | Rebuilds `data/api/` from a raw capture in `data/raw/` |
| `node scripts/shot.mjs <url> <outDir> /route … [--light] [--full]` | Screenshots at 1440 and 390 px, flags horizontal overflow |

## Layout

```
app/                 routes (31 pages, /chart/[slug] for 58 charts, /api/[...path] JSON mirror)
components/          chrome (top bar, context bar), ticker, charts, ui blocks, per-area parts
lib/data/            the data seam and typed helpers, one module per area
lib/charts/          chart definitions: question, takeaway, series, sources
lib/site.ts          navigation: sections, Tools groups, page context
docs/                design brief, artboards, plans and handover
```

Project rules for contributors and coding agents: [`AGENTS.md`](AGENTS.md).
