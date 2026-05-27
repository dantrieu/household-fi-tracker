import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
import Card from '../../components/ui/Card';

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-600 tabular-nums">{formatSGD(value)}</p>
    </div>
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
  const [view, setView] = useState('all');

  const filtered = ordered.filter((cat) => {
    if (cat.value <= 0) return false;
    if (view === 'investable') return cat.investable;
    if (view === 'non')        return !cat.investable;
    return true;
  });

  const data = filtered.map((cat) => ({ name: cat.label, value: cat.value }));

  const tabCls = (id) => [
    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
    view === id
      ? 'bg-green-600 text-white'
      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  ].join(' ');

  const toggleBar = (
    <div className="flex gap-1">
      {VIEWS.map(({ id, label }) => (
        <button key={id} className={tabCls(id)} onClick={() => setView(id)}>{label}</button>
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
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8}
            formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
