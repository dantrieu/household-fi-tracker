import { useState } from 'react';
import { NumericFormat } from 'react-number-format';
import useStore from '../../../store/useStore';
import Card from '../../../components/ui/Card';
import SnapshotTable from './SnapshotTable';
import SnapshotTrendChart from './SnapshotTrendChart';
import { exportJSON } from '../../../lib/storage';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function autoLabel(month, year) {
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

// ── Small SGD input ───────────────────────────────────────────────────────────
function SgdInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        S$
      </span>
      <NumericFormat
        value={value ?? ''}
        onValueChange={(vals) => onChange(vals.floatValue ?? null)}
        thousandSeparator=","
        allowNegative={false}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md py-1.5 pl-7 pr-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
    </div>
  );
}

// ── Month select ──────────────────────────────────────────────────────────────
function MonthSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm
                 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                 bg-white"
    >
      {MONTHS.map((m, i) => (
        <option key={i + 1} value={i + 1}>{m}</option>
      ))}
    </select>
  );
}

// ── Save current snapshot form ────────────────────────────────────────────────
function SaveCurrentForm() {
  const now         = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const [year, setYear]   = useState(String(currentYear));
  const [month, setMonth] = useState(currentMonth);
  const [label, setLabel] = useState(autoLabel(currentMonth, currentYear));
  const [saved, setSaved] = useState(false);
  const saveSnapshot = useStore((s) => s.saveSnapshot);

  function handleYearChange(e) {
    const y = e.target.value;
    setYear(y);
    setLabel(autoLabel(month, y));
  }

  function handleMonthChange(m) {
    setMonth(m);
    setLabel(autoLabel(m, year));
  }

  function handleSave() {
    const y = parseInt(year, 10);
    if (isNaN(y) || y < 2000 || y > 2100) return;
    saveSnapshot(y, month, label);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1 w-20">
        <label className="text-xs font-medium text-gray-500">Month</label>
        <MonthSelect value={month} onChange={handleMonthChange} />
      </div>
      <div className="flex flex-col gap-1 w-24">
        <label className="text-xs font-medium text-gray-500">Year</label>
        <input
          type="number" min="2000" max="2100"
          value={year} onChange={handleYearChange}
          className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-36">
        <label className="text-xs font-medium text-gray-500">Label</label>
        <input
          type="text" value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Jan 2025"
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
  );
}

// ── Manual past-data entry form ───────────────────────────────────────────────
function ManualEntryForm() {
  const currentYear = new Date().getFullYear();
  const saveManualSnapshot = useStore((s) => s.saveManualSnapshot);

  const [year, setYear]         = useState(String(currentYear - 1));
  const [month, setMonth]       = useState(12);
  const [label, setLabel]       = useState(autoLabel(12, currentYear - 1));
  const [total, setTotal]       = useState(null);
  const [investable, setInvest] = useState(null);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  function handleYearChange(e) {
    const y = e.target.value;
    setYear(y);
    setLabel(autoLabel(month, y));
  }

  function handleMonthChange(m) {
    setMonth(m);
    setLabel(autoLabel(m, year));
  }

  function handleSave() {
    const y = parseInt(year, 10);
    if (isNaN(y) || y < 2000 || y > 2100) { setError('Enter a valid year (2000–2100)'); return; }
    if (!total) { setError('Total Net Worth is required'); return; }
    setError('');
    saveManualSnapshot(y, month, label, { total, investable });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setTotal(null); setInvest(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Enter historical data you already know.
        Only <strong>Total Net Worth</strong> is required; Investable is optional.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Month</label>
          <MonthSelect value={month} onChange={handleMonthChange} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Year</label>
          <input
            type="number" min="2000" max="2100"
            value={year} onChange={handleYearChange}
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-500">Label</label>
          <input
            type="text" value={label} onChange={(e) => setLabel(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Total NW <span className="text-red-400">*</span></label>
          <SgdInput value={total} onChange={setTotal} placeholder="e.g. 500,000" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Investable</label>
          <SgdInput value={investable} onChange={setInvest} placeholder="optional" />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        className={[
          'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
          saved
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-green-600 hover:bg-green-700 text-white',
        ].join(' ')}
      >
        {saved ? '✓ Added' : 'Add Past Snapshot'}
      </button>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function SnapshotSection() {
  const state = useStore();
  const [mode, setMode] = useState('current'); // 'current' | 'manual'

  const tabCls = (id) => [
    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
    mode === id
      ? 'bg-green-600 text-white'
      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  ].join(' ');

  return (
    <Card
      title="Net Worth Snapshots"
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
      {/* ── Add snapshot area ── */}
      <div className="px-5 py-4 border-b border-gray-100 space-y-3">
        <div className="flex gap-1.5">
          <button className={tabCls('current')} onClick={() => setMode('current')}>
            Save current
          </button>
          <button className={tabCls('manual')} onClick={() => setMode('manual')}>
            + Add past data
          </button>
        </div>

        {mode === 'current' ? <SaveCurrentForm /> : <ManualEntryForm />}
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
