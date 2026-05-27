import { useState, useRef, useEffect } from 'react';
import { formatSGD, parseNumber } from '../../lib/format';

/**
 * Displays a formatted SGD value. Click → inline input → save on Enter/blur, cancel on Escape.
 *
 * Props:
 *   value       – number (raw SGD)
 *   onSave      – (newValue: number) => void
 *   readOnly    – boolean — shows value but disables editing (for portfolio-sourced categories)
 *   className   – extra classes on the wrapper span
 */
export default function EditableNumber({ value, onSave, readOnly = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    if (readOnly) return;
    setDraft(value === 0 ? '' : String(value));
    setEditing(true);
  }

  function commit() {
    const parsed = parseNumber(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') cancel();
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-36 text-right tabular-nums border border-green-400 rounded px-2 py-0.5
                   text-sm font-medium text-gray-900 focus:outline-none focus:ring-2
                   focus:ring-green-500 focus:ring-offset-1"
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      title={readOnly ? 'Auto-updated from Portfolio' : 'Click to edit'}
      className={[
        'tabular-nums font-medium text-gray-900 text-sm',
        readOnly
          ? 'cursor-default text-gray-500'
          : 'cursor-pointer hover:text-green-700 hover:underline decoration-dashed underline-offset-2',
        className,
      ].join(' ')}
    >
      {formatSGD(value)}
    </span>
  );
}
