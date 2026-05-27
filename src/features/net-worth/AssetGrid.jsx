import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import useStore, { selectors } from '../../store/useStore';
import AssetRow from './AssetRow';
import Card from '../../components/ui/Card';
import { formatSGD } from '../../lib/format';

export default function AssetGrid() {
  const state             = useStore();
  const ordered           = selectors.orderedCategories(state);
  const reorderCategories = useStore((s) => s.reorderCategories);
  const addCategory       = useStore((s) => s.addCategory);

  const totalNetWorth  = selectors.totalNetWorth(state);
  const totalInvest    = selectors.investableNetWorth(state);
  const totalExCpf     = selectors.netWorthExCpf(state);

  const [adding, setAdding]     = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const order    = state.net_worth.category_order;
    const oldIndex = order.indexOf(active.id);
    const newIndex = order.indexOf(over.id);
    reorderCategories(arrayMove(order, oldIndex, newIndex));
  }

  function handleAddConfirm() {
    const trimmed = newLabel.trim();
    if (trimmed) addCategory(trimmed);
    setNewLabel('');
    setAdding(false);
  }

  function handleAddKey(e) {
    if (e.key === 'Enter') handleAddConfirm();
    if (e.key === 'Escape') { setAdding(false); setNewLabel(''); }
  }

  const totalRow = (label, value, bold = false) => (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-xs ${bold ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>{label}</span>
      <span className={`tabular-nums text-sm ${bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
        {formatSGD(value)}
      </span>
    </div>
  );

  return (
    <Card title="Assets" padding="none">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-1 border-b border-gray-100">
        <div className="w-6 shrink-0" />
        <div className="flex-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</div>
        <div className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide w-32 hidden sm:flex shrink-0">
          Investable
          <span
            title={
              'Investable assets are included in passive income calculation\n' +
              'under FI Forecast (SWR set in FI Forecast inputs).\n' +
              'Non-investable assets (e.g. own-stay property, CPF) are excluded.'
            }
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full
                       bg-gray-200 text-gray-500 text-[9px] font-bold cursor-default
                       hover:bg-gray-300 transition-colors select-none normal-case"
          >
            i
          </span>
        </div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-36 text-right shrink-0">
          Value (SGD)
        </div>
        <div className="w-5 shrink-0" />
      </div>

      {/* Sortable rows */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={state.net_worth.category_order} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-gray-50 px-4">
            {ordered.map((cat) => (
              <AssetRow key={cat.key} categoryKey={cat.key} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add category */}
      <div className="px-5 py-3 border-t border-gray-100">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)} onKeyDown={handleAddKey}
              placeholder="Category name…"
              className="flex-1 border border-green-400 rounded-md px-2.5 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={handleAddConfirm}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors">
              Add
            </button>
            <button onClick={() => { setAdding(false); setNewLabel(''); }}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="text-sm text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1.5 font-medium">
            <span className="text-lg leading-none">+</span> Add category
          </button>
        )}
      </div>

      {/* Totals footer — 3 rows */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl space-y-0.5">
        {totalRow('Total Net Worth',       totalNetWorth, true)}
        {totalRow('Total Investable NW',   totalInvest)}
        {totalRow('Total NW, Excl. CPF',   totalExCpf)}
      </div>
    </Card>
  );
}
