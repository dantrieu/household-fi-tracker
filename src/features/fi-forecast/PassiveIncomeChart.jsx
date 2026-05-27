import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
import Card from '../../components/ui/Card';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';

const CPF_PAYOUT_AGE = 65;

function fmtAxis(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const cpfAmount = (d?.totalIncome ?? 0) - (d?.portfolioIncome ?? 0);
  const hasCpf    = cpfAmount > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-sm min-w-[210px]">
      <p className="font-semibold text-gray-800 mb-1.5 pb-1 border-b border-gray-100">
        {d?.year}{d?.age != null ? ` · Age ${d.age}` : ''}
      </p>
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-blue-600 font-medium">Portfolio income</span>
        <span className="tabular-nums text-gray-800">{formatSGD(d?.portfolioIncome ?? 0)}/mo</span>
      </div>
      {hasCpf && (
        <div className="flex justify-between gap-4 mb-0.5">
          <span className="text-purple-600 font-medium">+ CPF LIFE</span>
          <span className="tabular-nums text-gray-800">{formatSGD(cpfAmount)}/mo</span>
        </div>
      )}
      {hasCpf && (
        <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-gray-100">
          <span className="text-purple-700 font-semibold">Total income</span>
          <span className="tabular-nums font-semibold text-purple-800">{formatSGD(d?.totalIncome ?? 0)}/mo</span>
        </div>
      )}
      <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-gray-100">
        <span className="text-gray-500">Target</span>
        <span className="tabular-nums text-gray-600">{formatSGD(d?.target ?? 0)}/mo</span>
      </div>
    </div>
  );
}

export default function PassiveIncomeChart() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  if (!metrics.ready || !metrics.projectionSeries?.length) return null;

  const {
    projectionSeries,
    targetMonthlyIncome,
    cpfLifePayout,
    currentAge,
    swrPct,
    annualReturnPct,
    annualSavings,
  } = metrics;

  const currentYear = new Date().getFullYear();

  // Detect FI crossover from series
  let fiYearIncome = null;   // portfolio income alone crosses target
  let fiYearTotal  = null;   // total income (incl. CPF) crosses target
  for (const d of projectionSeries) {
    if (fiYearIncome == null && d.portfolioIncome >= targetMonthlyIncome) fiYearIncome = d.year;
    if (fiYearTotal  == null && d.totalIncome     >= targetMonthlyIncome) fiYearTotal  = d.year;
  }

  // Cutoff: a few years past first crossover
  const firstCrossover = fiYearTotal ?? fiYearIncome;
  const lastYear = projectionSeries[projectionSeries.length - 1]?.year;
  const cutoff   = firstCrossover ? Math.min(firstCrossover + 5, lastYear) : lastYear;
  const data     = projectionSeries.filter((d) => d.year <= cutoff);

  // CPF kick-in year
  const cpfKickInYear = currentAge != null
    ? currentYear + Math.max(0, CPF_PAYOUT_AGE - currentAge)
    : null;
  const showCpfMarker = cpfLifePayout > 0 && cpfKickInYear != null && cpfKickInYear <= cutoff;

  const maxIncome = Math.max(...data.map((d) => d.totalIncome), targetMonthlyIncome);
  const yMax      = Math.ceil(maxIncome * 1.2 / 500) * 500;

  return (
    <Card
      title="Monthly Passive Income"
      action={
        <span className="text-xs text-gray-400">
          {swrPct ?? 4}% SWR · {annualReturnPct}% return
        </span>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 80, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="piGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[0, yMax]} width={52} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />

            {/* Target monthly income — horizontal dashed line */}
            <ReferenceLine
              y={targetMonthlyIncome}
              stroke="#f97316"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: `Target  ${fmtAxis(targetMonthlyIncome)}/mo`, position: 'right', fontSize: 10, fill: '#ea580c' }}
            />

            {/* CPF kick-in at 65 */}
            {showCpfMarker && (
              <ReferenceLine
                x={cpfKickInYear}
                stroke="#8b5cf6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `CPF @ 65`, position: 'insideTopRight', fontSize: 10, fill: '#7c3aed' }}
              />
            )}

            {/* FI crossover — income line alone */}
            {fiYearIncome && fiYearIncome <= cutoff && (
              <ReferenceLine
                x={fiYearIncome}
                stroke="#16a34a"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `FI  ${fiYearIncome}`, position: 'top', fontSize: 10, fill: '#16a34a' }}
              />
            )}

            {/* FI crossover with CPF — if earlier than without */}
            {fiYearTotal && fiYearTotal !== fiYearIncome && fiYearTotal <= cutoff && (
              <ReferenceLine
                x={fiYearTotal}
                stroke="#8b5cf6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `FI+CPF  ${fiYearTotal}`, position: 'insideTopLeft', fontSize: 10, fill: '#7c3aed' }}
              />
            )}

            {/* Portfolio passive income — blue area */}
            <Area
              type="monotone"
              dataKey="portfolioIncome"
              name="Portfolio income/mo"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#piGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* Total income including CPF LIFE — purple line stepping up at 65 */}
            {cpfLifePayout > 0 && (
              <Line
                type="stepAfter"
                dataKey="totalIncome"
                name="Income + CPF/mo"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>🔵 Blue = portfolio passive income &nbsp;·&nbsp; — Orange dashed = target income</span>
        {cpfLifePayout > 0 && <span>🟣 Purple = income + CPF LIFE (jumps at 65)</span>}
      </div>
    </Card>
  );
}
