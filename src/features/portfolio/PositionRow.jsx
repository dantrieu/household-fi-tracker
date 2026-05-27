import { useState } from 'react';
import useStore from '../../store/useStore';
import { formatSGD, formatPct, formatDelta, formatDeltaPct } from '../../lib/format';
import { isStale } from '../../lib/api';

export default function PositionRow({ position, totalSGD }) {
  const updatePosition = useStore((s) => s.updatePosition);
  const removePosition = useStore((s) => s.removePosition);

  const [editShares, setEditShares]     = useState(false);
  const [sharesDraft, setSharesDraft]   = useState('');
  const [editCost, setEditCost]         = useState(false);
  const [costDraft, setCostDraft]       = useState('');

  const { id, ticker, exchange, company_name, shares, cost_price, last_price, last_price_currency, last_updated,
          valueSGD, plSGD, plPct } = position;

  const stale    = isStale(last_updated);
  const hasCost  = cost_price != null;
  const priceLabel = last_price_currency === 'USD' ? 'USD' : 'SGD';

  function commitShares() {
    const v = parseFloat(sharesDraft);
    if (!isNaN(v) && v > 0) updatePosition(id, { shares: v });
    setEditShares(false);
  }

  function commitCost() {
    const v = costDraft.trim() === '' ? null : parseFloat(costDraft);
    updatePosition(id, { cost_price: v });
    setEditCost(false);
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors group text-sm">
      {/* Ticker / Company */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900">{ticker}</span>
            {exchange === 'SGX' && (
              <span className="text-xs text-gray-400">.SI</span>
            )}
            {stale && last_price != null && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200
                               rounded px-1.5 py-0.5 font-normal">stale</span>
            )}
          </div>
          {company_name && (
            <span className="text-xs text-gray-400 truncate max-w-[160px]" title={company_name}>
              {company_name}
            </span>
          )}
        </div>
      </td>

      {/* Exchange */}
      <td className="py-3 px-2">
        <span className={[
          'text-xs font-semibold px-1.5 py-0.5 rounded',
          exchange === 'SGX'
            ? 'bg-blue-50 text-blue-600'
            : 'bg-purple-50 text-purple-600',
        ].join(' ')}>
          {exchange}
        </span>
      </td>

      {/* Shares — click to edit */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-700">
        {editShares ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="any"
            value={sharesDraft}
            onChange={(e) => setSharesDraft(e.target.value)}
            onBlur={commitShares}
            onKeyDown={(e) => { if (e.key === 'Enter') commitShares(); if (e.key === 'Escape') setEditShares(false); }}
            className="w-20 text-right border border-green-400 rounded px-1.5 py-0.5 text-sm
                       focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        ) : (
          <span
            onClick={() => { setSharesDraft(String(shares)); setEditShares(true); }}
            className="cursor-pointer hover:text-green-700 hover:underline decoration-dashed underline-offset-2"
          >
            {shares.toLocaleString()}
          </span>
        )}
      </td>

      {/* Last price */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-700">
        {last_price != null
          ? `${priceLabel === 'USD' ? 'US$' : 'S$'}${last_price.toFixed(2)}`
          : <span className="text-gray-400">—</span>
        }
      </td>

      {/* Value (SGD) */}
      <td className="py-3 px-2 tabular-nums text-right font-medium text-gray-900">
        {valueSGD != null ? formatSGD(valueSGD) : <span className="text-gray-400">—</span>}
      </td>

      {/* Weight */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-500">
        {valueSGD != null && totalSGD > 0
          ? formatPct(valueSGD / totalSGD)
          : <span className="text-gray-300">—</span>
        }
      </td>

      {/* Cost price — click to edit */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-500">
        {editCost ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="any"
            value={costDraft}
            onChange={(e) => setCostDraft(e.target.value)}
            onBlur={commitCost}
            onKeyDown={(e) => { if (e.key === 'Enter') commitCost(); if (e.key === 'Escape') setEditCost(false); }}
            placeholder="—"
            className="w-20 text-right border border-green-400 rounded px-1.5 py-0.5 text-sm
                       focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        ) : (
          <span
            onClick={() => { setCostDraft(cost_price != null ? String(cost_price) : ''); setEditCost(true); }}
            className="cursor-pointer hover:text-green-700 hover:underline decoration-dashed underline-offset-2"
          >
            {hasCost ? `${priceLabel === 'USD' ? 'US$' : 'S$'}${cost_price.toFixed(2)}` : <span className="text-gray-300">+cost</span>}
          </span>
        )}
      </td>

      {/* Unrealised P&L */}
      <td className="py-3 px-2 text-right">
        {plSGD != null ? (
          <span className={[
            'text-xs font-medium',
            plSGD >= 0 ? 'text-green-600' : 'text-red-500',
          ].join(' ')}>
            {formatDelta(plSGD)}
            <br />
            <span className="opacity-75">{formatDeltaPct(plPct)}</span>
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Delete */}
      <td className="py-3 pr-4 pl-2">
        <button
          onClick={() => removePosition(id)}
          aria-label={`Remove ${ticker}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300
                     hover:text-red-400 text-xs"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
