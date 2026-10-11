# ZEC Stats — redesign

A redesign of [zecstats.com](https://zecstats.com): the same pages at the same paths, reading the same JSON API.
Next.js 16, React 19, TypeScript. Design: [canvas](https://claude.ai/artifact/14NxTBtnDk6j4hyhMxHzqd).

## Test it against your backend

Out of the box the app reads a saved copy of your API (`data/api/`, data through 10 Oct 2026). Two variables switch
it to a live backend:

```bash
pnpm install
ZECSTATS_DATA_SOURCE=live ZECSTATS_UPSTREAM=http://localhost:8080 pnpm dev   # → http://localhost:3000
```

- **Routes:** the app requests `ZECSTATS_UPSTREAM/api/<name>` with the same names and query parameters your front end
  uses. The full list is in [`docs/api/endpoints.md`](docs/api/endpoints.md).
- **CORS doesn't apply.** Only the Next.js server calls your API; browsers only call this app's own `/api/*`, which
  proxies it.
- **Cloudflare does.** The challenge on zecstats.com refuses server requests. Point `ZECSTATS_UPSTREAM` at the backend
  directly (localhost or an internal host), or allow the test machine's IP in Cloudflare.
- **Fallback:** an endpoint that fails or returns non-JSON falls back to the saved copy. The server logs
  `[data] live <name> unavailable (<reason>)`, and every `/api/*` response has an `x-zecstats-source` header
  (`live`, `snapshot` or `snapshot-fallback`). Check these before trusting a number.
- **Not covered:** Wall of Shame, privacy tips and wallet apps have no `/api` route on your site, so they stay on
  saved data. The view counters (`/api/hit`, `/api/view`) and `/api/ad` are never called.
- **Caching:** live responses are cached for 60 s. Use `pnpm dev` for testing; a production build prerenders pages at
  build time.

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
