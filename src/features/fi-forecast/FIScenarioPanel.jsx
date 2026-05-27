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

function ScenarioCard({ title, badge, color, metrics }) {
  const {
    targetPortfolio,
    currentPortfolio,
    progressPct,
    fiYear,
    years,
    gapMonthly,
    alreadyFI,
    note,
  } = metrics;

  return (
    <div className={`rounded-xl border-2 ${color} p-5 flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {badge}
          </span>
        )}
      </div>

      {/* FI Year */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Projected FI Year</p>
        <p className="text-3xl font-bold text-gray-900 tabular-nums">
          {alreadyFI ? '🎉 Now' : fiYear ? String(fiYear) : '> 60 yrs'}
        </p>
        {!alreadyFI && years != null && (
          <p className="text-sm text-gray-500 mt-0.5">{years} years from today</p>
        )}
      </div>

      {/* Portfolio target */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Portfolio progress</span>
          <span className="tabular-nums">{formatSGD(currentPortfolio)} / {formatSGD(targetPortfolio)}</span>
        </div>
        <ProgressBar pct={progressPct} color={progressPct >= 1 ? 'bg-green-500' : 'bg-blue-400'} />
        <p className="text-xs text-gray-400 mt-1 text-right">{formatPct(progressPct)} of target</p>
      </div>

      {/* Monthly gap */}
      {!alreadyFI && gapMonthly != null && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
          <span className="text-gray-500">Monthly gap: </span>
          <span className="font-semibold tabular-nums text-gray-900">{formatSGD(gapMonthly)}/mo</span>
        </div>
      )}

      {/* Note */}
      {note && <p className="text-xs text-gray-400 leading-snug">{note}</p>}
    </div>
  );
}

export default function FIScenarioPanel() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  if (!metrics.ready) {
    return (
      <Card title="Scenarios — With vs Without CPF">
        <p className="text-sm text-gray-400 text-center py-6">
          Fill in your target monthly income above to see FI scenarios.
        </p>
      </Card>
    );
  }

  const {
    investablePortfolio,
    targetPortfolioFull,
    targetPortfolioWithCPF,
    progressPct,
    progressPctWithCPF,
    fiYearWithoutCPF,
    fiYearWithCPF,
    yearsWithoutCPF,
    yearsWithCPF,
    fiGapMonthly,
    effectiveMonthlyNeedWithCPF,
    alreadyFI,
    alreadyFIWithCPF,
    cpfLifePayout,
    cpfImpactYears,
    annualSavings,
    annualReturnPct,
  } = metrics;

  return (
    <Card
      title="Scenarios — With vs Without CPF"
      action={
        <span className="text-xs text-gray-400">
          {annualReturnPct}% assumed return · {formatSGD(annualSavings)}/yr savings
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Scenario A: Without CPF */}
        <ScenarioCard
          title="Without CPF"
          color="border-gray-200"
          metrics={{
            targetPortfolio: targetPortfolioFull,
            currentPortfolio: investablePortfolio,
            progressPct,
            fiYear: fiYearWithoutCPF,
            years: yearsWithoutCPF,
            gapMonthly: alreadyFI ? null : fiGapMonthly,
            alreadyFI,
            note: `Target: ${formatSGD(targetPortfolioFull)} portfolio (25× annual expenses)`,
          }}
        />

        {/* Scenario B: With CPF */}
        <ScenarioCard
          title="With CPF LIFE"
          badge={cpfImpactYears > 0 ? `${cpfImpactYears} yrs earlier` : undefined}
          color="border-green-300"
          metrics={{
            targetPortfolio: targetPortfolioWithCPF,
            currentPortfolio: investablePortfolio,
            progressPct: progressPctWithCPF,
            fiYear: fiYearWithCPF,
            years: yearsWithCPF,
            gapMonthly: alreadyFIWithCPF ? null : Math.max(0, effectiveMonthlyNeedWithCPF - (investablePortfolio * 0.04 / 12)),
            alreadyFI: alreadyFIWithCPF,
            note: cpfLifePayout > 0
              ? `Est. CPF LIFE payout: ${formatSGD(cpfLifePayout)}/mo from age 65. Reduces target portfolio by ${formatSGD(cpfLifePayout * 12 / 0.04)}.`
              : 'Enter your age in Inputs to auto-estimate CPF LIFE payout.',
          }}
        />
      </div>

      {/* CPF impact summary */}
      {cpfImpactYears != null && cpfImpactYears > 0 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          💚 CPF LIFE brings your FI date forward by <strong>{cpfImpactYears} year{cpfImpactYears !== 1 ? 's' : ''}</strong> — from {fiYearWithoutCPF} to {fiYearWithCPF}.
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 leading-relaxed">
        ⚠ Based on 4% SWR applied to investable assets. Does not adjust for inflation or sequence-of-returns risk.
        CPF LIFE payout applies from age 65 only. Treat projections as directional, not precise.
      </p>
    </Card>
  );
}
