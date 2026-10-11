# ZEC Stats — redesign

A redesign of [zecstats.com](https://zecstats.com): the same pages at the same paths, reading the same JSON API.
Next.js 16, React 19, TypeScript. Design: [canvas](https://claude.ai/artifact/14NxTBtnDk6j4hyhMxHzqd).

## Use your backend

By default the app reads a saved copy of the API in `data/api/` (data through 10 Oct 2026). To use a live backend:

```bash
pnpm install
ZECSTATS_DATA_SOURCE=live ZECSTATS_UPSTREAM=https://your-backend pnpm dev   # http://localhost:3000
```

- Requests go to `ZECSTATS_UPSTREAM/api/<name>` with your route names and query parameters
  ([full list](docs/api/endpoints.md)). They are made server-side; the browser only calls this app's `/api/*` proxy.
- An endpoint that fails falls back to the saved copy and logs `[data] live <name> unavailable`. The
  `x-zecstats-source` header on `/api/*` says `live`, `snapshot` or `snapshot-fallback`.
- Wall of Shame, privacy tips and wallet apps have no `/api` route, so they always use the saved copy.
- Live responses are cached for 60 s.

## Develop

| Command | Does |
|---|---|
| `pnpm dev` · `pnpm build` · `pnpm start` | Develop, build, serve (Node 20.9+, pnpm 10) |
| `pnpm typecheck` | Route types + `tsc` |
| `pnpm check:api` | Checks every typed read against the saved data |
| `pnpm extract-data` | Rebuilds `data/api/` from a raw capture in `data/raw/` |
| `node scripts/shot.mjs <url> <dir> /route … [--light]` | Screenshots at 1440 and 390 px, flags horizontal overflow |

```
app/          routes: 31 pages, /chart/[slug] (58 charts), /api/[...path] (JSON proxy)
lib/data/     the data seam (core.ts) and typed helpers per area
lib/charts/   chart definitions
components/   chrome, ticker, charts, UI blocks
docs/         design brief, artboards, API list, handover
```

Rules for contributors and coding agents: [`AGENTS.md`](AGENTS.md).
