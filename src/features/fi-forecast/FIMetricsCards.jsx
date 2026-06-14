import useStore, { selectors } from '../../store/useStore';
import { formatSGD, formatPct } from '../../lib/format';

function MetricCard({ label, value, sub, highlight = false, warn = false, muted = false }) {
  return (
    <div className={[
      'rounded-xl border p-4 flex flex-col gap-1 bg-white',
      warn      ? 'border-amber-200'
      : highlight ? 'border-green-200'
      : 'border-gray-200',
    ].join(' ')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-xl font-bold tabular-nums leading-tight ${
        highlight ? 'text-green-600'
        : warn      ? 'text-amber-700'
        : muted     ? 'text-gray-500'
        : 'text-gray-900'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 leading-snug mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FIMetricsCards() {
  const state   = useStore();
  const metrics = selectors.fiMetrics(state);

  const {
    investablePortfolio,
    currentPassiveMonthly,
    currentPassiveAnnual,
    targetMonthlyIncome,
    fiGapMonthly,
    alreadyFI,
    fiYearWithoutCPF,
    yearsWithoutCPF,
    progressPct,
    swrPct,
    targetPortfolioAtFI,
    applyInflation,
    inflationPct,
    ready,
  } = metrics;

  const currentYear = new Date().getFullYear();
  const fmtSGD = (v) =>
    new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* Card 1 — Investable Portfolio (foundation of everything) */}
      <MetricCard
        label="Investable portfolio"
        value={fmtSGD(investablePortfolio)}
        sub="Assets actively working toward FI"
        highlight
      />

      {/* Card 2 — Passive income generated at current SWR */}
      <MetricCard
        label={`Passive income (${swrPct ?? 4}% SWR)`}
        value={`${formatSGD(currentPassiveMonthly)} / mo`}
        sub={`${formatSGD(currentPassiveAnnual)} / yr from investable assets`}
      />

      {/* Card 3 — FI Gap */}
      <MetricCard
        label="FI gap (monthly)"
        value={
          !ready      ? '—'
          : alreadyFI ? '🎉 Reached!'
          : formatSGD(fiGapMonthly) + ' / mo'
        }
        sub={
          !ready      ? 'Set target income to calculate'
          : alreadyFI ? 'Passive income exceeds your target'
          : `Need ${formatSGD(targetMonthlyIncome)}/mo · have ${formatSGD(currentPassiveMonthly)}/mo`
        }
        warn={!ready}
        muted={alreadyFI}
      />

      {/* Card 4 — Projected FI year */}
      <MetricCard
        label="Projected FI year"
        value={
          !ready                ? '—'
          : alreadyFI           ? String(currentYear)
          : fiYearWithoutCPF    ? String(fiYearWithoutCPF)
          : '> 40 yrs'
        }
        sub={
          !ready      ? 'Fill in all inputs to project'
          : alreadyFI ? 'Already financially independent'
          : fiYearWithoutCPF
            ? [
                `${yearsWithoutCPF} yrs away · ${formatPct(progressPct)} of target`,
                applyInflation && targetPortfolioAtFI
                  ? `Target NW at FI: ${fmtSGD(targetPortfolioAtFI)} nominal (+${inflationPct}% p.a.)`
                  : null,
              ].filter(Boolean).join(' · ')
            : 'Increase savings or adjust return rate'
        }
      />
    </div>
  );
}
