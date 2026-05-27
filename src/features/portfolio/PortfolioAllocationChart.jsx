import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useStore, { selectors } from '../../store/useStore';
import { formatSGD, formatPct } from '../../lib/format';
import Card from '../../components/ui/Card';

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#ec4899'];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{d.ticker}</p>
      <p className="text-gray-600">{formatSGD(d.value)} · {formatPct(d.weight)}</p>
    </div>
  );
}

export default function PortfolioAllocationChart() {
  const state     = useStore();
  const positions = selectors.enrichedPositions(state).filter((p) => (p.valueSGD ?? 0) > 0);

  if (positions.length === 0) {
    return (
      <Card title="Allocation">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          Add positions to see allocation
        </div>
      </Card>
    );
  }

  const data = positions.map((p) => ({
    ticker: p.ticker,
    value: p.valueSGD,
    weight: p.weight,
  }));

  return (
    <Card title="Allocation">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="ticker"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
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
