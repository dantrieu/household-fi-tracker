import { useState, useRef, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { formatSGD } from '../../lib/format';

/**
 * Displays a formatted SGD value. Click → inline input with thousand separators →
 * save on Enter/blur, cancel on Escape.
 *
 * Props:
 *   value       – number (raw SGD)
 *   onSave      – (newValue: number) => void
 *   readOnly    – boolean — shows value but disables editing (for portfolio-sourced categories)
 *   className   – extra classes on the wrapper span
 */
export default function EditableNumber({ value, onSave, readOnly = false, className = '' }) {
  const [editing, setEditing]     = useState(false);
  const [floatVal, setFloatVal]   = useState(value);
  const inputRef                  = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    if (readOnly) return;
    setFloatVal(value);
    setEditing(true);
  }

  function commit() {
    const parsed = floatVal ?? 0;
    if (!isNaN(parsed) && parsed >= 0) onSave(parsed);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <NumericFormat
        getInputRef={inputRef}
        value={floatVal === 0 ? '' : floatVal}
        onValueChange={(vals) => setFloatVal(vals.floatValue ?? 0)}
        thousandSeparator=","
        prefix="S$"
        placeholder="S$0"
        allowNegative={false}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full text-right tabular-nums border border-green-400 rounded px-2 py-0.5
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
