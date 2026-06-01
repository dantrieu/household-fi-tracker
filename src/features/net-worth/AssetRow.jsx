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
  const toggleCpfTag        = useStore((s) => s.toggleCpfTag);
  const updateCategoryLabel = useStore((s) => s.updateCategoryLabel);
  const removeCategory      = useStore((s) => s.removeCategory);

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft]     = useState('');

  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: categoryKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (!category) return null;

  const PORTFOLIO_KEYS  = ['sgx_equities', 'us_equities', 'crypto'];
  const isPortfolioFed  = category.source === 'portfolio' || PORTFOLIO_KEYS.includes(categoryKey);
  const isLabelLocked   = isPortfolioFed || categoryKey === 'cpf'; // CPF label is fixed
  const isProtected     = PROTECTED.includes(categoryKey);

  function startLabelEdit() { setLabelDraft(category.label); setEditingLabel(true); }
  function commitLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== category.label) updateCategoryLabel(categoryKey, trimmed);
    setEditingLabel(false);
  }
  function handleLabelKey(e) {
    if (e.key === 'Enter') commitLabel();
    if (e.key === 'Escape') setEditingLabel(false);
  }

  const dragHandle = (
    <button
      ref={setActivatorNodeRef}
      {...attributes} {...listeners}
      aria-label="Drag to reorder"
      className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500
                 transition-colors p-1 rounded touch-none shrink-0"
    >
      ⠿
    </button>
  );

  const labelContent = editingLabel ? (
    <input
      autoFocus
      value={labelDraft}
      onChange={(e) => setLabelDraft(e.target.value)}
      onBlur={commitLabel}
      onKeyDown={handleLabelKey}
      className="text-sm font-medium border border-green-400 rounded px-2 py-0.5
                 focus:outline-none focus:ring-2 focus:ring-green-500 w-36 min-w-0"
    />
  ) : (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-sm font-medium text-gray-800 truncate">{category.label}</span>

      {/* auto-sync badge for portfolio-fed rows */}
      {isPortfolioFed ? (
        <span
          className="text-xs text-blue-400 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 shrink-0 cursor-default"
          title="Value and name are auto-synced from your Portfolio tab — edit positions there to update this."
        >
          auto-sync
        </span>
      ) : isLabelLocked ? null : (
        <button
          onClick={startLabelEdit}
          aria-label={`Rename ${category.label}`}
          className="text-[11px] opacity-25 hover:opacity-70 shrink-0 leading-none transition-opacity"
          title="Rename"
        >
          ✏️
        </button>
      )}

      {/* CPF tag: permanent on built-in cpf key; toggleable on custom rows */}
      {category.is_cpf && categoryKey === 'cpf' && (
        <span
          className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0 cursor-default"
          title="Always excluded from Total NW, Excl. CPF"
        >
          CPF
        </span>
      )}
      {category.is_cpf && categoryKey !== 'cpf' && (
        <button
          onClick={() => toggleCpfTag(categoryKey)}
          className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0 hover:bg-amber-100 transition-colors"
          title="Excluded from Total NW, Excl. CPF — click to remove tag"
        >
          CPF ×
        </button>
      )}
      {!category.is_cpf && !isPortfolioFed && (
        <button
          onClick={() => toggleCpfTag(categoryKey)}
          className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-60 hover:!opacity-100 shrink-0 transition-opacity"
          title="Tag as CPF — excludes from Total NW, Excl. CPF"
        >
          +CPF
        </button>
      )}
    </div>
  );

  // Show ✕ for everything except auto-portfolio-fed rows (SGX, US, Crypto)
  const removeBtn = !isPortfolioFed ? (
    <button
      onClick={() => removeCategory(categoryKey)}
      aria-label={`Remove ${category.label}`}
      className="text-gray-300 hover:text-red-400 text-xs shrink-0 transition-colors"
    >
      ✕
    </button>
  ) : <span className="w-3 shrink-0" />;

  return (
    <div ref={setNodeRef} style={style}>

      {/* ── Mobile: card layout ── */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 mb-2">
        {/* Row 1: drag + label + remove */}
        <div className="flex items-center gap-2">
          {dragHandle}
          <div className="flex-1 min-w-0">{labelContent}</div>
          {removeBtn}
        </div>
        {/* Row 2: toggle + value */}
        <div className="flex items-center justify-between mt-2 pl-7">
          <div className="flex items-center gap-1.5">
            <Toggle
              checked={category.investable}
              onChange={() => toggleInvestable(categoryKey)}
              label={`${category.label} investable`}
            />
            <span className="text-xs text-gray-400">
              {category.investable ? 'Investable' : 'Non-invest.'}
            </span>
          </div>
          <EditableNumber
            value={category.value}
            onSave={(v) => setCategoryValue(categoryKey, v)}
            readOnly={isPortfolioFed}
          />
        </div>
      </div>

      {/* ── Desktop: row layout ── */}
      <div className="hidden sm:flex items-center gap-3 py-3 px-1 group">
        {dragHandle}

        {/* Label */}
        <div className="flex-1 min-w-0">{labelContent}</div>

        {/* Investable toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Toggle
            checked={category.investable}
            onChange={() => toggleInvestable(categoryKey)}
            label={`${category.label} investable`}
          />
          <span className="text-xs text-gray-400 w-16">
            {category.investable ? 'Investable' : 'Non-invest.'}
          </span>
        </div>

        {/* Value */}
        <div className="w-36 text-right shrink-0">
          <EditableNumber
            value={category.value}
            onSave={(v) => setCategoryValue(categoryKey, v)}
            readOnly={isPortfolioFed}
          />
        </div>

        {removeBtn}
      </div>
    </div>
  );
}
