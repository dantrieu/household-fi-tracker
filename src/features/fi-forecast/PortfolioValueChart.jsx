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
} from 'recharts';

const CPF_PAYOUT_AGE = 65;

function fmtAxis(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-sm min-w-[190px]">
      <p className="font-semibold text-gray-800 mb-1.5 pb-1 border-b border-gray-100">
        {d?.year}{d?.age != null ? ` · Age ${d.age}` : ''}
      </p>
      <div className="flex justify-between gap-4">
        <span className="text-green-700 font-medium">Portfolio</span>
        <span className="tabular-nums text-gray-800">{formatSGD(d?.portfolio ?? 0)}</span>
      </div>
    </div>
  );
}

export default function PortfolioValueChart() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  if (!metrics.ready || !metrics.projectionSeries?.length) return null;

  const {
    projectionSeries,
    targetPortfolioFull,
    currentAge,
    retirementAge,
    stopContributionsAtRetirement,
    fiYearWithoutCPF,
    annualReturnPct,
    swrPct,
    annualSavings,
  } = metrics;

  const currentYear = new Date().getFullYear();

  // Cutoff: a few years past FI, capped at series end
  const lastYear = projectionSeries[projectionSeries.length - 1]?.year;
  const cutoff   = fiYearWithoutCPF
    ? Math.min(fiYearWithoutCPF + 5, lastYear)
    : lastYear;
  const data = projectionSeries.filter((d) => d.year <= cutoff);

  const retirementYear = retirementAge != null && currentAge != null
    ? currentYear + Math.max(0, retirementAge - currentAge)
    : null;

  const maxPortfolio = Math.max(...data.map((d) => d.portfolio), targetPortfolioFull ?? 0);
  const yMax = Math.ceil(maxPortfolio * 1.12 / 100_000) * 100_000;

  return (
    <Card
      title="Portfolio Value"
      action={
        <span className="text-xs text-gray-400">
          {annualReturnPct}% return · {formatSGD(annualSavings)}/yr contributions
        </span>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[0, yMax]} width={60} />
            <Tooltip content={<ChartTooltip />} />

            {/* Target portfolio — horizontal dashed line */}
            {targetPortfolioFull > 0 && (
              <ReferenceLine
                y={targetPortfolioFull}
                stroke="#94a3b8"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{ value: `Target  ${fmtAxis(targetPortfolioFull)}`, position: 'insideTopLeft', fontSize: 10, fill: '#6b7280' }}
              />
            )}

            {/* Retirement year — where contributions stop and drawdown begins */}
            {stopContributionsAtRetirement && retirementYear && retirementYear <= cutoff && (
              <ReferenceLine
                x={retirementYear}
                stroke="#f59e0b"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `Retire ${retirementYear}`, position: 'insideTopLeft', fontSize: 10, fill: '#d97706' }}
              />
            )}

            {/* FI crossover — portfolio hits target */}
            {fiYearWithoutCPF && fiYearWithoutCPF <= cutoff && (
              <ReferenceLine
                x={fiYearWithoutCPF}
                stroke="#16a34a"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `FI  ${fiYearWithoutCPF}`, position: 'top', fontSize: 10, fill: '#16a34a' }}
              />
            )}

            {/* Portfolio area */}
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio value"
              stroke="#22c55e"
              strokeWidth={2.5}
              fill="url(#pgGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>🟢 Green = portfolio value &nbsp;·&nbsp; — Grey dashed = FI target ({fmtAxis(targetPortfolioFull ?? 0)})</span>
        {stopContributionsAtRetirement && retirementYear && (
          <span>🟡 Amber = retirement (contributions stop, drawdown begins)</span>
        )}
      </div>
    </Card>
  );
}
