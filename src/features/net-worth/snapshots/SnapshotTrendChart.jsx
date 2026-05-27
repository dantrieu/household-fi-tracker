import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import useStore, { selectors } from '../../../store/useStore';
import { formatSGD } from '../../../lib/format';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 w-28">{p.name}</span>
          <span className="tabular-nums font-medium text-gray-800">{formatSGD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Compact Y-axis formatter: 1500000 → "S$1.5M"
function formatYAxis(value) {
  if (value >= 1_000_000) return `S$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `S$${(value / 1_000).toFixed(0)}K`;
  return `S$${value}`;
}

export default function SnapshotTrendChart() {
  const state = useStore();
  const snapshots = [...state.snapshots].sort((a, b) => a.year - b.year);

  if (snapshots.length < 2) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Save at least 2 snapshots to see the trend chart.
      </p>
    );
  }

  const data = snapshots.map((s) => ({
    year: String(s.year),
    'Total NW':      s.totals.total_net_worth,
    'Investable':    s.totals.investable_net_worth,
    'Excl. CPF':     s.totals.net_worth_ex_cpf,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#9ca3af' }} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }} width={64} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span className="text-xs text-gray-600">{v}</span>}
        />
        <Area type="monotone" dataKey="Total NW"   stroke="#22c55e" fill="url(#gradTotal)"  strokeWidth={2} dot={{ r: 3 }} />
        <Area type="monotone" dataKey="Investable" stroke="#3b82f6" fill="url(#gradInvest)" strokeWidth={2} dot={{ r: 3 }} />
        <Area type="monotone" dataKey="Excl. CPF"  stroke="#f59e0b" fill="none"             strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
