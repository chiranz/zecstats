# Parity audit: live zecstats.com vs the redesign (11 Oct 2026)

Read-only audit. Live = `data/raw/pages/*.html` + `data/raw/charts.js` (captured 11 Oct 2026); ours = `localhost:3100` + source.
Paths: identical. All 27 live sitemap pages and all 58 `/chart/<slug>` pages exist; `/privacy` and `/charts` are new.
Intentional redesign changes (question titles, chart forms, IA moves called for by BRIEF.md) are not counted as gaps.
Severity: **H** = a feature, link or URL param is lost · **M** = a difference users would notice · **L** = cosmetic or edge case.

## Top 15 gaps (ranked)
1. **Chart, compare and tx-sizes permalinks (H).** Live honours `?from=&to=` and has a custom date range (date inputs plus a dual slider) and 9M/YTD presets. Ours reads only `?range=&scale=`, so live links open at our default range. Fix in `components/chart-page/ChartBody.tsx`, `components/charts/TimeSeriesChart.tsx` and `app/compare/page.tsx`.
2. **Menu reachability (H).** Ironwood and Privacy Tips are in no menu (2 clicks via `/privacy`). Pool P&L (`/chart/pool-profit`) is in no menu and not in the footer. `/tools` claims to list every tool but doesn't link Wall of Shame, Privacy tips or Ironwood. Fix in `lib/site.ts`, `TopBar.tsx` and `app/tools/page.tsx`.
3. **Calculator assets (H).** Live compares 16 assets (BTC, ETH, SOL, XMR, … QQQ, SPY, gold) with PNG/CSV export and `?hidden=`/`?scale=`. Ours compares BTC only, and the menu copy promises "gold, stocks". It needs price data the snapshot lacks.
4. **`/metrics` (H/M).** No `?date=` as-of view; `?v=<json>` views ignored; at most 2 comparison periods (live allows any of 7D, 28D, 3MO, 6MO, 12MO); no PNG, Group column, row reordering, Reset or Correlate button.
5. **`/wallet-apps?p=day|week|month|quarter|all` ignored (H).** Live links use it. Also Daily/Weekly/Monthly/Quarterly granularity (ours: weekly only).
6. **`/btc-bull-run?at=` anchor permalink missing (H).** Also no PNG and no ZEC/BTC hide.
7. **`/privacy-suggestions.json` returns 404 (H).** The live page links it as a public export; our data is at `/api/privacy-suggestions`.
8. **Author link (H).** The x.com/jeremiahrogers link is gone site-wide; the footer shows plain text.
9. **swap-assets (H).** Lost the direction (ZEC→asset / asset→ZEC / Net), window (All time / Monthly) and grouping (Token / Chain / asset) toggles.
10. **btc-migration (H/M).** Lost the Sources section (mempool.space, esplora, NEAR explorer, Coin Metrics, CoinGecko), per-row NEAR explorer links, the date / min-USD / by-address filters and the `days, min_btc, gran, unit, by, rows` params.
11. **Chart template (M).** No Annotations toggle (`?ann=1`), no news event banner (`?event_date=&headline=`), and legend hide state (22 `*hide` keys) isn't kept in the URL.
12. **Per-chart toggles lost (M).**
    - fees: `fees-unit`, `fees-roll`
    - total-fees: `total-fees-unit`, `total-fees-roll`
    - implied-mcap: `imunit`, `nimsm`
    - near-vol-mcap: `nvmg`, `nvmsm`
    - orchard-internal: per-ZEC
    - exch-vol(-pct): `evwin`, `evset`, `evpwin`, `evpset`
    - survival: as-of vs cohort
    - smaller (L): `wma`, `nodiff`, `hl*sm` smoothing
13. **Report pages keep no URL state (M).** shield-hops (`class, days, repeat`), tx-sizes (`class`), swaps (`days, gran`), world-usage (`days`), activity (`window, range`).
14. **Thinner downloads (M).** JSON instead of CSV on non-dated charts and reports; no PNG on metrics, correlate or bull-run; no compare "Download all as PNG".
15. **Missing blocks (M).** `/network` weekly visible-nodes chart; `/exchange-support` access map; `/world-usage` animated map and awake-population curve; donate QR. The homepage five-year and daily-change prose is shorter (tx, fees, 24h range and volume gone). No og:image social cards; no `/sitemap.xml` or `/robots.txt`.

Fine as is: `/tools#methodology` (87 live inbound links) exists in ours. Live `/api/search` is server search, while our ⌘K is client-side, so nothing is lost. `tf=` is in robots.txt but not read anywhere.

## URL params matrix
✔ = same meaning · ≠ = same idea, different name · ✖ = ignored by ours.

| Param | Page | Live meaning | Ours |
|---|---|---|---|
| `from`, `to` | /chart/*, /compare, /tx-sizes | custom window | ✖ |
| `ann=1` | /chart/*, /compare, /tx-sizes | NU annotations | ✖ |
| `event_date`, `headline` | /chart/* | event banner + highlight | ✖ |
| `charts` | /compare | chart list | ✔ (max 6) |
| `*hide` (22 keys) | /chart/<slug> | hidden series | ✖ |
| per-chart unit/roll/grain keys (see 12) | /chart/<slug> | view options | ✖ |
| `c` (json) | /correlate | config (+ cookie) | ≠ `w`, `m` |
| `v` (json), `date` | /metrics | saved view, as-of date | ≠ `cmp/m/spark/sort`; `date` ✖ |
| `hidden`, `scale` | /savings | hidden assets, log | ✖ (ours `btc=0`) |
| `at` | /btc-bull-run | anchor | ✖ |
| `days, min_btc, gran, unit, by, rows` | /btc-migration | filters and view | ✖ |
| `days`, `gran` | /swaps | window, grouping | ✖ |
| `p` | /wallet-apps | window | ✖ |
| `all=1` | /exchange-support | all countries | ✖ |
| `class, days, repeat` | /shield-hops | class, range, drop repeats | ✖ |
| `class` | /tx-sizes | class | ✖ |
| `days` | /world-usage | period | ✖ |
| `window`, `range` | /activity | granularity, days | ✖ |
| ours-only | /chart/* `range, scale`; /savings `start, freq, amount`; /amount-suggest `amount, dir`; /what-if `asset, share, basis`; /news `type, major` | — | ✔ |

Not verified: live behaviour is inferred from the captured HTML/JS (the live site is Cloudflare-blocked for scripts).
Full per-page evidence: the audit agent's inputs are in the session scratchpad (`parity/ours`, `json`, `txt`).
