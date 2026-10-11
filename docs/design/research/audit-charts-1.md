# zecstats.com chart pages audit, part 1 (29 slugs, age-pct to mvrv)

Audited 2026-10-11 on the live site, desktop viewport 1512x771. The mobile check used a 390px same-origin iframe on age-pct only. All 29 pages loaded and rendered a chart. None was fully broken, but several have data or labelling bugs (listed below and marked **BUG**).
Screenshots: `scratchpad/shots/chart-<slug>-<n>.jpg`.

---

## 1. Chart page template anatomy

Every `/chart/<slug>` page uses one template. The page is a single column, max-width ~1200px, with server-rendered HTML and client-drawn SVG. Regions from top to bottom:

| # | Region | What it is | Notes / issues |
|---|---|---|---|
| 1 | **Top bar** (`.top-bar`) | `← ZEC Stats` wordmark, then Tools & Charts, Metrics, Calculator, News, More ▾ (≈15-link `<details>` menu), LIGHT theme toggle | The theme toggle reads "LIGHT" (it names the action, not the current state). The More menu hides most of the site. On mobile it becomes a hamburger with the search field moved to the top. |
| 2 | **Promo strip** | `ZECSTATS` badge, "Feeling Generous? — Help ZECStats pay server bills…", and a "Search charts and tools…" box on the right | The donation ask sits above the page title on every chart. Search is the only way to jump between the 58 charts without going back to /tools. |
| 3 | **Breadcrumb** (`nav.crumbs`) | `Tools & Charts › <title>` | Only 1 level deep, with no category level such as "Privacy › Flows". |
| 4 | **H1** (`#chart-title`) | e.g. "Zcash Transparent Age Distribution" | JetBrains Mono 32px, neon #00ff66. **Orbitron is not used anywhere on chart pages** (checked computed styles). The H1 has no glow, unlike the brand description. |
| 5 | **Lead** (`#chart-desc .page-lead`) | 1 paragraph, max-width 720px, 15.2px, #9bdcab | Length varies a lot: age-pct shows ~6 lines inline, while anonymity and cost-basis collapse the rest behind a "Read the full description" `<summary>`. The lead repeats the explainer below. |
| 6 | **"Now" sentence** (`p.chart-now`) | e.g. "Avg Block Size was 32 KB on 2026-10-09, the last full day of data. That is 43.1% lower than 28 days ago…" | This is the only headline number, and it is plain prose rather than a KPI tile. It appears on only 12 of 29 pages. Its 28-day window is unexplained. **BUG: on 6 pages it reports a different metric from the chart or has no unit** (see §2). |
| 6b | Inline note (some pages) | e.g. "This chart is plotted against ZEC amount, not date", or dev-fund's "53.3% of the deferred dev fund has been paid out" | Useful. Style and position are ad hoc. |
| 7 | **Range bar** (`.range-bar`, bordered card) | `RANGE` label, 2 native date inputs, a dual-thumb slider spanning 2016→today, presets 1M 3M 6M 9M 1Y 5Y YTD ALL, and an ANNOTATIONS toggle at the far right | The default is **3M** on every date chart, including slow metrics (inflation, dev-fund, ETF, dormant, coin age), where 3M shows a flat line. The slider always spans the full chain, even for datasets that start in 2025 (hl-*, exch-vol), so presets can produce "No data in range". Preset buttons are 32x22px with a 10.4px font (small tap target), and the active preset has no `aria-pressed`. The `RANGE` label is not bound to an input. On mobile the date inputs truncate ("11/07/202") and the thumbs overlap at the right end. **The range bar still shows on implied-gw (x-axis is coins issued, so it does nothing) but is hidden on mktcap-issuance and anonymity**, which is inconsistent. |
| 8 | **Action row** | 🔗 permalink · ⬇ Download PNG · ⬇ Download CSV · ⇆ compare (`/compare?charts=<slug>`) | Good set. Emoji icons sit next to text-glyph icons. Permalink and compare are links styled differently from the two buttons. There is no share or embed option. The URL keeps state (`from`, `to`, `ann=1`, `aphide=…`), which is good. |
| 9 | (hidden) `#related-links`, `#event-banner` | Empty 0-height divs on all 29 pages | Dead template slots. |
| 10 | **Series chips** (`.chip-legend`) | Filled pastel/neon pill per series with dark text. Click to hide (becomes an outline). `role=button`, `tabindex=0`, `aria-pressed` | This is the legend and the toggle in one. It sits **above** the chart, away from the lines. Pages with secondary controls (fees, exch-vol, hl-*, implied-mcap) stack 2–3 rows of chips and buttons in different styles (DAILY/WEEKLY/MONTHLY, ZAT/USD, MAJOR/ALL, 7-DAY AVG). |
| 11 | **Chart** (`#fullchart svg`) | Hand-rolled SVG, viewBox 1100×347 on desktop (separate 266-wide layout on mobile, so it is responsive). Cubic-Bezier smoothed lines, 1.5px strokes, dashed vertical "today" line in neon. **3 diagonal "zecstats.com" watermarks inside the plot** | Axis text is **11px UA `sans-serif`**, not the brand mono. Y-axes have no unit title except on a few pages ("actions/shielded tx", "zatoshi · daily", "market cap (USD)", top-right in tiny text). Rotated x labels (≈30°). There are local min/max "extrema" labels ("2026-09 / 133K") on many single-series charts. The SVG has no `role`, `aria-label`, `<title>` or `<desc>`, and there is no data-table fallback. |
| 12 | **"Latest" overlay box** | Fixed card in a plot corner: "Latest — 2026-10-07 / value lines" | It covers data in the top-left on most charts. **BUG (age-pct): the box drops every "< X" series and shows "30 days: 74.9%"** because the "<" and ">" labels are injected as HTML. When "> 30 days" is hidden it shows "6 months: 48.0%" (prefix lost again). **BUG (all 2-panel charts): the lower-panel box shows only the date plus "… hover the chart for the rest", with no values** (flow-*, hashrate, inflation). fees and implied-mcap also truncate with "… hover the chart for the rest". It is not shown on mobile. |
| 13 | **Hover tooltip** (`#tt`) | Crosshair (vertical plus horizontal), and a dark card listing date and every series value | Monochrome, with **no colour swatches**, so 8–9-series charts (age-pct, fees) can't be matched to lines. Rows follow series order, not value order. Narrative tooltips on anonymity are excellent ("Your anonymity set: 3,003 possible sources"). **No tooltip at all on exch-vol and exch-vol-pct.** `#tt` has no `aria-live`. |
| 14 | **Status line** | "✓ Complete — 93 snapshots across full chain history", "complete 2025-11-23 → 2026-10-09 · major venues" | Present on 7 of 29 pages, in two different formats and cases. It is a good idea that is used inconsistently. |
| 15 | **Explainer** (`section.explainer`) | H2 question plus 3–5 bold-lead paragraphs, max-width ~720px, with inline links to sibling charts | The copy is high quality and opinionated. **Copy bug:** age-pct and mean-coin-age both use the H2 "What does spent mean here?", which does not match their content. There is no separate methodology section; the footer links to one global page. |
| 16 | **Prev/next trail** (`nav.trail`) | "← Mean Transparent Coin Age · Coin Survival →" | It is a linear sequence through a category with no indication of position (e.g. "3 of 9"). |
| 17 | **"READ THIS NEXT"** (`section.next-up`) | 0–4 curated links, plus "Or something else we measure: <random chart>" | **Renders as an empty heading on 11 of 29 pages** (age-pct, density, dormant, flow-sapling, flow-sprout, flow-transparent, hl-volume, implied-gw, implied-mcap, mean-coin-age, mktcap-issuance). |
| 18 | **"MORE <CATEGORY> CHARTS"** (`section.related`) | Plain list of 7–9 sibling links plus "All Zcash charts & tools →" | This exposes the site taxonomy (Holders & Coin Age, Privacy Adoption, Usage & Activity, …). It is text-only, with no thumbnails or sparklines. |
| 19 | **Footer** | Provenance line ("computed from a full node we run…"), author, X handle, Donate 💚 | The provenance line is a real trust asset but is easy to miss. |

### Template-level issues, ranked
1. **Data-integrity display bugs:** the "now" sentence names the wrong series (§2), the "Latest" box loses labels, and the lower-panel box is empty. These read as wrong numbers to a careful visitor.
2. **Three "latest" dates on one page.** block-size shows the range end 10-11, the "now" sentence 10-09 and the Latest box 10-07, with values of 32 KB and 30,020 bytes. Freshness is not stated anywhere except the status line.
3. **Curve smoothing on sparse or step data** (cubic Bezier) invents peaks and troughs between points. Examples: age-pct ALL shows lens-shaped overshoots between 255 snapshots, flow spikes look 3 days wide, and anonymity buckets look continuous.
4. **The 3M default** hides the story on slow or structural metrics.
5. **Legend far from the data**, tooltips without swatches, and a corner overlay that hides data.
6. **No accessible alternative** (no SVG title, no table, no colour-independent encoding).
7. **Unbounded range control** (the slider runs 2016→ for 2025-only datasets), and the empty state is just "No data in range" with a layout collapse.

---

## 2. Per-chart table

Abbreviations: R = range bar plus presets plus annotations; C = series chips; ✱ = bug.

| slug | title | what it answers | chart type now | series | unit | controls | recommended chart type (dataviz reason) | issues |
|---|---|---|---|---|---|---|---|---|
| age-pct | Zcash Transparent Age Distribution | How much transparent ZEC is young vs dormant, and is old money waking up? | 8 smoothed lines, 0–100% | <30d, <6m, <1y, <3y, >30d, >6m, >1y, >3y | % of transparent ZEC | R, C(8), annotations | **100% stacked area of 5 disjoint bands** (0–30d, 30d–6m, 6m–1y, 1–3y, >3y). Each "<X"/">X" pair sums to 100%, so half the lines are redundant. | ✱Latest box drops all "<" series and eats prefixes. 8-colour rainbow. Smoothing overshoot on ALL. Heading "What does spent mean here?" doesn't match the content. Empty READ-NEXT. Annotation labels collide (Blossom/Heartwood). |
| anonymity | Zcash Shielded Anonymity Set | If I deshield X ZEC, how many shields could be my source? | 2 smoothed lines, log-x amount (0.01→10K), linear-y count | shielding (in), deshielding (out) | tx count | C(2), no range | **Log-y step chart (ECDF-style)** plus a "type your amount" input. The tail (>100 ZEC), where privacy actually fails, is flattened to 0 on linear y. Data is bucketed (tooltip "~1K-10K"), so draw steps, not curves. | The y-axis title is a rotated ellipsis phrase ("...this many txs could be the source"). The best tooltip on the site; reuse its pattern. |
| block-size | Zcash Average Block Size | How heavy are blocks (a proxy for shielded mix and spam)? | 1 smoothed line plus extrema labels | avg block | bytes (axis "150K", headline "KB") | R | **Line with a log/linear toggle, plus a 7-day mean**. ALL is dominated by the 2022–23 1.1M spam spike, so everything else is flat. Annotate the spam event. | ✱Headline 32 KB on 10-09 vs Latest 30,020 bytes on 10-07. Units mix bytes/KB/K. Extrema labels collide at the right end. No unit on axis. |
| cost-basis | Zcash Pool Acquisition Price | What did the average coin in each pool cost, vs spot? | 6 lines (spot dotted) | spot, orchard, ironwood, sapling, transparent, sprout | USD | R, C(6) | **Line with spot as a bold reference, or a dot plot "pool basis vs spot today"** plus a small-multiple history. | ✱The y-axis is non-linear but unlabeled ($0, $500, $1K, $2K are equally spaced, a symlog posing as linear). ✱Extrema labels repeat "$302.76" six times on a flat Orchard line. No "now" sentence. |
| density | Zcash Shielded Action Density | How many actions does a shielded tx carry? | 1 smoothed line | density | actions/shielded tx | R | **Line plus a 7-day mean**, fine as is. | ✱Extrema labels print raw floats ("6.713111644961436"). ✱The "now" sentence reports *Shielded Actions/Day = 8,528*, a different metric. Empty READ-NEXT. |
| dev-fund | Zcash Dev Fund Paid Out | How much of the lockbox accrual has been disbursed? | 3 lines | Accrued (cum), Paid out (cum), Lockbox balance | ZEC | R, C(3) | **Stacked area: paid + lockbox = accrued**, with paid-out as a step. It is part-to-whole and currently shown as 3 independent lines. Default to ALL (since NU6). | Paid-out is a lumpy step drawn smoothly. Ticks "150,000" vs "150K" elsewhere. No unit on axis. 3M hides the 2024 start. |
| dormant | Zcash Dormant Coins | How much ZEC created each week is still unspent? | Overlaid bars (created green, surviving red inside) | created, surviving | ZEC | R, C(2) | **Bar of surviving % per cohort (or a heatmap: cohort week × age)**. The red sliver (2–25%) is unreadable inside 20M bars. | Red/green pair (colour-blind clash). The axis has no unit ("20.0M"). Only 10 bars at 3M, but "516 weekly snapshots" exist. Empty READ-NEXT. |
| etf-holdings | Zcash ETF Holdings | How much ZEC does the ETF hold, and what share of supply? | 3 stacked panels: line, line, bars | held, % of supply, net flow | ZEC, % | R (ignored) | **Step line with markers** (quarterly filings). Keep the small multiples. Drop the symmetric ±200k axis on net flow. | The range shows 3M active while the chart shows 2019–2026 (an explanatory note exists, but the control lies). Ticks use lowercase "k". "167.471k" is over-precise. Net-flow axis has an empty negative half. |
| exch-vol | Zcash Volume by Exchange | Where does ZEC trade, and how much? | Stacked bars (weekly default) | Binance, Poloniex, Coinbase, KuCoin, OKX, Kraken, Gate | USD | R, DAILY/WEEKLY/MONTHLY, MAJOR/ALL | **Stacked bar is right; sort stacks by size and add a 100% toggle.** Put "Other" in grey. | ✱No hover tooltip. Legend is a dot row **below** the chart, unlike the chips elsewhere, and not toggleable. Duplicate x labels ("2026-07, 2026-07"). The lead says "Daily" but the default is Weekly. 7 rainbow colours, and Coinbase green equals the brand accent. Data from 2025-11 only, but ALL spans to 2016. |
| exch-vol-pct | Zcash Share of Market Volume | What share of the venues' total volume is ZEC? | 1 smoothed line with point markers | share | % | same as above | **Line (unsmoothed) or columns**; it is weekly data with 13 points. | ✱No tooltip. Duplicate x labels. Status line in lowercase format. |
| fdv-vs-btc | Zcash vs Bitcoin: Fully Diluted Value | How big is ZEC relative to BTC? | 2 lines | FDV ratio, market-cap ratio | % of BTC | R | **Single line (FDV%) with market-cap% as a faint companion, or a ribbon between them**. The two move in lockstep. | Direct labels sit stacked in the top-right corner, not at line ends. Ticks "0.50%" vs "2.0%". The tooltip mixes "$25,689M" and "$1,741B". Orange is used for FDV here but means BTC on other pages. |
| fees | Zcash Fee Distribution | What does a typical tx pay, and how skewed is it? | 9 lines on log-y | max, p99, p90, p75, mean, median, p25, p10, min | zat or USD | R, C(9), ZAT/USD, DAILY/WEEKLY/MONTHLY | **Percentile fan: shaded p10–p90 band, darker p25–p75, median line, mean dashed**, with max/min hidden by default. 9 rainbow lines is a spaghetti chart. | ✱The log axis has a "0" tick under 3K (log can't show 0). Latest box truncated. Chips p10 and min are near-invisible dull greens. |
| flow-compare | Zcash Net Pool Flows Comparison | When one pool loses, does another gain? | 5 smoothed lines around 0 | transparent, sapling, orchard, ironwood, sprout | ZEC/day | R, C(5) | **Diverging bars in small multiples (one row per pool, shared y)**, or a stacked diverging bar per day, so mirrored migrations line up. | ✱Negative ticks print "-100000" and "-200000" unformatted (positive ticks are "200K"). The transparent line (#4f8a63) is low-contrast. Smoothing turns single-day moves into humps. |
| flow-ironwood | Zcash Ironwood Flows + Balance | How is the Ironwood balance changing, and via what flows? | 2 panels: balance line, inflow/outflow lines | balance, inflow, outflow | ZEC | R | **Balance area on top; inflow up / outflow down mirrored bars below** (a standard flow chart). | ✱The lower Latest box is empty. Outflow red is flat at 0 and invisible. The top panel is only 182px. No chips. |
| flow-orchard | Zcash Orchard Flows + Balance | same, for Orchard | same | same | ZEC | R | same | ✱Empty lower box. Outflow red, inflow teal. |
| flow-sapling | Zcash Sapling Flows + Balance | same, for Sapling | same | same | ZEC | R | same | ✱Empty lower box. **Outflow is orange here but red on the other pools** (inconsistent semantics). Empty READ-NEXT. |
| flow-sprout | Zcash Sprout Flows + Balance | same, for Sprout | same | same | ZEC | R | same | ✱Empty lower box. **Inflow #ff6fa0 vs outflow #ff3b4e are both pink-red and indistinguishable.** One-day spikes are smoothed to about 3 days. |
| flow-transparent | Zcash Transparent Flows + Balance | Net transparent balance and (de)shielding flows | same | same | ZEC | R | same; label inflow as "deshield in" and outflow as "shield out" | ✱The "now" sentence reports *Transparent Volume/Day 881,125 ZEC*, not this chart's metric. The 11.9M balance sits above the top tick (10.0M), hugging the frame. Dull-green inflow is nearly invisible. |
| hashrate | Zcash Hashrate & Mining Difficulty | Is mining security growing? | Panel 1: line; panel 2: green/red Δ% bars | hashrate (diff in tooltip only), difficulty Δ% | "G" / "GH/s" / Sol/s | R, "☐ hashrate only" checkbox inside the SVG | **Line plus a 7-day MA; the Δ% bars are fine but should use a diverging blue/orange pair.** Plot difficulty on a matched second panel instead of only in the tooltip. | ✱The "now" sentence says "29.95B" with no unit, while the axis says "30.0G" and the tooltip "30.39 GH/s". The lead says solutions/s but labels say H/s. Empty lower box. The title promises difficulty, but it is not plotted. Green/red bars. |
| hl-funding | Zcash Perp Funding Rate — ZEC vs BTC | Are traders paying to be long ZEC vs BTC? | 2 lines | ZEC, BTC | % APR | R, C(2), 7-DAY AVG | **Line with a 0% reference line and a spread (ZEC−BTC) area beneath.** The question is the spread. | ✱The "now" sentence reports *BTC* funding on a ZEC page. The y-axis floor sits at 0% when funding can be negative. |
| hl-oi | Zcash Perp Open Interest — ZEC vs BTC | How much leverage is on ZEC vs BTC? | 2 lines, log-y | ZEC, BTC | USD | R, C(2), 7-DAY AVG | **Ratio line (ZEC OI / BTC OI)**; the log overlay leaves the reader to compute the gap. | ✱The "now" sentence reports *BTC* OI. The log axis is unlabeled as log on the chart. "$300.0M" is over-precise. Data starts Jul 14; ALL/5Y give empty space and pre-2025 ranges give "No data in range" (see empty-state shot). |
| hl-volume | Zcash Perp Volume — ZEC vs BTC | Relative perp trading activity | 2 lines, log-y | ZEC, BTC | USD | R, C(2), 7-DAY AVG | **Ratio line, or columns for ZEC with BTC as a reference line.** | ✱The "now" sentence reports *BTC* volume. ✱The lead says "ZEC on the left axis…" (dual axis) but the explainer says "both share one logarithmic axis". Empty READ-NEXT. |
| implied-gw | Zcash Implied Mining Power — ZEC vs BTC | At the same issuance point, how much power secured each chain? | 2 lines on log-y, x = coins issued | Zcash, Bitcoin | W (0.1 W→10 GW) | R (inert), "50-week MA" checkbox in the SVG | **Keep the issuance-aligned x; add log-y labels and direct line-end labels.** | ✱**Y tick labels 1 W…10 GW are in the DOM but not visible**; only "0.1 W" renders. The range bar does nothing on this x-axis. "0M" x tick. The legend is stacked text in the top-right. ZEC is green here but teal on hl-*. |
| implied-mcap | Zcash Activity-Implied Market Cap (ZEC) | If ZEC activity were priced like BTC's, what would the market cap be? | 7 lines on log-y (actual dashed) | actual, on-chain vol, txs, mining energy, perp vol, perp OI, BTC mcap @ issuance | USD (or price) | R, C(7), MARKET CAP / PRICE PER ZEC, 7-DAY AVG | **Dot plot of "multiple of actual" for today** (5.7×, 0.2×, 18.9×…) plus small multiples for history. 7 crossing log lines is unreadable. | The only page with a "Log scale — each gridline is 10×" note (good; copy it everywhere). Latest box truncated. Chips wrap to 2 rows. |
| inflation | Zcash Daily Emission + Inflation Rate | How fast is supply growing? | 2 panels: inflation line, emission line | inflation %/yr, emission ZEC/day | %, ZEC | R | **Step line over ALL with halvings annotated.** At 3M both are flat lines. | ✱Empty lower box. Extrema labels on a near-flat line (3.43%/3.43%/3.33%…) are noise. Default 3M. |
| market-cap | Zcash Market Cap (USD) | What is ZEC worth in total? | 1 smoothed line plus extrema labels | market cap | USD | R | **Line with a log toggle; overlay or link the FDV.** This is nearly a duplicate of price. | ✱The "now" sentence says $20.50B on 10-09, the Latest box $22.52B on 10-07. The data lags 4 days behind price-based fdv-vs-btc (10-11). |
| mean-coin-age | Zcash Mean Transparent Coin Age | Are transparent holders holding longer? | 1 line | mean age | days | R | **Line plus a median, or paired with age-pct bands.** | Extrema "400d" labelled twice. ✱H2 "What does spent mean here?" (reused). Empty READ-NEXT. |
| mktcap-issuance | Zcash Market Cap by Coins Issued — ZEC vs BTC | At equal issuance, how does ZEC's market cap compare with BTC's? | 2 lines on log-y, x = coins issued | Zcash, Bitcoin | USD | "50-week MA" checkbox, no range | **Same as implied-gw; consider a ratio line (ZEC/BTC at equal issuance).** | ✱Same invisible y-labels bug (only "$1M" shows). Range hidden here but shown on implied-gw. Empty READ-NEXT. |
| mvrv | Zcash MVRV: Price vs Cost Basis | Is the average coin in profit? | Line with green/red fill vs a 1.0× break-even reference | MVRV | × | R | **Keep it. This is the best-designed chart in the set** (reference line, threshold fill, unit in title). Add a log toggle for ALL. | Purple line on green fill (colour logic unclear). Spot $1223.27 here vs $1222.51 on cost-basis for the same day. |

---

## 3. Recurring dataviz problems

**Colour**
- Fixed categorical palette (#00ff66, #00f0c8, #3b8dff, #b48bff, #f5e017, #ff9e2c, #ff6fa0, #ff3b4e, #4f8a63, #c264ff, #2ad4ff) used as a rainbow. It runs to 8–9 hues on age-pct and fees, beyond what anyone can tell apart.
- **Pool colours are consistent** (transparent #4f8a63, sapling #3b8dff, orchard #00f0c8, ironwood #b48bff, sprout #ff6fa0). Keep and formalise them. But **transparent's dull green has low contrast** on #050a06, and **sprout pink collides with the outflow red**.
- **Asset colours are not consistent:** BTC is orange on hl-* and implied-*, but orange means "FDV" on fdv-vs-btc. ZEC is teal on hl-* but neon green on implied-gw and mktcap-issuance.
- **Semantic colours are not consistent:** outflow is red on 4 pools and orange on Sapling. Green/red is used for up/down (hashrate Δ, dormant, MVRV), which is the worst pair for deuteranopia.
- The brand neon #00ff66 is also a data colour (age-pct "<30d", Coinbase, hashrate, ZEC), so UI accent and data compete.

**Legend and labels**
- The legend (chips) sits above the plot. Direct end-of-line labels exist on only 4 charts and are stacked in the top-right corner rather than at the line ends.
- The tooltip has no colour keys and lists rows in series order rather than value order.
- The **"Latest" overlay** sits in the plot area and covers data on most charts. It is a duplicate of the "now" sentence and the tooltip, it is truncated or empty on 2-panel charts, and it has an HTML-escaping bug.
- **Extrema labels** (local min/max with "YYYY-MM") repeat on flat series (cost-basis, mean-coin-age, inflation), print raw floats (density) and collide at the right edge (block-size). They show a month only, so they are imprecise.

**Axes and scales**
- Y-axes rarely carry a unit. The unit lives in tiny top-right text or nowhere.
- Tick formatting is inconsistent: "150K" / "150,000" / "150k" / "-100000"; "0.50%" vs "2.0%"; "$300.0M"; "16.98M" vs "0M".
- **Log scales are used silently** (fees, hl-oi, hl-volume, implied-*, cost-basis symlog). Only implied-mcap says so. fees puts a "0" on a log axis, and cost-basis spaces $0–$500–$1K–$2K evenly.
- No user log/linear toggle anywhere. That hurts block-size, market-cap and mvrv on ALL.
- X-axis labels are rotated about 30° and over-dense (14 ticks on 3M). The format switches between "Jul 11" and "2018-01". Weekly series repeat the same month label ("2026-07, 2026-07").
- Font: axis text falls back to UA `sans-serif` 11px instead of JetBrains Mono.

**Mark choice**
- **Cubic-Bezier smoothing everywhere.** It invents overshoots between sparse snapshots (age-pct ALL), widens 1-day spikes (flows, sprout), and implies continuity in bucketed data (anonymity). Use linear or step interpolation; smoothing should be an explicit opt-in moving average (the 7-DAY AVG toggle already exists on some pages).
- Part-to-whole drawn as independent lines: age-pct (complementary pairs), dev-fund (accrued = paid + lockbox).
- Flows drawn as lines instead of mirrored bars (6 pages).
- Spaghetti: fees (9 lines), age-pct (8), implied-mcap (7).

**Dual axes / panels**
- No true dual-axis charts were found. Two-panel stacks (flows, hashrate, inflation) are good practice, but the panels are short (182px and 152px) and the lower panel loses its Latest values.
- hl-volume copy claims a left/right axis split that doesn't exist.

**Tooltips**
- Missing on exch-vol and exch-vol-pct.
- Cluttered "… hover the chart for the rest" placeholders.
- A good pattern to copy: anonymity's plain-language sentence tooltip.

**Empty and edge states**
- "No data in range" is a single grey line: the chart area collapses (layout shift), with no "data starts 2025-07-14" message and no "jump to available range" action.
- Presets aren't disabled when they exceed the data's span.
- etf-holdings silently ignores the selected range, though a note explains it.
- 11 of 29 pages render an empty "READ THIS NEXT" heading.
- Data freshness differs across and within pages (10-07 / 10-09 / 10-11).

**"Now" sentence correctness** (server HTML checked for all 29)
- Wrong metric on 6 pages: **hl-funding, hl-oi, hl-volume (BTC instead of ZEC), density (actions/day instead of actions/tx), flow-transparent (transparent volume instead of flows), hashrate (unitless "29.95B")**.
- Missing on 17 pages.

**Mobile** (390px, age-pct)
- The chart re-lays out correctly (axis text about 14px, 3 x-ticks).
- The chart starts at y≈994px, below the first screen, because of the promo strip, the long lead and a 220px range card.
- The date inputs truncate.
- 8 chips wrap to 2 rows of 48px buttons.
- The Latest box is hidden on mobile, so the only current value is in the tooltip.
- 2-panel and 7-chip pages are higher risk (not tested).

**Accessibility**
- No SVG `title`/`desc`/`aria-label` and no table view; the CSV download is the only alternative.
- Colour is the only series encoding (no dash or marker variation except spot price and actual market cap).
- Range presets have no pressed state for screen readers.

---

## 4. Grouping and filtering the 58 charts

The site already has a hidden taxonomy, visible in "MORE … CHARTS": *Holders & Coin Age*, *Privacy Adoption*, *Usage & Activity*, and others. Proposal, with these 29 plus siblings seen in nav:

**A. Primary category (one each, used for breadcrumb, trail and colour hint)**

| Category | Charts (this batch in bold) |
|---|---|
| Privacy & Pools | **anonymity, flow-compare, flow-ironwood/orchard/sapling/sprout/transparent**, pools, shielding-rate, orchard internal |
| Holders & Coin Age | **age-pct, mean-coin-age, dormant**, survival, utxo, utxo-depth, transparent-by-age, residency |
| Usage & Activity | **block-size, density, fees**, total-fees, tx/day, tx types, velocity, new-addresses |
| Supply & Monetary | **inflation, dev-fund**, halving |
| Mining & Security | **hashrate, implied-gw** |
| Valuation | **cost-basis, mvrv, market-cap**, realized-all, pool-profit, pool-usd, price |
| Markets & Trading | **exch-vol, exch-vol-pct, etf-holdings**, NEAR bridge/flow, swap-assets |
| Derivatives | **hl-funding, hl-oi, hl-volume** |

**B. Cross-cutting filter facets** (multi-select chips on /tools and in the chart page header)
- **Comparison with BTC:** fdv-vs-btc, mktcap-issuance, implied-gw, implied-mcap, hl-*, zec-btc-ratio, tx-issuance, volatility. This is a strong "ZEC vs BTC" collection.
- **By pool:** a Transparent / Sprout / Sapling / Orchard / Ironwood facet. It turns the 5 flow pages into one page with a pool switcher, or small multiples, and links cost-basis, pool-usd and pool-profit.
- **Data source / trust level:** *Consensus-exact on-chain* (flows, supply, fees), *Estimated on-chain* (hashrate, coin age: transparent only), *Exchange-reported* (exch-vol, hl-*), *Filings* (ETF). The explainers already argue this; make it a visible badge.
- **X-axis kind:** time series vs distribution (anonymity) vs issuance-aligned (implied-gw, mktcap-issuance). This determines whether the range bar appears.
- **Cadence/freshness:** daily, weekly snapshots, quarterly.

**C. By question** (landing-page entry points; each maps to 3–5 charts)
- "Is Zcash getting more private?" → shielding-rate, pools, flow-compare, anonymity
- "Are holders selling or holding?" → age-pct, dormant, mean-coin-age, mvrv
- "Is the network being used?" → tx/day, density, block-size, fees
- "How does ZEC stack up against BTC?" → fdv-vs-btc, mktcap-issuance, implied-mcap, implied-gw
- "What are traders doing?" → exch-vol, hl-funding, hl-oi, hl-volume
- "How is supply changing?" → inflation, dev-fund, halving

**D. Consolidation candidates** (could cut 58 to ~45 without losing data)
- 5 flow pages → 1 page with a pool switcher.
- hl-oi + hl-volume + hl-funding → 1 "Perps" page with tabs.
- exch-vol + exch-vol-pct → one page with an absolute/share toggle.
- market-cap ↔ price/fdv → shared page.
- age-pct + "Transparent ZEC by Age" → one page with an absolute/percentage toggle (the explainer itself says they are the same data).
