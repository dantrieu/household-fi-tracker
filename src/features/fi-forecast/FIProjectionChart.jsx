import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
import Card from '../../components/ui/Card';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';

// ─── Y-axis formatter (monthly income) ───────────────────────────────────────

function fmtIncome(value) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const cpfActive = d?.totalIncome > d?.portfolioIncome;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-[220px]">
      <p className="font-semibold text-gray-800 mb-2">
        {label}{d?.age != null ? ` · Age ${d.age}` : ''}
      </p>

      {/* Portfolio passive income */}
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-green-700 font-medium">Portfolio income</span>
        <span className="tabular-nums text-gray-800">{formatSGD(d?.portfolioIncome ?? 0)}/mo</span>
      </div>

      {/* CPF add-on (only once active) */}
      {cpfActive && (
        <div className="flex justify-between gap-4 mb-0.5">
          <span className="text-blue-600 font-medium">+ CPF LIFE</span>
          <span className="tabular-nums text-gray-800">
            {formatSGD((d?.totalIncome ?? 0) - (d?.portfolioIncome ?? 0))}/mo
          </span>
        </div>
      )}

      {/* Total */}
      {cpfActive && (
        <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-gray-100">
          <span className="text-blue-700 font-semibold">Total income</span>
          <span className="tabular-nums font-semibold text-blue-800">{formatSGD(d?.totalIncome ?? 0)}/mo</span>
        </div>
      )}

      {/* Target */}
      <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-gray-100">
        <span className="text-gray-500">Target</span>
        <span className="tabular-nums text-gray-600">{formatSGD(d?.target ?? 0)}/mo</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FIProjectionChart() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  if (!metrics.ready || !metrics.projectionSeries?.length) {
    return (
      <Card title="Monthly Passive Income Projection">
        <p className="text-sm text-gray-400 text-center py-6">
          Fill in your inputs above to see the projection chart.
        </p>
      </Card>
    );
  }

  const {
    projectionSeries,
    targetMonthlyIncome,
    cpfLifePayout,
    currentAge,
    retirementAge,
    annualReturnPct,
    swrPct,
    annualSavings,
    stopContributionsAtRetirement,
  } = metrics;

  const currentYear = new Date().getFullYear();

  // ── Find crossover years directly from the series ────────────────────────
  // (more accurate than pre-computed, since withdrawal phase affects the curve)
  let fiYearPortfolio = null;  // when portfolioIncome first >= target
  let fiYearTotal     = null;  // when totalIncome first >= target (with CPF)
  for (const d of projectionSeries) {
    if (fiYearPortfolio == null && d.portfolioIncome >= targetMonthlyIncome) fiYearPortfolio = d.year;
    if (fiYearTotal     == null && d.totalIncome     >= targetMonthlyIncome) fiYearTotal     = d.year;
  }

  // ── Trim series: show until a few years past first crossover ─────────────
  const firstCrossover = fiYearTotal ?? fiYearPortfolio;
  const lastYear = projectionSeries[projectionSeries.length - 1]?.year;
  const cutoff = firstCrossover
    ? Math.min(firstCrossover + 4, lastYear)
    : lastYear;
  const data = projectionSeries.filter((d) => d.year <= cutoff);

  // ── Reference line positions ──────────────────────────────────────────────
  const retirementYear = retirementAge != null && currentAge != null
    ? currentYear + Math.max(0, retirementAge - currentAge)
    : null;
  const cpfKickInYear = currentAge != null
    ? currentYear + Math.max(0, CPF_PAYOUT_AGE - currentAge)
    : null;
  const showCpfLine = cpfLifePayout > 0 && cpfKickInYear != null && cpfKickInYear <= cutoff;

  // ── Y-axis domain ─────────────────────────────────────────────────────────
  const maxIncome = Math.max(...data.map((d) => d.totalIncome), targetMonthlyIncome);
  const yMax = Math.ceil(maxIncome * 1.15 / 1000) * 1000;

  return (
    <Card
      title="Monthly Passive Income Projection"
      action={
        <span className="text-xs text-gray-400">
          {annualReturnPct}% return · {swrPct ?? 4}% SWR · {formatSGD(annualSavings)}/yr
        </span>
      }
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 20, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.03} />
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
              tickFormatter={fmtIncome}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              domain={[0, yMax]}
              width={52}
            />

            <Tooltip content={<ChartTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />

            {/* ── Retirement age — vertical marker ── */}
            {retirementYear && retirementYear <= cutoff && stopContributionsAtRetirement && (
              <ReferenceLine
                x={retirementYear}
                stroke="#f59e0b"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `Retire ${retirementYear}`, position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
              />
            )}

            {/* ── CPF kick-in at 65 — vertical marker ── */}
            {showCpfLine && cpfKickInYear !== retirementYear && (
              <ReferenceLine
                x={cpfKickInYear}
                stroke="#3b82f6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: 'CPF @ 65', position: 'insideTopRight', fontSize: 10, fill: '#3b82f6' }}
              />
            )}

            {/* ── FI crossover (portfolio only) ── */}
            {fiYearPortfolio && fiYearPortfolio <= cutoff && (
              <ReferenceLine
                x={fiYearPortfolio}
                stroke="#16a34a"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `FI ${fiYearPortfolio}`, position: 'top', fontSize: 10, fill: '#16a34a' }}
              />
            )}

            {/* ── FI crossover with CPF (only if different) ── */}
            {fiYearTotal && fiYearTotal !== fiYearPortfolio && fiYearTotal <= cutoff && (
              <ReferenceLine
                x={fiYearTotal}
                stroke="#2563eb"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `FI+CPF ${fiYearTotal}`, position: 'insideTopLeft', fontSize: 10, fill: '#2563eb' }}
              />
            )}

            {/* ── Target income — horizontal line ── */}
            <ReferenceLine
              y={targetMonthlyIncome}
              stroke="#6b7280"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: `Target ${formatSGD(targetMonthlyIncome)}/mo`, position: 'right', fontSize: 10, fill: '#6b7280' }}
            />

            {/* ── Portfolio passive income (green area) ── */}
            <Area
              type="monotone"
              dataKey="portfolioIncome"
              name="Portfolio income"
              stroke="#22c55e"
              strokeWidth={2.5}
              fill="url(#incomeGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* ── Total income including CPF LIFE (blue line, step-up at 65) ── */}
            {cpfLifePayout > 0 && (
              <Line
                type="stepAfter"
                dataKey="totalIncome"
                name="Portfolio + CPF income"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>📈 Green = portfolio passive income ({swrPct ?? 4}% SWR)</span>
        {cpfLifePayout > 0 && <span>🔵 Blue = portfolio + CPF LIFE (steps up at 65)</span>}
        {stopContributionsAtRetirement && retirementYear && (
          <span>🟡 Amber line = retirement (withdrawal begins)</span>
        )}
      </div>
    </Card>
  );
}

// Constant needed inside component
const CPF_PAYOUT_AGE = 65;
