import { useEffect, useState, useCallback } from 'react';
import useStore from '../../store/useStore';
import { fetchAllPrices, fetchFxRate, fetchStockPrice, isStale } from '../../lib/api';
import PortfolioSummaryCards from './PortfolioSummaryCards';
import AddPositionForm from './AddPositionForm';
import PositionsTable from './PositionsTable';
import PortfolioAllocationChart from './PortfolioAllocationChart';

export default function PortfolioPage() {
  const positions    = useStore((s) => s.portfolio.positions);
  const lastRefresh  = useStore((s) => s.portfolio.last_refreshed);
  const addPosition  = useStore((s) => s.addPosition);
  const applyPrices  = useStore((s) => s.applyPrices);

  const [refreshing,  setRefreshing]  = useState(false);
  const [addLoading,  setAddLoading]  = useState(false);
  const [refreshError, setRefreshError] = useState('');

  // ── Refresh all prices ────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    if (positions.length === 0) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      const [priceMap, { rate }] = await Promise.all([
        fetchAllPrices(positions),
        fetchFxRate(),
      ]);
      applyPrices(priceMap, rate);
    } catch (err) {
      setRefreshError(err.message ?? 'Refresh failed. Check your connection.');
    } finally {
      setRefreshing(false);
    }
  }, [positions, applyPrices]);

  // Auto-refresh on mount if stale
  useEffect(() => {
    if (positions.length > 0 && isStale(lastRefresh)) {
      refreshAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Add a position (fetch price immediately) ──────────────────────────────
  async function handleAdd({ ticker, exchange, shares, cost_price }) {
    setAddLoading(true);
    try {
      // Validate ticker by fetching price first (also returns company name + coin_id for crypto)
      const { price, currency, company_name, coin_id } = await fetchStockPrice(ticker, exchange);

      // Add to store (with company name and coin_id for crypto)
      const id = addPosition({ ticker, exchange, shares, cost_price, company_name, coin_id });

      // Also fetch FX rate and apply prices for the new position
      let fxRate = useStore.getState().portfolio.fx_rate_usd_sgd;
      if (!fxRate) {
        const { rate } = await fetchFxRate();
        fxRate = rate;
      }

      // Build a single-position price map for the new id
      const allPositions = useStore.getState().portfolio.positions;
      const newPos = allPositions.find((p) => p.id === id);
      if (newPos) {
        applyPrices({ [id]: { price, currency } }, fxRate);
      }
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Portfolio</h1>
        <p className="text-sm text-gray-500">
          SGX and US equity holdings. Prices via Yahoo Finance (15-min delay).
          Portfolio total auto-updates Net Worth.
        </p>
      </div>

      {/* Summary cards */}
      <PortfolioSummaryCards onRefresh={refreshAll} refreshing={refreshing} />

      {refreshError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          ⚠ {refreshError}
        </div>
      )}

      {/* Positions table + allocation chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <PositionsTable />
          <AddPositionForm onAdd={handleAdd} loading={addLoading} />
        </div>
        <div className="lg:col-span-1">
          <PortfolioAllocationChart />
        </div>
      </div>
    </div>
  );
}
