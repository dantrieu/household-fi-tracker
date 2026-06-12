// ─── localStorage schema migration ────────────────────────────────────────────
// Zustand's persist middleware handles the actual read/write.
// This module owns the migration logic: given a persisted state at version N,
// it upgrades it to the current schema version.
//
// HOW TO ADD A MIGRATION:
//   1. Increment CURRENT_SCHEMA_VERSION in constants.js.
//   2. Add a function migrate_N_to_M below.
//   3. Register it in the MIGRATIONS map.
//   Zustand's persist `migrate` option calls migrateState(persistedState, version).

import { CURRENT_SCHEMA_VERSION, buildDefaultCategories, DEFAULT_CATEGORY_ORDER } from './constants';

// ─── Individual migration functions ───────────────────────────────────────────

/**
 * v0 → v1: Initial schema. Any legacy / unversioned data gets replaced with defaults.
 */
function migrate_0_to_1(_oldState) {
  return buildV1State();
}

/**
 * v1 → v2: Add Crypto category to net worth (auto-fed from portfolio).
 * Preserves all existing user data; only patches in the missing category.
 */
function migrate_1_to_2(state) {
  const categories = { ...state.net_worth.categories };
  const order      = [...(state.net_worth.category_order ?? [])];

  // Ensure portfolio-fed categories have the correct source field
  // (users who created state before source was added may be missing it)
  if (!categories.crypto) {
    categories.crypto = { label: 'Crypto', value: 0, investable: true, source: 'portfolio' };
  } else {
    categories.crypto = { ...categories.crypto, source: 'portfolio' };
  }
  if (categories.sgx_equities) {
    categories.sgx_equities = { ...categories.sgx_equities, source: 'portfolio' };
  }
  if (categories.us_equities) {
    categories.us_equities = { ...categories.us_equities, source: 'portfolio' };
  }

  // Insert 'crypto' into order after 'us_equities' (or at front if not found)
  if (!order.includes('crypto')) {
    const usIdx = order.indexOf('us_equities');
    if (usIdx >= 0) order.splice(usIdx + 1, 0, 'crypto');
    else order.unshift('crypto');
  }

  // Also patch fi_settings: rename monthly_savings_sgd → annual_savings_sgd if present
  const fi = { ...state.fi_settings };
  if (fi.monthly_savings_sgd != null && fi.annual_savings_sgd == null) {
    fi.annual_savings_sgd = fi.monthly_savings_sgd * 12;
    delete fi.monthly_savings_sgd;
  }
  if (fi.cpf_persons == null) fi.cpf_persons = 1;

  return {
    ...state,
    schema_version: 2,
    net_worth: { ...state.net_worth, categories, category_order: order },
    fi_settings: fi,
  };
}

/**
 * v2 → v3: Add is_cpf flag to all categories.
 * Built-in 'cpf' key defaults to true; everything else defaults to false.
 */
function migrate_2_to_3(state) {
  const categories = { ...state.net_worth.categories };
  for (const key of Object.keys(categories)) {
    if (categories[key].is_cpf == null) {
      categories[key] = { ...categories[key], is_cpf: key === 'cpf' };
    }
  }
  return {
    ...state,
    schema_version: 3,
    net_worth: { ...state.net_worth, categories },
  };
}

/**
 * v3 → v4: Rename "US Equities" → "US / Intl Equities" for existing stores.
 * Only renames the default label; user-renamed categories are left untouched.
 */
function migrate_3_to_4(state) {
  const categories = { ...state.net_worth.categories };
  if (categories.us_equities && categories.us_equities.label === 'US Equities') {
    categories.us_equities = { ...categories.us_equities, label: 'US / Intl Equities' };
  }
  return {
    ...state,
    schema_version: 4,
    net_worth: { ...state.net_worth, categories },
  };
}

// ─── Migration registry ───────────────────────────────────────────────────────
const MIGRATIONS = {
  0: migrate_0_to_1,
  1: migrate_1_to_2,
  2: migrate_2_to_3,
  3: migrate_3_to_4,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called by Zustand persist's `migrate` option.
 * Chains migrations from `persistedVersion` up to CURRENT_SCHEMA_VERSION.
 *
 * @param {object} persistedState  - The raw object read from localStorage
 * @param {number} persistedVersion - The schema_version stored alongside it
 * @returns {object} - State at CURRENT_SCHEMA_VERSION
 */
export function migrateState(persistedState, persistedVersion) {
  let state = persistedState;
  let version = persistedVersion ?? 0;

  while (version < CURRENT_SCHEMA_VERSION) {
    const migrateFn = MIGRATIONS[version];
    if (!migrateFn) {
      // Gap in migrations — reset to safe defaults
      console.warn(`[hfi] No migration found for version ${version}. Resetting to defaults.`);
      return buildV1State();
    }
    state = migrateFn(state);
    version += 1;
  }

  return state;
}

/**
 * Build a fresh v1 state object.
 * Used both for new users and as a migration fallback.
 */
export function buildV1State() {
  // Seed data — realistic Singapore household demo values
  const categories = buildDefaultCategories();
  categories.cash_savings.value  = 85000;
  categories.sgx_equities.value  = 0;      // auto-fed from Portfolio
  categories.us_equities.value   = 0;      // auto-fed from Portfolio
  categories.crypto.value        = 0;      // auto-fed from Portfolio
  categories.cpf.value           = 180000;
  categories.property.value      = 450000;
  categories.other.value         = 12000;

  return {
    schema_version: 1,
    last_modified: new Date().toISOString(),
    net_worth: {
      category_order: [...DEFAULT_CATEGORY_ORDER],
      categories,
    },
    snapshots: [
      {
        id: 'seed-2022',
        year: 2022,
        label: 'Year-end 2022',
        saved_at: '2022-12-31T23:59:00.000Z',
        totals: {
          total_net_worth:    530000,
          investable_net_worth: 120000,
          net_worth_ex_cpf:  370000,
        },
        categories: {
          cash_savings: 68000, sgx_equities: 0, us_equities: 0, crypto: 0,
          cpf: 160000, property: 400000, other: 8000,
        },
      },
      {
        id: 'seed-2023',
        year: 2023,
        label: 'Year-end 2023',
        saved_at: '2023-12-31T23:59:00.000Z',
        totals: {
          total_net_worth:    648000,
          investable_net_worth: 74000,
          net_worth_ex_cpf:  478000,
        },
        categories: {
          cash_savings: 74000, sgx_equities: 0, us_equities: 0, crypto: 0,
          cpf: 170000, property: 420000, other: 10000,
        },
      },
      {
        id: 'seed-2024',
        year: 2024,
        label: 'Year-end 2024',
        saved_at: '2024-12-31T23:59:00.000Z',
        totals: {
          total_net_worth:    708000,
          investable_net_worth: 96000,
          net_worth_ex_cpf:  533000,
        },
        categories: {
          cash_savings: 85000, sgx_equities: 0, us_equities: 0, crypto: 0,
          cpf: 175000, property: 435000, other: 13000,
        },
      },
    ],
    portfolio: {
      positions: [],
      last_refreshed: null,
      fx_rate_usd_sgd: null,
      totals: { sgx_sgd: 0, us_sgd: 0 },
    },
    fi_settings: {
      target_monthly_income_sgd:  8000,
      current_age:                36,
      target_retirement_age:      55,
      assumed_annual_return_pct:  6,
      annual_savings_sgd:         36000,
      cpf_persons:                1,
      swr_pct:                    4,
    },
  };
}

/**
 * One-click full JSON export for manual backup.
 * Triggers a browser file download.
 */
export function exportJSON(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hfi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
