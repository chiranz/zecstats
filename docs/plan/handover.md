# Handover: end of iteration 2 (11 Oct 2026)

## State
- Next.js 16 app at the repo root, on `main`, committed in small per-area commits and **not pushed**. All 31 pages and 58 `/chart/<slug>` pages are built from the `data/api` snapshot.
- `pnpm build` passes (92 pages). `pnpm typecheck` is clean. `pnpm check:api` reports 68/68 typed reads matching the snapshot.
- Design canvas (source of truth): https://claude.ai/artifact/14NxTBtnDk6j4hyhMxHzqd, version 12. It is shared as "anyone with the link".
  - `docs/design/artboards/` mirrors it exactly, including `canvas.json`.
  - `docs/design/renders/*.jpg` are older exports that still show the old logo.
- Every page and chart path on the live site exists here at the same path. `/privacy` and `/charts` are new.
- Logo = the live zecstats.com favicon (three signal bars) in the app and on every artboard.

## Decisions (user)
- **Ticker:** Sample 1, a single-row "Nasdaq" tape on every page directly under the top bar. Not sticky. Pause/Play, pauses on hover and focus, an "All" list, and no motion under reduced-motion.
- **Dashboard opening:** composition A. The tape is the first line; the header is slimmer (no kicker, smaller H1, freshness on one line); the search field moves up.
- **Privacy hub:** v2, Ironwood-led. It opens with the Ironwood panel (4.11M ZEC, 83% of shielded, migration bar); the shielded share follows. Already built.
- **Navigation:** direction D, "answer first" (artboards `Nav-D-answer-first*.dc.html`; prototype at `/design/nav/d`).
  - One context bar holds the crumb and the section's pages. Ironwood is marked in Privacy. Chart pages get a group switcher and prev/next.
  - The page header is the H1 plus a one-sentence answer, with a key figure on chart pages.
  - Node status appears once, as a pill in the global bar; the "Redesign concept" note lives in its popover.
  - Not built yet.
- **Standing rules:**
  - Make design calls yourself from AGENTS.md, BRIEF.md and the artboards, and record each one. Ask before pushing, publishing or deleting.
  - Small commits, made by the lead only. Subagents never run git.
  - New designs are appended to the canvas as "Iteration N" rows; existing artboards are never overwritten.
  - Show the snapshot's numbers, not BRIEF §7's. Transaction counts leave out coinbase.

## Possibly unfinished when the session ended: verify first
A subagent was building the ticker + landing A into the app. Its work is uncommitted in the working tree:
- **Changed:** `app/layout.tsx`, `app/page.tsx` (+ `page.module.css`), `components/news/NewsFeed.tsx`, `components/ticker/*`, `lib/data/ticker.ts`.
- **Deleted:** the sample 2–8 components and possibly `app/design/ticker`.
- **Checks:**
  - The tape is mounted under the TopBar in the layout, with `refTs` = snapshot time in snapshot mode and `Date.now()` in live mode.
  - News articles have `id="ev-<ts>-<k>"`, and `/news#ev-…` opens and highlights that card.
  - Feed-event tape items link to `/news#ev-…`.
  - The dashboard top matches artboard `Landing-top.dc.html` composition A.
- **If incomplete:** finish it. Then typecheck, screenshot `/ /privacy /ironwood /news /chart/price /network` at 1440 and 390 in dark and light, and commit.

## Pending, in suggested order
1. **Finish/verify the ticker + landing A build** (above) and commit it.
2. **Build navigation direction D site-wide.** Shared files:
   - `components/chrome/TopBar.tsx`, `components/chrome/Masthead.tsx`
   - new `components/chrome/ContextBar.tsx`
   - `app/layout.tsx`, `app/globals.css`, `app/chrome.css`
   - `lib/site.ts` (section membership, Privacy order with Ironwood marked)
   - `lib/search.ts` and `lib/data/search-index.ts` (optional value per item)
   - `app/privacy/page.tsx`, `app/ironwood/page.tsx` (the page subnav becomes "On this page")
   - `components/chart-page/ChartPage.tsx` (prev/next moves into the context bar)
   - 3 pages that pass a `kicker`

   Fix while there:
   - On phones, search is hidden (`.kbd-search` is `display:none` at ≤560px).
   - The hub's "Ironwood" jump link scrolls within the hub instead of opening `/ironwood`.
3. **Close the parity gaps** in `docs/plan/parity-audit.md` (top 15, URL params matrix). Highest first:
   - Chart/compare/tx-sizes permalinks `?from=&to=`, a custom date range, and 9M/YTD presets.
   - Live menu items reachable: Privacy Tips; Pool P&L `/chart/pool-profit`.
   - `/wallet-apps?p=`, `/btc-bull-run?at=`, `/metrics?date=`.
   - `/privacy-suggestions.json`.
   - The footer link to x.com/jeremiahrogers.
   - swap-assets toggles.
   - btc-migration sources and explorer links.
   - Report pages keeping their state in the URL; CSV where the live site has CSV.
4. **API hardening:**
   - Runtime validation per endpoint, using zod/valibot (a new dependency; ask) or hand-written validators.
   - Capture the non-default API variants through the user's browser: `dca?assets=` (16 assets for the calculator), shield-hops classes and windows, `tx-values?class=`, `near-network?days=&gran=`, `btc-migration?days=&min_btc=`, `usage-clock?days=`, `utxo-survival`.
   - The mock `/api` route ignores query params in snapshot mode.
5. **Calculator:** restore the 16 assets once the `dca` variants are captured (the menu text promises gold and stocks).
6. **Missing blocks:** the weekly visible-nodes chart on `/network`, the exchange access map, the world-usage animated map and awake-population curve, the donate QR, og:image cards, `app/sitemap.ts` and `app/robots.ts`.
7. **A fresh-agent code review** (user rule: a different agent reviews; read the test diff first). No test suite exists yet. Consider adding one before the bigger changes.
8. **Housekeeping:**
   - Re-export the canvas renders, which still show the old logo.
   - Brand-mark glow: keep the current strength or make it subtler (user's call).
   - The nav artboards show the original Privacy hub under the bars, not the v2 hub.

## How to work here
- Read `AGENTS.md` (project rules, Next 16 notes, commands) and `docs/design/BRIEF.md`.
- Parallel dev servers reuse distDir names already listed in `tsconfig.json`: a1 a2 b1 b2 c d lead qa tk nl.
- Verify with `scripts/shot.mjs` (1440/390, `--light`, `--full`), `pnpm typecheck` and `pnpm check:api`. Run `pnpm build` before the report.
- Report in the user's format (`~/.agents/AGENTS.md`). Every subagent runs on Opus.
