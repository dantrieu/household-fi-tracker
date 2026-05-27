import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useStore from '../../store/useStore';
import Toggle from '../../components/ui/Toggle';
import EditableNumber from '../../components/ui/EditableNumber';

const PROTECTED = ['cash_savings', 'sgx_equities', 'us_equities', 'crypto', 'cpf', 'property', 'other'];


export default function AssetRow({ categoryKey }) {
  const category            = useStore((s) => s.net_worth.categories[categoryKey]);
  const setCategoryValue    = useStore((s) => s.setCategoryValue);
  const toggleInvestable    = useStore((s) => s.toggleInvestable);
  const updateCategoryLabel = useStore((s) => s.updateCategoryLabel);
  const removeCategory      = useStore((s) => s.removeCategory);

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft]     = useState('');

  // ── dnd-kit sortable ──────────────────────────────────────────────────────
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoryKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (!category) return null;

  // Portfolio-fed: check both the stored source flag AND hard-coded keys so that
  // existing localStorage users who predate the 'source' field stay protected.
  const PORTFOLIO_KEYS  = ['sgx_equities', 'us_equities', 'crypto'];
  const isPortfolioFed  = category.source === 'portfolio' || PORTFOLIO_KEYS.includes(categoryKey);
  const isProtected     = PROTECTED.includes(categoryKey);

  function startLabelEdit() {
    setLabelDraft(category.label);
    setEditingLabel(true);
  }

  function commitLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== category.label) {
      updateCategoryLabel(categoryKey, trimmed);
    }
    setEditingLabel(false);
  }

  function handleLabelKey(e) {
    if (e.key === 'Enter') commitLabel();
    if (e.key === 'Escape') setEditingLabel(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 sm:gap-3 py-3 px-1 group"
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500
                   transition-colors p-1 rounded touch-none"
      >
        ⠿
      </button>

      {/* Label — editable inline */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={handleLabelKey}
            className="text-sm font-medium border border-green-400 rounded px-2 py-0.5
                       focus:outline-none focus:ring-2 focus:ring-green-500 w-40"
          />
        ) : (
          <>
            <span className="text-sm font-medium text-gray-800 truncate">
              {category.label}
            </span>
            {isPortfolioFed && (
              <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                auto
              </span>
            )}
            {/* Edit label pencil */}
            <button
              onClick={startLabelEdit}
              aria-label={`Rename ${category.label}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400
                         hover:text-gray-700 text-xs px-1"
            >
              ✏️
            </button>
          </>
        )}
      </div>

      {/* Investable toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Toggle
          checked={category.investable}
          onChange={() => toggleInvestable(categoryKey)}
          label={`${category.label} investable`}
        />
        <span className="text-xs text-gray-400 w-16 hidden sm:block">
          {category.investable ? 'Investable' : 'Non-invest.'}
        </span>
      </div>

      {/* Value */}
      <div className="w-24 sm:w-36 text-right shrink-0">
        <EditableNumber
          value={category.value}
          onSave={(v) => setCategoryValue(categoryKey, v)}
          readOnly={isPortfolioFed}
        />
      </div>

      {/* Remove button — custom categories only */}
      {!isProtected ? (
        <button
          onClick={() => removeCategory(categoryKey)}
          aria-label={`Remove ${category.label}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300
                     hover:text-red-400 text-xs px-1 shrink-0"
        >
          ✕
        </button>
      ) : (
        <span className="w-5 shrink-0" /> /* spacer to align columns */
      )}
    </div>
  );
}
