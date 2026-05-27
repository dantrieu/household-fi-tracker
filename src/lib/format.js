// ─── Number & currency formatters ─────────────────────────────────────────────
// All monetary values in the app are stored as raw SGD numbers.

const SGD = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const SGD_PRECISE = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PCT = new Intl.NumberFormat('en-SG', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Format a number as SGD with no decimal places.
 * e.g. 123456 → "S$123,456"
 */
export function formatSGD(value) {
  if (value == null || isNaN(value)) return '—';
  return SGD.format(value);
}

/**
 * Format a number as SGD with 2 decimal places.
 * e.g. 1234.5 → "S$1,234.50"
 */
export function formatSGDPrecise(value) {
  if (value == null || isNaN(value)) return '—';
  return SGD_PRECISE.format(value);
}

/**
 * Format a ratio as a percentage.
 * e.g. 0.083 → "8.3%"
 */
export function formatPct(ratio) {
  if (ratio == null || isNaN(ratio)) return '—';
  return PCT.format(ratio);
}

/**
 * Format an absolute delta with sign.
 * e.g. 12000 → "+S$12,000" | -5000 → "-S$5,000"
 */
export function formatDelta(delta) {
  if (delta == null || isNaN(delta)) return '—';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${SGD.format(delta)}`;
}

/**
 * Format a percentage delta with sign.
 * e.g. 0.083 → "+8.3%" | -0.05 → "-5.0%"
 */
export function formatDeltaPct(ratio) {
  if (ratio == null || isNaN(ratio)) return '—';
  const sign = ratio >= 0 ? '+' : '';
  return `${sign}${PCT.format(ratio)}`;
}

/**
 * Parse a raw string into a number (strips commas, currency symbols).
 * Returns NaN if not parseable.
 */
export function parseNumber(str) {
  if (str == null) return NaN;
  const cleaned = String(str).replace(/[^0-9.-]/g, '');
  return cleaned === '' ? NaN : parseFloat(cleaned);
}
