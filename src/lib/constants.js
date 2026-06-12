// ─── Asset category definitions ───────────────────────────────────────────────
// These are the canonical metadata for each category.
// The DISPLAY ORDER is controlled by net_worth.category_order in the store
// (user-editable via up/down arrows), not by insertion order here.

export const CATEGORY_META = {
  cash_savings: {
    key: 'cash_savings',
    label: 'Cash & Savings',
    investable: true,
    source: 'manual',
    is_cpf: false,
  },
  sgx_equities: {
    key: 'sgx_equities',
    label: 'SGX Equities',
    investable: true,
    source: 'portfolio',
    is_cpf: false,
  },
  us_equities: {
    key: 'us_equities',
    label: 'US / Intl Equities',
    investable: true,
    source: 'portfolio',
    is_cpf: false,
  },
  cpf: {
    key: 'cpf',
    label: 'CPF',
    investable: false,
    source: 'manual',
    is_cpf: true,   // always excluded from NW Excl. CPF
  },
  property: {
    key: 'property',
    label: 'Own-Stay Property',
    investable: false,
    source: 'manual',
    is_cpf: false,
  },
  crypto: {
    key: 'crypto',
    label: 'Crypto',
    investable: true,
    source: 'portfolio',
    is_cpf: false,
  },
  other: {
    key: 'other',
    label: 'Other',
    investable: true,
    source: 'manual',
    is_cpf: false,
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
      label:     meta.label,
      value:     0,
      investable: meta.investable,
      source:    meta.source,
      is_cpf:    meta.is_cpf ?? false,
    };
  }
  return categories;
}

// ─── Schema versioning ────────────────────────────────────────────────────────
export const CURRENT_SCHEMA_VERSION = 4;
export const STORAGE_KEY = 'hfi-store';
