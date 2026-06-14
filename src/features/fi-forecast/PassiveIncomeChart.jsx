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

const CPF_PAYOUT_AGE = 65;

function fmtAxis(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const cpf   = d.cpfContribution ?? 0;
  const total = (d.portfolioIncome ?? 0) + cpf;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-sm min-w-[210px]">
      <p className="font-semibold text-gray-800 mb-1.5 pb-1 border-b border-gray-100">
        {d.year}{d.age != null ? ` · Age ${d.age}` : ''}
      </p>

      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-blue-600 font-medium">Portfolio income</span>
        <span className="tabular-nums text-gray-800">{formatSGD(d.portfolioIncome ?? 0)}/mo</span>
      </div>

      {cpf > 0 && (
        <div className="flex justify-between gap-4 mb-0.5">
          <span className="text-purple-600 font-medium">+ CPF LIFE</span>
          <span className="tabular-nums text-gray-800">{formatSGD(cpf)}/mo</span>
        </div>
      )}

      {cpf > 0 && (
        <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-gray-100">
          <span className="text-purple-700 font-semibold">Total income</span>
          <span className="tabular-nums font-semibold text-purple-800">{formatSGD(total)}/mo</span>
        </div>
      )}

      <div className={`flex justify-between gap-4 ${cpf > 0 ? 'mt-1 pt-1 border-t border-gray-100' : ''}`}>
        <span className="text-gray-400">Target</span>
        <span className="tabular-nums text-gray-500">{formatSGD(d.target ?? 0)}/mo</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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
    applyInflation,
    inflationPct,
  } = metrics;

  const currentYear = new Date().getFullYear();

  // CPF kick-in year (when person turns 65)
  const cpfKickInYear = currentAge != null
    ? currentYear + Math.max(0, CPF_PAYOUT_AGE - currentAge)
    : null;

  // Detect income crossover from series data — use d.target so inflation-adjusted threshold is used
  let fiYearPortfolio = null;
  let fiYearTotal     = null;
  for (const d of projectionSeries) {
    if (fiYearPortfolio == null && d.portfolioIncome >= d.target) fiYearPortfolio = d.year;
    if (fiYearTotal     == null && d.totalIncome     >= d.target) fiYearTotal     = d.year;
  }

  // Cutoff: show until a few years past first income crossover,
  // but ALWAYS extend to show the CPF step-up at 65 if it falls in the series.
  const firstCrossover = fiYearTotal ?? fiYearPortfolio;
  const baseCutoff     = firstCrossover ? firstCrossover + 5 : currentYear + 40;
  const seriesEnd      = projectionSeries[projectionSeries.length - 1]?.year ?? baseCutoff;

  // Extend chart to include CPF step-up (+ 3 years for context after it)
  const cutoff = Math.min(
    cpfKickInYear && cpfKickInYear > baseCutoff ? cpfKickInYear + 3 : baseCutoff,
    seriesEnd
  );

  // Transform data: add explicit cpfContribution field (0 before 65, cpfLifePayout after)
  const data = projectionSeries
    .filter((d) => d.year <= cutoff)
    .map((d) => ({
      ...d,
      cpfContribution: Math.max(0, (d.totalIncome ?? 0) - (d.portfolioIncome ?? 0)),
    }));

  // Only show CPF area if it actually activates within the visible range
  const hasCpfInRange = cpfLifePayout > 0 && data.some((d) => d.cpfContribution > 0);
  const showCpfMarker = hasCpfInRange && cpfKickInYear != null && cpfKickInYear <= cutoff;

  // Y-axis: accommodate target (may be inflated) + max income
  const maxIncome = Math.max(...data.map((d) => Math.max((d.portfolioIncome ?? 0) + (d.cpfContribution ?? 0), d.target ?? 0)));
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
          {/*
            Stacked area chart:
              Blue area  = portfolio passive income (portfolio × SWR / 12)
              Purple area = CPF LIFE contribution   (0 before 65, cpfLifePayout after)
            Total height of both areas = total monthly passive income.
            Orange dashed horizontal = target monthly income.
            The purple band appears at age 65 — the CPF step-up is immediately visible.
          */}
          <ComposedChart data={data} margin={{ top: 16, right: 90, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="piPortGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="piCpfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.15} />
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
              tickFormatter={fmtAxis}
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

            {/* ── Target monthly income — flat or rising with inflation ── */}
            <Line
              type="monotone"
              dataKey="target"
              name={applyInflation ? `Target income (+${inflationPct}%/yr)` : 'Target income/mo'}
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={false}
            />

            {/* ── CPF kick-in at 65 — vertical marker ── */}
            {showCpfMarker && (
              <ReferenceLine
                x={cpfKickInYear}
                stroke="#8b5cf6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: `CPF @ 65  (+${formatSGD(cpfLifePayout)}/mo)`,
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: '#7c3aed',
                }}
              />
            )}

            {/* ── FI crossover (portfolio income alone) ── */}
            {fiYearPortfolio && fiYearPortfolio <= cutoff && (
              <ReferenceLine
                x={fiYearPortfolio}
                stroke="#16a34a"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: `FI  ${fiYearPortfolio}`,
                  position: 'top',
                  fontSize: 10,
                  fill: '#15803d',
                }}
              />
            )}

            {/* ── FI crossover with CPF (if different / earlier) ── */}
            {fiYearTotal && fiYearTotal !== fiYearPortfolio && fiYearTotal <= cutoff && (
              <ReferenceLine
                x={fiYearTotal}
                stroke="#8b5cf6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: `FI+CPF  ${fiYearTotal}`,
                  position: 'insideTopLeft',
                  fontSize: 10,
                  fill: '#7c3aed',
                }}
              />
            )}

            {/* ── Blue: portfolio passive income (bottom of stack) ── */}
            <Area
              type="monotone"
              dataKey="portfolioIncome"
              stackId="income"
              name="Portfolio income/mo"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#piPortGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* ── Purple: CPF LIFE contribution (stacked on top, appears at 65) ── */}
            {hasCpfInRange && (
              <Area
                type="monotone"
                dataKey="cpfContribution"
                stackId="income"
                name="CPF LIFE income/mo"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#piCpfGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>🔵 Blue = portfolio passive income</span>
        {hasCpfInRange && <span>🟣 Purple band = CPF LIFE income added from age 65</span>}
        <span>
          {applyInflation
            ? `↗ Orange dashed = target income rising at ${inflationPct}%/yr`
            : '— Orange dashed = target monthly income (flat)'}
        </span>
      </div>
    </Card>
  );
}
