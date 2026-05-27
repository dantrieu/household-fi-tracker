// ─── Yahoo Finance + Frankfurter API helpers ──────────────────────────────────
// All requests go through Vite's dev proxy (see vite.config.js).
// In production (Vercel), add serverless API routes that proxy these same calls.

const STALE_MS = 15 * 60 * 1000; // 15 minutes

// ─── Yahoo Finance ─────────────────────────────────────────────────────────────

/**
 * Resolve the full Yahoo Finance ticker symbol.
 * SGX tickers get .SI appended; US tickers are used as-is.
 */
export function resolveYahooTicker(ticker, exchange) {
  const t = ticker.trim().toUpperCase();
  return exchange === 'SGX' ? `${t}.SI` : t;
}

/**
 * Fetch the latest price for a single ticker.
 * Returns { price: number, currency: string } or throws on error.
 */
export async function fetchStockPrice(ticker, exchange) {
  const symbol = resolveYahooTicker(ticker, exchange);
  const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&.tsrc=finance`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for ${symbol}`);

  const price = result.meta?.regularMarketPrice;
  if (price == null) throw new Error(`No price found for ${symbol}`);

  // longName > shortName > undefined — used to label the position
  const company_name = result.meta?.longName ?? result.meta?.shortName ?? null;

  return {
    price,
    currency: result.meta?.currency ?? (exchange === 'SGX' ? 'SGD' : 'USD'),
    company_name,
  };
}

/**
 * Fetch prices for multiple positions in parallel.
 * Returns a map: { [positionId]: { price, currency, error? } }
 */
export async function fetchAllPrices(positions) {
  const results = await Promise.allSettled(
    positions.map(async (pos) => {
      const { price, currency } = await fetchStockPrice(pos.ticker, pos.exchange);
      return { id: pos.id, price, currency };
    })
  );

  const map = {};
  results.forEach((r, i) => {
    const pos = positions[i];
    if (r.status === 'fulfilled') {
      map[pos.id] = { price: r.value.price, currency: r.value.currency };
    } else {
      map[pos.id] = { price: null, currency: null, error: r.reason?.message ?? 'Failed' };
    }
  });
  return map;
}

// ─── Frankfurter FX ────────────────────────────────────────────────────────────

/**
 * Fetch latest USD → SGD exchange rate.
 * Returns { rate: number, date: string }
 */
export async function fetchFxRate() {
  const res = await fetch('/api/fx/latest?from=USD&to=SGD');
  if (!res.ok) throw new Error(`FX fetch failed: HTTP ${res.status}`);

  const json = await res.json();
  const rate = json?.rates?.SGD;
  if (!rate) throw new Error('SGD rate not found in response');

  return { rate, date: json.date };
}

// ─── Staleness helper ──────────────────────────────────────────────────────────

/** Returns true if lastUpdated ISO string is older than STALE_MS (15 min). */
export function isStale(lastUpdated) {
  if (!lastUpdated) return true;
  return Date.now() - new Date(lastUpdated).getTime() > STALE_MS;
}
