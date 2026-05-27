import { useState } from 'react';
import useStore from '../../../store/useStore';
import Card from '../../../components/ui/Card';
import SnapshotTable from './SnapshotTable';
import SnapshotTrendChart from './SnapshotTrendChart';
import { exportJSON } from '../../../lib/storage';

export default function SnapshotSection() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]   = useState(String(currentYear));
  const [label, setLabel] = useState(`Year-end ${currentYear}`);
  const [saved, setSaved] = useState(false);

  const saveSnapshot  = useStore((s) => s.saveSnapshot);
  const state         = useStore();

  function handleYearChange(e) {
    const y = e.target.value;
    setYear(y);
    setLabel(`Year-end ${y}`);
  }

  function handleSave() {
    const y = parseInt(year, 10);
    if (isNaN(y) || y < 2000 || y > 2100) return;
    saveSnapshot(y, label);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card
      title="Year-End Snapshots"
      action={
        <button
          onClick={() => exportJSON(state)}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1
                     border border-gray-200 rounded hover:border-gray-300"
        >
          Export JSON
        </button>
      }
      padding="none"
    >
      {/* Save form */}
      <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Year</label>
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={handleYearChange}
            className="w-24 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs font-medium text-gray-500">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Year-end 2024"
            className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSave}
          className={[
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            saved
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-green-600 hover:bg-green-700 text-white',
          ].join(' ')}
        >
          {saved ? '✓ Saved' : 'Save Snapshot'}
        </button>
      </div>

      {/* Trend chart */}
      <div className="px-5 pt-2 pb-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Net Worth Trend</p>
        <SnapshotTrendChart />
      </div>

      {/* History table */}
      <div className="px-5 py-4">
        <SnapshotTable />
      </div>
    </Card>
  );
}
