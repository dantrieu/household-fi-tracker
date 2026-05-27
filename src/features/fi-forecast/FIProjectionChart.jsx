import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
import Card from '../../components/ui/Card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtSGDAxis(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-2">
        {label}{d?.age != null ? ` · Age ${d.age}` : ''}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="tabular-nums text-gray-700">{formatSGD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FIProjectionChart() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  if (!metrics.ready || !metrics.projectionSeries?.length) {
    return (
      <Card title="FI Projection — Portfolio Growth vs Target">
        <p className="text-sm text-gray-400 text-center py-6">
          Fill in your inputs above to see the projection chart.
        </p>
      </Card>
    );
  }

  const {
    projectionSeries,
    fiYearWithoutCPF,
    fiYearWithCPF,
    cpfLifePayout,
    currentAge,
    annualReturnPct,
    annualSavings,
    swrPct,
  } = metrics;

  // Trim series at reasonable endpoint (a few years past FI or max 40y)
  const fiYear = fiYearWithCPF ?? fiYearWithoutCPF;
  const cutoffYear = fiYear ? fiYear + 3 : projectionSeries[projectionSeries.length - 1]?.year;
  const data = projectionSeries.filter((d) => d.year <= cutoffYear);

  // Detect where CPF kicks in (age 65)
  const cpfKickInYear = currentAge != null
    ? new Date().getFullYear() + Math.max(0, 65 - currentAge)
    : null;

  return (
    <Card
      title="FI Projection — Portfolio Growth vs Target"
      action={
        <span className="text-xs text-gray-400">
          {annualReturnPct}% return · {swrPct ?? 4}% SWR · {formatSGD(annualSavings)}/yr
        </span>
      }
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="targetCpfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={fmtSGDAxis}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />

            <Tooltip content={<ChartTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />

            {/* FI crossover — without CPF */}
            {fiYearWithoutCPF && (
              <ReferenceLine
                x={fiYearWithoutCPF}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                label={{ value: `FI ${fiYearWithoutCPF}`, position: 'top', fontSize: 10, fill: '#94a3b8' }}
              />
            )}

            {/* FI crossover — with CPF */}
            {fiYearWithCPF && fiYearWithCPF !== fiYearWithoutCPF && (
              <ReferenceLine
                x={fiYearWithCPF}
                stroke="#3b82f6"
                strokeDasharray="4 3"
                label={{ value: `FI+CPF ${fiYearWithCPF}`, position: 'insideTopLeft', fontSize: 10, fill: '#3b82f6' }}
              />
            )}

            {/* CPF LIFE kick-in at 65 */}
            {cpfKickInYear && cpfLifePayout > 0 && cpfKickInYear <= cutoffYear && (
              <ReferenceLine
                x={cpfKickInYear}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: 'CPF@65', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
              />
            )}

            {/* Target without CPF */}
            <Area
              type="monotone"
              dataKey="targetWithoutCPF"
              name="Target (no CPF)"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="url(#targetGrad)"
              dot={false}
              activeDot={false}
            />

            {/* Target with CPF (steps down at 65) */}
            {cpfLifePayout > 0 && (
              <Area
                type="stepAfter"
                dataKey="targetWithCPF"
                name="Target (with CPF LIFE)"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#targetCpfGrad)"
                dot={false}
                activeDot={false}
              />
            )}

            {/* Portfolio growth */}
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke="#22c55e"
              strokeWidth={2.5}
              fill="url(#portfolioGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-gray-400 leading-relaxed">
        📈 Green = projected portfolio growth. Grey dashed = FI target at {swrPct ?? 4}% SWR (annual income ÷ {swrPct ?? 4}%).
        {cpfLifePayout > 0
          ? ` Blue dashed = target with CPF LIFE (est. ${formatSGD(cpfLifePayout)}/mo from age 65 — reduces required portfolio).`
          : ''}
      </p>
    </Card>
  );
}
