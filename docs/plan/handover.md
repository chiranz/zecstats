# Handover: iteration 3 + route loading state, deployed (11 Oct 2026)

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
- Design canvas: https://claude.ai/artifact/14NxTBtnDk6j4hyhMxHzqd, **version 18**; `docs/design/artboards/` mirrors it.
  Iteration 3 row: `Nav-D-states*.dc.html` (navigation D, every state + tape hover card), `Ticker-compact.dc.html`,
  `OG-cards.dc.html` (link-preview cards), `Loading-skeleton.dc.html` (route loading state).
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

## Route loading state (built, 11 Oct 2026)
- Option E "answer skeleton": `app/loading.tsx` → `components/skeleton/RouteSkeleton.tsx` (+ `skeleton.module.css`).
  The shape comes from `usePathname()` (`shapeFor`): dashboard `/` · chart `/chart/*` · news · charts index · report
  (tx-sizes, swaps, wallet-apps, world-usage, btc-migration, shield-hops) · activity · metrics · btc-bull-run · compare ·
  default (every static page without its own shape: header + answer hero + KPI band + first chart section).
- Page → shape: `components/skeleton/shape.ts` (one place; the compare script asks `/design/loading?path=`).
- Built from the pages' own classes and CSS modules; each text line is a `T` bar (real font and wrap, invisible filler of
  the real length, masked to letter height); plots follow TimeSeriesChart's narrow rule via a container query. Titles drop
  two characters for the signal mark (1.2em = two mono characters). No real `h1`–`h3` in the skeleton (no filler
  headings in streamed HTML). One shimmer for the whole page (fixed background), a 2 px progress line on the window's top edge (grows from the
  left to 85% over ~10 s, ease-out; user's pick on 11 Oct over "no line", "border glint" and "nav underline"),
  one polite "Loading" status, everything else `aria-hidden`; reduced motion stops all movement.
- Preview a shape alone: `/design/loading?shape=chart` or `?path=/chart/pools` (noindex). Compare with the real page, same chrome:
  `node scripts/skeleton-compare.mjs <base> <outDir> [/route …] [--light] [--widths=…]` (real device windows:
  390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080). 
- When copy or layout of a page changes, re-run the compare for that route; filler strings live in RouteSkeleton.tsx.
- Canvas v18: board `Loading-skeleton.dc.html` (anatomy running live + page vs skeleton at laptop, tablet, phone).
- References: `docs/design/refs/skeleton/*.png` (first screen, 390/768/1024/1280/1440/1920, dark) are local only, not in
  git (gitignored). Regenerate: `node scripts/shot.mjs <base> docs/design/refs/skeleton / /chart/pools /news /charts
  /privacy /tx-sizes /tools --widths=390,768,1024,1280,1440,1920` (add `--full` for whole pages).

## Pending, in suggested order
1. ~~Route loading state~~ built (above). Possible follow-ups: per-page shapes for static pages (they rarely show a
   loader: prefetched), or real title text instead of a bar where the title is known (Next's docs suggest it).
2. **Backend integration kit** for the site owner (env vars, strict live mode, upstream auth headers, route map,
   `check:api --live`, per-endpoint source badge, docs). See the iteration-3 report; not started.
   - **Syncing from zecstats.com with Vercel Cron (researched 11 Oct):** blocked until the owner allows it. Every
     server-side request (API and home page) gets `403 cf-mitigated: challenge`, and robots.txt disallows `/api/`; do not
     work around the challenge. With the owner's OK (a Cloudflare WAF skip rule on a secret header, or an unproxied API
     origin): set `ZECSTATS_DATA_SOURCE=live` plus the header and pages refresh on their own (60 s cache); a daily cron
     (Hobby allows once a day, ±59 min; Pro per minute) is only needed to keep a fallback copy, e.g. `/api/cron/sync`
     guarded by `CRON_SECRET`, writing to Vercel Blob (the deployed file system is read-only) or calling a Deploy Hook.
3. **Remaining parity:** gap 3 (calculator's 16 assets — needs `dca?assets=` variants), gap 4 rest (`?v=` views, any
   comparison periods, PNG, Group column, reorder, Reset, Correlate), gap 12 (per-chart unit/roll/grain toggles), gap 15
   (missing blocks: /network weekly nodes, exchange map, world-usage map + awake curve, donate QR, og:image, sitemap/robots).
4. **Capture non-default API variants** through the user's browser (shield-hops classes/repeat, tx-sizes classes and ranges,
   swaps windows/groupings, world-usage periods, activity daily/monthly, btc-migration 90D/ALL and <0.1 BTC). The
   controls exist and are disabled with a status line until then; in live mode they already query upstream.
5. **Chart permalinks paint the default range first** (chart route is static); consider reading searchParams server-side.
   Related: every page is server-rendered, but TimeSeriesChart draws at a 900 px width on the server and redraws at the
   card's width after load (a small redraw on phones). User asked about server rendering on 11 Oct; not changed yet.
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
