// ─── FI Model Logic ───────────────────────────────────────────────────────────
// SWR is configurable (default 4%). All projection series use monthly income
// as the Y-axis so the chart shows "passive income vs target income" directly.

const CURRENT_YEAR   = new Date().getFullYear();
const CPF_PAYOUT_AGE = 65;

// ─── CPF LIFE auto-estimate ────────────────────────────────────────────────────
const FRS_2025       = 213_000;   // Full Retirement Sum 2025
const FRS_GROWTH_PCT = 0.035;     // ~3.5% p.a. historical escalation
const PAYOUT_RATE    = 0.0073;    // ~0.73% of FRS → monthly payout

/**
 * Estimate CPF LIFE details for someone currently age `currentAge`.
 *
 * Returns:
 *   projectedFRS   — estimated FRS at age 55 (the "lock-in" point)
 *   monthlyPayout  — estimated monthly CPF LIFE payout from age 65
 *
 * Returns nulls/0 if age >= 55 (too late to meaningfully project from FRS growth).
 */
export function estimateCpfLifeDetails(currentAge) {
  if (!currentAge || currentAge >= 55) {
    return { projectedFRS: null, monthlyPayout: 0 };
  }
  const yearsTo55    = 55 - currentAge;
  const projectedFRS = FRS_2025 * Math.pow(1 + FRS_GROWTH_PCT, yearsTo55);
  const monthlyPayout = Math.round(projectedFRS * PAYOUT_RATE);
  return { projectedFRS: Math.round(projectedFRS), monthlyPayout };
}

/** Convenience wrapper — returns monthly CPF LIFE payout only. */
export function estimateCpfLifePayout(currentAge) {
  return estimateCpfLifeDetails(currentAge).monthlyPayout;
}

// ─── Simulation helpers ────────────────────────────────────────────────────────

/**
 * Year-by-year portfolio simulation to find how many years until target is reached.
 * Used only during the accumulation phase (before retirement / withdrawal).
 */
export function yearsToFI(currentPortfolio, annualContribution, targetPortfolio, annualReturnPct, maxYears = 60) {
  if (currentPortfolio >= targetPortfolio) return 0;
  const r = annualReturnPct / 100;
  let portfolio = currentPortfolio;
  for (let year = 1; year <= maxYears; year++) {
    portfolio = portfolio * (1 + r) + annualContribution;
    if (portfolio >= targetPortfolio) return year;
  }
  return null;
}

/**
 * Annual PMT required to grow `pv` to `targetFV` in `n` years at `annualReturnPct`.
 * Future-value-of-annuity solved for PMT:
 *   FV = PV×(1+r)^n + PMT × ((1+r)^n − 1) / r
 */
export function requiredAnnualSavings(pv, n, targetFV, annualReturnPct) {
  if (n <= 0) return null;
  const r = annualReturnPct / 100;
  const growthFactor = Math.pow(1 + r, n);
  const pvFutureValue = pv * growthFactor;
  if (pvFutureValue >= targetFV) return 0;
  if (r === 0) return (targetFV - pvFutureValue) / n;
  return ((targetFV - pvFutureValue) * r) / (growthFactor - 1);
}

// ─── Projection series (for chart) ────────────────────────────────────────────

/**
 * Build a year-by-year projection series.
 *
 * Y-axis is MONTHLY INCOME — this makes the chart read as
 * "passive income line rising to cross the target income line".
 *
 * Each data point:
 *   year, age, portfolio,
 *   portfolioIncome   — portfolio × SWR / 12  (changes after retirement)
 *   totalIncome       — portfolioIncome + CPF LIFE (steps up at 65)
 *   target            — target monthly income (constant)
 *
 * Withdrawal phase (when `stopContributionsAtRetirement` is true and age >= retirementAge):
 *   - No new contributions added
 *   - Portfolio is drawn down at (target income − CPF coverage) per year
 *   - CPF offsets some withdrawal from age 65 onwards
 *   - Portfolio is capped at 0 (can't go negative)
 *
 * @param {object} params
 */
export function buildProjectionSeries({
  investablePortfolio,
  annualContribution,
  targetMonthlyIncome,
  cpfLifePayout,           // total payout (already multiplied by cpfPersons)
  currentAge,
  annualReturnPct,
  swrPct = 4,
  retirementAge = null,
  stopContributionsAtRetirement = true,
  maxYears = 50,
}) {
  const swr = swrPct / 100;
  const r   = annualReturnPct / 100;

  const series = [];
  let portfolio = investablePortfolio;

  for (let y = 0; y <= maxYears; y++) {
    const age  = currentAge != null ? currentAge + y : null;
    const year = CURRENT_YEAR + y;

    const isRetired  = retirementAge != null && age != null && age >= retirementAge;
    const cpfActive  = age != null && age >= CPF_PAYOUT_AGE;
    const cpfMonthly = cpfActive ? (cpfLifePayout ?? 0) : 0;

    // Monthly passive income from portfolio at this moment
    const portfolioIncome = (portfolio * swr) / 12;
    const totalIncome     = portfolioIncome + cpfMonthly;

    series.push({
      year,
      age,
      portfolio: Math.round(portfolio),
      portfolioIncome: Math.round(portfolioIncome),
      totalIncome:     Math.round(totalIncome),
      target:          targetMonthlyIncome,
    });

    // ── Advance portfolio to next year ────────────────────────────────────
    if (stopContributionsAtRetirement && isRetired) {
      // Withdrawal phase: CPF covers part of expenses; rest comes from portfolio
      const annualWithdrawal = Math.max(0, targetMonthlyIncome - cpfMonthly) * 12;
      portfolio = Math.max(0, portfolio * (1 + r) - annualWithdrawal);
    } else {
      // Accumulation phase: full contributions continue
      portfolio = portfolio * (1 + r) + annualContribution;
    }
  }

  return series;
}

// ─── Main metrics computation ──────────────────────────────────────────────────

export function computeFIMetrics({
  investablePortfolio,
  targetMonthlyIncome,
  currentAge = null,
  retirementAge = null,
  annualSavings = 0,
  annualReturnPct = 6,
  cpfPersons = 1,
  swrPct = 4,
  stopContributionsAtRetirement = true,
}) {
  const swr = swrPct / 100;

  // ── Current passive income ────────────────────────────────────────────────
  const currentPassiveMonthly = (investablePortfolio * swr) / 12;
  const currentPassiveAnnual  = investablePortfolio * swr;

  // ── CPF LIFE estimate ─────────────────────────────────────────────────────
  const cpfDetails        = estimateCpfLifeDetails(currentAge);
  const cpfMonthlyPerPerson = cpfDetails.monthlyPayout;
  const estimatedFRS      = cpfDetails.projectedFRS;
  // Total payout (single or couple)
  const cpfLifePayout     = cpfMonthlyPerPerson * (cpfPersons ?? 1);

  // Partial metrics when target not set
  if (!targetMonthlyIncome) {
    return {
      investablePortfolio,
      currentPassiveMonthly,
      currentPassiveAnnual,
      targetMonthlyIncome: null,
      cpfLifePayout,
      cpfMonthlyPerPerson,
      estimatedFRS,
      swrPct,
      ready: false,
    };
  }

  const annualContribution = annualSavings ?? 0;

  // ── FI target portfolio (annual income / SWR) ─────────────────────────────
  const targetPortfolioFull = (targetMonthlyIncome * 12) / swr;

  // ── Monthly gap ───────────────────────────────────────────────────────────
  const fiGapMonthly = targetMonthlyIncome - currentPassiveMonthly;
  const alreadyFI    = fiGapMonthly <= 0;

  // ── Scenario A: pure accumulation, no CPF ────────────────────────────────
  const yearsA  = alreadyFI ? 0
    : yearsToFI(investablePortfolio, annualContribution, targetPortfolioFull, annualReturnPct);
  const fiYearA = yearsA != null ? CURRENT_YEAR + yearsA : null;

  // Implied FI age from current savings rate
  const impliedFIAge = currentAge != null && yearsA != null
    ? currentAge + yearsA
    : null;

  // ── Scenario B: with CPF LIFE (kicks in at 65) ───────────────────────────
  let yearsB = null, fiYearB = null, alreadyFIWithCPF = false;

  if (cpfLifePayout > 0 && currentAge != null) {
    if (currentAge >= CPF_PAYOUT_AGE) {
      const effectiveNeed  = Math.max(0, targetMonthlyIncome - cpfLifePayout);
      const targetWithCPF  = (effectiveNeed * 12) / swr;
      alreadyFIWithCPF     = investablePortfolio >= targetWithCPF;
      if (alreadyFIWithCPF) { yearsB = 0; fiYearB = CURRENT_YEAR; }
    }
    if (!alreadyFIWithCPF && yearsB === null) {
      const r = annualReturnPct / 100;
      let p = investablePortfolio;
      for (let y = 1; y <= 60; y++) {
        p = p * (1 + r) + annualContribution;
        const ageAtYear  = currentAge + y;
        const cpfActive  = ageAtYear >= CPF_PAYOUT_AGE;
        const effNeed    = cpfActive ? Math.max(0, targetMonthlyIncome - cpfLifePayout) : targetMonthlyIncome;
        const targetYear = (effNeed * 12) / swr;
        if (p >= targetYear) { yearsB = y; fiYearB = CURRENT_YEAR + y; break; }
      }
    }
  } else {
    yearsB = yearsA; fiYearB = fiYearA; alreadyFIWithCPF = alreadyFI;
  }

  const effectiveMonthlyNeedWithCPF = Math.max(0, targetMonthlyIncome - cpfLifePayout);
  const targetPortfolioWithCPF      = (effectiveMonthlyNeedWithCPF * 12) / swr;
  const cpfImpactYears              = yearsA != null && yearsB != null ? yearsA - yearsB : null;

  // ── Required annual savings to retire by target age ───────────────────────
  let requiredAnnualSavingsForAge = null;
  if (retirementAge != null && currentAge != null && retirementAge > currentAge) {
    const n = retirementAge - currentAge;
    const raw = requiredAnnualSavings(investablePortfolio, n, targetPortfolioFull, annualReturnPct);
    if (raw != null) requiredAnnualSavingsForAge = Math.max(0, Math.round(raw));
  }

  // ── Progress % ────────────────────────────────────────────────────────────
  const progressPct        = targetPortfolioFull > 0 ? Math.min(1, investablePortfolio / targetPortfolioFull) : 0;
  const progressPctWithCPF = targetPortfolioWithCPF > 0 ? Math.min(1, investablePortfolio / targetPortfolioWithCPF) : 0;

  // ── Projection series (income-based for chart) ────────────────────────────
  const projectionSeries = buildProjectionSeries({
    investablePortfolio,
    annualContribution,
    targetMonthlyIncome,
    cpfLifePayout,
    currentAge,
    annualReturnPct,
    swrPct,
    retirementAge,
    stopContributionsAtRetirement,
    maxYears: 50,
  });

  return {
    ready: true,
    investablePortfolio,
    currentPassiveMonthly,
    currentPassiveAnnual,
    targetMonthlyIncome,
    cpfLifePayout,
    cpfMonthlyPerPerson,
    estimatedFRS,
    swrPct,
    fiGapMonthly,
    alreadyFI,
    // Accumulation scenario (no CPF)
    targetPortfolioFull,
    yearsWithoutCPF: yearsA,
    fiYearWithoutCPF: fiYearA,
    impliedFIAge,
    progressPct,
    // With CPF LIFE
    effectiveMonthlyNeedWithCPF,
    targetPortfolioWithCPF,
    yearsWithCPF: yearsB,
    fiYearWithCPF: fiYearB,
    alreadyFIWithCPF,
    progressPctWithCPF,
    cpfImpactYears,
    // Linked inputs
    requiredAnnualSavingsForAge,
    // Settings echoed back for chart/display
    annualReturnPct,
    annualSavings: annualSavings ?? 0,
    cpfPersons: cpfPersons ?? 1,
    retirementAge,
    currentAge,
    stopContributionsAtRetirement,
    // Income-based chart data
    projectionSeries,
  };
}
