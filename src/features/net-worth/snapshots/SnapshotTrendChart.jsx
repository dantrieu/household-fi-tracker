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
      <p className="font-semibold text-gray-700 mb-1">
        {label}
        {label === 'Live' && (
          <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 rounded px-1 py-0.5 font-semibold">
            current
          </span>
        )}
      </p>
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

function formatYAxis(value) {
  if (value >= 1_000_000) return `S$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `S$${(value / 1_000).toFixed(0)}K`;
  return `S$${value}`;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function snapXLabel(snap) {
  if (!snap.month) return String(snap.year);
  return `${MONTHS_SHORT[snap.month - 1]} ${String(snap.year).slice(2)}`;
}

export default function SnapshotTrendChart() {
  const state     = useStore();
  const liveTotal = selectors.totalNetWorth(state);
  const liveInv   = selectors.investableNetWorth(state);

  const snapshots = [...state.snapshots].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.month ?? 12) - (b.month ?? 12);
  });

  // Need at least 1 snapshot to draw the chart (live point fills in as second)
  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Save at least 1 snapshot to see the trend chart.
      </p>
    );
  }

  const savedData = snapshots.map((s) => ({
    date:         snapXLabel(s),
    'Total NW':   s.totals.total_net_worth,
    'Investable': s.totals.investable_net_worth,
    isLive:       false,
  }));

  // Append live point (always last — represents current NW)
  const data = [
    ...savedData,
    { date: 'Live', 'Total NW': liveTotal, 'Investable': liveInv, isLive: true },
  ];

  // Custom dot: live point gets a filled green ring, others normal
  const liveDot = ({ cx, cy, index }) => {
    if (index !== data.length - 1) return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="#22c55e" stroke="#22c55e" />;
    return (
      <circle key={`dot-${index}`} cx={cx} cy={cy} r={5}
        fill="white" stroke="#22c55e" strokeWidth={2.5} />
    );
  };
  const liveInvDot = ({ cx, cy, index }) => {
    if (index !== data.length - 1) return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#3b82f6" />;
    return (
      <circle key={`dot-${index}`} cx={cx} cy={cy} r={5}
        fill="white" stroke="#3b82f6" strokeWidth={2.5} />
    );
  };

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
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }} width={64} />
        <Tooltip content={<CustomTooltip />} />
        {/* Legend: Total NW first, then Investable */}
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span className="text-xs text-gray-600">{v}</span>}
        />
        <Area type="monotone" dataKey="Total NW"   name="Total NW"
          stroke="#22c55e" fill="url(#gradTotal)"  strokeWidth={2} dot={liveDot} />
        <Area type="monotone" dataKey="Investable" name="Investable"
          stroke="#3b82f6" fill="url(#gradInvest)" strokeWidth={2} dot={liveInvDot} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
