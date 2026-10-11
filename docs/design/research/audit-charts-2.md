# zecstats.com — Chart pages audit (batch 2: 29 slugs)

Audited live on 2026-10-11, desktop viewport 1512x771 (dark theme). There is also one 390px-wide mobile check, done with a same-origin iframe on /chart/pools. Audit only, no redesign.
Screenshots are in `scratchpad/shots/chart-<slug>-<n>.jpg`.

Slugs covered (29): near-bridge near-flow near-vol-mcap new-addresses orchard-internal pool-profit pool-residency pool-usd pools price realized realized-all shielding-rate supply survival swap-assets total-fees tx tx-issuance tx-types utxo utxo-age utxo-depth utxo-set velocity vol-issuance volatility volume-issuance zec-btc-ratio

---

## 1. Chart page TEMPLATE anatomy

Every /chart/<slug> page uses the same vertical stack. It sits in a single 1200px max-width column, and the prose under the chart narrows to about 720px.

| # | Region | What it contains | Notes |
|---|---|---|---|
| 1 | **Global nav** | "← ZEC Stats", Tools & Charts, Metrics, Calculator, News, More ▾, LIGHT theme toggle | Same as the rest of the site. |
| 2 | **Donation strip + search** | "ZECSTATS" badge, "Feeling Generous? — Help ZECStats pay server bills…", "Search charts and tools…" input on the right | Takes vertical space on every chart page, above the H1. |
| 3 | **Breadcrumb** | `Tools & Charts › <title>` | |
| 4 | **H1** | e.g. "Zcash Price (ZEC/USD)" | JetBrains Mono (computed), **not Orbitron**. The H1 font matches the body font, so the display face is not used on chart pages. |
| 5 | **Intro paragraph** | 1–4 sentences. Often includes a "Read the full description" expander (a `generic` element, not a button) that adds 3–4 more paragraphs **above** the chart | Some intros contain code-like text ("pool_balance * daily_zec_price", "chainSupply field"). |
| 6 | **Headline stat sentence** | "**<Metric>** was **<value>** on <date>, the last full day of data. That is **x%** higher/lower than 28 days ago…" | Present on about half the pages and missing on the rest (see table). **On 3 pages it names the wrong metric** (see below). |
| 7 | **"Plotted against" callout** (non-time-series pages only) | Green left-border note, e.g. "This chart is plotted against coins issued, not date…" | Good pattern, but only used on survival, pool-profit, swap-assets and the *-issuance pages. |
| 8 | **Range card** | "RANGE" label, start date input, dual-thumb slider, end date input; preset buttons 1M 3M 6M 9M 1Y 5Y YTD ALL; ANNOTATIONS toggle on the right | Default range is **3M on every time-series chart**, whatever the metric's timescale. Date inputs use the browser locale (shows `11/07/2026`, DD/MM), while the rest of the page uses ISO `2026-07-11`. Preset buttons have no `aria-pressed`. Absent on the non-time-series pages (pool-profit, survival, swap-assets, *-issuance). |
| 9 | **Utility row** | 🔗 permalink · ⬇ Download PNG · ⬇ Download CSV · ⇆ compare | The permalink keeps the full state (`from`, `to`, hidden series `phide`, `ann=1`, unit and roll toggles), which is good. Compare deep-links to `/compare?charts=<slug>`. |
| 10 | **Mode toggles** (some charts) | Segmented buttons such as USD/ZEC/Both, Daily/Weekly/Monthly, Asset/Token, Total actions/Per ZEC, ZEC→asset/asset→ZEC/Net, Raw/Token/Chain | Styled like the range presets. There is no group label, so on near-vol-mcap a user sees "ASSET TOKEN" and "7-DAY AVG" with no explanation. |
| 11 | **Series chips = legend** | Filled coloured pills (`span.chip role=button tabindex=0 aria-pressed`). Clicking one hides the series, and the chip becomes an outline | They double as legend and filter. The hidden state is subtle (fill becomes outline). Some charts instead use **in-chart right-aligned text legends** (realized, realized-all, tx, *-issuance, swap-assets), so the legend pattern is inconsistent. |
| 12 | **Chart SVG** | Fixed `viewBox` 1100×~347, scaled to the container. It re-renders at narrow widths (268×450 viewBox at 390px). Two faint "zecstats.com" watermarks inside the plot. A "Latest — <date>" box pinned at top-left inside the plot. A dashed vertical line at the latest point. Auto-labelled local extrema ("$1,649 / 2026-09") | **No `<clipPath>`**, so series outside the y-domain draw outside the plot (price 200 WMA draws below the x-axis labels). No `role`, `<title>`, `<desc>` or aria-label, so screen readers get nothing. |
| 13 | **Hover tooltip** | Crosshair (vertical plus dashed horizontal) with a box listing date and all series values | **Two tooltips at once**: the pinned "Latest" box stays while the hover box appears. No colour swatches in either box. Units are often missing. Hidden series stay in the totals (pools). Not keyboard-reachable. |
| 14 | **Status line** (some) | "✓ Complete — full chain history · 7-day average", "✓ Backpopulated — 100%…" | A useful data-completeness signal, but it appears on only about a third of the charts. |
| 15 | **Methodology / explainer** | H2 question ("Where does this price come from?", "Is this the only route?", …) plus 3–4 paragraphs with inline links | High-quality writing. The first H2 always sits **below** the chart. Some pages also put a bordered "How is this computed?" box here (pool-profit). |
| 16 | **Prev/next** | "← Shielded Pool Balances · Transparent Flows + Balance →" | Sometimes only one side ("MVRV: Price vs Cost Basis →"). |
| 17 | **READ THIS NEXT** | 3–5 curated links plus "Or something else we measure: <random chart>" | The random link is often irrelevant (price → "Pool Residency Time"). |
| 18 | **MORE <CATEGORY> CHARTS** | 2-column list of every chart in the same category, plus "All Zcash charts & tools →" | Repeats the READ THIS NEXT links. |
| 19 | **Footer** | "computed from a full node we run…", "How these numbers are produced", by @jeremiahrogers · Follow @zecstats_ · Donate 💚 | |

### Template issues (priority order)

1. **The chart sits below the fold.** At 1512×771 the plot starts at y≈500–575px, so only the top 200–250px of the chart shows on load. Expanding "Read the full description" pushes it down another ~200px. On a 390px phone the chart starts at about y=1065 (two full screens down). Everything above it (donation strip, intro, headline, range card, utility row, chips) competes with the one thing the page is for.
2. **The headline stat names the wrong metric on 3 pages.** This is a template or config bug:
   - shielding-rate: says "Shielded Tx Share was 48.62%", but the chart shows % supply shielded (29.3%).
   - tx-types: says "Sapling Outputs / Day was 384.57".
   - orchard-internal: says "Orchard Actions / Day was 326.43". That is the total, not the internal metric, and it has decimals on a count.
3. **"Latest" dates conflict on the same page.** The headline says "2026-10-09, the last full day". The pinned Latest box shows 2026-10-07 (pools, pool-usd, tx, tx-types, utxo, utxo-set, supply, velocity, orchard-internal), 2026-10-10 (utxo-depth), 2026-10-11 "(today, so far)" (shielding-rate, price, residency, volatility), or 2026-10-09 (new-addresses, total-fees). total-fees' headline says 2026-10-10. Users will see numbers that disagree within one screen (tx: headline 5,741 vs box 5,905).
4. **The default range is 3M for everything.** Slow stocks (supply, utxo-set, shielding-rate, residency, realized) look flat or meaningless at 3M. Defaults should be set per chart.
5. **No log-scale toggle anywhere** (time-series pages). Price on ALL is dominated by the 2016-10 launch print of $19,077, which flattens 10 years of history into a line at $0. The only log axes are fixed ones (near-vol-mcap, *-issuance) and they lack proper ticks.
6. **No clipping.** The price 200 WMA ($264) is below the 3M y-domain and renders under the x-axis tick labels. supply's "21M cap" label sits outside a y-axis that tops out at 20M.
7. **Spline smoothing on daily counts** (total-fees, tx, utxo, near-bridge mint/burn, orchard-internal, velocity, tx-types). Curves overshoot between days and invent shape, and weekly or monthly totals are also drawn as curves. Spiky discrete data needs columns, or a step line plus a rolling average.
8. **The two-tooltip problem.** The fixed "Latest" box plus the hover box show two values at once. The Latest box also covers data and x-axis labels on multi-panel charts (near-bridge, near-flow).
9. **Hiding the only series collapses the chart.** On shielding-rate, clicking "% supply shielded" removes the entire SVG and the page jumps. There is no empty state ("All series hidden — click a chip to show").
10. **Hidden series stay in tooltip totals** (pools: "Total: 16,905,853" still includes the hidden transparent series).
11. **Accessibility.** The SVG has no title or desc. The tooltip is mouse-only. The "Read the full description" expander is not a button. Range presets lack pressed state. Chips do have `role=button`, `aria-pressed` and a focus outline (good).
12. **Copy bugs.** swap-assets' expanded description shows a literal `&#39;s` (double-escaped entity). The volatility chip says "6mo" but the text says "90-day is the regime". volume-issuance's intro says "on-chain transfer volume" but the explainer says "reported trading volume".

---

## 2. Per-chart table

Legend: **HL** = headline stat sentence present. Controls listed are beyond the standard range card, utility row and annotations unless noted. "spline" = smoothed curve.

| slug | title | what it answers | chart type now | series | unit | controls | recommended chart type (reason) | issues |
|---|---|---|---|---|---|---|---|---|
| price | Zcash Price (ZEC/USD) | What is ZEC worth, and where is it vs its long-run trend? | Line (spline) + 2 dashed MA lines; extrema labels | price (yellow), 50 WMA (blue), 200 WMA (red) | USD | chips; annotations (upgrade lines); HL | **Line with log-scale toggle (default log on ≥1Y)**: multi-year price spans 3 orders of magnitude | 200 WMA renders below the x-axis (no clip). ALL range unreadable because of the 2016 $19k spike. Upgrade annotations miss Sapling, Canopy, Ironwood and halvings. MA colours (red/blue) look like buy/sell signals. Two tooltips. Date inputs DD/MM vs ISO elsewhere. |
| pools | Zcash Shielded Pool Balances | How much ZEC sits in each shielded pool and how it migrates | Stacked area | transparent, sprout, sapling, orchard, ironwood | ZEC | chips; HL ("Shielded Supply") | **Stacked area of the 4 shielded pools only, transparent off by default, plus a 100%-share toggle**: the title is "shielded" but transparent is 71% of the stack and squashes the layers | Transparent shown by default contradicts the title. Sprout (22k) is invisible. Tooltip Total includes hidden transparent. Tooltip has raw 8-digit numbers with no units or %. Chart ends 10-07 while the headline says 10-09. ALL view shows a zero-value "ironwood: 0" row before launch. |
| shielding-rate | Zcash Shielding Rate | What share of supply is shielded? | Single line (spline), extrema labels | % supply shielded | % | single chip; "Read the full description"; HL | **Area or line on a 0–100% fixed axis, with pool-composition stacked area as an option**: a share needs a fixed 0–100 frame for honest scale | Headline names the wrong metric (Shielded Tx Share 48.62%). Hiding the only chip collapses the chart. Extrema labels overlap at the right edge on ALL (29.3% / 25.6%). Latest box is "today, so far" (partial day) while the headline is "last full day". |
| near-bridge | Zcash Bridged to NEAR (OMFT) | How much ZEC is wrapped on NEAR and which way it's flowing | 2 stacked panels: line (supply) + 2 spline lines (mint/burn) | wrapped supply, daily mint (in), daily burn (out) | ZEC | chips | **Top: area of wrapped supply. Bottom: mirrored columns (mint up, burn down) + net line**: in/out flows are signed daily quantities, so bars show magnitude per day honestly | Splined daily flows. Second panel's "Latest" box covers the top of its plot. Green/red only (CVD risk). Upper panel y starts at 0, so the 146k variation is invisible. |
| near-flow | Zcash Swap Flow on NEAR Intents | Is net value flowing into or out of ZEC via NEAR, and against which asset? | 3 panels: stacked columns (in vs out by asset), net-flow columns, cumulative lines | 10 chips: BTC/ETH/other inbound, BTC/ETH/other outbound, net flow, cumulative net, cumulative BTC, cumulative ETH | USD | 10 chips; HL ("Net ZEC Flow") | **Diverging stacked columns (inbound above 0, outbound below) + one cumulative-net line panel**: puts direction on the axis instead of in 6 colours | 10 series. Colours reused across meanings (BTC inbound = cumulative BTC #2ad4ff; ETH inbound = cumulative ETH). Panels 2–3 are only 78px tall and the net-flow ±$20M axis flattens the data. Three "Latest" boxes overlap the x-axis labels. Headline -$13.45M vs box -$13,939 (different days). |
| near-vol-mcap | Zcash Swap Volume per $ of Market Cap | Is ZEC swapped more heavily (relative to size) than other assets? | Multi-line, log y (spaghetti) | ZEC, BTC, ETH, SOL, NEAR, ARB, LTC, TRON, BSC, WBTC | ratio (swap $ / mcap $) | Asset/Token toggle; 7-day avg toggle; 10 chips; **no HL** | **Highlight chart: ZEC in accent, others grey; plus a ranked bar of the trailing-30d average**: the question is "ZEC vs the rest", not 10 trajectories | Y ticks in scientific notation (1e-4, 1e-6, 1e-8), unreadable for most users. Express as "$ per $1M mcap" or bps. ETH uses the site accent #00ff66, so ZEC is not the hero. Toggles have no labels. |
| new-addresses | Zcash New Transparent Addresses | How many never-seen transparent addresses receive coins each day | Stacked area (7-day avg) | excl. mining, mining payouts | addresses/day | chips; HL; status line | **Columns of daily values + 7d avg line**: the counts are discrete, and the average alone hides spikes | Latest box uses jargon ("t1 / t3: 1,840 / 48"). Mining-payouts layer is 0, so the chip does nothing. Latest box date 10-09 vs other charts. |
| orchard-internal | Zcash Orchard Internal Activity | How much Orchard activity is fully shielded z→z vs crossing the boundary | 2 spline lines (solid + dashed total) | shielded (z-to-z), total orchard | actions/day (or per ZEC) | Total actions / Per ZEC toggle; chips; HL | **Stacked area (internal + boundary-crossing = total) with an "internal %" secondary panel**: part-of-whole should look like part-of-whole | Headline shows "Orchard Actions / Day 326.43" (wrong metric, decimals on a count). Total line #4f8a63 is low-contrast on #050a06. Chart ends 10-07. |
| pool-profit | Zcash Cost Basis & % in Profit by Pool | What share of each pool's coins is above or below today's price? | Small-multiple histograms (5 panels, log-price x), green/red by profit, "now $1k" marker | Transparent, Sprout, Sapling, Orchard, Ironwood | ZEC by cost-basis bucket | none (no range card); "plotted against" callout | **Keep small multiples, but share one x-axis across panels and use blue/orange (not green/red)**: the panels can only be compared if their axes match | Each panel has its own x-range (Sprout to $20k, Ironwood $500–$1k), so shapes aren't comparable. 5 panels in a 2-col grid leave an orphan. Panel sub-labels (MVRV, realized) are ~9px. Red/green CVD. |
| pool-residency | Zcash Pool Residency Time | How long coins sit in each pool before crossing a boundary | Multi-line | orchard, sapling, sprout, transparent, ironwood | days | chips; **no HL** | **Small multiples (one per pool, independent y) or log y**: transparent (1,784d) flattens everything else | Transparent line runs at the very top edge (clipped look). Sprout missing from the Latest box. Pool order differs from pools chart (orchard first here, transparent first there). |
| pool-usd | Zcash Pool Values (USD) | What is each pool worth in dollars? | Multi-line (7) | total supply, transparent, all shielded, orchard, ironwood, sapling, sprout | USD | chips; **no HL** | **Stacked area of the pools (sums to market cap); drop "total" and "all shielded" lines or make them outline-only**: mixing parts and totals as equal lines double-counts | **Pool colours conflict with other charts**: orchard is #00ff66 here vs #00f0c8 on pools/residency, and "all shielded" takes #00f0c8. Total supply line is purple, the same as "net flow"/"all shielded" elsewhere. Chart ends 10-07. Intro reads like code. |
| realized | Zcash Realized Price & Realized Cap | What did each pool pay for its coins vs spot? | 2 panels: multi-line (7) + MVRV area/line | realized (overall), spot price, transparent, sapling, orchard, sprout, ironwood; MVRV | USD; × | in-chart text legend (no chips); **no HL** | **Top: spot line (bold) + realized (bold) + pool realized lines in muted tones. Bottom: MVRV with 1.0× band**: emphasis is inverted now | **Spot price is a faint thin line while "realized overall" is bright green**, which inverts emphasis. Legend is a stack of tiny right-aligned labels, not toggleable. Latest box packs all 5 pool values on one line. |
| realized-all | Zcash Realized Price — All Pools Combined | Is the average coin in profit? (spot vs realized, MVRV) | 2 panels: spot area + realized line; MVRV line with 1.0× dashed break-even | realized price, spot price; MVRV | USD; × | in-chart legend; HL | **Keep; add log option on top panel, and colour MVRV zones (<1, 1–3.5, >3.5)** | **Duplicate y tick "$2K, $2K"** (1,500 rounded to $2K). Tick formatter loses precision. Good use of a break-even reference line. |
| supply | Zcash Supply: Total ZEC Mined | How much ZEC exists, and how close is the 21M cap? | Single line (zero-based) | supply | ZEC | **no chips**; HL | **Default ALL; area vs the scheduled emission curve with 21M cap line and halving markers**: at 3M a 0.3% change is a flat line | Default 3M gives a meaningless flat line. "21M cap" label floats above a y-axis capped at 20M, with no visible cap line. Chart ends 10-07. |
| survival | Zcash Coin Survival | Of coins created in week X, how many remain unspent at date Y? | Heatmap "retention triangle" + market-cap context strip | % surviving (colour), market cap strip | % / USD | none (no range card); "plotted against" callout; status line | **Keep the triangle, use a perceptual sequential ramp (viridis-like in greens), add cell hover and a legend with ticks** | **Colour-legend labels overlap** ("fully spent" collides with "100% surviving"). Y tick labels at irregular intervals (2026-09, 2025-10, 2024-10, 2023-11…). Rotated 9px axis title. Single-hue green has low dynamic range on black. The market-cap strip has no y-axis. |
| swap-assets | What Zcash Is Swapped For (NEAR Intents) | Which assets do people swap ZEC into and out of? | Stacked monthly columns (14 assets) | USD, eth, btc, sol, NEAR, ltc, bsc, tron, xrp, base, arb, wbtc… | USD | ZEC→asset / asset→ZEC / Net; Monthly / All time; Raw / Token / Chain; status line; no range card | **Monthly: stacked columns with top-5 + "other". All-time: horizontal ranked bar (diverging for Net)**: 14 categorical colours exceed what people can tell apart | **No y-axis ticks except "$0"**. 14-colour legend in tiny right-aligned text with inconsistent casing (eth / NEAR / USD). Empty leading months. Literal `&#39;s` in the expanded description. |
| total-fees | Zcash Total Fees Paid | What is the network's total fee bill? | Single spline line; "Both" gives 2 stacked panels (USD + ZEC) | total fees | USD / ZEC | USD/ZEC/Both; Daily/Weekly/Monthly; HL; status line; partial-period note | **Columns per period (daily/weekly/monthly totals) + rolling avg line**: totals per period are discrete bars, not a continuous curve | Weekly/monthly totals drawn as smoothed curves. Latest box over-rounds ("USD: $2K" vs headline $2,208). Headline date 10-10 vs the box's 10-09. Good: "Both" uses 2 panels instead of a dual axis, and partial periods are excluded with a note. |
| tx | Zcash Transactions per Day | How much is the chain used? | Spline line + 50w WMA line, extrema labels | tx/day (excl. coinbase) purple, 50w WMA green | tx/day | in-chart legend; HL | **Columns (daily) + 50w WMA line, or 7d MA line over faint daily points** | Spline exaggerates peaks. Headline 5,741 (10-09) vs Latest box 5,905 (10-07). Y labels as "25,000" while other charts use "5K", so number formats are inconsistent. |
| tx-issuance | Zcash vs Bitcoin: Daily Transactions | At the same point in emission, how used was ZEC vs BTC? | 2 lines on log y, x = coins issued (M) | Zcash, Bitcoin | tx/day | "50-week MA" checkbox; HL; "plotted against" callout; no range card | **Keep (good idea); add log ticks at every decade (100, 1k, 10k, 100k) and a "today" marker label** | **Log y-axis shows only one tick ("1,000")**, so values can't be read. Green (Zcash) and orange (Bitcoin) are fine. |
| tx-types | Zcash Transaction Types | What kinds of transactions (transparent / shielding / deshielding / z-to-z / mixed) happen daily? | Stacked area (spline) | transparent, shielding, deshielding, fully shielded, mixed | tx/day | chips; HL | **Stacked columns with a 100%-share toggle**: the key question ("how much is shielded?") is a share | Headline shows "Sapling Outputs / Day" (wrong metric). Transparent fill #7cc88d equals the body dim-text colour. Splined stacked area. |
| utxo | Zcash UTXO Churn | Is the transparent UTXO set growing or consolidating? | 2 spline lines | outputs created (green), inputs spent (red) | count/day | chips; **no HL** | **Net-change diverging columns (created − spent) with the two gross lines muted**: the explainer says "the gap, not either line, is what matters" | Gap not plotted. Red/green CVD. Spline. Chart ends 10-07. |
| utxo-age | Zcash Transparent ZEC by Age | How long have transparent coins sat unspent? | Stacked area | <30d, 30-180d, 180d-1y, 1-3y, 3y+ | ZEC | chips; **no HL**; status line | **Stacked area with an ordered sequential ramp (fresh = bright → dormant = dark), plus a 100% toggle**: age buckets are ordinal, not categorical | Rainbow categorical colours (green, teal, blue, purple, pink) on ordinal buckets. Data artefact dip around Aug 20 (also on utxo-depth). |
| utxo-depth | Zcash Transparent Coins by Depth | How many hops separate transparent coins from their coinbase? | Stacked area | coinbase, 1 hop, 2-3 hops, 4+ hops | ZEC | chips; **no HL**; status line | **100% stacked area or horizontal stacked bar for "now", ordered sequential ramp** | 4+ hops = 91%, so the other layers are slivers. Categorical colours on an ordinal variable. Latest box date 10-10 (yet another date). Aug 20 artefact. |
| utxo-set | Zcash UTXO Set Size | How many unspent transparent outputs exist? | Single line, zero-based | UTXO set | count | **no chips, no HL** | **Line with a non-zero (auto) baseline, or area + a net daily-change bar panel**: a 1% move on a 0-based axis is invisible | Flat line. Extrema labels repeat "9.1M" three times (rounding makes them useless). |
| velocity | Zcash Activity per ZEC | How hard is each pool's value working? | Multi-line (6, spline) | all shielded, orchard, ironwood, sapling, sprout, transparent | actions / ZEC / day | chips; **no HL** | **Small multiples, or scale to "actions per 1,000 ZEC"**: values like 0.0002 are unreadable, and units differ across pools | Y labels "0.012, 0.010, 0.0080…" have inconsistent decimals. Extrema labels "0.001 / 0.000" are rounded to nothing. The explainer admits the pools aren't comparable, yet they share one axis. |
| vol-issuance | Zcash vs Bitcoin: 30-Day Volatility | At the same emission point, was ZEC more volatile than BTC? | 2 lines, x = coins issued | Zcash, Bitcoin | % annualised | 50-week MA checkbox; HL; callout | **Keep; add y ticks (25/50/100/150%) and the 50w MA on by default**: 30d vol is very noisy | **Y-axis shows only "0%"**, so values can't be read off the chart. |
| volatility | Zcash vs Bitcoin Volatility | Is ZEC more volatile than BTC right now, at several horizons? | Multi-line (6) | ZEC 7d/30d/6mo, BTC 7d/30d/6mo | % annualised | chips; **no HL** | **Two hue families (ZEC = green tints, BTC = orange tints) × line-weight or dash by window; default show 30d only**: 6 unrelated hues hide the ZEC-vs-BTC pairing | Hues not grouped by asset (ZEC = yellow/green/teal, BTC = orange/pink/purple). Chip says "6mo", text says "90-day". |
| volume-issuance | Zcash vs Bitcoin: Daily Volume | At the same emission point, how much value moved on ZEC vs BTC? | 2 lines, log y, x = coins issued | Zcash, Bitcoin | USD/day | 50-week MA checkbox; **no HL**; callout | **Keep; log ticks per decade; clarify the metric** | **Only one y tick ("$10K")**. Intro says "on-chain transfer volume" but the explainer says "reported trading volume", a metric definition conflict. |
| zec-btc-ratio | Zcash vs Bitcoin: the ZEC/BTC Ratio | Is ZEC out- or under-performing BTC? | Single spline line, zero-based, extrema labels | ZEC/BTC | BTC | **no chips**; HL | **Line with log toggle; show units as sats or ×10⁻² and add a "1.0 = parity at X" reference** | 5-decimal labels everywhere (0.01462). Zero baseline wastes about 40% of the plot at 3M. |

---

## 3. Recurring dataviz problems

### Colour
- **The accent is overloaded.** #00ff66 (the brand neon) is used as a series colour for: Zcash (issuance charts), ETH (near-vol-mcap), orchard (pool-usd), ZEC 30d (volatility), outputs created (utxo), daily mint (near-bridge), <30d (utxo-age), 1 hop (utxo-depth). It is also the UI active-state colour. Nothing stands out because everything is the accent.
- **Pool colours are not a fixed system.** Orchard is #00f0c8 on pools/residency/velocity but #00ff66 on pool-usd. "All shielded" is #00f0c8 on pool-usd but #c264ff on velocity. Transparent is #4f8a63 (pools, residency, pool-usd, velocity) but #7cc88d (tx-types). Pool order also changes by chart. Pools are the site's core entities and should have locked colours and a locked order (transparent → sprout → sapling → orchard → ironwood).
- **Colours reused for different meanings on the same page** (near-flow: BTC inbound = cumulative BTC). Purple #c264ff means "total supply", "net flow", "all shielded", "SOL" and "BTC 6mo" across pages.
- **Red/green as the only encoding** on utxo, near-bridge, pool-profit and price MAs. About 8% of men can't tell these apart. Pair with blue/orange or add shape.
- **Categorical palettes on ordinal data** (utxo-age, utxo-depth, survival's single hue). Use ordered ramps.
- **Low-contrast series**: #4f8a63 dashed or thin lines on #050a06 (orchard-internal total, transparent fills), and the faint spot price on realized.
- **Series colour equals text colour**: tx-types transparent fill uses #7cc88d, the body "dim" text token.

### Legend
- Three legend systems: (a) filled chips above the chart (toggleable), (b) right-aligned in-plot text labels (not toggleable: realized, tx, issuance, swap-assets), (c) none (supply, utxo-set, zec-btc-ratio). Pick one.
- The chip off-state (outline) is easy to miss. There's no "show all / only this" and no count of hidden series.
- swap-assets has a 14-entry, ~9px legend with mixed casing.

### Axes
- Only the y-axis has tick labels, with no axis title or unit. "5K", "15.0M" and "0.012" give no unit. Units appear only in the tooltip, if at all.
- Inconsistent number formats: "25,000" (tx) vs "5K" (new-addresses) vs "15.0M" vs "0.0080" vs "1e-6".
- The tick formatter rounds into duplicates ("$2K, $2K" on realized-all).
- Zero-baseline lines for slow stocks (supply, utxo-set, zec-btc-ratio, near-bridge supply) flatten the signal. Area charts need zero; lines do not.
- Rotated x labels (-30°) on every chart, even at desktop width with plenty of room.
- Inconsistent tick density on survival.

### Dual axes
- None found (good). Multi-unit views use stacked panels instead (total-fees Both, realized MVRV, near-bridge, near-flow). Panels are sometimes too short to read (near-flow panels 2–3 are 78px).

### Log scales
- No user log toggle on any time series. Price, ZEC/BTC, tx and pool-usd over ALL all need one.
- The fixed log axes (tx-issuance, volume-issuance, near-vol-mcap) have 1 tick or scientific notation. vol-issuance shows only "0%".

### Too many series
- near-flow (10), near-vol-mcap (10), swap-assets (14), pool-usd (7), realized (7), volatility (6), velocity (6). Default to 2–4 visible series and offer the rest via chips, or use highlight-plus-grey.

### Tooltips
- A pinned "Latest" box and the hover box show at the same time.
- No colour swatches, no units on most, raw unformatted big integers (pools), over-rounding (total-fees "$2K"), jargon (t1/t3).
- Totals include hidden series (pools).
- Rows show for zero-value or pre-launch series ("ironwood: 0" in 2024).
- Mouse-only. No keyboard or touch scrubbing confirmed.

### Smoothing
- Spline interpolation on discrete daily or period totals (fees, tx, utxo, mint/burn, velocity, tx-types, orchard-internal). It overshoots and misrepresents peaks. Use linear or step lines, or columns.

### Annotations and extrema labels
- Auto extrema labels collide (shielding-rate ALL), round to meaningless values (velocity "0.000", utxo-set "9.1M ×3"), and add clutter on 3M ranges (price shows 10 labels).
- The upgrade annotation set is incomplete (no Sapling, Canopy, Ironwood or halvings) and the labels crowd at the top (Blossom and Heartwood touch).

### Empty, stale and partial states
- Hiding all series removes the SVG entirely (shielding-rate). There's no empty-state message.
- Charts end on different dates (10-07 / 10-09 / 10-10 / 10-11) with no per-chart "data through" stamp near the plot. The status line ("✓ Complete") exists on only some charts.
- "Today, so far" partial days are mixed into some charts (shielding-rate, price) while others exclude partial periods with a note (total-fees: good pattern, make it universal).
- Wrong-metric headlines on 3 pages, and no headline on about 12 of 29.
- Data artefact (sharp dip around Aug 20) on utxo-age and utxo-depth, with no annotation.

### Mobile risk (390px iframe test on pools)
- The chart re-renders to a 268×450 portrait viewBox, so it doesn't just shrink (good). But the y-axis gutter takes about 35% of the width, the plot is ~220px wide, and there are only 3 x ticks.
- 5 chips wrap to two rows. The utility row wraps (Download CSV on its own line). Range presets get cramped.
- The chart starts about 2 screens down. The Latest box was not visible at 390px.
- Multi-panel charts (near-flow with 3 panels, realized with 2) and small multiples (pool-profit with 5) were not tested on mobile and are the highest-risk pages.
- No pinch or zoom gesture, and no touch scrubbing confirmed.

---

## 4. Grouping and filtering the 58 charts

The current /tools categories (counts as listed): Supply & Emission 8 · Market & Valuation 12 · Privacy Adoption 10 · Usage & Activity 8 · Holders & Coin Age 9 · Mining & Security 2 · Hyperliquid Derivatives 3 · Exchange Volume 2 · Access & Liquidity 4 charts (+5 non-chart links).

**Misfiles and overlaps seen:**
- Market Cap (USD) sits under Supply & Emission. It belongs under Market.
- The four "by coins issued" ZEC-vs-BTC charts sit under Supply. They form one family with zec-btc-ratio, volatility and fdv-vs-btc (Market). Today the BTC comparison is split across two categories.
- pool-residency sits under Holders, while every other pool chart is under Privacy.
- Exchange Volume (2) and Hyperliquid Derivatives (3) are tiny categories. Merge them into "Markets & Trading".
- There are 5 overlapping cost-basis views (mvrv, realized-all, realized, cost-basis, pool-profit). Users can't tell which to open.
- utxo, utxo-set, utxo-age and utxo-depth are 4 views of one object.

**Suggested structure (question-led, 7 groups):**
1. **Price & valuation**: price, market-cap, zec-btc-ratio, fdv-vs-btc, implied-mcap, etf-holdings
2. **Cost basis (are holders in profit?)**: realized-all (hub), mvrv, realized, cost-basis, pool-profit, pool-usd
3. **Privacy: how much is shielded**: shielding-rate (hub), pools, anonymity, flow-* (5), flow-compare, orchard-internal, pool-residency
4. **Usage**: tx (hub), tx-types, new-addresses, velocity, density, block-size, total-fees, fees
5. **Transparent holders**: utxo-set (hub), utxo, utxo-age, utxo-depth, age-pct, mean-coin-age, dormant, survival
6. **Supply & security**: supply, inflation, dev-fund, hashrate, implied-gw
7. **Markets & cross-chain**: near-flow (hub), near-bridge, swap-assets, near-vol-mcap, exch-vol, exch-vol-pct, hl-funding, hl-volume, hl-oi
- **Cross-cutting collection "ZEC vs BTC"** (a tag, not a folder): zec-btc-ratio, volatility, fdv-vs-btc, mktcap-issuance, tx-issuance, volume-issuance, vol-issuance.

**Filters and facets worth adding to the index:**
- **Entity**: Transparent / Sprout / Sapling / Orchard / Ironwood / All pools / NEAR / BTC comparison. Pools are the site's core dimension.
- **Unit**: ZEC · USD · count · % · ratio. Helps users find "the USD version".
- **Source**: node-exact vs external (price-derived, NEAR, Hyperliquid). The site's own methodology stresses this split.
- **Chart form**: time series / distribution / cohort / issuance-aligned. These match the existing "plotted against" callouts.
- **Freshness**: daily / weekly snapshot / monthly, plus a "data through" date.
- **Level**: Start here (one hub per group, ~7 charts) vs Deep dive. Mark the hub chart in each group and show the rest as "related views of the same thing" (for example, tabs on one page for utxo / utxo-set / utxo-age / utxo-depth).
- **Search with synonyms** (e.g. "z-to-z" → orchard-internal, "cost basis" → realized-all).
