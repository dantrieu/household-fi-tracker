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

// ─── Axis formatters ──────────────────────────────────────────────────────────

function fmtPortfolio(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtIncome(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const cpfAmount = (d.totalIncome ?? 0) - (d.portfolioIncome ?? 0);
  const hasCpf    = cpfAmount > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-[230px]">
      <p className="font-semibold text-gray-800 mb-2 pb-1.5 border-b border-gray-100">
        {d.year}{d.age != null ? ` · Age ${d.age}` : ''}
      </p>

      {/* Portfolio value (left axis) */}
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-green-700 font-medium">Portfolio value</span>
        <span className="tabular-nums text-gray-800">{formatSGD(d.portfolio ?? 0)}</span>
      </div>

      <div className="border-t border-gray-100 my-1.5" />

      {/* Monthly income breakdown (right axis) */}
      <div className="flex justify-between gap-4 mb-0.5">
        <span className="text-blue-600 font-medium">Portfolio income</span>
        <span className="tabular-nums text-gray-800">{formatSGD(d.portfolioIncome ?? 0)}/mo</span>
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
          <span className="tabular-nums font-semibold text-purple-800">{formatSGD(d.totalIncome ?? 0)}/mo</span>
        </div>
      )}

      <div className="flex justify-between gap-4 mt-1.5 pt-1 border-t border-gray-100">
        <span className="text-orange-500">Target income</span>
        <span className="tabular-nums text-gray-600">{formatSGD(d.target ?? 0)}/mo</span>
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
      <Card title="Portfolio Growth & Passive Income Projection">
        <p className="text-sm text-gray-400 text-center py-6">
          Fill in your inputs above to see the projection chart.
        </p>
      </Card>
    );
  }

  const {
    projectionSeries,
    targetMonthlyIncome,
    targetPortfolioFull,
    targetPortfolioAtFI,
    cpfLifePayout,
    currentAge,
    retirementAge,
    annualReturnPct,
    swrPct,
    annualSavings,
    stopContributionsAtRetirement,
    applyInflation,
    inflationPct,
    yearsWithoutCPF,
  } = metrics;

  // Inflated monthly target at projected FI year (for legend annotation)
  const targetMonthlyAtFI = applyInflation && yearsWithoutCPF
    ? Math.round(targetMonthlyIncome * Math.pow(1 + inflationPct / 100, yearsWithoutCPF))
    : null;

  // Nominal target NW for the portfolio reference line
  const targetPortfolioRef = applyInflation && targetPortfolioAtFI
    ? targetPortfolioAtFI
    : targetPortfolioFull;

  const currentYear = new Date().getFullYear();

  // ── Detect income crossover years from series (more accurate with withdrawal phase) ──
  // Compare against d.target so inflation-adjusted target is used automatically
  let fiYearPortfolio = null;
  let fiYearTotal     = null;
  for (const d of projectionSeries) {
    if (fiYearPortfolio == null && d.portfolioIncome >= d.target) fiYearPortfolio = d.year;
    if (fiYearTotal     == null && d.totalIncome     >= d.target) fiYearTotal     = d.year;
  }

  // ── Trim: show a few years past first crossover ───────────────────────────
  const firstCrossover = fiYearTotal ?? fiYearPortfolio;
  const lastYear = projectionSeries[projectionSeries.length - 1]?.year;
  const cutoff   = firstCrossover ? Math.min(firstCrossover + 4, lastYear) : lastYear;
  const data     = projectionSeries.filter((d) => d.year <= cutoff);

  // ── Reference line positions ──────────────────────────────────────────────
  const retirementYear = retirementAge != null && currentAge != null
    ? currentYear + Math.max(0, retirementAge - currentAge)
    : null;
  const cpfKickInYear = currentAge != null
    ? currentYear + Math.max(0, CPF_PAYOUT_AGE - currentAge)
    : null;
  const showCpfMarker = cpfLifePayout > 0 && cpfKickInYear != null && cpfKickInYear <= cutoff;

  // ── Y-axis domains ────────────────────────────────────────────────────────
  const maxPortfolio = Math.max(...data.map((d) => d.portfolio), targetPortfolioRef);
  const portfolioMax = Math.ceil(maxPortfolio * 1.15 / 100_000) * 100_000;

  const maxIncome    = Math.max(...data.map((d) => Math.max(d.totalIncome, d.target)));
  const incomeMax    = Math.ceil(maxIncome * 1.2 / 1000) * 1000;

  return (
    <Card
      title="Portfolio Growth & Passive Income Projection"
      action={
        <span className="text-xs text-gray-400">
          {annualReturnPct}% return · {swrPct ?? 4}% SWR · {formatSGD(annualSavings)}/yr
          {applyInflation ? ` · ${inflationPct}% inflation` : ''}
        </span>
      }
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 64, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />

            {/* Left axis — portfolio value */}
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={fmtPortfolio}
              tick={{ fontSize: 11, fill: '#22c55e' }}
              tickLine={false}
              axisLine={false}
              domain={[0, portfolioMax]}
              width={60}
            />

            {/* Right axis — monthly income */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={fmtIncome}
              tick={{ fontSize: 11, fill: '#3b82f6' }}
              tickLine={false}
              axisLine={false}
              domain={[0, incomeMax]}
              width={52}
            />

            <Tooltip content={<ChartTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />

            {/* ── Target portfolio — horizontal on left axis ── */}
            <ReferenceLine
              yAxisId="left"
              y={targetPortfolioRef}
              stroke="#94a3b8"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: applyInflation
                  ? `Target ${fmtPortfolio(targetPortfolioRef)} nominal`
                  : `Target ${fmtPortfolio(targetPortfolioRef)}`,
                position: 'insideTopLeft', fontSize: 10, fill: '#94a3b8',
              }}
            />

            {/* ── Retirement year — vertical marker ── */}
            {retirementYear && retirementYear <= cutoff && stopContributionsAtRetirement && (
              <ReferenceLine
                yAxisId="left"
                x={retirementYear}
                stroke="#f59e0b"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `Retire ${retirementYear}`, position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
              />
            )}

            {/* ── CPF kick-in at 65 ── */}
            {showCpfMarker && cpfKickInYear !== retirementYear && (
              <ReferenceLine
                yAxisId="left"
                x={cpfKickInYear}
                stroke="#8b5cf6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: 'CPF @ 65', position: 'insideTopRight', fontSize: 10, fill: '#8b5cf6' }}
              />
            )}

            {/* ── FI crossover (portfolio income = target) ── */}
            {fiYearPortfolio && fiYearPortfolio <= cutoff && (
              <ReferenceLine
                yAxisId="left"
                x={fiYearPortfolio}
                stroke="#16a34a"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `FI ${fiYearPortfolio}`, position: 'top', fontSize: 10, fill: '#16a34a' }}
              />
            )}

            {/* ── FI crossover with CPF (if earlier) ── */}
            {fiYearTotal && fiYearTotal !== fiYearPortfolio && fiYearTotal <= cutoff && (
              <ReferenceLine
                yAxisId="left"
                x={fiYearTotal}
                stroke="#8b5cf6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `FI+CPF ${fiYearTotal}`, position: 'insideTopLeft', fontSize: 10, fill: '#8b5cf6' }}
              />
            )}

            {/* ── Portfolio value (green area, left axis) ── */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="portfolio"
              name="Portfolio value"
              stroke="#22c55e"
              strokeWidth={2.5}
              fill="url(#portfolioGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* ── Monthly portfolio income (blue line, right axis) ── */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="portfolioIncome"
              name="Portfolio income/mo"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* ── Total income incl. CPF (purple line, right axis, steps up at 65) ── */}
            {cpfLifePayout > 0 && (
              <Line
                yAxisId="right"
                type="stepAfter"
                dataKey="totalIncome"
                name="Income + CPF/mo"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {/* ── Target income line (orange dashed — flat or rising with inflation) ── */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="target"
              name={applyInflation ? `Target income (inflated ${inflationPct}%/yr)` : 'Target income/mo'}
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / key */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400">
        <span>🟢 Green area = portfolio value (left axis)</span>
        <span>🔵 Blue line = portfolio passive income/mo (right)</span>
        {cpfLifePayout > 0 && <span>🟣 Purple line = income + CPF LIFE from 65 (right)</span>}
        <span>— Grey dashed = target portfolio (nominal)</span>
        <span>
          {applyInflation && targetMonthlyAtFI
            ? `↗ Orange dashed = target income rising ${inflationPct}%/yr (${formatSGD(targetMonthlyIncome)}/mo today → ~${formatSGD(targetMonthlyAtFI)}/mo at FI year)`
            : '— Orange dashed = target monthly income (flat)'}
        </span>
      </div>
    </Card>
  );
}
