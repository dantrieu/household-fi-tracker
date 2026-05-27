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

  const fmt = (d) => d
    ? new Date(d).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const cardCls = 'bg-white rounded-xl border border-gray-200 p-3 sm:p-5 flex flex-col gap-0.5 sm:gap-1';
  const labelCls = 'text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500';
  const valueCls = 'text-lg sm:text-2xl font-bold tabular-nums';

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {/* Total portfolio value */}
      <div className={cardCls}>
        <p className={labelCls}>Total Portfolio</p>
        <p className={`${valueCls} text-green-600`}>{formatSGD(totalSGD)}</p>
        {stale && lastRefresh && (
          <p className="text-[10px] sm:text-xs text-amber-500 mt-0.5">⚠ Prices may be stale</p>
        )}
      </div>

      {/* FX Rate */}
      <div className={cardCls}>
        <p className={labelCls}>USD / SGD</p>
        <p className={`${valueCls} text-gray-900`}>
          {fxRate ? fxRate.toFixed(4) : '—'}
        </p>
        <p className="text-[10px] sm:text-xs text-gray-400">
          {fxRate ? 'Live rate' : 'Not fetched'}
        </p>
      </div>

      {/* Last refreshed + refresh button */}
      <div className={cardCls}>
        <p className={labelCls}>Last Updated</p>
        <p className={`${valueCls} text-gray-900`}>{fmt(lastRefresh)}</p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className={[
            'mt-1 self-start px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all',
            refreshing
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-green-600 hover:bg-green-700 text-white',
          ].join(' ')}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>
    </div>
  );
}
