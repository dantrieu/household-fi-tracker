import { useState } from 'react';

export default function AddPositionForm({ onAdd, loading }) {
  const [ticker,    setTicker]    = useState('');
  const [exchange,  setExchange]  = useState('SGX');
  const [shares,    setShares]    = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [open,      setOpen]      = useState(false);
  const [error,     setError]     = useState('');

  function reset() {
    setTicker(''); setShares(''); setCostPrice(''); setError('');
  }

  function handleCancel() { reset(); setOpen(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const t = ticker.trim().toUpperCase();
    const s = parseFloat(shares);
    if (!t)          return setError('Ticker is required.');
    if (isNaN(s) || s <= 0) return setError('Enter a valid share count.');

    const cp = costPrice.trim() ? parseFloat(costPrice) : null;
    if (costPrice.trim() && isNaN(cp)) return setError('Invalid cost price.');

    try {
      await onAdd({ ticker: t, exchange, shares: s, cost_price: cp });
      reset();
      setOpen(false);
    } catch (err) {
      setError(err.message ?? 'Failed to add position. Check the ticker and try again.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-400
                   hover:text-green-600 transition-colors"
      >
        <span className="text-lg leading-none">+</span> Add position
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">New Position</p>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Exchange */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Exchange</label>
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="SGX">SGX</option>
            <option value="US">US</option>
            <option value="CRYPTO">Crypto</option>
          </select>
        </div>

        {/* Ticker / Symbol */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            {exchange === 'CRYPTO' ? 'Symbol' : 'Ticker'}
            {exchange === 'SGX' && <span className="text-gray-400"> (no .SI needed)</span>}
          </label>
          <input
            autoFocus
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder={
              exchange === 'SGX' ? 'e.g. D05'
              : exchange === 'CRYPTO' ? 'e.g. BTC'
              : 'e.g. AAPL'
            }
            className="w-28 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Shares / Amount */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            {exchange === 'CRYPTO' ? 'Amount' : 'Shares'}
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder={exchange === 'CRYPTO' ? '0.5' : '100'}
            className="w-28 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Cost price (optional) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            Cost price / {exchange === 'CRYPTO' ? 'token' : 'share'}{' '}
            <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder={exchange === 'SGX' ? 'SGD' : 'USD'}
            className="w-28 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pb-0.5">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300
                       text-white text-sm font-medium rounded-md transition-colors"
          >
            {loading ? 'Adding…' : 'Add & Fetch Price'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm rounded-md
                       border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <p className="mt-2 text-xs text-gray-400">
        {exchange === 'CRYPTO'
          ? 'Price fetched from CoinGecko. All values converted to SGD.'
          : 'Price fetched from Yahoo Finance on add. 15-min delay on live data.'}
      </p>
    </form>
  );
}
