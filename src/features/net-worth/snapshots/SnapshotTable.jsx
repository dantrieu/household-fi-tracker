import { useState } from 'react';
import { NumericFormat } from 'react-number-format';
import useStore, { selectors } from '../../../store/useStore';
import { formatSGD } from '../../../lib/format';
import DeltaBadge from '../../../components/ui/DeltaBadge';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function snapDate(snap) {
  const m = snap.month;
  if (!m) return String(snap.year);
  return `${MONTHS[m - 1]} ${snap.year}`;
}

function SgdDraftInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">S$</span>
      <NumericFormat
        value={value ?? ''}
        onValueChange={(v) => onChange(v.floatValue ?? null)}
        thousandSeparator=","
        allowNegative={false}
        placeholder={placeholder}
        className="w-28 border border-green-400 rounded pl-5 pr-1 py-1 text-xs text-right
                   focus:outline-none focus:ring-1 focus:ring-green-500"
      />
    </div>
  );
}

function SnapshotRow({ snap }) {
  const deleteSnapshot = useStore((s) => s.deleteSnapshot);
  const updateSnapshot = useStore((s) => s.updateSnapshot);

  const [editing, setEditing]         = useState(false);
  const [yearDraft, setYearDraft]     = useState('');
  const [monthDraft, setMonthDraft]   = useState(12);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [totalDraft, setTotalDraft]   = useState(null);
  const [investDraft, setInvestDraft] = useState(null);

  function startEdit() {
    setYearDraft(String(snap.year));
    setMonthDraft(snap.month ?? 12);
    setRemarkDraft(snap.remark ?? '');
    setTotalDraft(snap.totals.total_net_worth);
    setInvestDraft(snap.totals.investable_net_worth);
    setEditing(true);
  }

  function commitEdit() {
    const year = parseInt(yearDraft, 10);
    updateSnapshot(snap.id, {
      year:   !isNaN(year) ? year : snap.year,
      month:  monthDraft,
      remark: remarkDraft,
      totals: {
        total:      totalDraft  ?? snap.totals.total_net_worth,
        investable: investDraft ?? snap.totals.investable_net_worth,
      },
    });
    setEditing(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <tr className="bg-green-50">
        <td colSpan={5} className="py-2.5 px-3">
          <div className="flex flex-wrap gap-2 items-end">
            {/* Month */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400 uppercase">Month</span>
              <select
                value={monthDraft}
                onChange={(e) => setMonthDraft(Number(e.target.value))}
                className="w-20 border border-green-400 rounded px-1.5 py-1 text-sm bg-white
                           focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            {/* Year */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400 uppercase">Year</span>
              <input
                type="number" value={yearDraft}
                onChange={(e) => setYearDraft(e.target.value)} onKeyDown={handleKey}
                className="w-16 border border-green-400 rounded px-2 py-1 text-sm
                           focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            {/* Total NW */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400 uppercase">Total NW</span>
              <SgdDraftInput value={totalDraft} onChange={setTotalDraft} placeholder="Total" />
            </div>
            {/* Investable */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400 uppercase">Investable</span>
              <SgdDraftInput value={investDraft} onChange={setInvestDraft} placeholder="Investable" />
            </div>
            {/* Remark */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-32">
              <span className="text-[10px] text-gray-400 uppercase">Remark</span>
              <input
                autoFocus
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder="optional note"
                className="w-full border border-green-400 rounded px-2 py-1 text-sm
                           focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            {/* Actions */}
            <div className="flex gap-1.5 pb-0.5">
              <button
                onClick={commitEdit}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded hover:border-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      {/* Date + remark */}
      <td className="py-3 pr-4 w-40 min-w-[8rem]">
        <button onClick={startEdit} className="text-left w-full" title="Click to edit">
          <span className="font-semibold text-gray-800 text-sm hover:text-green-700 hover:underline decoration-dashed underline-offset-2 transition-colors">
            {snapDate(snap)}
          </span>
          {snap.remark && (
            <span
              className="block text-xs text-gray-400 leading-tight mt-0.5 truncate max-w-[18rem]"
              title={snap.remark}
            >
              {snap.remark}
            </span>
          )}
        </button>
      </td>

      <td className="py-3 pr-4 w-32 text-right tabular-nums font-medium text-gray-900 text-sm">
        {formatSGD(snap.totals.total_net_worth)}
      </td>
      <td className="py-3 pr-4 w-32 text-right tabular-nums text-gray-600 text-sm">
        {formatSGD(snap.totals.investable_net_worth)}
      </td>
      <td className="py-3 pr-4 w-40 text-right">
        <DeltaBadge delta={snap.delta} deltaPct={snap.deltaPct} />
      </td>
      <td className="py-3 pr-2 w-6 text-right">
        <button
          onClick={() => deleteSnapshot(snap.id)}
          aria-label={`Delete ${snapDate(snap)} snapshot`}
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
  const state = useStore();
  // snapshotsWithDelta returns oldest→newest; toggle reverses for display
  const rows = selectors.snapshotsWithDelta(state);
  const [newestFirst, setNewestFirst] = useState(true);

  const displayed = newestFirst ? [...rows].reverse() : rows;

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
            <th className="py-2 pr-4">
              <button
                onClick={() => setNewestFirst((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400
                           uppercase tracking-wide hover:text-gray-600 transition-colors"
              >
                Date
                <span className="text-gray-300">{newestFirst ? '↓' : '↑'}</span>
              </button>
            </th>
            <th className="py-2 pr-4 w-32 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total NW</th>
            <th className="py-2 pr-4 w-32 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Investable</th>
            <th className="py-2 pr-4 w-40 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">vs Prior</th>
            <th className="py-2 w-6" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {displayed.map((snap) => (
            <SnapshotRow key={snap.id} snap={snap} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
