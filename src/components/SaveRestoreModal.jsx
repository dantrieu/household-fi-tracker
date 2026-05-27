import { useState } from 'react';
import useStore from '../store/useStore';
import { saveToCloud, loadFromCloud } from '../lib/cloudSync';

// ─── Shared sub-components ────────────────────────────────────────────────────

function RiskNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
      <p className="font-semibold flex items-center gap-1.5">⚠️ Security notice</p>
      <ul className="space-y-0.5 pl-1 list-disc list-inside marker:text-amber-500">
        <li>Anyone who knows your passphrase can view <strong>and overwrite</strong> your data</li>
        <li>Data is stored on Vercel's servers and is <strong>not encrypted</strong></li>
        <li>Choose something unique — not your name, birthday, or "password"</li>
        <li>If you forget the passphrase, the cloud copy <strong>cannot be recovered</strong></li>
      </ul>
    </div>
  );
}

function PassphraseInput({ value, onChange, placeholder = 'e.g. my-house-tracker-2024', disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm
                   focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
      >
        {show ? 'hide' : 'show'}
      </button>
    </div>
  );
}

// ─── Save tab ────────────────────────────────────────────────────────────────

function SaveTab() {
  const state = useStore();
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus]         = useState(null); // null | 'saving' | 'ok' | 'error'
  const [errorMsg, setErrorMsg]     = useState('');

  async function handleSave() {
    if (passphrase.trim().length < 6) {
      setErrorMsg('Passphrase must be at least 6 characters.');
      setStatus('error');
      return;
    }
    setStatus('saving');
    setErrorMsg('');
    try {
      await saveToCloud(passphrase.trim(), state);
      setStatus('ok');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Choose a passphrase you'll remember. Use it to reload your data on any device.
        Saving again with the same passphrase <strong>overwrites</strong> the previous save.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Your passphrase
        </label>
        <PassphraseInput
          value={passphrase}
          onChange={setPassphrase}
          disabled={status === 'saving'}
        />
        <p className="text-xs text-gray-400">Minimum 6 characters. Case-insensitive.</p>
      </div>

      <RiskNotice />

      {status === 'ok' && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
          ✅ Data saved! Use <strong className="mx-1">"{passphrase.trim().toLowerCase()}"</strong> to restore on any device.
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          ❌ {errorMsg}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={status === 'saving' || !passphrase.trim()}
        className="w-full py-2 rounded-lg text-sm font-semibold
                   bg-green-600 text-white hover:bg-green-700
                   disabled:bg-gray-200 disabled:text-gray-400
                   transition-colors"
      >
        {status === 'saving' ? 'Saving…' : '☁️ Save to cloud'}
      </button>
    </div>
  );
}

// ─── Load tab ────────────────────────────────────────────────────────────────

function LoadTab({ onClose }) {
  const restoreFromCloud = useStore((s) => s.restoreFromCloud);
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus]         = useState(null);
  const [errorMsg, setErrorMsg]     = useState('');
  const [confirm, setConfirm]       = useState(false);

  async function handleLoad() {
    if (!confirm) { setConfirm(true); return; }
    if (passphrase.trim().length < 6) {
      setErrorMsg('Passphrase must be at least 6 characters.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await loadFromCloud(passphrase.trim());
      restoreFromCloud(data);
      setStatus('ok');
      setTimeout(onClose, 1500);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
      setConfirm(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter the passphrase you used when saving. Your current data will be
        <strong className="text-red-600"> replaced</strong> with the cloud copy.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Your passphrase
        </label>
        <PassphraseInput
          value={passphrase}
          onChange={(v) => { setPassphrase(v); setConfirm(false); }}
          placeholder="Enter your saved passphrase"
          disabled={status === 'loading'}
        />
      </div>

      {status === 'ok' && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          ✅ Data loaded! Closing…
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          ❌ {errorMsg}
        </div>
      )}

      {confirm && status !== 'loading' && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          ⚠️ This will <strong>replace all your current data</strong>. Click "Load" again to confirm.
        </div>
      )}

      <button
        onClick={handleLoad}
        disabled={status === 'loading' || status === 'ok' || !passphrase.trim()}
        className="w-full py-2 rounded-lg text-sm font-semibold
                   bg-blue-600 text-white hover:bg-blue-700
                   disabled:bg-gray-200 disabled:text-gray-400
                   transition-colors"
      >
        {status === 'loading' ? 'Loading…' : confirm ? '⚠️ Confirm — replace my data' : '📥 Load from cloud'}
      </button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function SaveRestoreModal({ onClose }) {
  const [tab, setTab] = useState('save');

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Panel */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">💾 Save / Restore Data</h2>
            <p className="text-xs text-gray-400 mt-0.5">Optional — your data stays in your browser by default</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[['save', '💾 Save'], ['load', '📥 Restore']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                tab === id
                  ? 'text-green-700 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {tab === 'save' ? <SaveTab /> : <LoadTab onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}
