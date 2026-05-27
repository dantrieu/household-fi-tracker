// ─── Asset category definitions ───────────────────────────────────────────────
// These are the canonical metadata for each category.
// The DISPLAY ORDER is controlled by net_worth.category_order in the store
// (user-editable via up/down arrows), not by insertion order here.

export const CATEGORY_META = {
  cash_savings: {
    key: 'cash_savings',
    label: 'Cash & Savings',
    investable: true,   // default investable toggle value
    source: 'manual',  // 'manual' | 'portfolio' (portfolio = auto-fed by Phase 2)
  },
  sgx_equities: {
    key: 'sgx_equities',
    label: 'SGX Equities',
    investable: true,
    source: 'portfolio',
  },
  us_equities: {
    key: 'us_equities',
    label: 'US Equities',
    investable: true,
    source: 'portfolio',
  },
  cpf: {
    key: 'cpf',
    label: 'CPF',
    investable: false,  // non-investable by default per PRD
    source: 'manual',
  },
  property: {
    key: 'property',
    label: 'Own-Stay Property',
    investable: false,  // non-investable by default per PRD
    source: 'manual',
  },
  crypto: {
    key: 'crypto',
    label: 'Crypto',
    investable: true,
    source: 'portfolio',  // auto-fed from crypto positions
  },
  other: {
    key: 'other',
    label: 'Other',
    investable: true,
    source: 'manual',
  },
};

// Default display order (user can reorder; this is the initial order)
export const DEFAULT_CATEGORY_ORDER = [
  'cash_savings',
  'sgx_equities',
  'us_equities',
  'crypto',
  'cpf',
  'property',
  'other',
];

// Build the initial categories object for a fresh store
export function buildDefaultCategories() {
  const categories = {};
  for (const key of DEFAULT_CATEGORY_ORDER) {
    const meta = CATEGORY_META[key];
    categories[key] = {
      label: meta.label,
      value: 0,
      investable: meta.investable,
      source: meta.source,
    };
  }
  return categories;
}

// ─── Schema versioning ────────────────────────────────────────────────────────
export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'hfi-store';
