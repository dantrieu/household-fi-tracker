import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useStore, { selectors } from '../../../store/useStore';
import { formatSGD } from '../../../lib/format';
import DeltaBadge from '../../../components/ui/DeltaBadge';

function SnapshotRow({ snap }) {
  const deleteSnapshot = useStore((s) => s.deleteSnapshot);
  const updateSnapshot = useStore((s) => s.updateSnapshot);

  const [editing, setEditing]       = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [yearDraft, setYearDraft]   = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: snap.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  function startEdit() {
    setLabelDraft(snap.label);
    setYearDraft(String(snap.year));
    setEditing(true);
  }

  function commitEdit() {
    const year = parseInt(yearDraft, 10);
    updateSnapshot(snap.id, {
      label: labelDraft.trim() || snap.label,
      year: !isNaN(year) ? year : snap.year,
    });
    setEditing(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <tr ref={setNodeRef} style={style} className="bg-green-50">
        <td colSpan={5} className="py-2 px-3">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              value={yearDraft}
              onChange={(e) => setYearDraft(e.target.value)}
              onKeyDown={handleKey}
              className="w-20 border border-green-400 rounded px-2 py-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Year"
            />
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={handleKey}
              className="flex-1 min-w-32 border border-green-400 rounded px-2 py-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Label"
            />
            <button
              onClick={commitEdit}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs
                         font-medium rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 border border-gray-200 text-gray-500 text-xs
                         rounded hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </td>
        <td />
      </tr>
    );
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="hover:bg-gray-50 transition-colors group"
    >
      {/* Drag handle */}
      <td className="py-3 pl-1 pr-2 w-5">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500
                     transition-colors touch-none opacity-0 group-hover:opacity-100"
        >
          ⠿
        </button>
      </td>

      {/* Label — click to edit */}
      <td className="py-3 pr-4">
        <button
          onClick={startEdit}
          className="font-semibold text-gray-800 text-left hover:text-green-700
                     hover:underline decoration-dashed underline-offset-2 transition-colors"
          title="Click to edit"
        >
          {snap.label}
        </button>
      </td>

      <td className="py-3 pr-4 text-right tabular-nums font-medium text-gray-900 text-sm">
        {formatSGD(snap.totals.total_net_worth)}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums text-gray-600 text-sm">
        {formatSGD(snap.totals.investable_net_worth)}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums text-gray-600 text-sm">
        {formatSGD(snap.totals.net_worth_ex_cpf)}
      </td>
      <td className="py-3 pr-4 text-right">
        <DeltaBadge delta={snap.delta} deltaPct={snap.deltaPct} />
      </td>
      <td className="py-3 pr-2 text-right">
        <button
          onClick={() => deleteSnapshot(snap.id)}
          aria-label={`Delete ${snap.label} snapshot`}
          className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1
                     opacity-0 group-hover:opacity-100"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

export default function SnapshotTable() {
  const state            = useStore();
  const rows             = selectors.snapshotsWithDelta(state);
  const reorderSnapshots = useStore((s) => s.reorderSnapshots);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = rows.map((r) => r.id);
    const oldIdx = ids.indexOf(active.id);
    const newIdx = ids.indexOf(over.id);
    reorderSnapshots(arrayMove(ids, oldIdx, newIdx));
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No snapshots yet — save your first one above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="py-2 w-5" />
            <th className="py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Year / Label
            </th>
            <th className="py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total NW</th>
            <th className="py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Investable</th>
            <th className="py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">ex-CPF</th>
            <th className="py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">vs Prior Year</th>
            <th className="py-2" />
          </tr>
        </thead>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <tbody className="divide-y divide-gray-50">
              {rows.map((snap) => (
                <SnapshotRow key={snap.id} snap={snap} />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
    </div>
  );
}
