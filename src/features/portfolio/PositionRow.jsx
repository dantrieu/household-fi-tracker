import { useState } from 'react';
import useStore from '../../store/useStore';
import { formatSGD, formatPct, formatDelta, formatDeltaPct } from '../../lib/format';
import { isStale } from '../../lib/api';

export default function PositionRow({ position, totalSGD }) {
  const updatePosition = useStore((s) => s.updatePosition);
  const removePosition = useStore((s) => s.removePosition);

  const [editing, setEditing]       = useState(false);
  const [sharesDraft, setSharesDraft] = useState('');
  const [costDraft, setCostDraft]     = useState('');

  const {
    id, ticker, exchange, company_name, shares, cost_price,
    last_price, last_price_currency, last_updated,
    valueSGD, plSGD, plPct,
  } = position;

  const stale      = isStale(last_updated);
  const hasCost    = cost_price != null;
  const priceLabel = last_price_currency === 'USD' ? 'USD' : 'SGD';
  const isCrypto   = exchange === 'CRYPTO';

  function startEdit() {
    setSharesDraft(String(shares));
    setCostDraft(cost_price != null ? String(cost_price) : '');
    setEditing(true);
  }

  function commitEdit() {
    const s = parseFloat(sharesDraft);
    const c = costDraft.trim() === '' ? null : parseFloat(costDraft);
    if (!isNaN(s) && s > 0) {
      updatePosition(id, {
        shares: s,
        cost_price: c != null && !isNaN(c) ? c : null,
      });
    }
    setEditing(false);
  }

  function cancelEdit() { setEditing(false); }

  // ── Edit mode row ──────────────────────────────────────────────────────────
  if (editing) {
    return (
      <tr className="bg-green-50 text-sm">
        {/* Ticker (read-only in edit) */}
        <td className="py-2 pl-4 pr-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-gray-900">{ticker}</span>
            {company_name && (
              <span className="text-xs text-gray-400 truncate max-w-[160px]">{company_name}</span>
            )}
          </div>
        </td>

        {/* Exchange badge */}
        <td className="py-2 px-2">
          <span className={[
            'text-xs font-semibold px-1.5 py-0.5 rounded',
            exchange === 'SGX'    ? 'bg-blue-50 text-blue-600'
            : exchange === 'CRYPTO' ? 'bg-orange-50 text-orange-600'
            : 'bg-purple-50 text-purple-600',
          ].join(' ')}>
            {isCrypto ? 'Crypto' : exchange}
          </span>
        </td>

        {/* Shares / Amount input */}
        <td className="py-2 px-2 text-right">
          <div className="flex flex-col items-end gap-0.5">
            <label className="text-[10px] text-gray-400 uppercase">{isCrypto ? 'Amount' : 'Shares'}</label>
            <input
              autoFocus
              type="number"
              min="0"
              step="any"
              value={sharesDraft}
              onChange={(e) => setSharesDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="w-24 text-right border border-green-400 rounded px-1.5 py-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </td>

        {/* Price (read-only) */}
        <td className="py-2 px-2 tabular-nums text-right text-gray-500 text-xs">
          {last_price != null ? `${priceLabel === 'USD' ? 'US$' : 'S$'}${last_price.toFixed(2)}` : '—'}
        </td>

        {/* Value (read-only) */}
        <td className="py-2 px-2 tabular-nums text-right text-gray-500 text-xs">
          {valueSGD != null ? formatSGD(valueSGD) : '—'}
        </td>

        {/* Weight (read-only) */}
        <td className="py-2 px-2 text-right text-gray-400 text-xs">
          {valueSGD != null && totalSGD > 0 ? formatPct(valueSGD / totalSGD) : '—'}
        </td>

        {/* Cost input */}
        <td className="py-2 px-2 text-right">
          <div className="flex flex-col items-end gap-0.5">
            <label className="text-[10px] text-gray-400 uppercase">Cost / {isCrypto ? 'token' : 'share'}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={costDraft}
              onChange={(e) => setCostDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
              placeholder="optional"
              className="w-24 text-right border border-green-400 rounded px-1.5 py-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </td>

        {/* P&L (read-only) */}
        <td className="py-2 px-2 text-right text-gray-400 text-xs">—</td>

        {/* Save / Cancel */}
        <td className="py-2 pr-4 pl-2">
          <div className="flex gap-1.5">
            <button
              onClick={commitEdit}
              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs
                         font-medium rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="px-2 py-1 border border-gray-300 text-gray-500 text-xs
                         rounded hover:border-gray-400 transition-colors"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // ── Normal (view) mode row ─────────────────────────────────────────────────
  return (
    <tr className="hover:bg-gray-50 transition-colors group text-sm">
      {/* Ticker / Company */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900">{ticker}</span>
            {exchange === 'SGX' && <span className="text-xs text-gray-400">.SI</span>}
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
          exchange === 'SGX'    ? 'bg-blue-50 text-blue-600'
          : exchange === 'CRYPTO' ? 'bg-orange-50 text-orange-600'
          : 'bg-purple-50 text-purple-600',
        ].join(' ')}>
          {isCrypto ? 'Crypto' : exchange}
        </span>
      </td>

      {/* Shares */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-700">
        {isCrypto
          ? shares.toLocaleString(undefined, { maximumFractionDigits: 8 })
          : shares.toLocaleString()}
      </td>

      {/* Last price */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-700">
        {last_price != null
          ? `${priceLabel === 'USD' ? 'US$' : 'S$'}${last_price.toFixed(2)}`
          : <span className="text-gray-400">—</span>}
      </td>

      {/* Value (SGD) */}
      <td className="py-3 px-2 tabular-nums text-right font-medium text-gray-900">
        {valueSGD != null ? formatSGD(valueSGD) : <span className="text-gray-400">—</span>}
      </td>

      {/* Weight */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-500">
        {valueSGD != null && totalSGD > 0
          ? formatPct(valueSGD / totalSGD)
          : <span className="text-gray-300">—</span>}
      </td>

      {/* Cost price */}
      <td className="py-3 px-2 tabular-nums text-right text-gray-500">
        {hasCost
          ? `${priceLabel === 'USD' ? 'US$' : 'S$'}${cost_price.toFixed(2)}`
          : <span className="text-gray-300">—</span>}
      </td>

      {/* Unrealised P&L */}
      <td className="py-3 px-2 text-right">
        {plSGD != null ? (
          <span className={`text-xs font-medium ${plSGD >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatDelta(plSGD)}
            <br />
            <span className="opacity-75">{formatDeltaPct(plPct)}</span>
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Edit + Delete */}
      <td className="py-3 pr-4 pl-2">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={startEdit}
            aria-label={`Edit ${ticker}`}
            className="text-gray-400 hover:text-green-600 text-xs transition-colors"
            title="Edit shares & cost"
          >
            ✏️
          </button>
          <button
            onClick={() => removePosition(id)}
            aria-label={`Remove ${ticker}`}
            className="text-gray-300 hover:text-red-400 text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
