# ZEC Stats redesign — shared brief for every redesign agent

You are a senior product designer building artboards for a design canvas that proposes a redesign of https://zecstats.com
(a Zcash network-statistics site run by someone else; the user is pitching this redesign to the owner). Show the product as it will ship — no mock/snapshot/concept wording in the UI.

## 0. Files you must read first
- This brief (all of it).
- `ds-tokens.css` (same folder): the design system CSS. Paste it VERBATIM as the first thing inside every artboard's `<helmet><style>`.
  Page-specific CSS goes AFTER it in the same `<style>`. Never change token values; never invent new colours.
- `chrome.html` (same folder): the exact header + footer markup. Paste it into every page; only change which nav item has
  `aria-current="page"` and the breadcrumb.
- The research for your pages in `../research/` (audit-*.md). Every page in your assignment has a section there listing its
  real content, numbers, controls and problems. **Use the real labels and numbers from those audits** — never invent stats.
  If a value is unknown, use a clearly-marked placeholder like `[value]`.
- Screenshots of the current site in `../shots/` (Read them as images when useful).
- The user's own layout draft (the layout spirit to follow, NOT its colours):
  `/Users/chiranjibipoudyal/.claude/projects/-Users-chiranjibipoudyal-programming-side-projects-zecstats/0b1c857a-a884-4583-8557-9d591107901d/tool-results/artifact-ba7a35fa-1790477582-7aae.html`
  Read lines 1–400 (CSS + home + Ironwood markup). Borrow its LAYOUT ideas: sticky slim top bar, masthead with
  kicker + H1 + lede and a right-aligned snapshot/freshness note, prominent search with "Try" chips, one big hero panel
  with the headline figure and chart, a shared-border KPI band, paired narrative cards with "Read more" disclosures,
  a "Popular this week" tray, and an "All charts" index with a sticky category rail + two-column aligned rows
  (name … latest value). Ironwood: subnav of section jumps, hero with a huge %, gate/progress bar with a scale,
  KPI band, ring + key, folded "Reading the number" explainer, tiles of "read this next". Calm, uncluttered.

## 1. Design direction: "Refined terminal"
Stay as close as possible to the live site's identity — near-black green ground, neon green #00ff66 accent, monospace
numerals, Orbitron wordmark with glow, faint CRT scanlines — but fix hierarchy and legibility:
- Text is soft mint-white (`--text`), not neon; numbers in `--value`. Neon is reserved for: brand mark, active/selected
  state, the ONE primary series in a chart (ZEC / Ironwood), positive deltas, focus rings, primary button.
- Glow ONLY on the wordmark/brand mark (and at most one live dot). Never on headings or body copy.
- Headings + labels + numbers: JetBrains Mono. Prose (paragraphs, captions, explanations): IBM Plex Sans 14–17px.
  Never set long paragraphs in mono; never body text below 13px; never use `--faint` for text.
- Section headings use `.sec-h .h2` (renders a green `//` prefix — the terminal accent).
- Fonts link (put inside `<helmet>` before `<style>`):
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">`

## 2. Global layout rules
- Max content width 1200px (`.shell`). NEVER leave a narrow left-aligned column with an empty right half: pair prose with
  a figure/table (`.split`, `.grid2`), or let the block span.
- Order on every page: top bar → masthead (crumbs, H1, one-sentence answer/lede, freshness note right) → the ANSWER
  (hero figure/chart) → supporting KPIs → detail sections → methodology (folded) → "Read next" tiles → footer.
  The page's answer is always above the fold. Methodology/caveats go to the bottom in `details.more`, never above the chart.
- KPI bands: use `.kpis` (4 per row) or `.kpis.six` (6 per row); choose tile counts that fill rows (4, 8, 6, 12). No orphans.
- One canonical RANGE control everywhere: `.seg` with `1M 3M 6M 1Y 5Y ALL` + a "Custom" button. Dates shown as
  "11 Oct 2026" in prose and "Oct '26" / "Oct 11" on axes. Never DD/MM. Never "20000k" — use 20M.
- Download/share actions live in ONE place per chart: a small icon-button group at the chart card's top-right
  (Link · PNG · CSV), labelled with aria-labels.
- Tables: `.tbl-wrap` + `table.t`, sticky header, right-aligned numbers, ≤8 columns visible; long lists get a filter bar,
  a search field, and pagination ("1–50 of 500").
- Mobile (≤560px): top bar = brand + search icon + burger; KPI bands 2-up; charts min-height 220px with ≤4 x-ticks and
  labels not rotated; segmented controls scroll horizontally; tables scroll in their box; hero figure shrinks via clamp.

## 3. Chart rules (follow strictly)
- Every chart card: title phrased as the question it answers (h3) + one-sentence takeaway with the key number in bold
  (`.takeaway`) ABOVE the plot, legend directly under the title (or direct end-labels for ≤4 series), plot, then a
  one-line source/"data through" caption (`.small`).
- Canonical colours (CSS vars): pools `--p-transparent` (neutral grey: "not private"), `--p-sprout`, `--p-sapling`,
  `--p-orchard`, `--p-ironwood` (= brand green), `--p-lockbox`; ZEC `--zec` (green) vs BTC `--btc` (orange); gold `--gold`.
  Pool ORDER is always transparent → sprout → sapling → orchard → ironwood (→ lockbox). Generic series `--s1…--s6`.
  Use `stroke="var(--p-orchard)"` etc. inside SVG so light/dark both work.
- Up/down: green ▲ / coral ▼ always WITH the arrow glyph (never colour alone). Avoid red/green as the only encoding in
  charts: use blue/orange or position (diverging bars above/below zero).
- Forms: time-series levels → line (log option for price/ratios over ≥1Y); daily counts/period totals → columns
  (+ rolling-average line), never splines; part-of-whole over time → stacked area (or 100% toggle); shares → fixed 0–100%
  axis; ordinal buckets (age, depth) → sequential ramp of one hue, not rainbow; >5 series → highlight one + grey the rest
  or small multiples; no dual y-axes (use stacked panels sharing the x-axis).
- Axes: y gridlines `class="gl"` faint; ticks formatted with units (1.2M, $1.6K, 29%); first/last x tick dated; no rotated
  labels; clip series to the plot (`<clipPath>`); annotation labels never overlap.
- ONE tooltip style (`.tip`): date header + rows of swatch · label · value with unit; show it statically in at most one
  chart per page (as if hovered) to document the pattern.
- SVG in artboards is hand-written markup: `viewBox` sized to the card (e.g. 0 0 1100 300), `preserveAspectRatio="none"`
  only for pure area/line backgrounds, `role="img"` + `aria-label` describing the chart. Generate path `d` strings offline
  (python in Bash is fine) from data that follows the real shape seen in the screenshots/audits; label only real values.

## 4. Artboard format (the canvas editor's `.dc.html` — rules that fail silently)
Each artboard file:
```
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Short screen name</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&amp;family=JetBrains+Mono:wght@400;500;600;700&amp;family=IBM+Plex+Sans:wght@400;500;600&amp;display=swap">
<style>
/* ds-tokens.css pasted verbatim */
/* page CSS */
</style>
</helmet>
<div class="site" data-theme="{{theme}}">
  ... header, page, footer ...
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"theme":{"editor":"enum","options":["dark","light"],"default":"dark"},"$preview":{"width":1440,"height":3200}}'>
class Component extends DCLogic {
  renderVals() { return { theme: this.props.theme ?? 'dark' }; }
}
</script>
</body>
</html>
```
- Keep `<script src="./support.js"></script>` EXACTLY. Close every non-void element; quote every attribute; self-closing
  SVG elements are fine (`<path ... />`). Escape `&` as `&amp;` in attributes/text.
- `{{hole}}` = dotted lookup into `renderVals()` only, never an expression. Keep holes to `{{theme}}` (+ any small state
  you really need). All copy is literal markup.
- The root `.site` div is FLUID (no px width) — these are PAGES. `$preview.width` = 1440 for desktop artboards and 390 for
  mobile artboards; `$preview.height` = your best estimate of the page height at that width (report it back).
- A MOBILE artboard is a separate file (`X-mobile.dc.html`) holding the same page markup (it must render correctly at 390px
  via the media queries) — you may show a mobile-specific state (e.g. collapsed filters, a bottom sheet open) and you may
  trim long repeated lists to keep it reasonable.
- Real elements: `<a href>`, `<button type="button">`, `<input>` + `<label>`; `aria-label` on icon-only buttons; decorative
  SVG `aria-hidden="true"`. No emoji (use inline stroke SVG icons). No `<iframe>`, no scripts building DOM, no external
  images (draw everything in SVG/CSS). No `<sc-for>` needed — write repeated rows literally.
- Links between artboards: `href="Privacy.dc.html"` etc. (file names in §6). Other links: `href="#"`.
- No AI tropes: no gradient washes beyond the hero's subtle raised→card gradient, no left-border accent cards, no emoji.

## 5. Write files, don't publish
Write ONLY your assigned files into
`/private/tmp/claude-501/-Users-chiranjibipoudyal-programming-side-projects-zecstats/0b1c857a-a884-4583-8557-9d591107901d/scratchpad/canvas/root/project/`
using the Write tool (one file per Write). Do NOT call the Artifact tool, do NOT publish, do NOT open a browser to verify.
When done, reply with: each file name, its `$preview` width × height, and a ≤10-line list of the design decisions you
made per page (what changed vs the live page and why) plus any number conflicts you resolved.

## 6. Site map (file names) — information architecture of the redesign
Primary nav (5): Dashboard `Main.dc.html` · Privacy `Privacy.dc.html` (NEW hub) · Charts `Charts.dc.html` (index of all 58,
replaces the chart half of /tools) · Tools ▾ (grouped menu, see `Navigation.dc.html`) · News `News.dc.html`.
Right side: ⌘K search (works across charts, tools, pages, with synonyms), theme toggle, Donate (primary button).
Tools menu groups: Calculators (Investment calculator /savings → `Calculator.dc.html`, What if gold, Amount lookup) ·
Compare & explore (Compare charts, Correlations, Metrics table → `Metrics.dc.html`, ZEC 2026 vs BTC 2017) ·
Cross-chain (Swaps, Bitcoin → Zcash, Wallet apps, Exchanges) · Reports (Founders' Reward, Orchard turnstile watch →
`Turnstile.dc.html`, Shield-bound hops, Transaction sizes → `Report-tx-sizes.dc.html`, Transparent activity, When the world uses Zcash) ·
Network (Network nodes → `Network.dc.html`, Node status, Halving) · About (Methodology, Signals (experimental), Donate).
Privacy hub sections link to: Ironwood `Ironwood.dc.html`, Turnstile, Privacy tips, Amount lookup, Privacy leaks
(renamed from "Wall of Shame" — suggested; URL kept) `Leaks.dc.html`, Shield hops, Anonymity set chart, pool charts.
Chart pages: `Chart-price.dc.html` (single series + MAs), `Chart-pools.dc.html` (multi-series).
Every page ends with "Read next" tiles (3–4, each: title + one-line why + latest value) and the shared footer.

## 7. Canonical snapshot figures (11 Oct 2026) — use these exact values where they appear
Price $1,221.62 (24h ▲0.9%) · ZEC/BTC 0.01474 (24h ▲0.5%, 30d ▲4.6%) · Market cap $20.78B (16,979,486 ZEC) · FDV vs BTC 1.48%
· MVRV 3.46× (realized $354) · Shielded 29.3% = 4,966,968 ZEC ($6,078M) · Inflation 3.28%/yr (1,525 ZEC/day) · Supply
16,979,486 of 21,000,000 (80.9%) · Hashrate 32.63 GH/s · NEAR bridge 146,704 ZEC · Monthly fees $135.5k (96 ZEC) ·
Pools: Transparent 11.94M · Sprout 22,309 · Sapling 476,049 · Orchard 361,823 · Ironwood 4.11M ZEC · Ironwood migration
89.24% (3,267,319.17 of 3,661,233.41 Orchard ZEC crossed; live since block 3,428,143; activated 74 days ago) · Tx/day 5,366
(shielded tx share ~50%) · Net shielding last 7d +91,282 ZEC (shielded 99,468, deshielded 8,186; prior 7d +111,040) ·
Block 3,513,512 · Node synced (Zebra v6.3.0) · Next halving block 4,406,400 (~775 days, ~24 Nov 2028, 1.5625 → 0.78125 ZEC)
· 5-year: ZEC/BTC up 7.1×, price range $20–$1,554 over 5y. Five-year text: "As of 11 October 2026, one ZEC buys 0.01476 BTC —
up 7.1× over five years, up 5.6× on the year and up 76% over three months. Five years ago it bought 0.002071 BTC."
Where the audits show conflicting numbers on one page, pick one, make the page internally consistent, and report it.
