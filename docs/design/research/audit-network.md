# ZECStats UI/UX audit — network, explainer and tracker pages

Audited live on 2026-10-11 at 1512×771 (desktop), dark theme. Screenshots are in `scratchpad/shots/` and named `<slug>-<n>`. This is an audit only, with no redesign.

Measured contrast on bg #050a06 / card #0a120c:

| colour | role | on bg | on card |
|---|---|---|---|
| #c6f9d0 | body/H2 text | 17.0 | 16.2 |
| #9bdcab | paragraph text | 12.6 | 12.0 |
| #7cc88d | dim / table cells / th | 10.0 | 9.5 |
| #00ff66 | H1, links, accent | 14.7 | 14.0 |
| #9e9eff | visited / "← ZEC Stats" link (off-palette lavender) | 8.4 | 8.0 |
| #266542 | card border | **2.9** | **2.7** (below the 3:1 minimum for UI components) |
| #c6f9d0 on #00ff66 | Ironwood progress-bar label | **1.15** | |

Colour contrast is fine for text. Legibility suffers from **size**: table headers are 10.56px uppercase, table cells are 12.16px, intros and chart captions are 12–12.6px, and chart axis ticks are roughly 9–10px. A faint CRT scanline texture over the whole background adds noise behind small text.

---

## Global chrome

**Header, row 1** (not sticky; not a `<header>` element, but it does contain `<nav>`):
- `← ZEC Stats` (to `/`). It renders in lavender #9e9eff, which looks like an unstyled `:visited` colour.
- `Tools & Charts` (/tools) · `Metrics` (/metrics) · `Calculator` (/savings) · `News` (/news)
- **Dropdown (`<details><summary>`)**. Its label **changes to the current page's name** when that page is in the menu ("Network Nodes ▾", "Node Status ▾", "Usage Map ▾", "Privacy Tips ▾", "Halving ▾", "Founders' Reward ▾", "Ironwood ▾"). On any other page it reads "More ▾". This is confusing because the menu trigger looks like a page title, and there is no constant "More" affordance.
- `LIGHT` / `DARK` theme-toggle button. It stores `localStorage zec-theme`.

**Header, row 2:** `ZECSTATS` pill label + **"Feeling Generous?"** (links to `/ad/c/1`, which is an ad slot) + "— Help ZECStats pay server bills and provide a free service". It reads like a sponsorship/ad unit but sits where a site tagline would go. **It disappears in light theme.** The search input "Search charts and tools…" sits on the right. Typing "node" showed no instant suggestions; it presumably needs Enter (not submitted).

**More-menu contents (18 items, in order):** Dashboard (/) · Compare (/compare) · Bull Run (/btc-bull-run) · Swaps (/swaps) · Wallet Apps (/wallet-apps) · Exchanges (/exchange-support) · Network Nodes (/network) · Node Status (/node) · Usage Map (/world-usage) · Privacy Tips (/privacy-suggestions) · Halving (/halving) · Founders' Reward (/founders-reward) · Ironwood (/ironwood) · What If (/what-if) · Pool P&L (/chart/pool-profit) · Donate (/donate). The current page is highlighted with a solid neon pill (dark text on #00ff66).
- **Missing from the menu:** /orchard-turnstile, /btc-migration, /shield-hops, /tx-sizes, /wall-of-shame. They are reachable only via Tools, Search or in-page links.
- The menu is an unordered mix of dashboards, explainers, trackers, a calculator and Donate. There are no group headings.
- "Dashboard" (the homepage) is buried inside "More" while "← ZEC Stats" also goes home: two home links.

**Breadcrumb:** `Tools & Charts › <Page>`. The breadcrumb label often differs from the nav label and the H1, for example nav "Usage Map", breadcrumb "World Usage Map", H1 "When the World Uses Zcash".

**Page-level toolbar** (inconsistent): ⬇ Download PNG / ⬇ Download CSV buttons. Sometimes they sit under the H1 on the left (network), sometimes right-aligned (ironwood, btc-migration, tx-sizes), sometimes floating above a card (founders-reward), and sometimes inside a card under the legend (orchard-turnstile). Chart-card buttons alternate between "⬇ DOWNLOAD PNG" (uppercase) and "⬇ Download PNG". Two-panel charts get two buttons, "— HOPS"/"— ZEC" and "— COUNT"/"— DOLLARS", one at the top and one at the bottom.

**"Read this next" block** (every page): an uppercase dim label plus 2–3 inline green links, with no descriptions or thumbnails. It often duplicates an inline "Related:" sentence just above it (halving, privacy, btc-migration).

**Footer** (centred, small, dim): "Zcash network data computed from a [full node we run](/node) — not copied from an exchange API. [How these numbers are produced](/tools#methodology)." then "by [@jeremiahrogers](x.com) · [Follow @zecstats_ on X](x.com) · [Donate 💚](/donate)". There are no sitemap or section links and no last-updated stamp.

**Light theme:** a pale-green background with dark-green accent; cards and borders keep their structure. The "Feeling Generous?" row vanishes (`global-light-theme.jpg`).

**Content width is inconsistent:** the header and charts use about 1200px. Hero/explainer cards and prose use about 720–900px and are left-aligned (halving, node, founders "never moved", btc hero), which leaves a large empty right gutter on desktop.

---

## 1. /network — "Zcash Network Nodes"

- **Purpose:** How many Zcash nodes are publicly reachable, where are they, and what software do they run?
- **Type:** Live tracker + map + data tables (a long "dataset report").
- **Structure:**
  1. Breadcrumb, H1, and ⬇ PNG / ⬇ CSV buttons (left-aligned).
  2. Status callout card **"✓ Index complete"** (neon border): "crawl has run for 54 days… 1,219 new addresses in the last 24h"; completion criteria "7+ days… under 10% new… Now: 54d running, 1.96%"; crawler line "198 probes in the last hour, 118 answered, 60 new… last probe 2m ago · pace 100%".
  3. Intro paragraph ("This is not every node") + disclosure "How the crawl works, and why addresses are hidden".
  4. **H2 "Where are the nodes?"**: a long dim caption, toggle chips **SYNC STATUS | NODE SOFTWARE**, then a full-width dark world map (SVG 1200×600) with dots. The legend sits *below* the map. In Sync mode it reads "zecstats node (0) · At tip (79) · Out of sync (21) · Live, height unknown (22) · Not reachable (579, greyed/struck)". In Software mode it reads "Zebra (45) · Zakura (52) · zcashd (3) · Other (0) · Not reported (22)". The caption text changes with the mode: "701 nodes placed" vs "122 reachable nodes placed".
  5. **H2 "Which countries run the most nodes?"**: "122 reachable nodes across 23 countries". Table columns are #, Country (flag), Nodes, At tip (green), Out of sync (orange), Unknown. 23 rows; US 35, Germany 25, France 12…
  6. Card **H3 "Visible Nodes (weekly)"**: a stacked bar chart, 8 weeks (08-17…10-05), y 0–350. The legend shows totals "IPv4 194 · IPv6 19 · Tor 0 · Unreachable 61,973 (greyed)". Caption: "week of 2026-10-05: 62,186 addresses known, 213 reachable".
  7. **H2 "What software do the nodes run?"**: a 100% stacked bar (Zakura 52 / 42%, Zebra 43 / 35%, unknown 26 / 21%, zcashd 3 / 2%) + an "Advertised version / Nodes" table (12 rows, e.g. /Zakura:1.6.0/ 25).
  8. **H2 "Which nodes are visible right now?"**: "62,186 addresses known (62,068 gossip · 74 rpc · 44 dns) · 124 confirmed reachable in the last 24h". A ~125-row table: Network (IPv4/IPv6 pill), Node (hash), Range (masked IP), Location, Client, Version, "Sync (when indexed) ↑" (sortable), First seen, Last seen. Sync shows "at tip", a negative block lag ("−28,470", "−3,488,176") or "—".
  9. **H2 "What state is each address in?"**: a status taxonomy table (Status / What it means / Addresses with %). Indented "↳" sub-rows: reachable 124 (0.2%), not attempted 51,128 (82.2%), no connection 10,568 (17.0%) → host_silent / port_closed / refused / host_unreachable / network_unreachable, failed handshake 225, not mainnet 80, unclassified 31, proxy error 30.
  10. Read this next: Hashrate + Difficulty · Average Block Size, then the footer.
- **Controls:** the Sync/Software toggle recolours the dots and swaps the legend and caption. Legend entries are clickable to toggle series (per the caption). The table column header "Sync (when indexed) ↑" sorts. The details disclosure expands. There is no map zoom or pan, no country filter, no table search or pagination.
- **Chart behaviour:** the map tooltip is nearly empty: hovering a US dot shows only **"US ·"** (`network-10-tooltip.png`). The bar chart has no visible axis titles.
- **Issues:**
  - **Colour mapping conflicts on the same page.** On the map in Software mode, Zebra is green and Zakura is cyan. In the "What software" bar directly below, **Zakura is purple and Zebra is cyan**. Purple elsewhere on the site means Orchard (ironwood) or the "zecstats node".
  - The legend sits under the map and **butts directly against the next H2** with no spacing (`network-11.jpg`).
  - The numbers disagree in ways the reader can't reconcile in one glance: 701 placed vs 122 reachable vs 124 in 24h vs 213 weekly reachable vs 79+21+22 = 122.
  - The status callout and three dense dim paragraphs sit above the map. The hero metric (reachable nodes) is never shown as a big number.
  - The map's projection wastes about 25% of its height on Antarctica and oceans. Dots are about 5px with no clustering, so Europe is a blob.
  - The ~125-row table has no sticky header, search, filter or pagination. The "Sync" column mixes words, huge negative numbers and dashes.
  - The status-taxonomy table uses snake_case codes (`host_silent`, `foreign_chain`) as user-facing labels.
  - The download buttons don't say what they export (whole page? map? table?).
- Screens: network-1…11, global-more-menu.

## 2. /node — "Zcash Node Status [SYNCED]"

- **Purpose:** Is the site's own Zebra node healthy and in sync, and how fresh is the data?
- **Type:** Live status panel (a small tracker).
- **Structure:** H1 with a green "SYNCED" badge, then 2 intro paragraphs (the "Zebra" link is lavender #9e9eff), then a disclosure "Why read from our own node at all?". Next is one card, "Node is fully synced", holding a key/value list: Zebra node version v6.3.0 · Latest indexed day 2026-10-11 (0 days behind today) · Latest indexed block 3,513,510 / 3,513,512 (100.0%) · Last block seen 3m 43s ago · Indexing rate (last 6h) 1 blocks/min · Zebra node verification 100.0% · Blocks remaining to sync 0 blocks · UTXO backfill height 3,513,410. Then the note "Block counter updates every 5 seconds; full reload every 5 minutes." and a sub-table "Blocks indexed, last 6 hours (UTC)" (Hour / Blocks / End height, 6 rows). Read this next has 3 links.
- **Controls:** only the disclosure. The counter updates live.
- **Issues:** the card uses about 60% width, leaving a big empty right side. Health is shown only as text, with no status colours per row (e.g. "Last block seen 3m 43s" has no threshold cue) and no sparkline for blocks per hour. "1 blocks/min" is a grammar slip. There is no history of outages or lag. The badge is the only visual status. Off-palette lavender link.
- Screens: node-1, node-2.

## 3. /world-usage — "When the World Uses Zcash"

- **Purpose:** At what UTC hours is Zcash busiest, and how does that line up with which parts of the world are awake and have exchange access?
- **Type:** Analytical explainer with interactive charts + an animated map.
- **Structure:**
  1. Intro + disclosure "How to read it".
  2. A **PERIOD** bar card: 30D / 90D / 6M / **1Y** / ALL, plus a summary "2025-10-11 → 2026-10-11 · 418,465 blocks · 2.78M txs".
  3. Two side-by-side cards. "Activity by hour (UTC)" is a 24-bar chart where the peak bar is gold and the current animation hour is bright green. "By day & hour (UTC)" is a 7×24 green heatmap. Each card has its own ⬇ DOWNLOAD PNG.
  4. A full-width card with an **animated day/night world map**. Countries are coloured by exchange access (open green / partial amber / banned red / not assessed grey) with a sunlit overlay. Controls are "❙❙ Pause", a time **slider**, and "⬇ Download page as PNG". A status line reads "01:00 UTC · sun overhead near the western Pacific & Australia · activity 63% of peak" and "In daylight now: India · E. Asia…". There is also a legend and a "▦ availability page →" link.
  5. Card "Usage vs awake population vs awake-with-access — by hour (UTC)": 3 line series (Zcash activity green, World awake blue, Awake + ZEC access yellow) and a correlation summary (r = 0.78 vs 0.39).
  6. Card "Weekly peak activity hour (UTC) — trailing year": yellow dots for the weekly peak hour plus a green weighted-average line.
  7. A summary callout (left neon rule): "peak around 15:00 UTC… bottom 01:00… 1.7×… Americas, S. America, Europe, Africa" + a caveat.
  8. Read this next.
- **Controls:** Period buttons re-query all charts and write `?days=30` to the URL (this works). Pause/slider scrubs the map hour and syncs the highlighted bar. Download PNG per chart and for the whole page.
- **Tooltips are inconsistent.** The bar chart, heatmap and weekly-peak chart use **native SVG `<title>`** tooltips (delayed, unstyled browser tooltips, e.g. "0:00 UTC — 9,694 txs"). The usage-vs-awake chart has a **custom styled tooltip** with a crosshair (`world-usage-7.jpg`).
- **Issues:**
  - Heading levels are inconsistent: "Activity by hour" is H2 while its sibling "By day & hour" is H3, and the other chart titles are H3.
  - The heatmap has **no colour scale or legend**, and its single-hue green has low discriminability.
  - **Amber/yellow is overloaded:** it means "partial access" on the map, "peak hour" on the bar chart, the "Awake + ZEC access" line, and the sun overlay. The bright-green "current hour" bar isn't explained.
  - The slider `<input type=range>` has no label or aria-label. The map animates by default (motion with no reduced-motion handling observed).
  - The Weekly-peak y labels ("00h…24h") and the rotated axis title are tiny.
  - Naming drift: nav says Usage Map, the breadcrumb says World Usage Map, the H1 says When the World Uses Zcash. The page is mostly about *time*, not a map.
  - Period options (30D/90D/6M/1Y/ALL) differ from other pages (see the cross-page section).
- Screens: world-usage-1…7.

## 4. /privacy-suggestions — "Zcash Privacy Tips"

- **Purpose:** Which round ZEC amounts give the biggest anonymity set when shielding or deshielding?
- **Type:** Guidance + ranked data lists (a "recommendation board").
- **Structure:** an intro paragraph (link "Wall of Shame" in lavender). Then "→ Look up a specific amount" (green link to /amount-suggest), "Related: Wall of Shame · Shielded Anonymity Set", and the meta line "Generated 2026-10-10 12:35 UTC from 843,651 shielding + 760,646 deshielding transactions · JSON API ↓". **Two columns:** "Shielding · t→z" and "Deshielding · z→t". Each has 5 cards (0–1, 1–10, 10–100, 100–1000, 1000–10000 ZEC) with 4–5 rows of amount + thin bar + count. The top amount is highlighted green, and the rows are ranked by count, not by amount (e.g. 2.5 / 5 / 1 / 2). Each column ends with a disclosure "100 most recent amounts" listing date, actual amount, and → nearest round amount (no headers). Read this next follows.
- **Controls:** the two disclosures only. There are no inputs. The lookup lives on another page.
- **Issues:**
  - The key takeaway ("use 0.1 / 2.5 / 10 / 100 ZEC") is never stated as a headline. Users must scan 10 cards.
  - Bars are scaled to the global max, so the 1000–10000 cards show near-invisible stubs.
  - Opening one disclosure makes the columns uneven.
  - The recent-amounts table lacks column headers.
  - Mixed link colours (lavender visited vs green).
  - The JSON API link sits in a dim meta line.
  - The page's main CTA (look up an amount) is a text link. It is not an input.
- Screens: privacy-suggestions-1…3.

## 5. /halving — "Zcash Halving"

- **Purpose:** When is the next halving and what is the reward schedule?
- **Type:** Countdown tracker + explainer article.
- **Structure:**
  1. Hero card: "NEXT HALVING — BLOCK 4,406,400" with the big "**~775 days**" and the caption "About 892,888 blocks to go… 1.56250 ZEC to 0.78125 ZEC around 24 November 2028 — an estimate…".
  2. 4 stat tiles: Current block reward 1.56250 ZEC · Halvings so far 2 · Halving interval 1,680,000 · Current height 3,513,512.
  3. H2 "Why doesn't Zcash halve on Bitcoin's schedule?": prose plus a Before/After Blossom comparison card (150s → 75s, 12.5 → 6.25 ZEC, 840,000 → 1,680,000) and more prose.
  4. H2 "When is every Zcash halving?": a table (#, Block, Reward after, Status: done / projected, with "3 ← next" highlighted green), a projections note, and "Related:" links.
  5. Read this next.
- **Controls:** none.
- **Issues:**
  - **The schedule table has no date column.** The page title promises "Dates", but projected dates and actual past dates (18 Nov 2020) appear only in prose.
  - There is no progress bar showing how far through the current era the chain is.
  - The countdown gives days only (no live ticker).
  - "0.39062 ZEC" is truncated (the true value is 0.390625).
  - Content is narrow (about 720–900px) on a 1200px shell.
  - The "Related:" links duplicate "Read this next".
- Screens: halving-1…3.

## 6. /founders-reward — "Zcash Founders' Reward"

- **Purpose:** What was the 2016–2020 Founders' Reward worth when paid vs today, who got it, and has it moved?
- **Type:** Long-form data article (explainer with charts + tables).
- **Structure:**
  1. Intro.
  2. Hero card: "BLOCKS 1 – 1,046,399 · 2016–2020", big "**$280.3M**" with an explanatory sentence ("…worth $2.57B today — 9.2× more").
  3. **6 stat tiles in a 5-column grid, so the 6th ("Never moved…0.078834 ZEC") wraps alone.** The tiles: Coins issued 2,100,000 · Average price $133.67 · Same coins today $2.57B · Worst it got $38.5M · Share of ZEC 12.4%.
  4. H2 "What was the Founders' Reward?": prose plus a schedule table (Blocks / Dates / Block reward / Founders' share + total row).
  5. H2 "What was it worth day by day?" with a lone right-floating ⬇ Download CSV, then 3 chart cards:
     - "Dollars received per day": a dense bar chart with native `<title>` tooltips on 1,483 bars and a caption "Best single day 2018-01-07 $1,092,300".
     - "Cumulative dollars: sold on receipt vs never sold": 2 lines with end labels $2.56B / $280.3M and a clickable legend.
     - "The price the reward was actually received at": a log-scale line with a dashed average of $133.67.
  6. H2 "What happened year by year?" table.
  7. H2 "Who received it?": a recipient split table + caveat.
  8. H2 "How much has never moved?": the big "99.999996% SWEPT OUT" card + an address table (1 row).
  9. H2 "How is this number built?" + disclosure.
  10. Read this next.
- **Controls:** the legend buttons toggle series. Toggling "Worth today" off hides the line but **the y-axis doesn't rescale, and the "$2.56B" end label stays orphaned** (`founders-reward-9.jpg`). There is no hover tooltip on the cumulative or price charts, but there is a native one on the bars. Per-chart PNG, page CSV.
- **Issues:**
  - The orphan tile.
  - "$2.57B" (hero/tile) vs "$2.56B" (chart end label).
  - Chart-card titles (H3) are bright neon while section H2s are pale #c6f9d0, so the hierarchy is visually inverted.
  - Width alternates between full (tables/charts) and narrow (prose, the "never moved" card) within one scroll.
  - The page is about 4,900px with no in-page TOC.
- Screens: founders-reward-1…9.

## 7. /ironwood — "Zcash Ironwood Pool"

- **Purpose:** How far has the Orchard → Ironwood turnstile migration progressed?
- **Type:** Live tracker (migration progress) + analysis.
- **Structure:**
  1. ⬇ PNG / CSV buttons (right).
  2. Hero card with a ◈ icon: "● LIVE SINCE BLOCK 3,428,143", "**89.24%** of Orchard coins have crossed the turnstile into Ironwood", "Activated 74d 11h 2m ago".
  3. **A full-width neon progress bar with the label "3,267,319.17 ZEC of 3,661,233.41 ZEC Orchard has crossed" printed in pale text ON the neon fill (contrast about 1.15:1, unreadable).**
  4. 5 tiles: Value migrating/day $5.0M · Total value migrated $5.0B · Migrated into Ironwood 4.11M ZEC · Orchard remaining 361,823 ZEC · Blocks since activation 85,369.
  5. H2 "How much supply is verified?": a donut showing 97.9% verified (green) / 2.1% unverified (amber) with a legend.
  6. Prose + disclosure "What that percentage counts…".
  7. H2 "How many coins cross per day?": card "Orchard → Ironwood, ZEC per day", a bar chart (76 days) with a legend "fully attributed / partial", native titles, and a summary line.
  8. H2 "How big is a typical migration?": a CDF card with an inline stats row (Transactions 102,955 · Median 0.15 · P90 10 · Largest 69,386 · Total 4,886,789 ZEC), a log-x step line with a dashed median marker, and an interpretation paragraph.
  9. H2 "Where did the migrated value come from?": a stacked bar (Orchard purple / Sapling cyan / Transparent amber) + table (ZEC, %, $).
  10. H2 "What is in each pool today?": a pool table (Ironwood row in green).
  11. Read this next.
- **Controls:** downloads and a disclosure only. There is no range selector.
- **Issues:**
  - The progress-bar label is unreadable.
  - **The numbers don't reconcile visibly:** "Total value migrated $5.0B" vs table total "$5,974,183,494". "Migrated into Ironwood 4.11M" vs "4,886,817 total migrated" vs "3,267,319 from Orchard". "Orchard remaining 361,823" vs 3,661,233 − 3,267,319 = 393,914.
  - "$5.0M/day" next to "$5.0B total" reads like a typo.
  - The donut sits in a half-width card with dead space beside it.
  - The pool colour palette (Orchard purple, Transparent amber, Sapling cyan) is not shared with /network, where purple means Zakura.
- Screens: ironwood-1…5.

## 8. /orchard-turnstile — "Zcash Orchard Turnstile — Inflation Watch"

- **Purpose:** Is there evidence the 2026 Orchard soundness bug was exploited to mint counterfeit ZEC?
- **Type:** Investigative report with a live composite index (a "forensic dashboard").
- **Structure:**
  1. Two dense intro paragraphs.
  2. **Inflation Suspicion Index card:** a semicircle gauge (green / yellow / orange / red) reading **32**, "INCONCLUSIVE — SIGNALS CONFOUNDED", with component bars: Masked-deshield 31% · w0.5, Post-disclosure net drain 29% · w0.35, Amount anomaly (Benford) 40% · w0.15, Turnstile breach "clean · override".
  3. Five numbered H2 sections:
     - "1 · Does the turnstile hold?": 6 tiles (Pool balance floor 156 ZEC · Ever negative? No · Total shielded in 20.05M · Total deshielded out 16.56M · Deshield/shield 82.6% · Flow↔balance gap 0.00 ZEC) + a cumulative-flow line chart (in green / out orange / balance blue). The CSV button sits inside the card.
     - "2 · Could a fake be hidden…": a long paragraph + a lag-correlation bar chart (−7…+7, lag 0 highlighted).
     - "3 · Did anything change after disclosure?": 5 tiles.
     - "4 · How fast could value even leave?": 3 tiles.
     - "5 · Do the amounts look natural?": a Benford grouped bar (observed cyan vs expected grey-green).
  4. A **Verdict card** (neon border) with 5 bolded paragraphs.
  5. Read this next.
- **Loading:** the data takes over 10s. Until then the gauge shows "·· READING…" and the bottom reads "Reading the data… Loading the full Orchard flow history". The layout shifts by about 600px when it arrives. This page isn't in the More menu, which shows "More ▾".
- **Controls:** downloads only. No tooltips found (no `<title>` elements; none observed).
- **Issues:**
  - **Copy contradicts the data.** The tile "Deshield rate pre → post 13k → 10k/d" and the verdict "did rise (~0.8× the prior rate)" disagree, since 0.8× is a fall. Section 4 says "elevated post-disclosure pace".
  - The gauge's "32" overlaps the needle.
  - The cumulative chart x-axis starts at 2023 though Orchard launched in 2022.
  - Walls of 12px prose sit between charts. The key verdict comes at the very bottom (about 3,100px down), though the gauge at the top partially summarises it.
  - Tile rows have 6, 5 and 3 tiles, so the grids are uneven.
- Screens: orchard-turnstile-1…7.

## 9. /btc-migration — "Bitcoin Moving into Zcash"

- **Purpose:** How much BTC is being swapped into ZEC via NEAR Intents, and how long had those coins been dormant?
- **Type:** Live tracker + filterable data table (the richest "explorer" page).
- **Structure:**
  1. Intro.
  2. A filter row of **pill-shaped** chips: 7D / **30D** / 90D / ALL | **≥ 0.1 BTC** / ≥ 1 BTC / ≥ 5 BTC / All sizes, plus ⬇ Download CSV (right).
  3. Status: "294 swaps over 2026-09-11 → 2026-10-10. 1 still awaiting a Bitcoin trace". Two progress bars, "Swaps collected 100% 592 of 592 pages…" and "Bitcoin traced 100% 6,476 of 6,485…", then "Priced at $1,223/ZEC (live) and $82,902/BTC".
  4. Hero card: "BITCOIN SWAPPED FOR ZEC · LAST 30 DAYS", big **317.2 BTC**, and a dense 6-line paragraph with bolded figures.
  5. **10 tiles (2×5):** Share of all ZEC 4.00% · Swaps 294 · ZEC bought 18,066 · Held >1y 94.709 BTC · Held >5y 70.889 BTC · Weighted age 3.0 y · CAGR +8.6%/yr · Worth now $22.1M · Vs holding BTC −16.0% · From a consolidation 18.027 BTC.
  6. **H2 "What it turned into" + inline dim subtitle "money in, against what that ZEC is worth".** The DOM concatenates these with no space ("What it turned intomoney in…"), which screen readers will read as one word. The card "Paid, and worth" holds 2 cumulative lines with a brown fill between them.
  7. H2 "Every swap": a bubble chart (x = date, y = log "how long the Bitcoin had sat still" 1 day…10 years, size = BTC), a dashed "held more than a year" line, a size legend, and always-on callout labels.
  8. Card "How much moved, per day": chips Auto / Daily / Weekly / Monthly and BTC / USD, and a bar chart.
  9. H2 "The swaps": toggle Each swap / By address, From/To **native date inputs (dd/mm/yyyy)**, Min BTC, Min $ in, All / In profit / Underwater, 50 rows / 250 / 500, "address or txid…" search, and Reset. The table has 13 columns (Swapped, BTC in, USD in, ZEC out, Worth when rested, Paid $/ZEC, Worth now, Gain $, Return %, CAGR, BTC last moved, Trace, Sender ₿). Gains are green, losses red. Footer: "Showing the first 50 of 294".
  10. H2 "How a row is built" (an ordered list), H2 "Sources", H2 "What this measures, and what it cannot" (long prose with an amber-ruled callout).
  11. Read this next.
- **Controls verified:** By address switches columns (Sender, Swaps, … Vs holding BTC, Oldest coins) and writes `?by=` to the URL. Column headers sort. The chips filter.
- **Issues:**
  - **The table overflows horizontally** (1453px inside a 1198px wrapper, overflow auto), and the Trace and Sender columns are cut off with no visible scroll cue.
  - The bubble chart's always-on labels **collide** ("8.000 BTC 188 d untouched" over neighbouring labels), and the "above this line" label overlaps bubbles.
  - The chart legend "worth now ▪ paid" overlaps itself.
  - The native date inputs show OS chrome and a DD/MM locale, while the rest of the site uses ISO dates.
  - Chip styles: rounded pills here vs square chips on world-usage and tx-sizes.
  - Ten tiles plus a paragraph hero restate the same numbers (317.2 vs 317.0 BTC).
  - About 2,000px of methodology prose sits after the table with no TOC or anchors.
- Screens: btc-migration-1…9.

## 10. /shield-hops — "Zcash Shield-Bound Hop Sizes"

- **Purpose:** How much ZEC moves at a time when a transparent coin goes shielded?
- **Type:** Statistical distribution report (analysis page with filters).
- **Structure:**
  1. Intro.
  2. One row of chips: All hops / **Sweeps removed** / Sweeps only | "☐ Drop the repeated amount" (dashed-border checkbox chip) | 90D / **1Y** / 3Y / ALL, plus ⬇ CSV. Then "Through 2026-10-10."
  3. Hero card: "TYPICAL HOP · SWEEPS REMOVED · MEDIAN OF THE LAST 364 DAILY MEDIANS", **1.25 ZEC**, and an explanation.
  4. H2 "The distribution" + subtitle: **6 tiles in a 5-column grid, orphan 6th** (Median 1.25 · Mean 58.03 · P10 0.0349 · P90 20.00 · Hops 489,935 · ZEC 28.43M).
  5. Card "Hop size over time — median, with p10–p90 spread": a log-scale band chart with a mean dashed orange line and annotated min/max/latest dots.
  6. Card "How many hops, and how much ZEC": two stacked panels (blue hops/day, teal ZEC/day) with two separate PNG buttons.
  7. Card "Is this a distribution, or one robot?": a bar chart of the share at one exact amount.
  8. H2 "What this measures, and what it cannot": long prose.
  9. Read this next.
- **Controls verified:** "Drop the repeated amount" writes `?repeat=drop` and updates the hero eyebrow and the tiles (mean 58.03 → 63.81, hops 489,935 → 444,353). But the **checked state is hard to see**: the chip still looks like a dashed "☐" box.
- **Issues:**
  - Three different control types (segmented choice, checkbox, period) share identical chip styling with no group labels.
  - The band chart legend is tiny and crammed top-right.
  - Annotation labels overlap at the right edge.
  - The y-axis uses "1000k / 2000k" instead of 1M / 2M.
  - Date ticks use "10-12" (MM-DD), unlike the "Sep 13" style elsewhere.
  - The blue hops colour is off-palette.
- Screens: shield-hops-1…5.

## 11. /tx-sizes — "Zcash Transparent Transaction Sizes"

- **Purpose:** How many dollars does a typical transparent transaction move, and where is the money concentrated?
- **Type:** Statistical distribution report (same template family as shield-hops).
- **Structure:**
  1. Intro.
  2. A **RANGE card:** date picker "11/07/2026", a **dual-handle slider**, date picker "11/10/2026", and presets 1M / **3M** / 6M / 9M / 1Y / 5Y / YTD / ALL. The URL holds `?from=…&to=…`.
  3. View chips: Transparent → transparent / Leaving a shielded pool / Everything, plus ⬇ CSV.
  4. "92 days, 2026-07-11 → 2026-10-10." Hero: **$1,558** median + explanation.
  5. H2 "Across the selected range": **8 tiles in a 6-column grid, so 2 orphans** (Mean $259k, Median $1,558, Mode (latest day) $0.49, P90 $219k, P95 $574k, P99 $3.69M, P99.9 $34.84M, Per day 3,181 txs).
  6. Five chart cards:
     - CDF: share of transactions (blue) vs share of dollars (teal), with labelled median/p90/p99 points.
     - "The shape": two-panel histograms.
     - "Transaction size over time": band chart.
     - "The upper tail": 5 lines in green/blue/purple/orange/red.
     - "How many, and how much": two panels, two PNG buttons.
  7. H2 "What this measures, and what it cannot" (prose with an amber-ruled callout).
  8. Read this next.
- **Controls:** range presets, slider, date pickers, view chips, CSV/PNG. A hidden "Annotations" button exists in the DOM.
- **Issues:**
  - **The range UI is a fourth variant** (see the cross-page section).
  - The pickers display DD/MM/YYYY ("11/07/2026" is ambiguous for US readers).
  - Ticks use "26-07-11" (YY-MM-DD), a third date format.
  - The text contradicts itself: "90% of transactions moved $224k or less" vs the P90 tile "$219k"; "Half… under about $1,778" vs the median "$1,558" (band rounding, but it looks like an error).
  - The rainbow 5-line chart has no direct labels.
  - Overlapping annotations ("$4,459" over "2026-10-10", "$330.19M").
  - Captions refer to colours by name ("the blue line… the teal line"), which fails for colour-blind users and breaks if the theme changes.
- Screens: tx-sizes-1…6.

## 12. /wall-of-shame — "Zcash Wall of Shame"

- **Purpose:** Which shield→deshield round-trips leaked privacy by reusing a near-identical non-round amount?
- **Type:** List / leaderboard (a single big data table).
- **Structure:** H1, 2 intro paragraphs (the definition, then a heuristic disclaimer), 2 green "→" links (Privacy Suggestions, Shielded Anonymity Set), "500 incidents. Click a column to sort.", and **one 500-row table**: Shield ↓ (date + #block link), Amount ($ + ZEC), Deshield (date + #block), Back out ($ + ZEC), Gap (42m, 5d 5h), Match (badge: ZEC blue ×123 / USD orange ×197 / ZEC+USD green ×180, plus diff %), Pools (sapling → orchard, etc.). Read this next follows.
- **Controls:** column sort (verified: Amount ↓ re-sorts, and the arrow moves to the header). Nothing else.
- **Issues:**
  - The page is **23,867px tall**: 500 rows with no pagination, filters (pool, match type, date, size), search or sticky header. The header scrolls away (`position: static`).
  - There are no summary stats or charts (incidents over time, by pool, total $ exposed) to give the list a headline.
  - The Match badge colours (blue / orange / green) mean something different from the same colours on other pages.
  - The two-line cells ($ over ZEC) make rows tall.
  - The title "Wall of Shame" is a naming/tone choice worth flagging, since it shames on-chain users. The disclaimer is good but sits in dense dim text.
- Screens: wall-of-shame-1…4.

---

## Cross-page summary

### Recurring components (current, de facto)
1. **Page header block:** breadcrumb → neon H1 (24px, the same JetBrains Mono, so **Orbitron is not used for page titles**; only the logo, if at all) → 1–3 paragraphs of 12.6–13px intro → optional disclosure ("How to read it", "How the crawl works", "Why read from our own node").
2. **Hero stat card:** eyebrow (uppercase dim, often encoding filter state, e.g. "TYPICAL HOP · SWEEPS REMOVED · …") → huge number → explanatory paragraph. Used on halving, founders, ironwood, btc-migration, shield-hops and tx-sizes.
3. **Stat tile grid:** label (uppercase tiny) / value (neon or pale) / caption. Used on 9 of 12 pages. It frequently leaves **orphan tiles** (6-in-5, 8-in-6, 6-in-5).
4. **Chart card:** title (neon H3) + ⬇ DOWNLOAD PNG (right) + dim caption paragraph + legend (sometimes clickable) + SVG chart + summary sentence under the chart.
5. **Filter chip rows:** period, size, view and toggle chips.
6. **Data table:** uppercase 10.5px dim headers, 12px cells, thin border rows, sortable headers (some), sometimes a total row.
7. **Callout boxes:** neon-bordered status/verdict card, left-ruled summary (green or amber rule).
8. **Disclosure (`<details>`)** for methodology.
9. **"What this measures, and what it cannot"** methodology prose section (btc-migration, shield-hops, tx-sizes, founders, ironwood).
10. **"Read this next"** link row + global footer.

### Recurring problems
- **No shared range or period control.** World-usage has 30D/90D/6M/1Y/ALL (square). Btc-migration has 7D/30D/90D/ALL (pill). Shield-hops has 90D/1Y/3Y/ALL (pill). Tx-sizes has date pickers + slider + 1M/3M/6M/9M/1Y/5Y/YTD/ALL (square). Network, ironwood and turnstile have no range.
- **No shared colour semantics.** Purple means Zakura, Orchard, or the zecstats node. Cyan means Zebra, Zakura, Sapling, IPv4, or "observed". Amber/orange means out-of-sync, partial access, peak hour, transparent pool, USD match, cumulative out, or mean. Within /network the map and the bar disagree.
- **Three or four date formats:** ISO "2026-10-10", "Sep 13", "10-12" (MM-DD), "26-07-11" (YY-MM-DD), and native DD/MM/YYYY inputs.
- **Tooltip systems:** native `<title>` (delayed, unstyled), custom styled tooltips, a near-empty map tooltip ("US ·"), and charts with none. Captions promise "Hover any…" inconsistently.
- **Inverted hierarchy:** chart-card titles in neon outshine section H2s in pale text. H2 vs H3 is used inconsistently for sibling cards. H2 + inline subtitle concatenate in the DOM ("What it turned intomoney in").
- **Text density and size:** most explanatory copy is 12–13px dim mono in long paragraphs. Key conclusions sit at the bottom (turnstile verdict, world-usage summary). There is no TOC on 4,000–24,000px pages.
- **Number inconsistencies visible to readers:** ironwood ($5.0B vs $5.97B; 361,823 vs 393,914), founders ($2.57B vs $2.56B), tx-sizes (P90 $219k vs $224k; median $1,558 vs $1,778), turnstile (rise vs 0.8×), btc (317.2 vs 317.0).
- **Grid gaps:** orphan tiles; half-width cards (node, donut, "never moved") leave dead space; content width alternates within a page.
- **Label collisions** on annotated charts (btc bubble, shield-hops and tx-sizes band and bar end labels).
- **Big tables lack table UX:** no sticky headers, pagination, filtering or search (network ~125 rows, wall-of-shame 500 rows), and there is hidden horizontal overflow (btc-migration).
- **Navigation:** five of these pages are missing from More. The More trigger relabels itself to the current page. The menu has no grouping. Breadcrumb, nav label and H1 disagree.
- **Accessibility:** card borders at 2.9:1. The progress-bar label is at 1.15:1. The range slider is unlabelled. Colour-only status (sync columns, gains/losses, match badges). Captions refer to "the blue line". Animated map by default. No `<header>`/`<main>` landmarks (there is a `<nav>`). The unstyled visited-link lavender (#9e9eff) is off-palette.
- **Loading:** turnstile shows a long blank "READING…" state with layout shift. There are no skeletons.
- **Download buttons** are ambiguous about scope and placed inconsistently. Uppercase vs Title Case.

### Proposed reusable page templates (for the redesign phase)
1. **Live Tracker:** status strip (live dot, last update, data freshness) → hero KPI + progress or countdown → 4–5 tile KPI row (fixed column counts 3/4/6) → primary chart → breakdown tables → methodology disclosure. *Fits: /ironwood, /halving, /node, /network (top half), /btc-migration (top half).*
2. **Distribution / Statistical Report:** a sticky filter bar (one shared Range control + one shared segmented "View" control + an explicit Toggle style) → hero "typical value" card → percentile tile row → chart stack (CDF, histogram, over-time band, tail) → "What this measures / cannot" section. *Fits: /shield-hops, /tx-sizes, /world-usage, parts of /btc-migration.*
3. **Investigation / Long-form Data Article:** title + one-line answer up top (verdict or TL;DR card first, not last) → sticky in-page TOC → numbered sections each with intro (max ~70ch), tiles, chart card → sources/method appendix. *Fits: /orchard-turnstile, /founders-reward, /halving (explainer part).*
4. **Map + Directory:** map card with a mode toggle, a legend that doubles as filters (placed above or inside the map), and a rich tooltip (country, count, client, sync) → ranked country table → searchable, paginated directory table with a sticky header. *Fits: /network, /world-usage (map), /exchange-support.*
5. **List / Leaderboard:** summary header (count, totals, a small trend chart) → filter bar (type chips, date, size, search) → paginated sortable table with a sticky header and responsive column priority. *Fits: /wall-of-shame, /btc-migration swaps table, the /network node list.*
6. **Recommendation / Guidance:** one-sentence recommendation headline + "check an amount" input inline → ranked option cards with consistent per-card scaling → recent examples. *Fits: /privacy-suggestions (and /amount-suggest).*

Shared primitives to standardise across all templates: PageHeader (breadcrumb, Orbitron or mono H1, standfirst, meta line), RangeControl, SegmentedControl, ToggleChip, StatTile and TileGrid (no orphans), HeroStat, ChartCard (title, actions menu with PNG/CSV, legend-as-filter, a single tooltip component, consistent date axis formatter), DataTable (sticky header, sort indicators, pagination, overflow shadow), Callout (info/verdict/caveat), MethodologyDisclosure, ReadNext cards, and one global categorical palette per domain (pools, clients, status, gain/loss) used identically everywhere.
