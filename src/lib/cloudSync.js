/**
 * Cloud save/load helpers.
 * Data is keyed by passphrase on Vercel KV — anyone who knows the passphrase
 * can read or overwrite the stored data.
 */

/**
 * Save the relevant parts of the store to Vercel KV.
 * Live prices are stripped — they'll be re-fetched on next load.
 */
export async function saveToCloud(passphrase, state) {
  const payload = {
    v: 1,
    saved_at: new Date().toISOString(),
    net_worth: state.net_worth,
    fi_settings: state.fi_settings,
    snapshots: state.snapshots,
    portfolio: {
      // Strip live price data — will be re-fetched
      positions: (state.portfolio.positions ?? []).map((p) => ({
        ...p,
        last_price: null,
        last_updated: null,
      })),
    },
  };

  const res = await fetch('/api/save-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase, data: payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save failed (${res.status})`);
  }
}

/**
 * Load previously saved state from Vercel KV.
 * Returns the raw payload object — caller is responsible for merging into store.
 */
export async function loadFromCloud(passphrase) {
  const res = await fetch('/api/load-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase }),
  });

  if (res.status === 404) {
    throw new Error('No data found for this passphrase. Check your spelling and try again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Load failed (${res.status})`);
  }

  const { data } = await res.json();
  return data;
}
