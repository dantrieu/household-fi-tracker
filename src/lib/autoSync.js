/**
 * Local device state for auto-sync — separate from the Zustand-persisted
 * app data since it's per-device, not part of the financial data schema.
 *
 *   passphrase  — remembered after a successful manual Save/Load, enables
 *                 auto-sync on this device going forward
 *   watermark   — the `saved_at` of the last cloud state this device knows
 *                 about (either pushed or pulled). Used to detect when
 *                 another device has newer data.
 */

const PASSPHRASE_KEY = 'hfit_sync_passphrase';
const WATERMARK_KEY  = 'hfit_sync_watermark';

export function getRememberedPassphrase() {
  return localStorage.getItem(PASSPHRASE_KEY);
}

export function rememberPassphrase(phrase) {
  localStorage.setItem(PASSPHRASE_KEY, phrase.trim().toLowerCase());
}

export function forgetPassphrase() {
  localStorage.removeItem(PASSPHRASE_KEY);
  localStorage.removeItem(WATERMARK_KEY);
}

export function getSyncWatermark() {
  return localStorage.getItem(WATERMARK_KEY);
}

export function setSyncWatermark(iso) {
  if (iso) localStorage.setItem(WATERMARK_KEY, iso);
}
