import useStore, { selectors } from '../../store/useStore';
import { formatSGD, formatPct } from '../../lib/format';

function MetricCard({ label, value, sub, highlight = false, warn = false }) {
  return (
    <div className={[
      'rounded-xl border p-5 flex flex-col gap-1 bg-white',
      warn ? 'border-amber-200' : 'border-gray-200',
    ].join(' ')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${
        highlight ? 'text-green-600' : warn ? 'text-amber-700' : 'text-gray-900'
      }`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-gray-400">{sub}</p>
      )}
    </div>
  );
}

export default function FIMetricsCards() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  const {
    currentPassiveMonthly,
    currentPassiveAnnual,
    targetMonthlyIncome,
    fiGapMonthly,
    alreadyFI,
    fiYearWithoutCPF,
    yearsWithoutCPF,
    progressPct,
    ready,
  } = metrics;

  const currentYear = new Date().getFullYear();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Current passive income */}
      <MetricCard
        label="Current passive income"
        value={formatSGD(currentPassiveMonthly) + ' / mo'}
        sub={`${formatSGD(currentPassiveAnnual)} / year · 4% SWR on investable assets`}
        highlight
      />

      {/* FI Gap */}
      <MetricCard
        label="FI Gap (monthly)"
        value={!ready ? '—' : alreadyFI ? '🎉 Already FI!' : formatSGD(fiGapMonthly) + ' / mo'}
        sub={!ready
          ? 'Set target income to calculate'
          : alreadyFI
          ? 'Your passive income exceeds your target'
          : `Need ${formatSGD(targetMonthlyIncome)}/mo · have ${formatSGD(currentPassiveMonthly)}/mo`
        }
        warn={!ready}
      />

      {/* Projected FI year */}
      <MetricCard
        label="Projected FI year (no CPF)"
        value={
          !ready ? '—'
          : alreadyFI ? String(currentYear)
          : fiYearWithoutCPF ? String(fiYearWithoutCPF)
          : '> 60 yrs'
        }
        sub={
          !ready ? 'Set all inputs to project'
          : alreadyFI ? 'Already financially independent'
          : fiYearWithoutCPF
            ? `${yearsWithoutCPF} years · ${formatPct(progressPct)} of target portfolio reached`
            : 'Target not reachable with current inputs'
        }
      />
    </div>
  );
}
