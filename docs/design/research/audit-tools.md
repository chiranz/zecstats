# ZECStats UI/UX Audit: Tools group (14 pages)

Audited live on https://zecstats.com, 2026-10-11, desktop viewport 1512x771 (dark theme). Read-only: no forms were submitted (so the Amount Lookup results state was **not** observed) and no Donate/Copy controls were clicked.
Screenshots: `scratchpad/shots/<page-slug>-<n>*.jpg` (58 files, listed at the end).

---

## 0. Shared chrome (on every page)

**Top nav, row 1:** `← ZEC Stats` (wordmark link, off-palette lavender `#9e9eff`, **13.12px on /tools but 15.2px on /metrics**) · `Tools & Charts` · `Metrics` · `Calculator` (goes to /savings) · `News` · `More ▾` · `LIGHT` (theme toggle, 9.6px text).
- `More ▾` is a `div`, not a button. Hovering does nothing; clicking opens a flat list of 16 items with no grouping: Dashboard, Compare, Bull Run, Swaps, Wallet Apps, Exchanges, Network Nodes, Node Status, Usage Map, Privacy Tips, Halving, Founders' Reward, Ironwood, What If, Pool P&L, Donate.
- When the current page is in that menu, the `More` label **is replaced by the page name** (for example "Compare ▾", "Bull Run ▾", "Swaps ▾"). The trigger changes its label from page to page, so users lose the "More" landmark.
- **/amount-suggest, /correlate and /signals are in no menu.** They can only be reached from the /tools grid, the search box or the /metrics "Correlate" button.

**Row 2:** a `ZECSTATS` badge, then the banner "**Feeling Generous?** — Help ZECStats pay server bills and provide a free service". It sits on every page, directly above the H1. On the right is a global search box, "Search charts and tools…".
- **Bug:** typing "shield" opened a dropdown that stayed on "Searching…" for more than 6 seconds and never returned results (`tools-5-search-stuck.jpg`).

**Page header pattern:** breadcrumb `Tools & Charts › <name>` → H1 (Orbitron is **not** used here; the H1 is JetBrains Mono, 24px, #00ff66) → a lead paragraph in `subtext1` #9bdcab at 13.1px → often an amber or green callout box.

**Page footer pattern:** `READ THIS NEXT` (3 chart links) → a centred dim line, "Zcash network data computed from a full node we run — not copied from an exchange API. How these numbers are produced." → "by @jeremiahrogers · Follow @zecstats_ on X · Donate 💚" (11.2px, dim).

**Background:** a full-page scanline overlay (a repeating-linear-gradient of green at 3.5% opacity).

**Measured contrast** (WCAG ratios; the colour tokens are fine, the problems come from size and the effects layered on top):

| Token | on bg #050a06 | on card #0a120c | Note |
|---|---|---|---|
| text #c6f9d0 | 16.97 | 16.17 | ok |
| dim #7cc88d | 9.98 | 9.51 | ok as colour; used at 9.6–11px, which is the real problem |
| accent #00ff66 | 14.72 | 14.03 | ok, but glow and full saturation tire the eye over large areas |
| overlay0 #4f8a63 | 4.89 | 4.66 | borderline for small text |
| red #ff3b4e | 5.69 | 5.42 | ok |
| status-banned #da3633 | 4.33 | 4.12 | **below 4.5** for badge text |
| border #266542 | 2.87 | 2.74 | **below 3:1** non-text contrast for input and card edges (WCAG 1.4.11) |

Smallest type seen: tags and badges 9.6px (news tags, theme toggle), card descriptions 10.88px, footer 11.2px.

---

## 1. /tools — "Zcash Tools & Charts"
- **Purpose:** "What analysis tools and charts exist here, and can I trust the numbers?" The site index plus methodology.
- **Type:** directory / index (with a methodology article bolted on top).
- **Structure:**
  1. H1 "Zcash Tools & Charts" + lead "The analysis tools on this site, how the numbers behind them are produced, and a full index of every chart."
  2. H2 "How are these numbers produced?": 5 paragraphs, each opening with a bold sentence (Zebra full node; consensus-verified supply via chainSupply/valuePools; price from Coin Metrics + CoinGecko→Coinbase→Kraken; complete UTC days only; estimates labelled).
  3. H2 "Tools & Analysis": a grid of **24 cards** in 5 columns, each a title (12.8px) plus a dim one-line description (10.88px). Cards: Wall of Shame, Privacy Tips, Amount Lookup, World Usage Map, Exchanges, Compare Charts, Investment Calculator, What If, Signals, Metric Correlations, News, Founders' Reward, Orchard Turnstile Watch, ZEC 2026 vs BTC 2017, Shield-Bound Hop Sizes, Transparent Transaction Sizes, Bitcoin Moving into Zcash, Wallet Apps on NEAR Intents, Node Status, Network Nodes, Zcash Ironwood Pool, Cross-Chain Swaps, Halving, Metrics.
  4. H2 "Every chart (58 in all)": "Grouped by subject. Each opens its full-page view with a permalink." 9 categories, each with an H3 and a dim one-line description: Supply & Emission (8), Market & Valuation (12), Privacy Adoption (10), Usage & Activity (8), Holders & Coin Age (9), Mining & Security (2), Hyperliquid Derivatives (3), Exchange Volume (2), Access & Liquidity (4). Cards show the title only.
  5. Footer.
- **Controls:** none on the page apart from the global nav and search.
- **Charts:** none.
- **Issues:**
  - Hierarchy is inverted. A wall of methodology prose sits **above** the tool index the user came for. Methodology belongs at the bottom or on its own page; the footer already links to "How these numbers are produced".
  - 82 near-identical bordered boxes. Nothing groups the 24 tools by intent: privacy tools, market tools, network health, and calculators are mixed together (Halving next to Cross-Chain Swaps, News next to Founders' Reward). There are no icons, thumbnails or sparklines to help scanning.
  - Uneven description lengths give ragged card heights within a row (for example "Transparent Transaction Sizes" wraps to 4 lines).
  - Card descriptions are 10.88px dim text, which is hard to read at a distance.
  - The tool names on the cards do not match the page H1s or nav labels (see the naming table in section 15).
  - The global search, the obvious way into an 82-item index, appears broken (stuck on "Searching…").
  - The chart index has no in-page filter.
- Screens: `tools-1..6`.

## 2. /metrics — "Zcash Network Metrics"
- **Purpose:** "What are all the key Zcash numbers right now, and how have they changed over N days?"
- **Type:** data table / dashboard (configurable scorecard).
- **Structure:**
  1. Breadcrumb, H1, and a long lead (levels vs 7-day averages, click a name for its chart, click a header to sort, choices saved in the browser), then "As of 2026-10-10. All figures derive from the same daily_stats rollup…" (an internal table name exposed to users).
  2. Toolbar: `TIMEFRAMES` checkboxes 7D / **28D** / 3MO / 6MO / **12MO** (bold = on by default) · `Group` · `Sparklines` (on) · `Metrics ▾` · `⊞ Correlate` (solid neon) · `🔗 Copy link` · `⬇ Download PNG` · `⬇ Download CSV` · `Reset`.
  3. Caption "ZEC Metrics · as of 2026-10-10 · zecstats.com", then a table. Columns: METRIC (⠇ drag handle + name link) | NOW | 28D (2026-09-12) | 12MO (2025-10-10). Each period cell holds a sparkline, the old value, and ▲/▼ % in green or red.
  4. Default rows (24): ZEC Price $1,222 (28D $1,124 ▲8.7%, 12MO $233.10 ▲424%) · ZEC/BTC 0.01473 · Shielded Supply 4.97M ZEC · Transactions/Day 5,707 (▼36.1%) · Shielded Tx/Day 2,887 · Shielded Tx Share 50.48% · Net ZEC Flow (NEAR) −$13.52M · Net ZEC ← BTC Flow (NEAR) −$5.65M · Price/Tx/Market Cap/Volatility vs BTC @ issuance · New Transparent Addresses/Day 1,868 · BTC OI $3.18B · BTC Perp Funding 8.59% · BTC Perp Vol $2.07B · ZEC OI $562.33M · ZEC Funding 13.41% · ZEC Perp Vol $284.54M · ZEC−BTC Funding Spread 4.82% · MVRV 3.45× · Realized Price $353.79 · Total Fees/Day $2,208 · ZEC FDV % of BTC 1.47%.
  5. Footnote on coinbase-transaction exclusion, then the footer.
- **Controls and behaviour:**
  - Timeframe checkboxes add or remove columns.
  - `Group` adds a GROUP column of tags (MARKET / SHIELDED / ACTIVITY) but does not group the rows (`metrics-4-group.jpg`).
  - `Sparklines` toggles the mini charts.
  - `Metrics ▾` opens a panel with All / None and **43 checkboxes in an unsorted grid** (19 hidden by default, including Market Cap, Total Supply, the pool balances and Hashrate). While it is open, each row also gets a × remove button (`metrics-5-picker.jpg`).
  - Clicking a column header sorts the table. The header is a `div`, not a button, and the only sort indicator is a colour change.
  - Copy link puts the whole state into a huge URL-encoded JSON `?v=` string.
  - Reset restores the defaults.
- **Charts:** inline SVG sparklines (215 of them), with no axes and no tooltip on hover (only the row highlights).
- **Issues:**
  - **Sorting by NOW mixes units** ($, ×, %, ZEC), which makes the result meaningless (`metrics-6-sorted.jpg`). Sorting by % change would be useful but is not offered.
  - **Missing data is shown as "$0 —"** in the 12MO column for BTC/ZEC OI and perp volume. It reads as a real zero.
  - Market Cap, Total Supply and Hashrate are hidden by default while derivative spreads are shown. The default selection is odd for "every headline number".
  - A wide dead gap separates the metric name from NOW (NOW is right-aligned at about 560px). The table is hard to scan.
  - The `Group` toggle does not group anything.
  - There are 9 toolbar actions with equal visual weight.
  - The 9.6–10px header labels and date sub-labels are dim and small.
- Screens: `metrics-1..6`.

## 3. /savings — "Zcash Investment Calculator"
- **Purpose:** "If I had DCA'd $X into ZEC (vs BTC, ETH, SPY…) since date Y, what would it be worth?"
- **Type:** calculator (form → chart → results table).
- **Structure:**
  1. Breadcrumb "Investment Calculator", H1, lead (real daily closes; QQQ/SPY total-return).
  2. `⬇ Download PNG` and `⬇ Download CSV`, placed **above the form**, before any result exists.
  3. Form card: START DATE (native date input showing **29/10/2016**, locale DD/MM, while the rest of the site uses ISO) with presets 1Y / 5Y / 10Y / MAX (10Y equals Max; only the aria-label says so) · FREQUENCY select Daily / Weekly / **Monthly** / Quarterly · AMOUNT PER PURCHASE (USD) set to 100 · COMPARE chips (16): Zcash, Bitcoin, Ethereum, Solana, XRP, BNB, Dogecoin, Cardano, Tron, Litecoin, Monero, Dash, NEAR, QQQ, SPY, Gold. Zcash, Bitcoin and Gold are on by default; the SPY chip renders faded, as if disabled.
  4. Chart card "Dollar-Cost Averaging" with a `LINEAR | LOG` toggle. Subtitle: "$100.00 invested every month from 2016-10-29 through 2026-10-11 — 121 purchases, $12,100 total (based on ZEC's own purchase schedule)". The inline legend carries the results: **Zcash $241,962 (20.0x) · Bitcoin $140,337 (11.6x) · Gold $28,454 (2.4x) · Invested $12,100**.
  5. H2 "What did it return per year?": XIRR explanation paragraph, then a table with columns ASSET | SINCE INCEPTION | 5-YEAR | 1-YEAR | SELECTED (2016-10-29 → TODAY) | VALUE AT $100.00/MONTH. Rows: Zcash 56.6% / 156.6% / 556.0% / 56.6% / $241,962; Bitcoin 46.0 / 26.4 / 13.7; Gold 16.3 / 22.8 / −7.6.
  6. READ THIS NEXT (ZEC Price, Realized Price, Market Cap), then the footer.
- **Controls and behaviour:** chips toggle lines; Linear/Log switches the y-scale; the presets reset the date; changing the frequency or amount recalculates. The URL keeps `hidden=` and `scale=` but **not the date, frequency or amount**, so a result cannot be shared.
- **Chart:** multi-line SVG. x is years 2017–2026; y is $0–$400k (log: $100…$100k). The Invested line is dashed. A static annotation sits in the top-left corner: "1st Zcash buy: $100.00 at $1996.14/unit (2016-10-29, ~0.0501)". The unit "~0.0501" is unlabelled (it is ZEC). The tooltip is good: date, per-series values and a vertical crosshair (`savings-3-tooltip.jpg`).
- **Issues:**
  - **No result headline.** The answer ("$12,100 became $241,962, 20×") is buried in a 10px legend line. It should be a KPI hero.
  - **The compare chips are `span`s with no role or tabindex**, so they cannot be reached by keyboard.
  - Zcash (#00ff66) and Gold (pale green) are hard to tell apart. 16 categorical colours exceed what can be told apart on dark green.
  - The log axis on 1Y shows only one tick ($1k).
  - The phrase "based on ZEC's own purchase schedule" is unexplained jargon.
  - The page has three names: nav "Calculator", breadcrumb "Investment Calculator", URL "/savings".
  - Download buttons are `type=submit`.
- Screens: `savings-1..6`.

## 4. /news — "Zcash On-Chain News"
- **Purpose:** "What notable things just happened on the Zcash chain or market?"
- **Type:** article / feed (auto-generated event stream).
- **Structure:**
  1. Breadcrumb, H1, lead ("auto-generated, reverse-chronological… z-scores vs the 30-day norm… Tap any item to expand. Covers 5+ years.").
  2. Sticky filter chips: All · Price · ZEC/BTC · Hashrate · Shielded pool · Pool flows · Activity.
  3. Time-bucket headings: LAST HOUR / LAST 24 HOURS / THIS WEEK / THIS MONTH / THIS YEAR.
  4. A pinned live card: tag NETWORK + NOTABLE; "Now: ZEC $1,222.51 ▲ 0.9% (24h) · 29.3% of supply shielded · hashrate 31.61 GH/s · block 3,513,512."; a sparkline; methodology text; "Open chart →".
  5. Event cards, each with a coloured left border by category, a category tag (HASHRATE, FLOWS, RATIO, PRICE, SHIELDED, TX, NETWORK at 9.6px), a severity tag (NOTABLE / MAJOR), an optional σ badge ("+2.8σ"), and a time on the right ("1m ago", which changes to ISO dates after 30 days). Examples: "All-time high: 31.26 GH/s network hashrate…", "14,117 ZEC migrated Orchard → Ironwood today", "23,336 ZEC deshielded today (+5.0σ)".
  6. "Load more", which turns into infinite scroll ("Loading…"), then READ THIS NEXT and the footer.
- **Controls:** the chips filter the feed and scroll to the top (the filter is not kept in the URL). Clicking a card expands it to show detail text and "Open chart →".
- **Charts:** a single sparkline in the live card.
- **Issues:**
  - The chips and cards are `span`/`div` elements with no button role, so they cannot be used from the keyboard.
  - Cards have **no expand affordance** (no chevron), and the "Tap…" copy assumes a touch device.
  - **The numbers contradict each other at a glance:** "Now: hashrate 31.61 GH/s" vs "jumps to 32.23 GH/s" (1m ago) vs "All-time high: 31.26 GH/s" (13h ago). They use different averaging windows, and nothing says so.
  - Repetitive near-duplicate items appear the same day (ZEC ▼10.7% and ZEC/BTC ▼8.9%).
  - The feed is a 720px column, left-aligned in a 1512px viewport, which leaves the right half empty.
  - Infinite scroll makes the footer and READ THIS NEXT hard to reach.
- Screens: `news-1..4`.

## 5. /compare — "Compare Zcash Charts"
- **Purpose:** "How did metric A and metric B move over the same period?"
- **Type:** comparison dashboard (user-assembled stacked charts).
- **Structure:**
  1. Breadcrumb "Compare Charts", H1, lead (shared range, drag to reorder, state kept in the URL).
  2. An input, "Search charts to add...", whose typeahead lists matching chart titles.
  3. Empty state: one dim centred line, "Search above to add charts for side-by-side comparison."
  4. RANGE card: from-date · dual range slider · to-date (locale DD/MM) · presets 1M / **3M** / 6M / 9M / 1Y / 5Y / YTD / ALL · `ANNOTATIONS` toggle · `⬇ Download all as PNG`.
  5. Chart cards, stacked one per row, each with a title link ("ZEC PRICE (USD)" underlined in lavender), a tiny dim "open" link, a × close button, and series toggle pills (price / 50 WMA / 200 WMA; transparent / sprout / sapling / orchard / ironwood).
  6. READ THIS NEXT, then the footer.
- **Controls:** search and add; × removes a chart; the range presets, slider and dates drive every chart; the series pills toggle lines. The URL is `?from&to&charts=price,pools` (good).
- **Charts:**
  - Price: a yellow line plus blue and red dashed WMAs, peak and trough data labels with dates, tiled "zecstats.com" watermarks inside the plot, and x labels rotated 45°.
  - Pools: a stacked area chart (transparent dark green, sprout pink, sapling blue, orchard teal, ironwood purple), y 0–15M.
  - The tooltip shows the date and values with a crosshair, **but the crosshair is not synced across charts**, which is the whole point of the page.
- **Issues:**
  - **Bug:** the 50 and 200 WMA values ($501 and $217 in the tooltip) fall below the y-axis minimum, so the red 200 WMA line is drawn **under the x-axis labels, outside the plot area** (`compare-4-tooltip.jpg`).
  - **Bug or inconsistency:** the price chart's x-axis ends Oct 11 but the pools chart's ends Oct 07. The copy promises "the same stretch of time".
  - "Shielded Pool Balances" stacks the *transparent* pool, which dominates the area.
  - The empty state has no presets ("Price vs shielded supply", "Price vs tx/day").
  - The typeahead covers the empty-state text.
  - Peak and trough labels plus watermarks clutter the plot.
  - The price line is yellow here but green elsewhere: the colour for a metric is not consistent across pages.
  - When this page is active, the nav label becomes "Compare ▾".
- Screens: `compare-1..5`.

## 6. /btc-bull-run — "ZEC 2026 vs BTC 2017"
- **Purpose:** "Is Zcash's current run tracking Bitcoin's 2017 run, day for day?"
- **Type:** comparison dashboard (single-story analysis: hero → KPIs → charts → table → caveats).
- **Structure:**
  1. Breadcrumb and H1 "ZEC 2026 vs BTC 2017", lead paragraph, and an amber callout: "Built because people asked for it, not because the comparison means anything…".
  2. Hero card: "DAY 46 OF ZCASH'S RUN" / **"$1,223 · 1.50× its $800"** / "On its own day 46, Bitcoin was at $1,189 — 1.47×. Zcash is running +2% hotter."
  3. Strip: ALIGNED AT $500 / **$800** / $1,000 · "ZEC day 0 = 2026-08-26 ($817) · BTC day 0 = 2017-01-12 ($810)" · ⬇ Download PNG.
  4. Five KPI tiles: ZCASH TODAY $1,223 · BITCOIN, DAY 46 $1,189 · RELATIVE PACE 1.02× · BITCOIN'S PEAK $19,345 (day 338, 2017-12-16, 24×) · AND THEN $3,233 (day 702, −83% from the peak).
  5. Chart card "How do the two runs line up day for day?": explanatory paragraph, legend (Zcash 2026 green, Bitcoin 2017 orange), SCALE Linear / Log, DAYS 60 / 90 / 180 / 365 / **FULL CYCLE**.
  6. Chart card "Pace: Zcash ÷ Bitcoin" with an explanatory paragraph.
  7. Table "Where was Bitcoin day by day?" with columns DAY | BITCOIN 2017 | × ANCHOR | ZCASH 2026 | × ANCHOR. Rows: day 0, 30, **46 — Zcash is here** (highlighted), 60, 90, 180, 270, 338 — Bitcoin's peak. Future ZEC cells show "—", with a footnote.
  8. Amber callout "READ THIS BEFORE YOU READ THE CHART" (4 bold-lead paragraphs), then a "▸ Method" disclosure, READ THIS NEXT and the footer.
- **Controls:** the anchor ($500 / $800 / $1,000) re-aligns everything; Linear/Log; the day-window buttons. **None of these is kept in the URL.**
- **Charts:**
  - Main: a line chart with x day 0…718 and y $0–$20k. A dotted line marks the $800 anchor, the peak and bottom are labelled, and the lines carry end labels (BTC/ZEC). Tooltip example: "Day 186 / BTC: $2,233 (2.76×) · 2017-07-17".
  - Pace: a line from 1.00× to 1.60× with a "same pace" reference line.
- **Issues:**
  - **The default "Full cycle" view squashes ZEC's 46 days into the bottom-left corner**, so the subject of the page is invisible on load (`btc-bull-run-2`). The 60-day view is readable (`btc-bull-run-5`), but there the y-axis starts at $0, which wastes about 40% of the chart.
  - The pace chart shares the 0–718 x-axis, so about 94% of it is empty.
  - The hero and the KPI tiles repeat the same numbers.
  - The "sample of one" disclaimer appears 3 times.
  - **Copy mismatch:** the lead says "84% fall", while the tile and the caveat say 83%.
  - The "Read this before you read the chart" box sits **after** the chart.
- Screens: `btc-bull-run-1..5`.

## 7. /swaps — "Zcash Cross-Chain Swaps"
- **Purpose:** "How central is ZEC in the NEAR Intents swap network, and what flows in and out?"
- **Type:** comparison dashboard (network graph plus ranking table).
- **Structure:**
  1. Breadcrumb "Cross-Chain Swaps", H1, a lead explaining PageRank with an inline "JSON" link.
  2. Headline sentence: "Zcash ranks **#3** of 41 assets by PageRank centrality — 30 day(s) of swaps (2026-09-12 → 2026-10-11). Relative to its market cap, Zcash is **21.17× over-weighted**…"
  3. Controls: `window:` 7d / 14d / **30d** · `group by:` **Asset** / Token / Chain · ⬇ Download PNG.
  4. Ops status line: "Backfill 30 / 30 days (100%) · 113,000 rows filled · $1.32B volume · complete", with a progress bar.
  5. Force-directed network graph.
  6. A note: "PageRank vs raw volume: rank correlation ρ = 0.98. They agree almost perfectly — here PageRank adds little beyond ranking by volume."
  7. An untitled table with columns # ▲ | VOL # | ASSET | PAGERANK | VOLUME | NET FLOW | MARKET CAP | VOL/MCAP | SWAPS. Top rows: USD 30.17% $607.8M; btc 14.90% $340.6M; **zec 12.48% $277.5M −$9.7M $20.75B 21.17× over** (highlighted); eth; sol; near… It shows 30 of 41 assets.
  8. READ THIS NEXT, then the footer.
- **Controls:** the window and group-by buttons update the graph, table and headline (Chain gives "#4 of 39 chains… 13.29×"). The URL is `?days=30&gran=asset` (good).
- **Charts:** an SVG force graph. Node size is PageRank and colour is green intensity, with zec in yellow. There is **no legend, no tooltip and no zoom**, and the simulation never settles, so nodes keep drifting under the cursor. About 8 nodes are unlabelled, and labels are raw tickers ("hot:143", "hot:1100", "token").
- **Issues:**
  - The page's own note says the headline method adds nothing over volume, which undercuts the visual.
  - Backend backfill telemetry is exposed to users.
  - The "# ▲ / VOL #" headers are cryptic.
  - "$1665.53B" should be "$1.67T".
  - "—" appears for missing market caps, with no explanation.
  - There is no "show all 41" option.
  - Edges form a hairball, and colour encodes nothing beyond size.
- Screens: `swaps-1..5`.

## 8. /wallet-apps — "Zcash Wallet Apps on NEAR Intents"
- **Purpose:** "Which wallets and apps route ZEC swaps through NEAR Intents, and who leads?"
- **Type:** data table / leaderboard plus a time-series chart.
- **Structure:**
  1. Breadcrumb "Wallet Apps on NEAR Intents", H1, lead.
  2. Status box: "History complete: all 255,630 ZEC swaps since 30 March 2025, kept up to date every 10 minutes."
  3. Range: Today / **7 days** / 30 days / 90 days / All time (large pill buttons) · ⬇ Download PNG.
  4. Summary: "$59M in 5,923 swaps over the last 7 days."
  5. Table with columns # | APP | VOLUME | SHARE (inline bar) | SWAPS | INTO ZEC | OUT OF ZEC | CODE / FEE ACCOUNT, 25 rows. Examples: 1 Zodl (Zashi) $20M 34.3%; 2 near-intents.org $15M 26.0%; 3 THORSwap (SwapKit) $6.5M; "unlabeled e61f96621f…"; "e1a72603-64b3-4be1-8265-8bae5970d396"; "No referral".
  6. H2 "How has each app's volume moved?": Daily / **Weekly** / Monthly / Quarterly · **Dollars** / Share · ⬇ PNG, then the stacked bar chart and a footnote.
  7. H2 "Which app led each week?": table with columns PERIOD | LEADER | SHARE | SECOND | SHARE | TOTAL, covering 12 weeks.
  8. Source paragraph, READ THIS NEXT, footer.
- **Controls:** the range buttons drive the leaderboard; the rollup and Dollars/Share buttons drive the chart. The two sets are **independent, and nothing tells the user so**. The range is not kept in the URL.
- **Chart:** a stacked bar chart, y $0–$150M or 0–100%, x Mar '25 to Oct '26, with 9 series in the legend (Zodl green, near-intents.intents-referral.near cyan, new.intents-referral.near orange, solswap purple, THORSwap yellow, Trust Wallet pink, Ledger teal, near-intents.org blue, Other grey-green). No hover tooltip was observed.
- **Issues:**
  - Cyan, teal and blue series are hard to tell apart.
  - The legend lists apps that do not appear in the current 7-day table (new.intents-referral.near).
  - In Share mode, March–September 2025 shows 100% grey "Other" bars when volume is near zero, which is visual noise.
  - Raw IDs and hashes appear as app names; truncated "…" accounts have no tooltip.
  - Known apps are randomly bold green (Zodl, Vizor).
  - This page's range-button style (large pills) differs from /swaps (small 7d/14d/30d) and /compare (1M…ALL).
  - The H2s here are about 22px, versus 16px on /tools.
- Screens: `wallet-apps-1..4`.

## 9. /exchange-support — "Zcash Exchanges"
- **Purpose:** "Can people in my country buy ZEC on a regulated exchange?"
- **Type:** directory / data table (choropleth map plus a searchable country table).
- **Structure:**
  1. Breadcrumb and H1 "Zcash Exchanges" (the `<title>` is "Where to Buy ZEC, by Country"). Lead: hand-maintained, "not gospel — JSON", plus a link "where ZEC is actually used, by timezone →".
  2. Status box: "Last verified 2026-09-09 (31 days ago). Next update due within 31 days."
  3. Three KPI tiles: **63%** of world population can access ZEC via a regulated exchange · **42** exchanges tracked · **45%** of them list ZEC (19/42).
  4. Legend open (green) / partial (amber) / banned (red) / not assessed (grey), plus ⬇ PNG and ⬇ CSV.
  5. World choropleth map.
  6. A "Find a country…" input, then the table "Showing the 25 largest by population" with columns COUNTRY | ZEC ACCESS (badge) | EXCHANGES (count) | POP (M) | NOTE. For example: India open 13 1430 "taxed but legal; CoinDCX and WazirX list ZEC/INR…"; China banned 0; United States open 13 "Coinbase, Kraken, Gemini list ZEC".
  7. A "Show all 176 countries" button, READ THIS NEXT, footer.
- **Controls:** the filter does a substring match ("ca" → "11 of 176 countries", including South Africa); Show all expands the table. The map tooltip reads "Colombia — open / 11 ZEC exchanges: Coinbase, Kraken, Binance, … Bitfinex… / pop 52M" (truncated).
- **Issues:**
  - **Red/green choropleth.** Users with colour-vision deficiency cannot tell open from banned. The /correlate page deliberately avoids this; this page does not.
  - **There is no list of the 42 exchanges** on a page titled "Exchanges" whose tools card says "which exchanges list ZEC". The table shows only a count per country.
  - Antarctica renders as a large grey "not assessed" block that dominates the bottom of the map.
  - The staleness copy reads oddly: verified 31 days ago, next update "within 31 days".
  - The banned badge red #da3633 gives 4.3:1 contrast.
  - Population "0" for New Caledonia (should be shown as "<1").
- Screens: `exchange-support-1..4`.

## 10. /what-if — "What if Zcash took a share of gold?"
- **Purpose:** "What would one ZEC be worth if Zcash captured X% of gold, BTC, equities or offshore wealth?"
- **Type:** calculator (but static: there are **no inputs**).
- **Structure:**
  1. Breadcrumb "What If". The H1 mentions gold only, but the table covers four assets.
  2. Lead, then a box: "One ZEC today **$1,223.27**".
  3. Table with columns IF ZCASH REACHED | TOTAL SIZE | 1% OF IT | 2% | 5% | 10%. Rows: Bitcoin $1.7T → $793.21 / $1,586.42 / $3,966.06 / $7,932.12; Offshore wealth $12.0T → $5,714.29 … $57,142.86; Gold $20.0T → $9,523.81 … $95,238.10; World stock market $120.0T → $57,142.86 … $571,428.57.
  4. Explanatory paragraphs (divided by 21,000,000 ZEC, not the 16,979,499 mined so far; "This is division, and nothing else.").
  5. H2 "Where do these numbers come from?": a definition list. Each entry has a name and size, a green source line (for example "Computed here, today: $82,902.00 per BTC × 20.1M coins issued"; "World Gold Council… as of 2026-06") and a description.
  6. Note "last reviewed 2026-09-17", READ THIS NEXT, footer.
- **Controls:** none. The row names are underlined anchor links to the sources section.
- **Issues:**
  - The "tool" has no inputs: no custom %, no asset picker, no choice between circulating and max supply.
  - Cells are not compared with today's price. The 1% of BTC figure ($793) is *below* today's $1,223, and nothing flags it; there is no "× today" multiple.
  - Values to the cent ($571,428.57) give false precision.
  - The H1 says gold, but gold is the third of four rows.
- Screens: `what-if-1..2`.

## 11. /amount-suggest — "Zcash Amount Lookup"
- **Purpose:** "If I shield or deshield amount X, how common is that amount, so I blend in?"
- **Type:** form / lookup tool.
- **Structure:**
  1. Breadcrumb "Amount Lookup", H1, lead (with an inline amber `MATCHED` badge and lavender underlined links to Wall of Shame and Privacy Suggestions).
  2. Amber "Heads up:" privacy and legal callout, which is visually larger than the tool itself.
  3. Form: number input (placeholder "amount in ZEC", **no visible label**), select shield (t→z) / deshield (z→t), and a solid neon `Check` button.
  4. READ THIS NEXT, footer.
  The page is 771px tall, so everything fits on one screen with lots of empty space.
- **Controls:** the form posts the query. **I did not submit it**, so the results UI was not audited.
- **Issues:**
  - The empty state offers no example amounts, no preview of popular amounts and no picture of the output.
  - The page is in no menu.
  - It has four names: slug "amount-suggest", title "How Often a ZEC Amount Is Sent", H1 "Amount Lookup", and links to "Privacy Suggestions" vs nav "Privacy Tips".
  - The input relies on its placeholder as the label.
  - The links use an off-palette lavender.
- Screens: `amount-suggest-1`.

## 12. /correlate — "Zcash Metric Correlations"
- **Purpose:** "Which Zcash metrics move together, or opposite?"
- **Type:** comparison dashboard (correlation matrix plus a scatter drill-down).
- **Structure:**
  1. Breadcrumb and H1, then a lead: green = together, purple = opposite, the number is r² from 0 to 1, click a cell for a scatter.
  2. A "▸How to read it in more detail" disclosure (not a `<details>` element). It explains that the row is the Y variable, describes the ZEC Price +30d/+90d shifted metrics, notes that purple is used instead of red for colour-vision deficiency, explains the numbered columns, edit mode (tick / × / drag), and that selections are saved to a cookie and the URL.
  3. WINDOW card: 3M / 6M / 1Y / 2Y / 5Y / **ALL** · dual slider · date → date (DD/MM).
  4. `Metrics ▾` (picker with All / None / Defaults and about 40 checkboxes) · `⬇ Download PNG` (**solid neon**, unlike other pages) · `⬇ Download CSV`.
  5. Legend gradient: −1 (opposite) · 0 · +1 (together).
  6. An 8×8 matrix. Rows are numbered and named (1 Shielded Tx Share, 2 Transactions /d, 3 ZEC Price, 4 Orchard Actions /d, 5 Sapling Outputs /d, 6 Shielded % of Supply, 7 Shielded Supply, 8 Total Supply); columns show **only the numbers 1–8**. Diagonal cells hold mini time-series. Other cells show r² (".00"–".98") over a mini scatter, with a green or purple tint.
  7. READ THIS NEXT, footer.
- **Controls:** the window changes the matrix; Metrics adds or removes rows; clicking a cell opens a modal scatter (`correlate-3`) titled "Shielded Supply vs Shielded % of Supply", subtitled "2016-10-28 → 2026-10-10 · n=3635 · r=0.988 · r²=0.975", with labelled axes and a dashed fit line. × and Esc both close it.
- **Issues:**
  - The full symmetric matrix shows every value twice.
  - Column headers are only numbers, so users have to cross-reference rows.
  - r² drops the sign, which only the colour carries. Readers with colour-vision deficiency lose that information.
  - Most values are .00–.19, so the grid is mostly dark with little to see.
  - The matrix takes about half the width and leaves the right half empty.
  - The Download PNG button style differs from other pages.
  - The page is in no menu.
- Screens: `correlate-1..4`.

## 13. /signals — "Zcash signals: when has the model changed its mind?"
- **Purpose:** "What has the site's allocation model said, and would following it have paid?"
- **Type:** article / feed (track record), combining a KPI dashboard and a log table.
- **Structure:**
  1. Breadcrumb "Signals", a long H1, and a 2-paragraph lead (a paid private Telegram channel; this page is the free part).
  2. A 2×2 grid of feature cards: "A message when something changes" / "One summary a day" / "Every number can be checked" / "It is research, not advice". The tone is marketing.
  3. Callout: "**Not open yet.** The channel is being tested…"
  4. H2 "How following it would have done" ($10,000 on Jul 15, 0.1% fees). Three KPI tiles: FOLLOWING THE MESSAGES **+81.6%** ($18,155; max drawdown −19.3%) · HOLDING ZEC THROUGHOUT **+116.0%** ($21,601; −28.5%) · WHAT THE TIMING WAS WORTH **+5.0 pts** (vs the average 69% share, +76.5%).
  5. A summary sentence: 24 messages, 23 changes, $91 in fees, 8 helped and 15 hurt.
  6. Chart, then the callout "Read this before trusting any of it" (4 bullets: 14 of the 24 calls are replayed; 90 days is a short record; fills; thresholds re-fit daily).
  7. H2 "Every call, and what it did": a table with columns WHEN (UTC) [with a sub-line "dry run · block 3,498,608" or "replayed · block …"] | CALL ("Neutral · CASH", "Bullish · SCALE IN" + ▸message) | SHARE OF ZEC ("16% → 0%") | ZEC THEN ("$1574.08") | NEXT 7 DAYS | NEXT 30 DAYS | EFFECT (+$669 green / −$125 red). It has 24 rows.
  8. A note that the research page needs a password, READ THIS NEXT, footer.
- **Controls:** only the "▸message" disclosures, which expand a monospace message box inside the CALL cell (`signals-5`).
- **Chart:** two panels. The top shows equity lines (solid green Following, dashed white Holding) on $0–$30k. The bottom is a stepped area of the ZEC share held (0–100%). A vertical dashed line is labelled "replayed | live", and the x-axis runs Aug–Oct. The legend sits **below** the chart, and there is no tooltip. A "$0" label floats between the two panels.
- **Issues:**
  - **All three KPIs are the same celebratory green**, although following the model *underperformed* holding by 34 points. "+5.0 pts" is the framed headline.
  - **The terms do not match:** the copy says calls from Sep 17 are "live", the table labels them "dry run", and the chart says "live".
  - "$1574.08" has no thousands separator, unlike the rest of the site.
  - The copy says "a handful of messages a month", but 10 messages went out between Sep 17 and Sep 28.
  - Expanding a message makes its row balloon, and the other cells float vertically centred.
  - The feature-card block reads as a sales page inside a stats tool.
  - The page is in no menu.
- Screens: `signals-1..5`.

## 14. /donate — "Support ZEC Stats"
- **Purpose:** "How do I support the site, and how much does it need?"
- **Type:** form-like conversion page (static: a QR code and an address).
- **Structure:**
  1. Breadcrumb "Tools & Charts › Donate" (an odd parent) and H1 "Support ZEC Stats".
  2. Lead: "costs about $300/month… ZEC equivalents at $1228.29/ZEC." There is no thousands separator, and the price differs from the $1,223 shown on other pages.
  3. Three tier cards: $300 ≈ 0.24 ZEC (1 MONTH) · $1,800 ≈ 1.47 ZEC (6 MONTHS) · $3,600 ≈ 2.93 ZEC (12 MONTHS).
  4. Address card: a QR code (with alt text) and the label "DONATION ADDRESS (UNIFIED)". The u1… address is shown at 11.8px in a box, with a solid neon `Copy address` button and the line "Scan the QR with any Zcash wallet…".
  5. Footer.
- **Controls:** Copy address (not clicked).
- **Issues:**
  - The **tier cards look like selectable options but are inert divs** (cursor: auto). Users will click them.
  - The page shows no progress toward the $300/month goal or any social proof.
  - The banner "Feeling Generous?" still appears on this page.
  - The tiny dense address is hard to verify by eye; chunking it into groups would help.
- Screens: `donate-1`.

---

## 15. Cross-page summary

### Recurring components (what to standardise)
1. **Page header:** breadcrumb, H1, a lead paragraph (always long, 3–6 lines), and an optional callout. The callout comes in amber (disclaimer), green (status) or neutral variants.
2. **Status or freshness strip:** "As of 2026-10-10", "Last verified…", "History complete…", "Backfill 30/30…". There are four different styles.
3. **Range selector:** small segmented (bull-run, swaps, correlate), large pills (wallet-apps), checkboxes (metrics), and a date + slider + presets combination (compare, correlate). There are five variants.
4. **Toolbar actions:** ⬇ Download PNG / CSV, 🔗 Copy link, Reset, Metrics ▾ picker. Placement varies (above the form, right-aligned, inline), and so does style (outline vs solid neon).
5. **KPI tiles:** used on bull-run, exchange-support, signals and donate. Their label, value and sub-line hierarchy differs, and positive, negative and neutral values all use the same green.
6. **Chart card:** a title, explanatory paragraph, legend, toggles, an SVG chart and a footnote. Tooltips exist on savings, compare, bull-run and correlate, but not on signals, wallet-apps, sparklines or the swaps graph.
7. **Data table:** dense, right-aligned numerics with green/red deltas and a highlighted "you are here" row. Sorting exists on /metrics and is implied by "# ▲" on /swaps.
8. **Filter chips:** /news, /savings. These are spans, not buttons.
9. **Disclosure ("▸ How to read", "▸ Method", "▸ message")**: implemented three ways, none as `<details>`.
10. **Methodology / sources block** and **READ THIS NEXT** (3 links) on every page.

### Recurring problems
- **Naming chaos.** One tool often has three or four names across the nav, tools card, breadcrumb, H1, `<title>` and slug:

| Slug | Nav | Card | H1 |
|---|---|---|---|
| /savings | Calculator | Investment Calculator | Zcash Investment Calculator |
| /amount-suggest | none | Amount Lookup | Zcash Amount Lookup |
| /btc-bull-run | Bull Run | ZEC 2026 vs BTC 2017 | ZEC 2026 vs BTC 2017 |
| /exchange-support | Exchanges | Exchanges | Zcash Exchanges (but it is a country list) |
| /what-if | What If | What If | What if Zcash took a share of gold? |

- **Navigation gaps.** /amount-suggest, /correlate and /signals are in no menu. "More" is an unordered list of 16 items and changes its own label. The global search did not return results.
- **Interactive elements that are not buttons:** chips (savings, news), news cards, the More trigger, sortable headers, disclosures. None is keyboard- or screen-reader-operable. Inert tier cards on /donate look clickable.
- **Inconsistent controls:** five range-selector styles; the Download button is outline on some pages and solid neon on others; buttons are `type=submit` outside any form; native date inputs show DD/MM while the site writes ISO everywhere else.
- **State not in the URL** on /savings (date, frequency, amount), /btc-bull-run, /news, /wallet-apps. It *is* in the URL on /compare, /swaps and /metrics, but /metrics uses huge JSON.
- **Answer buried.** Calculators and analyses lead with prose and disclaimers, while the result sits in a small legend (/savings) or a full-cycle chart that hides the subject (/btc-bull-run). Disclaimers repeat two or three times (bull-run, amount-suggest, signals, what-if).
- **Colour semantics.** Green means brand, positive, Zcash, "open", the primary button and simply "important", all at once. Red/green is used for country access. Series colours change between pages (ZEC price is yellow on /compare and green elsewhere). The categorical palettes (16 on /savings, 9 on /wallet-apps) have near-indistinguishable cyan, teal and blue.
- **Small and dim type.** 9.6–11px for tags, descriptions, axis labels and footers, made worse by the scanline overlay and glow. The tokens pass contrast, but the type sizes do not support comfortable reading. Card and input borders (#266542) are 2.87:1, below the 3:1 WCAG minimum for UI component edges.
- **Empty or missing values:** "$0 —" for no data (metrics), "—" with no tooltip (swaps market cap, bull-run future rows, signals NEXT 30 DAYS), pop "0" (exchange support), truncated IDs with "…" and no hover text.
- **Number formatting:** missing thousands separators ($1574.08, $1228.29, $1996.14), "$1665.53B" instead of $1.67T, cents on hypothetical prices.
- **Chart bugs:** WMA lines drawn outside the plot area, misaligned x-domains on /compare, an unsettled force graph on /swaps, an empty 94% of the pace chart.
- **Layout:** many pages use a narrow 720px text measure but full-width tables and charts, leaving big empty right halves (news, correlate, amount-suggest, donate). Spacing and H2 sizes vary (16px vs about 22px).
- **Internal and ops jargon exposed:** "daily_stats rollup", "Backfill… rows filled", "hot:1100", raw referral hashes, "dry run · block 3,498,608".

### Proposed reusable page templates for this group
1. **T1 Index / Directory** (/tools, part of /exchange-support): a header, then an in-page filter or search, then grouped card sections. Groups by user intent (Privacy, Market, Network, Calculators, Feeds). Cards carry an icon or sparkline, title and description. Methodology moves to the footer or its own page.
2. **T2 Calculator** (/savings, /what-if, /amount-suggest): header (one-line lead) → input panel (labelled fields, presets) → **result hero** (big answer plus KPI tiles) → chart card → detail table → collapsible "How this is calculated" → caveats. All inputs are kept in the URL. The empty state shows an example result.
3. **T3 Single-story analysis** (/btc-bull-run, /signals): a header with one compact disclaimer → hero KPI row (with semantic colours: better, worse, neutral) → primary chart with a default view that frames the subject → secondary chart → log or table → a single caveats-and-method disclosure.
4. **T4 Comparison / explorer dashboard** (/compare, /correlate, /swaps): a sticky control bar (one standard range component, plus a picker and export menu) → a canvas of chart cards with a synced crosshair and consistent per-metric colours → a drill-down modal → a ranking table. Useful presets fill the empty state.
5. **T5 Data table / scorecard** (/metrics, /wallet-apps, /exchange-support table): a toolbar (range, column and metric picker, export) → a sortable, accessible table with real `<th>` buttons, unit-aware sorting, explicit "no data" cells, sticky header and inline bars or sparklines with tooltips → an optional companion chart that shares the same range control.
6. **T6 Feed** (/news, the /signals call log): sticky filter chips (real toggle buttons, kept in the URL) → time-bucketed cards with expand chevrons → a "Load more" button (not infinite scroll) → footer. A two-column layout on desktop would put context in the side rail, such as the live snapshot and the counts per category.
7. **T7 Utility / conversion** (/donate): a short pitch → a goal or progress bar → a single primary action (address, QR code, copy) → no competing banner.

Shared building blocks across all templates: PageHeader, Callout (info / warn / status), FreshnessBadge, RangeControl (one design), ExportMenu (PNG / CSV / Link), KPITile (with semantic tone), ChartCard (title, legend, tooltip, footnote), DataTable, ChipGroup (role=group, aria-pressed), Disclosure (`<details>`), SourcesList, ReadNext. Each metric gets one canonical name and one canonical colour, used everywhere.

---

## Screenshot files (scratchpad/shots/)
tools-1.jpg, tools-2.jpg, tools-3.jpg, tools-4.jpg, tools-5-search-stuck.jpg, tools-6-more-menu.jpg ·
metrics-1.jpg, metrics-2.jpg, metrics-3.jpg, metrics-4-group.jpg, metrics-5-picker.jpg, metrics-6-sorted.jpg ·
savings-1.jpg, savings-2-chart.jpg, savings-3-tooltip.jpg, savings-4-returns.jpg, savings-5-log-eth.jpg, savings-6-1y.jpg ·
news-1.jpg, news-2-feed.jpg, news-3-price-filter.jpg, news-4-bottom.jpg ·
compare-1-empty.jpg, compare-2-search.jpg, compare-3-charts.jpg, compare-4-tooltip.jpg, compare-5-bottom.jpg ·
btc-bull-run-1.jpg, btc-bull-run-2-chart-tooltip.jpg, btc-bull-run-3-pace-table.jpg, btc-bull-run-4-caveats.jpg, btc-bull-run-5-60days.jpg ·
swaps-1.jpg, swaps-2-graph.jpg, swaps-3-graph-hover.jpg, swaps-4-table.jpg, swaps-5-chain.jpg ·
wallet-apps-1.jpg, wallet-apps-2-chart.jpg, wallet-apps-3-share.jpg, wallet-apps-4-leaders.jpg ·
exchange-support-1.jpg, exchange-support-2-map-tooltip.jpg, exchange-support-3-table.jpg, exchange-support-4-filter.jpg ·
what-if-1.jpg, what-if-2-sources.jpg · amount-suggest-1.jpg ·
correlate-1.jpg, correlate-2-matrix.jpg, correlate-3-scatter-modal.jpg, correlate-4-howto.jpg ·
signals-1.jpg, signals-2-performance.jpg, signals-3-caveats.jpg, signals-4-calls-table.jpg, signals-5-message-expanded.jpg ·
donate-1.jpg
