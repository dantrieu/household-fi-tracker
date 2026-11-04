import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import useStore, { selectors } from '../../store/useStore';
import { formatSGD, formatPct, formatFIYear } from '../../lib/format';
import Card from '../../components/ui/Card';

const REACHED_COLOR   = '#3b82f6'; // blue while in progress (matches the old bar)
const COMPLETE_COLOR  = '#22c55e'; // green once the target is reached
const REMAINING_COLOR = '#94a3b8'; // slate — readable in light and dark

function ProgressTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-600 tabular-nums">{formatSGD(value)}</p>
    </div>
  );
}

/** Donut showing how much of the FI target portfolio has been reached. */
function ProgressPie({ current, target, pct }) {
  const reached   = Math.min(current, target);
  const remaining = Math.max(0, target - current);
  const done      = pct >= 1;
  const reachedColor = done ? COMPLETE_COLOR : REACHED_COLOR;

  const data = [
    { name: 'Current portfolio', value: reached,   color: reachedColor },
    ...(remaining > 0 ? [{ name: 'Remaining to target', value: remaining, color: REMAINING_COLOR }] : []),
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-36 h-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%" cy="50%"
              innerRadius={44} outerRadius={64}
              startAngle={90} endAngle={-270}
              paddingAngle={remaining > 0 && reached > 0 ? 2 : 0}
              stroke="none"
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip content={<ProgressTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tabular-nums text-gray-900">{formatPct(pct)}</span>
          <span className="text-[11px] text-gray-400">of target</span>
        </div>
      </div>

      {/* Legend with amounts */}
      <div className="flex flex-col gap-2.5 text-sm min-w-0">
        <div className="flex items-start gap-2">
          <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: reachedColor }} />
          <div>
            <p className="text-xs text-gray-500">Current portfolio</p>
            <p className="font-semibold tabular-nums text-gray-900">{formatSGD(current)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: REMAINING_COLOR }} />
          <div>
            <p className="text-xs text-gray-500">Remaining to target</p>
            <p className="font-semibold tabular-nums text-gray-900">{formatSGD(remaining)}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 tabular-nums">Target {formatSGD(target)}</p>
      </div>
    </div>
  );
}

export default function FIScenarioPanel() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  if (!metrics.ready) {
    return (
      <Card title="FI Scenario">
        <p className="text-sm text-gray-400 text-center py-8">
          Fill in your target monthly income above to see your FI scenario.
        </p>
      </Card>
    );
  }

  const {
    investablePortfolio,
    targetPortfolioFull,
    targetPortfolioAtFI,
    applyInflation,
    inflationPct,
    progressPct,
    fiYearWithoutCPF,
    yearsWithoutCPF,
    fiGapMonthly,
    alreadyFI,
    annualReturnPct,
    annualSavings,
    swrPct,
    cpfLifePayout,
    fiYearWithCPF,
    cpfImpactYears,
  } = metrics;

  // When inflation is applied, show the nominal target at the projected FI year
  const displayTarget      = applyInflation && targetPortfolioAtFI ? targetPortfolioAtFI : targetPortfolioFull;
  const displayProgressPct = displayTarget > 0 ? Math.min(1, investablePortfolio / displayTarget) : 0;

  const currentYear = new Date().getFullYear();

  return (
    <Card
      title="FI Scenario"
      action={
        <span className="text-xs text-gray-400">
          {annualReturnPct}% return · {swrPct ?? 4}% SWR
        </span>
      }
    >
      <div className="flex flex-col gap-5">

        {/* ── FI Year ────────────────────────────────────────────────────────── */}
        <div className="flex items-end gap-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
              Projected FI Year
            </p>
            <p className="text-4xl font-bold text-gray-900 tabular-nums">
              {alreadyFI ? '🎉 Now' : fiYearWithoutCPF ? formatFIYear(fiYearWithoutCPF) : '> 40 yrs'}
            </p>
            {!alreadyFI && yearsWithoutCPF != null && (
              <p className="text-sm text-gray-500 mt-1">{yearsWithoutCPF} years from today</p>
            )}
          </div>

          {/* CPF LIFE bonus — shown inline if it accelerates the date */}
          {cpfImpactYears > 0 && fiYearWithCPF && (
            <div className="mb-1 flex flex-col items-start">
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                +CPF → {formatFIYear(fiYearWithCPF)} ({cpfImpactYears} yrs earlier)
              </span>
              <span className="text-xs text-gray-400 mt-1">Est. CPF LIFE {formatSGD(cpfLifePayout)}/mo from 65</span>
            </div>
          )}
        </div>

        {/* ── Portfolio progress ──────────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Portfolio progress to FI target</p>
          {displayTarget > 0 ? (
            <ProgressPie
              current={investablePortfolio}
              target={displayTarget}
              pct={displayProgressPct}
            />
          ) : (
            <p className="text-sm text-gray-400">Set a target income to see progress.</p>
          )}
        </div>

        {/* ── Monthly gap ─────────────────────────────────────────────────────── */}
        {!alreadyFI && fiGapMonthly != null && (
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex justify-between items-center text-sm">
            <span className="text-gray-500">Monthly income gap</span>
            <span className="font-semibold tabular-nums text-gray-900">
              {formatSGD(fiGapMonthly)} / mo
            </span>
          </div>
        )}

        {alreadyFI && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-800 font-medium">
            🎉 Your passive income already covers your target — you're FI!
          </div>
        )}

        {/* ── Note ────────────────────────────────────────────────────────────── */}
        <p className="text-xs text-gray-400 leading-relaxed">
          Target portfolio: <strong>{formatSGD(displayTarget)}</strong>
          {applyInflation && targetPortfolioAtFI && fiYearWithoutCPF
            ? ` (nominal at ${formatFIYear(fiYearWithoutCPF)}, ${inflationPct}% p.a. inflation applied · today's equivalent: ${formatSGD(targetPortfolioFull)})`
            : ` (${swrPct ?? 4}% SWR on today's income target)`}.
          Treat as directional guidance.
        </p>
      </div>
    </Card>
  );
}
