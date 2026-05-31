import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useStore, { selectors } from '../../store/useStore';
import { formatSGD, formatPct } from '../../lib/format';
import Card from '../../components/ui/Card';

// Fixed colours per exchange (matches badge colours)
const EXCHANGE_COLORS = {
  SGX:    '#3b82f6',  // blue
  US:     '#8b5cf6',  // purple
  CRYPTO: '#f97316',  // orange
};

// Fallback palette for individual positions
const POSITION_COLORS = [
  '#22c55e','#3b82f6','#f59e0b','#8b5cf6',
  '#ef4444','#06b6d4','#f97316','#ec4899',
  '#14b8a6','#a855f7','#84cc16','#f43f5e',
];

// % label rendered inside each slice (mirrors AssetAllocationChart)
const RADIAN = Math.PI / 180;
function PctLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
          fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{d.name}</p>
      <p className="text-gray-600">{formatSGD(d.value)} · {formatPct(d.pct)}</p>
    </div>
  );
}

export default function PortfolioAllocationChart() {
  const [mode, setMode] = useState('exchange'); // 'exchange' | 'position'

  const state     = useStore();
  const positions = selectors.enrichedPositions(state).filter((p) => (p.valueSGD ?? 0) > 0);
  const totalSGD  = positions.reduce((s, p) => s + (p.valueSGD ?? 0), 0);

  if (positions.length === 0) {
    return (
      <Card title="Allocation">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          Add positions to see allocation
        </div>
      </Card>
    );
  }

  // ── Build chart data ───────────────────────────────────────────────────────

  let data, colors;

  if (mode === 'exchange') {
    // Aggregate by exchange bucket
    const buckets = {};
    for (const p of positions) {
      const key = p.exchange; // 'SGX' | 'US' | 'CRYPTO'
      buckets[key] = (buckets[key] ?? 0) + p.valueSGD;
    }
    const LABELS = { SGX: 'SGX', US: 'US Equities', CRYPTO: 'Crypto' };
    data = Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: LABELS[key] ?? key,
        value,
        pct: totalSGD > 0 ? value / totalSGD : 0,
        exchangeKey: key,
      }));
    colors = data.map((d) => EXCHANGE_COLORS[d.exchangeKey] ?? '#94a3b8');
  } else {
    data = positions.map((p) => ({
      name: p.ticker,
      value: p.valueSGD,
      pct: p.weight ?? 0,
    }));
    colors = data.map((_, i) => POSITION_COLORS[i % POSITION_COLORS.length]);
  }

  // ── Toggle buttons ─────────────────────────────────────────────────────────

  const toggle = (
    <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs font-medium">
      {[
        { key: 'exchange', label: 'By Exchange' },
        { key: 'position', label: 'By Position' },
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          className={[
            'px-2.5 py-1 transition-colors',
            mode === key
              ? 'bg-green-600 text-white'
              : 'text-gray-500 hover:bg-gray-50',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <Card title="Allocation" action={toggle}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            labelLine={false}
            label={PctLabel}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => <span className="text-xs text-gray-600">{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
