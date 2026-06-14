import useStore, { selectors } from '../../store/useStore';
import { formatSGD, formatPct } from '../../lib/format';
import Card from '../../components/ui/Card';

function ProgressBar({ pct, color = 'bg-green-500' }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, (pct ?? 0) * 100).toFixed(1)}%` }}
      />
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
              {alreadyFI ? '🎉 Now' : fiYearWithoutCPF ? String(fiYearWithoutCPF) : '> 40 yrs'}
            </p>
            {!alreadyFI && yearsWithoutCPF != null && (
              <p className="text-sm text-gray-500 mt-1">{yearsWithoutCPF} years from today</p>
            )}
          </div>

          {/* CPF LIFE bonus — shown inline if it accelerates the date */}
          {cpfImpactYears > 0 && fiYearWithCPF && (
            <div className="mb-1 flex flex-col items-start">
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                +CPF → {fiYearWithCPF} ({cpfImpactYears} yrs earlier)
              </span>
              <span className="text-xs text-gray-400 mt-1">Est. CPF LIFE {formatSGD(cpfLifePayout)}/mo from 65</span>
            </div>
          )}
        </div>

        {/* ── Portfolio progress ──────────────────────────────────────────────── */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Portfolio progress to FI target</span>
            <span className="tabular-nums font-medium">
              {formatSGD(investablePortfolio)} / {formatSGD(displayTarget)}
            </span>
          </div>
          <ProgressBar
            pct={displayProgressPct}
            color={displayProgressPct >= 1 ? 'bg-green-500' : 'bg-blue-400'}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {formatPct(displayProgressPct)} of target reached
          </p>
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
            ? ` (nominal at ${fiYearWithoutCPF}, ${inflationPct}% p.a. inflation applied · today's equivalent: ${formatSGD(targetPortfolioFull)})`
            : ` (${swrPct ?? 4}% SWR on today's income target)`}.
          Treat as directional guidance.
        </p>
      </div>
    </Card>
  );
}
