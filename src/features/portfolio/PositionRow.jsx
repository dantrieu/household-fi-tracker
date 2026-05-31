import { useState } from 'react';
import useStore from '../../store/useStore';
import { formatSGD, formatPct, formatDelta, formatDeltaPct } from '../../lib/format';
import { isStale } from '../../lib/api';

export default function PositionRow({ position, totalSGD }) {
  const updatePosition = useStore((s) => s.updatePosition);
  const removePosition = useStore((s) => s.removePosition);

  const [editing, setEditing]         = useState(false);
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
  const priceStr   = last_price != null
    ? `${priceLabel === 'USD' ? 'US$' : 'S$'}${last_price.toFixed(2)}`
    : '—';

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

  const exchangeBadge = (
    <span className={[
      'text-xs font-semibold px-1.5 py-0.5 rounded',
      exchange === 'SGX'      ? 'bg-blue-50 text-blue-600'
      : exchange === 'CRYPTO' ? 'bg-orange-50 text-orange-600'
      : 'bg-purple-50 text-purple-600',
    ].join(' ')}>
      {isCrypto ? 'Crypto' : exchange}
    </span>
  );

  // ── Mobile card (shown below sm) ────────────────────────────────────────────
  const mobileCard = editing ? (
    <div className="sm:hidden bg-green-50 rounded-xl border border-green-200 p-3 mb-2 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-900">{ticker}</span>
          {company_name && <p className="text-xs text-gray-400">{company_name}</p>}
        </div>
        {exchangeBadge}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase">{isCrypto ? 'Amount' : 'Shares'}</label>
          <input
            autoFocus
            type="number" min="0" step="any"
            value={sharesDraft}
            onChange={(e) => setSharesDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
            className="w-full border border-green-400 rounded px-2 py-1 text-sm
                       focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase">Cost / {isCrypto ? 'token' : 'share'}</label>
          <input
            type="number" min="0" step="any"
            value={costDraft}
            onChange={(e) => setCostDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
            placeholder="optional"
            className="w-full border border-green-400 rounded px-2 py-1 text-sm
                       focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={commitEdit}
          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors">
          Save
        </button>
        <button onClick={cancelEdit}
          className="px-3 py-1.5 border border-gray-300 text-gray-500 text-xs rounded hover:border-gray-400 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="sm:hidden bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-2">
      {/* Header row: pencil + ticker + badge + remove */}
      <div className="flex items-start gap-2">
        <button onClick={startEdit} title="Edit" className="text-[11px] opacity-25 hover:opacity-70 leading-none transition-opacity mt-0.5">✏️</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-900">{ticker}</span>
            {exchange === 'SGX' && <span className="text-xs text-gray-400">.SI</span>}
            {stale && last_price != null && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded px-1 py-0.5">stale</span>
            )}
            {exchangeBadge}
          </div>
          {company_name && (
            <p className="text-xs text-gray-400 truncate">{company_name}</p>
          )}
        </div>
        <button onClick={() => removePosition(id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>
      {/* Data rows */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs pl-5">
        <span className="text-gray-400">{isCrypto ? 'Amount' : 'Shares'}</span>
        <span className="text-right tabular-nums text-gray-700">
          {isCrypto ? shares.toLocaleString(undefined, { maximumFractionDigits: 8 }) : shares.toLocaleString()}
        </span>
        <span className="text-gray-400">Price</span>
        <span className="text-right tabular-nums text-gray-700">{priceStr}</span>
        <span className="text-gray-400">Value (SGD)</span>
        <span className="text-right tabular-nums font-medium text-gray-900">
          {valueSGD != null ? formatSGD(valueSGD) : '—'}
        </span>
        {hasCost && <>
          <span className="text-gray-400">Cost/{isCrypto ? 'token' : 'share'}</span>
          <span className="text-right tabular-nums text-gray-500">
            {`${priceLabel === 'USD' ? 'US$' : 'S$'}${cost_price.toFixed(2)}`}
          </span>
        </>}
        {plSGD != null && <>
          <span className="text-gray-400">Unreal. P&L</span>
          <span className={`text-right tabular-nums font-medium ${plSGD >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatDelta(plSGD)} ({formatDeltaPct(plPct)})
          </span>
        </>}
      </div>
    </div>
  );

  // ── Desktop table row (shown sm+) ───────────────────────────────────────────
  const desktopRow = editing ? (
    <tr className="hidden sm:table-row bg-green-50 text-sm">
      {/* Pencil column (edit mode — save button here) */}
      <td className="py-2 pl-3 pr-1">
        <div className="flex gap-1">
          <button onClick={commitEdit}
            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors">
            Save
          </button>
          <button onClick={cancelEdit}
            className="px-1.5 py-1 border border-gray-300 text-gray-500 text-xs rounded hover:border-gray-400 transition-colors">
            ✕
          </button>
        </div>
      </td>
      <td className="py-2 pl-2 pr-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-gray-900">{ticker}</span>
          {company_name && <span className="text-xs text-gray-400 truncate max-w-[160px]">{company_name}</span>}
        </div>
      </td>
      <td className="py-2 px-2">{exchangeBadge}</td>
      <td className="py-2 px-2 text-right">
        <input autoFocus type="number" min="0" step="any"
          value={sharesDraft} onChange={(e) => setSharesDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
          className="w-24 text-right border border-green-400 rounded px-1.5 py-1 text-sm
                     focus:outline-none focus:ring-1 focus:ring-green-500" />
      </td>
      <td className="py-2 px-2 tabular-nums text-right text-gray-500 text-xs">{priceStr}</td>
      <td className="py-2 px-2 tabular-nums text-right text-gray-500 text-xs">
        {valueSGD != null ? formatSGD(valueSGD) : '—'}
      </td>
      <td className="py-2 px-2 text-right text-gray-400 text-xs">
        {valueSGD != null && totalSGD > 0 ? formatPct(valueSGD / totalSGD) : '—'}
      </td>
      <td className="py-2 px-2 text-right">
        <input type="number" min="0" step="any"
          value={costDraft} onChange={(e) => setCostDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
          placeholder="optional"
          className="w-24 text-right border border-green-400 rounded px-1.5 py-1 text-sm
                     focus:outline-none focus:ring-1 focus:ring-green-500" />
      </td>
      <td className="py-2 pr-4 px-2 text-right text-gray-400 text-xs">—</td>
    </tr>
  ) : (
    <tr className="hidden sm:table-row hover:bg-gray-50 transition-colors group text-sm">
      {/* Pencil at front */}
      <td className="py-3 pl-3 pr-1">
        <div className="flex items-center gap-1.5">
          <button onClick={startEdit} aria-label={`Edit ${ticker}`}
            title="Edit shares & cost"
            className="text-[11px] opacity-25 hover:opacity-70 leading-none transition-opacity">
            ✏️
          </button>
          <button onClick={() => removePosition(id)} aria-label={`Remove ${ticker}`}
            className="text-gray-200 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100">
            ✕
          </button>
        </div>
      </td>
      <td className="py-3 pl-2 pr-2">
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
      <td className="py-3 px-2">{exchangeBadge}</td>
      <td className="py-3 px-2 tabular-nums text-right text-gray-700">
        {isCrypto
          ? shares.toLocaleString(undefined, { maximumFractionDigits: 8 })
          : shares.toLocaleString()}
      </td>
      <td className="py-3 px-2 tabular-nums text-right text-gray-700">
        {last_price != null ? priceStr : <span className="text-gray-400">—</span>}
      </td>
      <td className="py-3 px-2 tabular-nums text-right font-medium text-gray-900">
        {valueSGD != null ? formatSGD(valueSGD) : <span className="text-gray-400">—</span>}
      </td>
      <td className="py-3 px-2 tabular-nums text-right text-gray-500">
        {valueSGD != null && totalSGD > 0 ? formatPct(valueSGD / totalSGD) : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-3 px-2 tabular-nums text-right text-gray-500">
        {hasCost
          ? `${priceLabel === 'USD' ? 'US$' : 'S$'}${cost_price.toFixed(2)}`
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-3 pr-4 px-2 text-right">
        {plSGD != null ? (
          <span className={`text-xs font-medium ${plSGD >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatDelta(plSGD)}<br />
            <span className="opacity-75">{formatDeltaPct(plPct)}</span>
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );

  return (
    <>
      {mobileCard}
      {desktopRow}
    </>
  );
}
