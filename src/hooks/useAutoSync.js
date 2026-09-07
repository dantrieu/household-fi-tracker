import { useCallback, useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { saveToCloud, loadFromCloud } from '../lib/cloudSync';
import {
  getRememberedPassphrase,
  rememberPassphrase,
  forgetPassphrase,
  getSyncWatermark,
  setSyncWatermark,
} from '../lib/autoSync';

const SAVE_DEBOUNCE_MS = 2000;
const POLL_INTERVAL_MS = 45_000;

/**
 * Cross-device auto-sync. When a passphrase is remembered on this device:
 *  - every store change is pushed to the cloud a couple seconds after
 *    the user stops editing
 *  - on mount, on window focus/visibility, and on a 45s poll, the cloud
 *    is checked for a newer save (from another device) and pulled down
 *
 * "Newer" is tracked via a local watermark (the last-known cloud `saved_at`),
 * not by comparing against `last_modified` directly — this avoids a pull
 * immediately re-triggering a redundant push, and vice versa.
 *
 * Call this once at the app root (NavBar, which is always mounted).
 */
export function useAutoSync() {
  const [passphrase, setPassphrase] = useState(() => getRememberedPassphrase());
  const [status, setStatus] = useState('idle'); // idle | syncing | synced | error
  const [lastSyncedAt, setLastSyncedAt] = useState(() => getSyncWatermark());

  const debounceRef       = useRef(null);
  const pullingRef        = useRef(false);
  const skipPushIfNoEdits = useRef(null); // last_modified right after a pull

  const pullIfNewer = useCallback(async (phrase) => {
    if (!phrase || pullingRef.current) return;
    pullingRef.current = true;
    try {
      const data = await loadFromCloud(phrase);
      const cloudSavedAt = data?.saved_at;
      const watermark = getSyncWatermark();
      if (cloudSavedAt && (!watermark || cloudSavedAt > watermark)) {
        useStore.getState().restoreFromCloud(data);
        skipPushIfNoEdits.current = useStore.getState().last_modified;
        setSyncWatermark(cloudSavedAt);
        setLastSyncedAt(cloudSavedAt);
      }
      setStatus('synced');
    } catch (err) {
      // No cloud data yet is expected on a brand-new passphrase — not an error.
      if (!/No data found/.test(err.message)) setStatus('error');
    } finally {
      pullingRef.current = false;
    }
  }, []);

  const pushNow = useCallback(async (phrase) => {
    if (!phrase) return;
    const state = useStore.getState();
    if (skipPushIfNoEdits.current && state.last_modified === skipPushIfNoEdits.current) {
      // Nothing changed since the last pull — skip the redundant push.
      skipPushIfNoEdits.current = null;
      return;
    }
    skipPushIfNoEdits.current = null;
    setStatus('syncing');
    try {
      const savedAt = await saveToCloud(phrase, state);
      setSyncWatermark(savedAt);
      setLastSyncedAt(savedAt);
      setStatus('synced');
    } catch {
      setStatus('error');
    }
  }, []);

  // Initial pull on mount
  useEffect(() => {
    if (passphrase) pullIfNewer(passphrase);
  }, [passphrase, pullIfNewer]);

  // Store changes → debounced push
  useEffect(() => {
    if (!passphrase) return;
    const unsub = useStore.subscribe((state, prevState) => {
      if (state.last_modified === prevState.last_modified) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => pushNow(passphrase), SAVE_DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [passphrase, pushNow]);

  // Pull on focus / tab becoming visible
  useEffect(() => {
    if (!passphrase) return;
    function onWake() {
      if (document.visibilityState === 'hidden') return;
      pullIfNewer(passphrase);
    }
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [passphrase, pullIfNewer]);

  // Background poll while the tab is open
  useEffect(() => {
    if (!passphrase) return;
    const id = setInterval(() => pullIfNewer(passphrase), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [passphrase, pullIfNewer]);

  /** Called after a manual Save/Load succeeds — enables auto-sync from then on. */
  const enableSync = useCallback((phrase, knownSavedAt) => {
    const p = phrase.trim().toLowerCase();
    rememberPassphrase(p);
    if (knownSavedAt) setSyncWatermark(knownSavedAt);
    setPassphrase(p);
  }, []);

  const disableSync = useCallback(() => {
    forgetPassphrase();
    setPassphrase(null);
    setStatus('idle');
    setLastSyncedAt(null);
  }, []);

  return {
    enabled: !!passphrase,
    passphrase,
    status,
    lastSyncedAt,
    enableSync,
    disableSync,
  };
}
