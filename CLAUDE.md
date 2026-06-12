# Household FI Tracker — Claude Context

This file is read automatically at the start of every Claude session.
Update it whenever significant features are added or decisions are made.

---

## Project Overview

A personal **Financial Independence tracker** for a Singapore household.
Built with React + Vite + Tailwind CSS v3 + Zustand (localStorage persist).
Deployed on **Vercel** (auto-deploy from GitHub master).

**Live URL:** check Vercel dashboard (dantrieu/household-fi-tracker on GitHub)
**Owner:** danieltrieu88@gmail.com

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| State | Zustand with persist middleware → localStorage |
| Routing | React Router v6 (AppShell + Outlet) |
| Charts | recharts (PieChart, AreaChart) |
| Number input | react-number-format (NumericFormat) |
| Cloud sync | Upstash Redis via Vercel serverless functions in `/api` |
| Price feeds | Yahoo Finance (stocks) + CoinGecko (crypto) + Frankfurter (FX) |

---

## Current Version

**v0.8.7** · 12 Jun 2026, 18:38 SGT

Always bump `src/version.js` (APP_VERSION + BUILD_DATE) with every commit.
The footer displays this so the user can confirm Vercel deployed successfully.

---

## App Structure

```
src/
  version.js                    ← Single source of truth for version + build date
  App.jsx                       ← Routes: /net-worth, /portfolio, /fi-forecast
  main.jsx
  components/
    layout/
      AppShell.jsx              ← Nav + footer with version
      NavBar.jsx
    ui/
      Card.jsx
      Toggle.jsx
      EditableNumber.jsx
      DeltaBadge.jsx
    SaveRestoreModal.jsx        ← Cloud save/load/delete with passphrase
  features/
    net-worth/
      NetWorthPage.jsx
      AssetGrid.jsx             ← 3-row totals footer (Total NW / Investable / Excl. CPF)
      AssetRow.jsx              ← CPF tag system, auto-sync badge, pencil ✏️
      AssetAllocationChart.jsx  ← Pie chart with All/Investable/Non-invest. tabs + Group toggle
      SummaryCards.jsx          ← "Total Investable NW" + "Total NW, Excl. CPF"
      snapshots/
        SnapshotSection.jsx     ← Save current + save manual forms (year + month + remark)
        SnapshotTable.jsx       ← LiveRow at top, sort toggle, Total NW △ + Investable △
        SnapshotTrendChart.jsx  ← Area chart with live data point
    portfolio/
      PortfolioPage.jsx         ← Handles add/refresh, passes company_name
      PortfolioSummaryCards.jsx
      AddPositionForm.jsx       ← SGX / US / Intl / Crypto dropdown
      PositionsTable.jsx        ← Auto-sort: SGX → US → Crypto; then ticker A-Z
      PositionRow.jsx           ← Exchange badge, ✏️ pencil, stale indicator
      PortfolioAllocationChart.jsx ← Pie with % labels
    fi-forecast/
      FIForecastPage.jsx
      FIInputsPanel.jsx         ← CPF LIFE auto-calculated (no manual input)
      FIMetricsCards.jsx
      FIProjectionChart.jsx
      FIScenarioPanel.jsx
      CPFLifePanel.jsx
      PassiveIncomeChart.jsx
      PortfolioValueChart.jsx
  lib/
    constants.js                ← CATEGORY_META, DEFAULT_CATEGORY_ORDER, CURRENT_SCHEMA_VERSION
    storage.js                  ← migrateState(), buildV1State() with seed data
    api.js                      ← fetchStockPrice, fetchCryptoPrice, fetchFxRate, resolveYahooTicker
    cloudSync.js                ← saveToCloud, loadFromCloud, deleteFromCloud, checkCloudExists
    format.js                   ← formatSGD, formatPct, formatDelta, formatDeltaPct
    fi.js                       ← estimateCpfLifePayout(), CPF-65 gating, projectionSeries
  store/
    useStore.js                 ← Zustand store + all actions + selectors
api/
  yahoo.js                      ← Vercel proxy → Yahoo Finance (15-min CDN cache)
  coingecko.js                  ← Vercel proxy → CoinGecko
  fx.js                         ← Vercel proxy → Frankfurter (USD/SGD rate)
  save-data.js                  ← POST passphrase + data → Upstash Redis
  load-data.js                  ← POST passphrase → returns data from Redis
  delete-data.js                ← POST passphrase → deletes from Redis
```

---

## Schema Versioning

**Current: v4** (defined in `src/lib/constants.js` → `CURRENT_SCHEMA_VERSION`)

Migrations live in `src/lib/storage.js` → `migrateState()`. Always add a new migration function and register it in the `MIGRATIONS` map when making breaking schema changes.

| Version | Change |
|---|---|
| v0→v1 | Initial schema |
| v1→v2 | Add Crypto NW category; rename monthly_savings → annual_savings in fi_settings |
| v2→v3 | Add `is_cpf` boolean flag to all NW categories |
| v3→v4 | Rename `us_equities.label` from "US Equities" → "US / Intl Equities" |

---

## Net Worth Features

### Category system
- Built-in categories: `cash_savings`, `sgx_equities`, `us_equities`, `crypto`, `cpf`, `property`, `other`
- Portfolio-fed: `sgx_equities`, `us_equities`, `crypto` (source: `'portfolio'`) — value auto-synced, no manual edit
- User can add custom categories (free-form label)

### CPF tag system (`is_cpf`)
- Every category has `is_cpf: boolean`
- Built-in `cpf` key: permanent amber "CPF" badge, `is_cpf` cannot be removed
- Custom rows: can be tagged CPF via `+CPF` hover button → shows amber "CPF ×" badge (clickable to remove)
- `netWorthExCpf` selector excludes ALL `is_cpf=true` categories
- `toggleCpfTag(key)` action — guards against mutating the built-in `cpf` key

### Totals footer (AssetGrid)
Three rows: **Total Net Worth** (bold) / Total Investable NW / Total NW, Excl. CPF

### Pie chart (AssetAllocationChart)
- Three tab views: All / Investable / Non-invest.
- "All" view defaults to `grouped=true` → two slices: Investable (green) / Non-invest. (slate)
- Group toggle only visible in All view
- % labels inside slices ≥5%

### Snapshots
- Model: `{ id, year, month (1-12), label (auto: "MMM YYYY"), remark (optional), saved_at, totals: { total_net_worth, investable_net_worth } }`
- Excl. CPF removed from snapshots (only Total NW + Investable stored)
- SnapshotTable: LiveRow always at top/bottom, sort direction toggle (↓/↑), 6 columns (Date | Total NW | Investable | Total NW △ | Investable △ | Delete)
- Remark shown as muted sub-line, truncated with tooltip
- Trend chart: live data point as open circle, min 1 snapshot needed

---

## Portfolio Features

### Exchanges
- `SGX` — tickers resolved as `TICKER.SI` for Yahoo Finance
- `US` (displayed as "US / Intl") — tickers passed as-is to Yahoo Finance; international tickers use exchange suffix (e.g. `VWRA.L` for LSE, `IWDA.AS` for Euronext)
- `CRYPTO` — fetched from CoinGecko, not Yahoo Finance

### Exchange rates
- One live FX rate: **USD → SGD** (from Frankfurter API)
- All USD-priced positions (US/Intl + Crypto) converted to SGD using this rate
- VWRA.L and most international ETFs are USD-denominated → existing USD/SGD rate handles them
- Multi-currency (GBP, HKD, etc.) is NOT yet implemented — parked for future

### Position model
```json
{
  "id": "timestamp-string",
  "ticker": "VWRA.L",
  "exchange": "US",
  "company_name": "Vanguard FTSE All-World UCITS ETF USD Acc",
  "shares": 50,
  "cost_price": 105.20,
  "last_price": 112.40,
  "last_price_currency": "USD",
  "last_updated": "2026-06-12T10:30:00.000Z",
  "coin_id": null
}
```

### Sort order
`EXCHANGE_ORDER = { SGX: 0, US: 1, CRYPTO: 2 }` then ticker A-Z within each group.

### Net worth sync
- SGX positions total → `sgx_equities` category value
- US/Intl positions total → `us_equities` category value
- Crypto positions total → `crypto` category value

---

## Cloud Save / Restore

- Passphrase-keyed storage on **Upstash Redis** via Vercel serverless functions
- Passphrase shown by default (not masked)
- **New passphrase guard**: on first save, `checkCloudExists()` pings `/api/load-data`; if 404 (new slot), shows amber warning and requires second click to confirm
- Load replaces all local data (requires two-click confirm)
- Delete requires passphrase + two-click confirm
- Live prices stripped on save (re-fetched on next load)

---

## FI Forecast Features

- 4% SWR rule
- CPF LIFE: auto-calculated from age (FRS 2025 formula), only applies after age 65 in simulation
- Scenarios panel
- Charts: portfolio growth vs FI target, passive income over time

---

## Design Conventions

| Convention | Detail |
|---|---|
| Pencil icon | `✏️` emoji, `opacity-25 hover:opacity-70 leading-none transition-opacity text-[11px]` |
| Auto-sync badge | Blue `bg-blue-50 text-blue-400 border-blue-100`, label "auto-sync", tooltip explaining Portfolio tab |
| CPF badge | Amber `bg-amber-50 text-amber-600 border-amber-200` |
| Responsive | Mobile: `sm:hidden` card layout; Desktop: `hidden sm:flex` row/table |
| Currency input | `NumericFormat` from react-number-format with `thousandSeparator` |
| SGD formatting | `formatSGD()` from `src/lib/format.js` |
| Cards | White background, no filled green. Colored text for accent values |
| Stale price | Amber "stale" badge if `last_updated` > 15 min old |

---

## Decisions Log (why things are the way they are)

| Decision | Rationale |
|---|---|
| Upstash Redis (not Supabase) | Simpler — no auth needed, passphrase is the key. Supabase/Auth parked indefinitely |
| `is_cpf` tag per category | User created a custom CPF-linked property row; needed a way to exclude it from "NW Excl. CPF". Tag approach chosen over name-matching or separate list |
| US exchange → "US / Intl" | User wants to hold VWRA (LSE) without a new exchange bucket. VWRA.L is USD-denominated so existing USD/SGD FX rate covers it |
| No DnD in SnapshotTable | Removed — auto-sort by year+month is cleaner. Sort direction toggle (↓/↑) added instead |
| Month-level snapshots | User wanted to capture progress monthly, not just annually |
| Pie chart defaults to grouped | "All" view with many categories was visually messy; grouped (Investable/Non-invest.) is the default, users can toggle off |
| Passphrase visible by default | Less friction; security notice already warns about risk |
| CPF LIFE auto-calculated | Removed manual input field — formula `FRS × 1.035^yearsTo55 × 0.0073` is accurate enough and reduces user error |

---

## Known / Parked Items

- **Multi-currency FX** (GBP, HKD, EUR): not yet implemented. All non-SGD positions currently assume USD. Fine for VWRA and most ETFs. Flag if user adds GBP/HKD stocks
- **Phase 4 (Supabase DB) + Phase 5 (Auth)**: parked indefinitely — Upstash Redis passphrase approach is sufficient
- **Chunk size warning on build**: expected (recharts + zustand bundle size), not a functional issue

---

## How to Resume Work

1. Read this file (auto-loaded by Claude Code)
2. Check `src/version.js` for current version
3. Read any specific file the user mentions before editing
4. Bump `APP_VERSION` (patch = 0.X.Y+1) and `BUILD_DATE` to now in `src/version.js` with every commit
5. Push to master → Vercel auto-deploys → user confirms via footer version number
