# Homepage + global audit (lead designer)

## Inventory (verified by in-browser crawl of every page, 2026-10-11)
- 27 standalone pages + 58 /chart/* pages (sitemap.xml) + /activity (unlisted, linked from /shield-hops) + /pro (password gate) = 87 HTML pages.
- Non-pages ignored: /api/exchange-coverage, /api/near-network, /privacy-suggestions.json, /ad/c/1 (ad redirect, robots-disallowed). 404 page exists.
- External hosts linked (not followed): x.com, explorer.near-intents.org, github.com, mempool.space, blockstream.info, coinmetrics.io, coingecko.com, blockchain.com, blockchair.com.

## Theme tokens (live)
Dark: bg #050a06, mantle/card #0a120c, crust #030604, surface0 #102117, surface1 #1d3d2a, surface2 #2c5a3e, text #c6f9d0, value #dcffe6, subtext1 #9bdcab, dim/subtext0 #7cc88d, overlay0 #4f8a63, border #266542, accent #00ff66 (+glow 0 0 10px rgba(0,255,102,.45)), on-fill #050a06. Catppuccin-style named hues (rosewater #9affc4, pink #ff3fb4, mauve #c264ff, red #ff3b4e, peach #ff9e2c, yellow #f5e017, teal #00f0c8, sky #2ad4ff, blue #3b8dff, lavender #b48bff). Status: open #2ea043, partial #d29922, banned #da3633. Link colour ~#9e9eff (periwinkle — off-theme).
Light (toggle, stored in localStorage "zec-theme"): bg #eef3ee, card #e4ebe5, border #8e9c92, text #0c1b11, dim #375841, accent #00722f, value #04301a.
Fonts: Orbitron (wordmark only), JetBrains Mono for EVERYTHING else incl. long paragraphs. Scanline/CRT overlay texture on bg.
Layout widths: --page 75rem, --page-wide 93.75rem, --measure 45rem.

## Contrast (WCAG)
text/bg 16.97 · value/card 17.64 · dim/card 9.51 · overlay0/bg 4.89 · accent/bg 14.72 · border/card 2.74 (<3:1) · surface1/card 1.59 · red/card 5.42 · light dim/card 6.57 · light accent/bg 5.42 · light border/card 2.37 (<3:1).
=> Problem is not low contrast; it is (a) everything is the same hue (text, dim, value, accent, positive delta all green) → no hierarchy, semantic "up=green" collides with brand green; (b) pure neon at 15–17:1 with glow causes halation on black; (c) component boundaries under 3:1; (d) link colour periwinkle breaks the palette; (e) chart series colours (yellow price, blue/red WMAs) unrelated to theme.

## Homepage structure (desktop 1512)
1. Header: Orbitron glowing wordmark "ZEC STATS: ZCASH NETWORK STATISTICS" (very long) + nav: Tools & Charts · Metrics · Calculator · News · More ▾ · LIGHT toggle.
2. Donate strip: "[ZECSTATS] Feeling Generous? — Help ZECStats pay server bills…" (sits above content on every page).
3. Lede: "Every Zcash number on one page, computed from a full node we run — not copied from an exchange API. 58 charts, updated daily."
4. Search (full-width) + "Try" chips: price, shielded, fees, gold, calculator, hashrate.
5. 5-year price area chart (no title, no current value; "last 5 years · $20 to $1,554" floating top-right; y labels inside plot).
6. 12 KPI cards, 5-col grid (last row orphaned 2): ZEC price, ZEC/BTC, Market cap, FDV vs Bitcoin, MVRV, Shielded %, Shielded USD, Inflation, Total supply, Hashrate, NEAR bridge, Monthly fees. All same weight.
7. Two narrative cards with coloured left rule (green / orange): "Five year outlook (ZEC vs Bitcoin)" + "Daily changes (market)", each with "Read the…" expander.
8. 🔥 Popular this week — 6 tiles (4+2 orphan), many show "—".
9. Chart index — 11 collapsible categories, each a grid of tiles (title + latest value, many "—"): Supply & Emission (8), Market & Valuation (12), Privacy Adoption (10), Usage & Activity (8), Holders & Coin Age (9), Mining & Security (2), Hyperliquid Derivatives (3), Exchange Volume (2), Access & Liquidity (4). Duplicates across groups (Pool Residency Time, Pool Values, Cost Basis, ZEC Price appear twice). Orphan rows everywhere.
10. Footer: one centred line — methodology link, "by @jeremiahrogers · Follow @zecstats_ on X · Donate 💚".

## Global issues seen
- Three different headers: home (wordmark + nav), sub-pages ("← ZEC Stats" back link + nav + right-floating search), tool pages like /activity, /pro (page title + "← DASHBOARD" + search box). No persistent identity/wayfinding.
- Donate strip pushes every page's content down; on mobile it takes ~60px of the first fold.
- Footer is a single line: no sitemap, no section links, no data-freshness, no methodology/sources list.
- "—" values: ~25 of 58 index tiles show a dash → looks broken.
- Mobile (390px): wordmark wraps 3 lines; hero chart collapses to ~60px with no y-axis; price chart page: chart below fold after 2 paragraphs + date range + 8 range buttons + annotations; date inputs clip; WMA line rendered below x-axis (outside plot); annotation labels overlap line; x-axis labels collide on Ironwood daily bar chart; Ironwood progress-bar label overflows/clips; mobile menu is an inline accordion with nested "More▾".
- /activity: 50-row address table at narrow width with empty right half; stacked bar chart where the red "in exchanges" series is invisible against grey "transient"; '20000k' style axis units (should be 20M).
- /pro: bare password card.
- 404: helpful links but different header.
