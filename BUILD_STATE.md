# Household FI Tracker — Build State

> Managed by Claude Code loop.

## Current Phase: Complete (Phases 1–3 done + Improvements batch applied)

## Phases

| # | Name | Status |
|---|------|--------|
| 1 | Net Worth Dashboard | ✅ Done |
| 2 | Stock Portfolio Tracker | ✅ Done |
| 3 | FI Forecast (4% SWR, CPF LIFE, scenarios) | ✅ Done |
| 4 | Supabase DB | ⏸ Parked |
| 5 | Auth | ⏸ Parked |

## Post-Phase-3 Improvements (✅ Applied)

1. **Seed data** — `buildV1State()` now seeds realistic demo values (Cash $85K, CPF $180K, Property $450K, equities $80K, FI settings pre-filled). Also seeds 3 historical snapshots (2022–2024).
2. **Card redesign** — Removed filled green backgrounds from Net Worth summary cards, Portfolio summary, and FI Metrics cards. Now white cards with colored value text — no fake-button appearance.
3. **"Own-Stay Property"** — Default label renamed from "Property". ℹ️ info icon added next to every investable toggle explaining its role in FI passive income (4% SWR).
4. **Company name in Portfolio** — `api.js` extracts `meta.longName` from Yahoo Finance. Stored as `company_name` on position. Displayed under ticker in positions table.
5. **FI Forecast improvements**:
   - Removed manual "CPF LIFE monthly payout" input — now auto-calculated from age using FRS 2025 projection formula (`FRS × 1.035^yearsTo55 × 0.0073`)
   - CPF LIFE only counts AFTER age 65 in year-by-year simulation (no longer applied immediately)
   - Added `FIProjectionChart` — recharts AreaChart showing portfolio growth vs dual targets (with/without CPF LIFE), with reference lines for FI crossover and CPF activation

## Schema

### fi_settings (localStorage)
```json
{
  "target_monthly_income_sgd": 8000,
  "current_age": 36,
  "target_retirement_age": 55,
  "assumed_annual_return_pct": 6,
  "monthly_savings_sgd": 3000
}
```
Note: `cpf_life_monthly_payout_sgd` removed — now derived from `current_age`.

### position schema
```json
{
  "id": "timestamp",
  "ticker": "D05",
  "exchange": "SGX",
  "company_name": "DBS Group Holdings Ltd",
  "shares": 100,
  "cost_price": null,
  "last_price": null,
  "last_price_currency": "SGD",
  "last_updated": null
}
```

## Key Files
```
src/
  lib/
    constants.js        ← "Own-Stay Property" label
    storage.js          ← buildV1State() with seed data
    fi.js               ← estimateCpfLifePayout(), CPF-65 gating, projectionSeries
    api.js              ← fetchStockPrice now returns company_name
  store/
    useStore.js         ← addPosition accepts company_name; fiMetrics no longer takes cpfLifePayout param
  features/
    net-worth/
      SummaryCards.jsx        ← white cards, green text accent
      AssetRow.jsx            ← ℹ️ info icon on investable toggle
    portfolio/
      PortfolioSummaryCards.jsx  ← white card with green text
      PortfolioPage.jsx          ← passes company_name to addPosition
      PositionsTable.jsx         ← "Ticker / Company" column header
      PositionRow.jsx            ← company_name shown under ticker
    fi-forecast/
      FIInputsPanel.jsx       ← removed manual CPF input, shows auto-estimated payout
      FIMetricsCards.jsx      ← white cards, green accent on passive income
      FIProjectionChart.jsx   ← NEW: portfolio growth vs FI target chart
      FIForecastPage.jsx      ← includes FIProjectionChart
```

## Notes for next session
- localStorage migration: users with existing data keep old "Property" label — rename manually or clear localStorage to get seed data
- Phase 4 (Supabase) and Phase 5 (Auth) are parked indefinitely per user request
- Chunk size warning on build is expected (recharts + zustand) — not a functional issue
