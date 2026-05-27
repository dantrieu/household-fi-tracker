import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
import Card from '../../components/ui/Card';
import Toggle from '../../components/ui/Toggle';

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
];

// Fixed two-slice colours for grouped view
const GROUP_COLORS = {
  'Investable':  '#22c55e',
  'Non-invest.': '#94a3b8',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  const pct = payload[0].percent;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-600 tabular-nums">{formatSGD(value)}</p>
      {pct != null && (
        <p className="text-gray-400 text-xs">{(pct * 100).toFixed(1)}%</p>
      )}
    </div>
  );
}

// Percentage label rendered inside each slice
const RADIAN = Math.PI / 180;
function PctLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null; // skip slivers
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

const VIEWS = [
  { id: 'all',        label: 'All' },
  { id: 'investable', label: 'Investable' },
  { id: 'non',        label: 'Non-invest.' },
];

export default function AssetAllocationChart() {
  const state   = useStore();
  const ordered = selectors.orderedCategories(state);
  const [view, setView]       = useState('all');
  const [grouped, setGrouped] = useState(false);

  // Build chart data
  let data;
  if (view === 'all' && grouped) {
    // Collapse all categories into two aggregate slices
    const inv    = ordered.filter((c) => c.value > 0 &&  c.investable).reduce((s, c) => s + c.value, 0);
    const nonInv = ordered.filter((c) => c.value > 0 && !c.investable).reduce((s, c) => s + c.value, 0);
    data = [
      ...(inv    > 0 ? [{ name: 'Investable',   value: inv,    color: GROUP_COLORS['Investable']  }] : []),
      ...(nonInv > 0 ? [{ name: 'Non-invest.',   value: nonInv, color: GROUP_COLORS['Non-invest.'] }] : []),
    ];
  } else {
    const filtered = ordered.filter((cat) => {
      if (cat.value <= 0) return false;
      if (view === 'investable') return  cat.investable;
      if (view === 'non')        return !cat.investable;
      return true;
    });
    data = filtered.map((cat, i) => ({
      name:  cat.label,
      value: cat.value,
      color: COLORS[i % COLORS.length],
    }));
  }

  // Tab button styles
  const tabCls = (id) => [
    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
    view === id
      ? 'bg-green-600 text-white'
      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  ].join(' ');

  const toggleBar = (
    <div className="flex gap-1">
      {VIEWS.map(({ id, label }) => (
        <button key={id} className={tabCls(id)} onClick={() => setView(id)}>
          {label}
        </button>
      ))}
    </div>
  );

  if (data.length === 0) {
    return (
      <Card title="Allocation" action={toggleBar}>
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          No data for this view
        </div>
      </Card>
    );
  }

  return (
    <Card title="Allocation" action={toggleBar}>
      {/* Group-by-type toggle — only shown in All view */}
      {view === 'all' && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <Toggle
            checked={grouped}
            onChange={() => setGrouped((g) => !g)}
            label="Group by investable type"
          />
          <span className="text-xs text-gray-500">
            {grouped ? 'Grouped: Investable / Non-invest.' : 'Group by type'}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={55} outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={PctLabel}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
