import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CURRENT_SCHEMA_VERSION, STORAGE_KEY } from '../lib/constants';
import { migrateState, buildV1State } from '../lib/storage';
import { computeFIMetrics } from '../lib/fi';

// ─── Store ────────────────────────────────────────────────────────────────────

const useStore = create(
  persist(
    (set, get) => ({
      // ── Raw state (mirrors localStorage schema) ──────────────────────────
      schema_version: CURRENT_SCHEMA_VERSION,
      last_modified: new Date().toISOString(),
      net_worth: buildV1State().net_worth,
      snapshots: [],
      portfolio: buildV1State().portfolio,
      fi_settings: buildV1State().fi_settings,

      // ── Net Worth actions ────────────────────────────────────────────────

      /** Update a single category's value. */
      setCategoryValue(key, value) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          net_worth: {
            ...state.net_worth,
            categories: {
              ...state.net_worth.categories,
              [key]: {
                ...state.net_worth.categories[key],
                value: Number(value) || 0,
              },
            },
          },
        }));
      },

      /** Toggle a category's investable flag. */
      toggleInvestable(key) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          net_worth: {
            ...state.net_worth,
            categories: {
              ...state.net_worth.categories,
              [key]: {
                ...state.net_worth.categories[key],
                investable: !state.net_worth.categories[key].investable,
              },
            },
          },
        }));
      },

      /**
       * Replace the full category order (used by drag-and-drop).
       * @param {string[]} newOrder - full array of category keys in new order
       */
      reorderCategories(newOrder) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          net_worth: { ...state.net_worth, category_order: newOrder },
        }));
      },

      /**
       * Add a new custom category.
       * @param {string} label - display name
       */
      addCategory(label) {
        const key = `custom_${Date.now()}`;
        set((state) => ({
          last_modified: new Date().toISOString(),
          net_worth: {
            ...state.net_worth,
            category_order: [...state.net_worth.category_order, key],
            categories: {
              ...state.net_worth.categories,
              [key]: { label, value: 0, investable: true, source: 'manual' },
            },
          },
        }));
      },

      /**
       * Rename a category label.
       * @param {string} key
       * @param {string} newLabel
       */
      updateCategoryLabel(key, newLabel) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          net_worth: {
            ...state.net_worth,
            categories: {
              ...state.net_worth.categories,
              [key]: { ...state.net_worth.categories[key], label: newLabel },
            },
          },
        }));
      },

      /**
       * Remove a custom category (built-in categories are protected).
       * @param {string} key
       */
      removeCategory(key) {
        const PROTECTED = ['cash_savings', 'sgx_equities', 'us_equities', 'crypto', 'cpf', 'property', 'other'];
        if (PROTECTED.includes(key)) return;
        set((state) => {
          const { [key]: _removed, ...rest } = state.net_worth.categories;
          return {
            last_modified: new Date().toISOString(),
            net_worth: {
              ...state.net_worth,
              category_order: state.net_worth.category_order.filter((k) => k !== key),
              categories: rest,
            },
          };
        });
      },

      // ── Portfolio bridge (Phase 2 hook-up point) ─────────────────────────

      /**
       * Called by the Portfolio module (Phase 2) to push live totals
       * into the Net Worth equities categories automatically.
       * In Phase 1 the values are editable manually — this action is a no-op
       * until Phase 2 is wired up, but the store slot is ready.
       *
       * @param {{ sgx_sgd: number, us_sgd: number }} totals
       * @param {{ fx_rate_usd_sgd: number, last_refreshed: string }} meta
       */
      setPortfolioTotals(totals, meta = {}) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          portfolio: {
            ...state.portfolio,
            totals,
            fx_rate_usd_sgd: meta.fx_rate_usd_sgd ?? state.portfolio.fx_rate_usd_sgd,
            last_refreshed: meta.last_refreshed ?? state.portfolio.last_refreshed,
          },
          net_worth: {
            ...state.net_worth,
            categories: {
              ...state.net_worth.categories,
              sgx_equities: {
                ...state.net_worth.categories.sgx_equities,
                value: totals.sgx_sgd ?? state.net_worth.categories.sgx_equities.value,
              },
              us_equities: {
                ...state.net_worth.categories.us_equities,
                value: totals.us_sgd ?? state.net_worth.categories.us_equities.value,
              },
            },
          },
        }));
      },

      // ── Portfolio position actions (Phase 2) ────────────────────────────

      /** Add a new position. */
      addPosition({ ticker, exchange, shares, cost_price = null, company_name = null, coin_id = null }) {
        const position = {
          id: String(Date.now()),
          ticker: ticker.trim().toUpperCase(),
          exchange,
          company_name: company_name ?? null,
          coin_id: coin_id ?? null,           // CoinGecko ID for crypto positions
          shares: Number(shares),
          cost_price: cost_price != null ? Number(cost_price) : null,
          last_price: null,
          last_price_currency: exchange === 'SGX' ? 'SGD' : 'USD',
          last_updated: null,
        };
        set((state) => ({
          last_modified: new Date().toISOString(),
          portfolio: {
            ...state.portfolio,
            positions: [...state.portfolio.positions, position],
          },
        }));
        return position.id;
      },

      /** Update shares or cost price for an existing position. */
      updatePosition(id, { shares, cost_price }) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          portfolio: {
            ...state.portfolio,
            positions: state.portfolio.positions.map((p) =>
              p.id !== id ? p : {
                ...p,
                ...(shares != null ? { shares: Number(shares) } : {}),
                ...(cost_price !== undefined ? { cost_price: cost_price != null ? Number(cost_price) : null } : {}),
              }
            ),
          },
        }));
      },

      /** Remove a position by id. */
      removePosition(id) {
        set((state) => {
          const positions = state.portfolio.positions.filter((p) => p.id !== id);
          return {
            last_modified: new Date().toISOString(),
            portfolio: { ...state.portfolio, positions },
          };
        });
      },

      /**
       * Apply fetched prices to positions and recalculate totals.
       * @param {Object} priceMap  { [positionId]: { price, currency, error? } }
       * @param {number} fxRate    USD/SGD rate
       */
      applyPrices(priceMap, fxRate) {
        set((state) => {
          const now = new Date().toISOString();
          const positions = state.portfolio.positions.map((p) => {
            const result = priceMap[p.id];
            if (!result || result.error) return p;
            return {
              ...p,
              last_price: result.price,
              last_price_currency: result.currency,
              last_updated: now,
            };
          });

          // Recalculate totals by exchange
          let sgx_sgd = 0, us_sgd = 0, crypto_sgd = 0;
          for (const p of positions) {
            if (p.last_price == null) continue;
            if (p.exchange === 'SGX') {
              sgx_sgd += p.shares * p.last_price;
            } else if (p.exchange === 'CRYPTO') {
              crypto_sgd += p.shares * p.last_price * fxRate;
            } else {
              // US equities — price is in USD
              us_sgd += p.shares * p.last_price * fxRate;
            }
          }

          return {
            last_modified: now,
            portfolio: {
              ...state.portfolio,
              positions,
              last_refreshed: now,
              fx_rate_usd_sgd: fxRate,
              totals: { sgx_sgd, us_sgd, crypto_sgd },
            },
            // Auto-feed Net Worth categories
            net_worth: {
              ...state.net_worth,
              categories: {
                ...state.net_worth.categories,
                sgx_equities: { ...state.net_worth.categories.sgx_equities, value: sgx_sgd },
                us_equities:  { ...state.net_worth.categories.us_equities,  value: us_sgd  },
                ...(state.net_worth.categories.crypto
                  ? { crypto: { ...state.net_worth.categories.crypto, value: crypto_sgd } }
                  : {}),
              },
            },
          };
        });
      },

      // ── Snapshot actions ─────────────────────────────────────────────────

      /**
       * Save current net worth state as a year-end snapshot.
       * @param {number} year  e.g. 2024
       * @param {string} [label]  e.g. "Year-end 2024"
       */
      saveSnapshot(year, label) {
        const state = get();
        const cats = state.net_worth.categories;

        const total = selectors.totalNetWorth(state);
        const investable = selectors.investableNetWorth(state);
        const exCpf = selectors.netWorthExCpf(state);

        // Build flat category values map
        const categoryValues = {};
        for (const key of Object.keys(cats)) {
          categoryValues[key] = cats[key].value;
        }

        const snapshot = {
          id: String(Date.now()),
          year: Number(year),
          label: label || `Year-end ${year}`,
          saved_at: new Date().toISOString(),
          totals: {
            total_net_worth: total,
            investable_net_worth: investable,
            net_worth_ex_cpf: exCpf,
          },
          categories: categoryValues,
        };

        set((state) => ({
          last_modified: new Date().toISOString(),
          // Replace same-year snapshot; append new one (no auto-sort — display order is user-defined)
          snapshots: [
            ...state.snapshots.filter((s) => s.year !== Number(year)),
            snapshot,
          ],
        }));
      },

      /**
       * Save a manually-entered snapshot with custom totals (for past years).
       * @param {number} year
       * @param {string} label
       * @param {{ total: number, investable: number, exCpf: number }} totals
       */
      saveManualSnapshot(year, label, totals) {
        const snapshot = {
          id: String(Date.now()),
          year: Number(year),
          label: label || `Year-end ${year}`,
          saved_at: new Date().toISOString(),
          manual: true,
          totals: {
            total_net_worth:      totals.total     ?? 0,
            investable_net_worth: totals.investable ?? 0,
            net_worth_ex_cpf:     totals.exCpf      ?? 0,
          },
          categories: {},
        };
        set((state) => ({
          last_modified: new Date().toISOString(),
          snapshots: [
            ...state.snapshots.filter((s) => s.year !== Number(year)),
            snapshot,
          ],
        }));
      },

      /** Update snapshot label, year, and/or totals. */
      updateSnapshot(id, { label, year, totals }) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          snapshots: state.snapshots.map((s) =>
            s.id !== id ? s : {
              ...s,
              ...(label  != null ? { label } : {}),
              ...(year   != null ? { year: Number(year) } : {}),
              ...(totals != null ? {
                totals: {
                  total_net_worth:      totals.total      ?? s.totals.total_net_worth,
                  investable_net_worth: totals.investable  ?? s.totals.investable_net_worth,
                  net_worth_ex_cpf:     totals.exCpf       ?? s.totals.net_worth_ex_cpf,
                },
              } : {}),
            }
          ),
        }));
      },

      /** Reorder snapshots — newOrder is array of snapshot ids. */
      reorderSnapshots(newOrder) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          snapshots: newOrder
            .map((id) => state.snapshots.find((s) => s.id === id))
            .filter(Boolean),
        }));
      },

      /** Delete a snapshot by id. */
      deleteSnapshot(id) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          snapshots: state.snapshots.filter((s) => s.id !== id),
        }));
      },

      // ── FI settings actions (Phase 3 prep) ──────────────────────────────

      setFiSetting(key, value) {
        set((state) => ({
          last_modified: new Date().toISOString(),
          fi_settings: { ...state.fi_settings, [key]: value },
        }));
      },

      // ── Cloud restore ────────────────────────────────────────────────────

      /**
       * Replace store data with payload loaded from cloud save.
       * Only overwrites data fields — actions are untouched.
       * @param {object} payload  The object returned by loadFromCloud()
       */
      restoreFromCloud(payload) {
        set(() => ({
          last_modified: new Date().toISOString(),
          net_worth:   payload.net_worth   ?? buildV1State().net_worth,
          fi_settings: payload.fi_settings ?? buildV1State().fi_settings,
          snapshots:   payload.snapshots   ?? [],
          portfolio: {
            ...buildV1State().portfolio,
            positions: payload.portfolio?.positions ?? [],
          },
        }));
      },
    }),

    // ── Zustand persist config ─────────────────────────────────────────────
    {
      name: STORAGE_KEY,
      version: CURRENT_SCHEMA_VERSION,
      migrate: migrateState,
      // Only persist the data fields — not actions
      partialize: (state) => ({
        schema_version: state.schema_version,
        last_modified: state.last_modified,
        net_worth: state.net_worth,
        snapshots: state.snapshots,
        portfolio: state.portfolio,
        fi_settings: state.fi_settings,
      }),
    }
  )
);

// ─── Selectors (derived values — not stored) ──────────────────────────────────
// Import these alongside useStore: import useStore, { selectors } from '...'

export const selectors = {
  /** Sum of all category values. */
  totalNetWorth(state) {
    return Object.values(state.net_worth.categories).reduce(
      (sum, cat) => sum + (cat.value || 0),
      0
    );
  },

  /** Sum of categories where investable === true. */
  investableNetWorth(state) {
    return Object.values(state.net_worth.categories).reduce(
      (sum, cat) => sum + (cat.investable ? cat.value || 0 : 0),
      0
    );
  },

  /** Total minus CPF. */
  netWorthExCpf(state) {
    const total = selectors.totalNetWorth(state);
    const cpf = state.net_worth.categories.cpf?.value || 0;
    return total - cpf;
  },

  /**
   * Returns categories in user-defined display order.
   * @returns {{ key: string, label: string, value: number, investable: boolean, source: string }[]}
   */
  orderedCategories(state) {
    return state.net_worth.category_order.map((key) => ({
      key,
      ...state.net_worth.categories[key],
    }));
  },

  /**
   * All derived FI metrics computed from current state.
   * Returns partial metrics if target income is not yet set.
   */
  fiMetrics(state) {
    return computeFIMetrics({
      investablePortfolio:            selectors.investableNetWorth(state),
      targetMonthlyIncome:            state.fi_settings.target_monthly_income_sgd,
      currentAge:                     state.fi_settings.current_age,
      retirementAge:                  state.fi_settings.target_retirement_age,
      annualSavings:                  state.fi_settings.annual_savings_sgd,
      annualReturnPct:                state.fi_settings.assumed_annual_return_pct ?? 6,
      cpfPersons:                     state.fi_settings.cpf_persons ?? 1,
      swrPct:                         state.fi_settings.swr_pct ?? 4,
      stopContributionsAtRetirement:  state.fi_settings.stop_contributions_at_retirement ?? true,
    });
  },

  /**
   * Portfolio positions enriched with SGD value, weight, and P&L.
   */
  enrichedPositions(state) {
    const fx = state.portfolio.fx_rate_usd_sgd ?? 1;
    const positions = state.portfolio.positions.map((p) => {
      const valueSGD = p.last_price != null
        ? (p.exchange === 'SGX' ? p.shares * p.last_price : p.shares * p.last_price * fx)
        : null;
      const costSGD = p.cost_price != null
        ? (p.exchange === 'SGX' ? p.shares * p.cost_price : p.shares * p.cost_price * fx)
        : null;
      const plSGD = valueSGD != null && costSGD != null ? valueSGD - costSGD : null;
      const plPct = plSGD != null && costSGD ? plSGD / costSGD : null;
      return { ...p, valueSGD, costSGD, plSGD, plPct };
    });
    const totalSGD = positions.reduce((s, p) => s + (p.valueSGD ?? 0), 0);
    return positions.map((p) => ({
      ...p,
      weight: totalSGD > 0 && p.valueSGD != null ? p.valueSGD / totalSGD : null,
    }));
  },

  /**
   * Snapshots in user-defined display order, with delta vs chronologically prior year attached.
   * Display order is determined by how snapshots are stored (drag/drop reorderable).
   * Delta is always computed year-over-year regardless of display order.
   */
  snapshotsWithDelta(state) {
    // Build a year-sorted index for delta lookup
    const byYear = [...state.snapshots].sort((a, b) => a.year - b.year);

    return state.snapshots.map((snap) => {
      const idxInYear = byYear.findIndex((s) => s.id === snap.id);
      const prior = idxInYear > 0 ? byYear[idxInYear - 1] : null;
      const delta = prior
        ? snap.totals.total_net_worth - prior.totals.total_net_worth
        : null;
      const deltaPct =
        delta != null && prior.totals.total_net_worth !== 0
          ? delta / prior.totals.total_net_worth
          : null;
      return { ...snap, delta, deltaPct };
    });
  },
};

export default useStore;
