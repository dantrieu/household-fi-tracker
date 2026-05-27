import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
import { isStale } from '../../lib/api';

export default function PortfolioSummaryCards({ onRefresh, refreshing }) {
  const state       = useStore();
  const positions   = selectors.enrichedPositions(state);
  const totalSGD    = positions.reduce((s, p) => s + (p.valueSGD ?? 0), 0);
  const fxRate      = state.portfolio.fx_rate_usd_sgd;
  const lastRefresh = state.portfolio.last_refreshed;
  const stale       = isStale(lastRefresh);

  const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total portfolio value */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Portfolio</p>
        <p className="text-2xl font-bold tabular-nums text-green-600">{formatSGD(totalSGD)}</p>
        {stale && lastRefresh && (
          <p className="text-xs text-amber-500 mt-1">⚠ Prices may be stale</p>
        )}
      </div>

      {/* FX Rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">USD / SGD Rate</p>
        <p className="text-2xl font-bold tabular-nums text-gray-900">
          {fxRate ? fxRate.toFixed(4) : '—'}
        </p>
        <p className="text-xs text-gray-400">
          {fxRate ? 'Live rate' : 'Not fetched yet'}
        </p>
      </div>

      {/* Last refreshed + refresh button */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Updated</p>
        <p className="text-2xl font-bold text-gray-900">{fmt(lastRefresh)}</p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className={[
            'mt-2 self-start px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
            refreshing
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-green-600 hover:bg-green-700 text-white',
          ].join(' ')}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh Prices'}
        </button>
      </div>
    </div>
  );
}
