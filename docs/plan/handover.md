# Handover: end of iteration 2 (11 Oct 2026)

## State
- Next.js 16 app at the repo root, on `main`, committed in small per-area commits and **not pushed**. The working tree is clean. All 31 pages and 58 `/chart/<slug>` pages are built from the `data/api` snapshot.
- Last checks:
  - `pnpm build` → 99 pages.
  - `pnpm typecheck` → clean.
  - `pnpm check:api` → 68/68 typed reads match the snapshot.
  - `scripts/shot.mjs` → 31 pages in dark and light plus 58 charts in dark, all 200 at 1440 and 390, no overflow, no console errors.
- Design canvas (source of truth): https://claude.ai/artifact/14NxTBtnDk6j4hyhMxHzqd, version 13, shared as "anyone with the link".
  - `docs/design/artboards/` mirrors it exactly, including `canvas.json`.
  - `docs/design/renders/*.jpg` are older exports that still show the old logo.
- Every page and chart path on the live site exists here at the same path. `/privacy` and `/charts` are new.
- Logo = the live zecstats.com favicon (three signal bars) in the app and on every artboard.

## Decisions (user)
- **Ticker:** Sample 1, a single-row "Nasdaq" tape on every page directly under the top bar. Built.
- **Dashboard opening:** composition A (tape first, slim header, freshness on one line). Built.
- **Privacy hub:** v2, Ironwood-led. It opens with the Ironwood panel; the shielded share follows. Built.
- **No mock wording in the UI or on the canvas:**
  - No "redesign concept", "snapshot", "captured", "placeholder" or "not the live site".
  - The design shows the final product, in the same voice as the live site.
  - Product freshness ("Data through 10 Oct 2026 · updates daily") stays.
  - Missing values get real numbers or "—".
  - Done everywhere; also recorded in BRIEF.md §0.
- **Navigation:** direction D, "answer first" (artboards `Nav-D-answer-first*.dc.html`; prototype at `/design/nav/d`). Not built yet.
  - One context bar holds the crumb and the section's pages, with Ironwood marked in Privacy.
  - Chart pages get a group switcher and prev/next.
  - The page header is the H1 plus a one-sentence answer (a key figure on chart pages).
  - Node status appears once, as a pill in the global bar.
- **Standing rules:**
  - Make design calls yourself from AGENTS.md, BRIEF.md and the artboards, and record each one. Ask before pushing, publishing or deleting, or adding npm dependencies.
  - Small commits, made by the lead only. Subagents never run git; every subagent runs on Opus.
  - Design first: append new designs to the canvas as "Iteration 3" rows, never overwrite existing artboards, then build.
  - Show the snapshot's numbers, not BRIEF §7's. Transaction counts leave out coinbase.

## Pending, in suggested order
1. **Build navigation direction D site-wide.** Design any missing states on the canvas first. Shared files:
   - `components/chrome/TopBar.tsx`, `components/chrome/Masthead.tsx`
   - new `components/chrome/ContextBar.tsx`
   - `app/layout.tsx`, `app/globals.css`, `app/chrome.css`
   - `lib/site.ts` (section membership, Privacy order with Ironwood marked)
   - `lib/search.ts` and `lib/data/search-index.ts` (optional value per item)
   - `app/privacy/page.tsx`, `app/ironwood/page.tsx` (the page subnav becomes "On this page")
   - `components/chart-page/ChartPage.tsx` (prev/next moves into the context bar)
   - the pages that pass a `kicker`

   Fix while there:
   - On phones, search is hidden (`.kbd-search` is `display:none` at ≤560px).
   - The hub's "Ironwood" jump link scrolls within the hub instead of opening `/ironwood`.
2. **Close the parity gaps** in `docs/plan/parity-audit.md` (top 15, URL params matrix). Highest first:
   - Chart/compare/tx-sizes permalinks `?from=&to=`, a custom date range, and 9M/YTD presets.
   - Live menu items reachable: Privacy Tips; Pool P&L `/chart/pool-profit`.
   - `/wallet-apps?p=`, `/btc-bull-run?at=`, `/metrics?date=`.
   - `/privacy-suggestions.json`.
   - The footer link to x.com/jeremiahrogers.
   - swap-assets toggles.
   - btc-migration sources and explorer links.
   - Report pages keeping their state in the URL; CSV where the live site has CSV.
3. **API hardening:**
   - Runtime validation per endpoint, using zod/valibot (a new dependency; ask) or hand-written validators.
   - Capture the non-default API variants through the user's browser: `dca?assets=` (16 assets), shield-hops classes and windows, `tx-values?class=`, `near-network?days=&gran=`, `btc-migration?days=&min_btc=`, `usage-clock?days=`, `utxo-survival`.
   - The mock `/api` route ignores query params in snapshot mode.
   - Controls whose data isn't captured are disabled for now: tx-sizes, swaps, btc-migration, world-usage and wallet-apps windows, and the shield-hops views.
4. **Calculator:** restore the 16 assets once the `dca` variants are captured (the menu text promises gold and stocks).
5. **Missing blocks:** the weekly visible-nodes chart on `/network`, the exchange access map, the world-usage animated map and awake-population curve, the donate QR (removed for now), og:image cards, `app/sitemap.ts` and `app/robots.ts`.
6. **A fresh-agent code review** (user rule: a different agent reviews; read the test diff first). No test suite exists yet. Consider adding one before the bigger changes.
7. **Housekeeping:**
   - Re-export the canvas renders.
   - Brand-mark glow: keep the current strength or make it subtler (user's call).
   - The nav artboards show the original Privacy hub under the bars, not the v2 hub.
   - Some Metrics-board sparklines are drawn, not real (Total supply dips, but supply only grows).

## How to work here
- Read `AGENTS.md` (project rules, Next 16 notes, commands) and `docs/design/BRIEF.md`.
- Parallel dev servers reuse distDir names already listed in `tsconfig.json`: a1 a2 b1 b2 c d lead qa tk nl.
- Verify with:
  - `scripts/shot.mjs` (1440/390, `--light`, `--full`)
  - `pnpm typecheck`
  - `pnpm check:api`
  - `pnpm build`, before reporting
- Report in the user's format (`~/.agents/AGENTS.md`).
