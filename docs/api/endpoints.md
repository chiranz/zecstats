# zecstats.com API: every route the live site calls

Compiled 11 Oct 2026 from the live site's own front-end code: `data/raw/charts.js` and the 87 saved pages in
`data/raw/pages/*.html` (every `/api/…` string, plus parameters built by string concatenation). Routes the server has
but no page calls can't be seen from outside, so this is the complete set **the site uses**, not a server listing.

"Saved" = in `data/api/` (the app's default data). Saved responses are the default variant; requests with other
parameters need live mode.

## Data endpoints (53: 52 saved, plus search)

| Route | Parameters | Saved |
|---|---|---|
| **Site-wide** | | |
| `/api/charts` | — (chart index, every page) | yes |
| `/api/live` | — (price, ratio, 24 h change) | yes |
| `/api/latest-block` | — | yes |
| `/api/date-range` | — | yes |
| `/api/backfill-status` | — | yes |
| `/api/news` | `before` (paging; used by our feed) | yes |
| `/api/search` | `q` | no |
| **Prices & valuation** | | |
| `/api/prices` | — | yes |
| `/api/prices-hourly` | — | yes |
| `/api/daily-prices` | — | yes |
| `/api/five-year-price` | — | yes |
| `/api/fdv-vs-btc` | — | yes |
| `/api/implied-mcap` | — | yes |
| `/api/mktcap-issuance` | — | yes |
| `/api/etf-holdings` | — | yes |
| `/api/btc-bull-run` | `at` | yes |
| `/api/dca` | `start, amount, freq, assets` (16 assets) | yes (BTC only) |
| `/api/metric-series` | — | yes |
| **Chain & usage** | | |
| `/api/daily-stats` | `points` | yes |
| `/api/pool-balances` | — | yes |
| `/api/fee-stats` | — | yes |
| `/api/inflation` | — | yes |
| `/api/dev-fund` | — | yes |
| `/api/new-addresses` | — | yes |
| `/api/usage-weekly` | — | yes |
| `/api/usage-clock` | `days` | yes (all history) |
| `/api/tx-values` | `class`, then `from, to` or `days` | yes (transparent, 1 y) |
| `/api/activity` | `window` | yes (weekly) |
| `/api/network` | — | yes |
| **Holders & cost basis** | | |
| `/api/realized` | — | yes |
| `/api/pool-cost-basis` | — | yes |
| `/api/pool-pnl` | — | yes |
| `/api/coin-age` | — | yes |
| `/api/utxo-cohorts` | — | yes |
| `/api/utxo-depth` | — | yes |
| `/api/utxo-survival` | `axes`, `compact`, `latest` (flags) | yes (default) |
| `/api/largest-wallets` | — | yes |
| `/api/founders-reward` | — | yes |
| **Privacy & Ironwood** | | |
| `/api/shield-hops` | `class, days, repeat` | yes (single, keep) |
| `/api/shielding-histogram` | — | yes |
| `/api/amount-suggest` | `amount, dir` | yes (one lookup) |
| `/api/ironwood-daily` | — | yes |
| `/api/ironwood-sources` | — | yes |
| `/api/ironwood-tx-sizes` | — | yes |
| **Markets & cross-chain** | | |
| `/api/near-stats` | — | yes |
| `/api/near-swaps` | — | yes |
| `/api/near-network` | `days, gran` | yes (14 d, asset) |
| `/api/near-vol-mcap` | `gran` (asset, token) | yes (asset) |
| `/api/btc-migration` | `days, min_btc` | yes (30 d, ≥ 0.1 BTC) |
| `/api/exchange-volume` | `window, set` | yes (weekly, major) |
| `/api/exchange-volume-status` | — | yes |
| `/api/exchange-coverage` | — | yes |
| `/api/hyperliquid` | — | yes |

## Not data: never call these from the redesign

| Route | What it is |
|---|---|
| `/api/hit/<chartId>` | chart view counter |
| `/api/view/<sessionId>/<chartId>` | per-session view log |
| `/api/ad` | footer ad slot |
| `/api/survival-chart.png?v=&rev=` | pre-rendered survival chart image |

Calling the counters from a test deploy would inflate the owner's stats.

## Saved here but not live API routes

`wall-of-shame`, `privacy-suggestions` and `wallet-apps` are taken from the live pages' HTML by
`pnpm extract-data`. The live site publishes privacy suggestions at `/privacy-suggestions.json`, but no `/api/` route
serves any of the three, so in live mode they stay on saved data.

## External APIs the live site credits (not zecstats routes)

NEAR Intents explorer `explorer.near-intents.org/api/v0/transactions-pages` · mempool.space / Esplora REST ·
blockstream.info · Coin Metrics · CoinGecko · Blockchain.com.
