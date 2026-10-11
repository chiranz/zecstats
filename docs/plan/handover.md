# Handover: end of iteration 3, deployed (11 Oct 2026)

## State
- Next.js 16 app at the repo root, on `main`, small per-area commits. Private repo https://github.com/chiranz/zecstats;
  Vercel project `zecstats` (scope chiranz) deploys `main` to https://zecstats.vercel.app. `NEXT_PUBLIC_SITE_URL` is
  set to that URL (production + preview), which makes the deploy noindex; only https://zecstats.com is indexable.
- Last checks (end of iteration 3):
  - `pnpm build` → 100 pages. 13 routes are dynamic: /api, /compare, /amount-suggest, /privacy-suggestions.json, and the
    report/tool pages that read their URL params on the server (activity, btc-bull-run, btc-migration, metrics,
    shield-hops, swaps, tx-sizes, wallet-apps, world-usage).
  - `pnpm typecheck` clean · `pnpm check:api` → 75 typed reads in 26 modules match.
  - `scripts/shot.mjs` → 31 pages dark + light and 58 charts dark, all 200 at 1440 and 390, no overflow, no console errors.
- Design canvas: https://claude.ai/artifact/14NxTBtnDk6j4hyhMxHzqd, **version 16**; `docs/design/artboards/` mirrors it.
  Iteration 3 row: `Nav-D-states*.dc.html` (navigation D, every state + tape hover card), `Ticker-compact.dc.html`,
  `OG-cards.dc.html` (link-preview cards).
- Also built: search/sharing metadata (`lib/seo.ts`: titles, canonical, OG/Twitter, sitemap, robots, manifest, share
  cards via next/og, JSON-LD); README (owner-facing "Use your backend"); `docs/api/endpoints.md` (every live API route).
- Iteration 3 built: navigation D site-wide (status pill, context bar, answer-first headers, 7-group Tools menu with
  Privacy first); event-tape hover card (switch `TAPE_TOOLTIPS` in `components/ticker/Marquee.tsx`); compact tape
  wording (symbol · value · change; window in the card); parity gaps 1, 2, 4 (`?date=`), 5–11, 13, 14.

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
- **Navigation:** direction D, "answer first" (artboards `Nav-D-answer-first*.dc.html`, states in `Nav-D-states*.dc.html`). Built.
  - One context bar holds the crumb and the section's pages, with Ironwood marked in Privacy.
  - Chart pages get a group switcher and prev/next.
  - The page header is the H1 plus a one-sentence answer (a key figure on chart pages).
  - Node status appears once, as a pill in the global bar.
- **Event tape (iteration 3):** per-item hover card instead of hold-on-hover (revert: `TAPE_TOOLTIPS = false` or commit 2851fed);
  tape reads like a ticker — TAG [qualifier] · value · ▲Δ · age; the full name and the delta's window live in the card
  and the "All" list (commit 3740705).
- **Standing rules:**
  - Make design calls yourself from AGENTS.md, BRIEF.md and the artboards, and record each one. Ask before pushing, publishing or deleting, or adding npm dependencies.
  - Small commits, made by the lead only. Subagents never run git; every subagent runs on Opus.
  - Design first: append new designs to the canvas as "Iteration 3" rows, never overwrite existing artboards, then build.
  - Show the snapshot's numbers, not BRIEF §7's. Transaction counts leave out coinbase.

## Pending, in suggested order
1. **Route loading state: option E "answer skeleton" (user's choice, 11 Oct 2026).** Not built yet.
   - Why: clicks to the 9 dynamic pages (and slow networks) show nothing until the server answers.
   - Options page the user chose from: https://claude.ai/artifact/K4wXs6Aqt16xnrpLaqcYR5 (A signal acquire, B meter,
     C terminal scan, D heartbeat, **E answer skeleton**).
   - E = the page's own shape in shimmering blocks + the small signal-bars logo (A's rising-bars loop, 150 ms stagger,
     1.2 s) beside the title + a 2 px green progress line on top. Reduced motion: no shimmer, bars static at full signal.
     `role="status"` with "Loading". Show immediately (it matches the layout, so no flash).
   - **User rule: the skeleton must look identical to the real page.** Build it from the pages' own layout classes
     (`.page`, `.mast`/`.h1`/`.lede`, `.card`/`.hero`, `.kpis`, the chart card classes in
     `components/chart-page/chart-page.module.css`, `app/page.module.css` for the dashboard), with shimmer bars in place of
     text, so spacing can't drift. Reference screenshots of the real pages (1440 + 390):
     `docs/design/refs/skeleton/*.png` (dashboard, chart page, privacy hub, report page, news, charts index, tools).
   - Plan: one `app/loading.tsx` rendering a client `RouteSkeleton` that picks a shape from `usePathname()` (the URL is
     already the destination while the fallback shows): `/` dashboard · `/chart/*` chart page (header + key figure, chart
     card with actions, range seg, legend chips, plot, caption) · `/news` feed + right rail · `/charts` filter band + rail +
     rows · default: header + hero + KPI band. Layout chrome (top bar, tape, context bar) stays; only `<main>` swaps.
   - Design first: add an Iteration 3 canvas board for it (skeleton next to the real page for each shape), then build,
     then compare screenshots of skeleton vs page at 1440/390 dark+light, then deploy (push to `main`).
2. **Backend integration kit** for the site owner (env vars, strict live mode, upstream auth headers, route map,
   `check:api --live`, per-endpoint source badge, docs). See the iteration-3 report; not started.
3. **Remaining parity:** gap 3 (calculator's 16 assets — needs `dca?assets=` variants), gap 4 rest (`?v=` views, any
   comparison periods, PNG, Group column, reorder, Reset, Correlate), gap 12 (per-chart unit/roll/grain toggles), gap 15
   (missing blocks: /network weekly nodes, exchange map, world-usage map + awake curve, donate QR, og:image, sitemap/robots).
4. **Capture non-default API variants** through the user's browser (shield-hops classes/repeat, tx-sizes classes and ranges,
   swaps windows/groupings, world-usage periods, activity daily/monthly, btc-migration 90D/ALL and <0.1 BTC). The
   controls exist and are disabled with a status line until then; in live mode they already query upstream.
5. **Chart permalinks paint the default range first** (chart route is static); consider reading searchParams server-side.
6. **Fresh-agent code review** of iteration 3 (user rule: a different agent; read the test diff first). No tests yet.
7. **Housekeeping:** `components/privacy-tools/HopsReport.tsx` is now unused (user asked before deleting); re-export
   canvas renders; brand-mark glow; nav lab artboards show the old Privacy hub; some Metrics-board sparklines are drawn.
   `app/metrics/asOf.ts` duplicates `getMetricsTable` rules for an earlier day — keep in sync.

## How to work here
- Read `AGENTS.md` (project rules, Next 16 notes, commands) and `docs/design/BRIEF.md`.
- Parallel dev servers reuse distDir names already listed in `tsconfig.json`: a1 a2 b1 b2 c d lead qa tk nl.
- Verify with:
  - `scripts/shot.mjs` (1440/390, `--light`, `--full`)
  - `pnpm typecheck`
  - `pnpm check:api`
  - `pnpm build`, before reporting
- Report in the user's format (`~/.agents/AGENTS.md`).
