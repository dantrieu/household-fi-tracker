// ─── FI Model Logic ───────────────────────────────────────────────────────────
// Based on PRD Section 10 (Appendix — FI Model Logic)
// Safe Withdrawal Rate is configurable (default 4%).

const CURRENT_YEAR   = new Date().getFullYear();
const CPF_PAYOUT_AGE = 65;        // CPF LIFE starts at 65

// ─── CPF LIFE auto-estimate ────────────────────────────────────────────────────
const FRS_2025       = 213_000;   // Full Retirement Sum 2025
const FRS_GROWTH_PCT = 0.035;     // ~3.5% p.a. historical escalation
const PAYOUT_RATE    = 0.0073;    // ~0.73% of FRS → monthly payout

/**
 * Estimate monthly CPF LIFE payout at age 65 for someone currently age `currentAge`.
 * Returns 0 if age is unknown or already past 55.
 */
export function estimateCpfLifePayout(currentAge) {
  if (!currentAge || currentAge >= 55) return 0;
  const yearsTo55 = 55 - currentAge;
  const projectedFRS = FRS_2025 * Math.pow(1 + FRS_GROWTH_PCT, yearsTo55);
  return Math.round(projectedFRS * PAYOUT_RATE);
}

// ─── Simulation helpers ────────────────────────────────────────────────────────

/**
 * Simulate year-by-year portfolio growth until target is reached.
 * @returns {number|null}  Years to reach target, or null if not reached in maxYears
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
 * Annual savings (PMT) required to grow `pv` to `targetFV` in `n` years at `annualReturnPct`.
 * Uses the future-value-of-annuity formula solved for PMT:
 *   FV = PV×(1+r)^n + PMT × ((1+r)^n − 1) / r
 *   → PMT = (FV − PV×(1+r)^n) × r / ((1+r)^n − 1)
 *
 * @returns {number|null}  Required annual savings, or null if n ≤ 0 or already there
 */
export function requiredAnnualSavings(pv, n, targetFV, annualReturnPct) {
  if (n <= 0) return null;
  const r = annualReturnPct / 100;
  const growthFactor = Math.pow(1 + r, n);
  const pvFutureValue = pv * growthFactor;
  if (pvFutureValue >= targetFV) return 0; // already on track without savings
  if (r === 0) return (targetFV - pvFutureValue) / n;
  return ((targetFV - pvFutureValue) * r) / (growthFactor - 1);
}

// ─── Projection series (for chart) ────────────────────────────────────────────

/**
 * Build a year-by-year projection series for the chart.
 *
 * @param {object} params
 * @param {number} params.swrPct  Safe withdrawal rate, e.g. 4 for 4%
 * @returns {{ year, age, portfolio, targetWithoutCPF, targetWithCPF }[]}
 */
export function buildProjectionSeries({
  investablePortfolio,
  annualContribution,
  targetMonthlyIncome,
  cpfLifePayout,
  currentAge,
  annualReturnPct,
  swrPct = 4,
  maxYears = 60,
}) {
  const swr = swrPct / 100;
  const r   = annualReturnPct / 100;
  const targetFull = (targetMonthlyIncome * 12) / swr;
  const effectiveMonthlyNeedWithCPF = Math.max(0, targetMonthlyIncome - cpfLifePayout);
  const targetWithCPFValue = (effectiveMonthlyNeedWithCPF * 12) / swr;

  const series = [];
  let portfolio = investablePortfolio;

  for (let y = 0; y <= maxYears; y++) {
    const age  = currentAge ? currentAge + y : null;
    const year = CURRENT_YEAR + y;
    const cpfActive = age != null && age >= CPF_PAYOUT_AGE;

    series.push({
      year,
      age,
      portfolio: Math.round(portfolio),
      targetWithoutCPF: Math.round(targetFull),
      targetWithCPF: Math.round(cpfActive ? targetWithCPFValue : targetFull),
    });

    portfolio = portfolio * (1 + r) + annualContribution;
  }

  return series;
}

// ─── Main metrics computation ──────────────────────────────────────────────────

/**
 * Compute all FI metrics from current state values.
 *
 * @param {object} params
 * @param {number}      params.investablePortfolio
 * @param {number|null} params.targetMonthlyIncome
 * @param {number|null} params.currentAge
 * @param {number|null} params.retirementAge        Target retirement age (user input)
 * @param {number}      params.annualSavings
 * @param {number}      params.annualReturnPct
 * @param {number}      params.cpfPersons            1 = single, 2 = couple
 * @param {number}      params.swrPct               Safe withdrawal rate % (default 4)
 */
export function computeFIMetrics({
  investablePortfolio,
  targetMonthlyIncome,
  currentAge = null,
  retirementAge = null,
  annualSavings = 0,
  annualReturnPct = 6,
  cpfPersons = 1,
  swrPct = 4,
}) {
  const swr = swrPct / 100;

  // ── Current passive income (SWR on investable pool) ──────────────────────
  const currentPassiveMonthly = (investablePortfolio * swr) / 12;
  const currentPassiveAnnual  = investablePortfolio * swr;

  // Auto-estimate CPF LIFE payout based on age (kicks in at 65)
  const cpfLifePayout = estimateCpfLifePayout(currentAge) * (cpfPersons ?? 1);

  // If no target set yet, return partial metrics
  if (!targetMonthlyIncome) {
    return {
      investablePortfolio,
      currentPassiveMonthly,
      currentPassiveAnnual,
      targetMonthlyIncome: null,
      cpfLifePayout,
      swrPct,
      ready: false,
    };
  }

  const annualContribution = annualSavings ?? 0;

  // ── FI Target portfolio (annual income / SWR) ────────────────────────────
  const targetPortfolioFull = (targetMonthlyIncome * 12) / swr;

  // FI gap (monthly) — without CPF
  const fiGapMonthly = targetMonthlyIncome - currentPassiveMonthly;
  const alreadyFI    = fiGapMonthly <= 0;

  // ── Scenario A: without CPF ──────────────────────────────────────────────
  const yearsA = alreadyFI
    ? 0
    : yearsToFI(investablePortfolio, annualContribution, targetPortfolioFull, annualReturnPct);
  const fiYearA = yearsA != null ? CURRENT_YEAR + yearsA : null;

  // Implied FI age based on annual savings (scenario A)
  const impliedFIAge = (currentAge != null && yearsA != null)
    ? currentAge + yearsA
    : null;

  // ── Scenario B: with CPF LIFE (only applies from age 65) ─────────────────
  let yearsB = null;
  let fiYearB = null;
  let alreadyFIWithCPF = false;

  if (cpfLifePayout > 0 && currentAge != null) {
    if (currentAge >= CPF_PAYOUT_AGE) {
      const effectiveNeed = Math.max(0, targetMonthlyIncome - cpfLifePayout);
      const targetWithCPF = (effectiveNeed * 12) / swr;
      alreadyFIWithCPF = investablePortfolio >= targetWithCPF;
      if (alreadyFIWithCPF) { yearsB = 0; fiYearB = CURRENT_YEAR; }
    }

    if (!alreadyFIWithCPF && yearsB === null) {
      const r = annualReturnPct / 100;
      let portfolio = investablePortfolio;
      for (let y = 1; y <= 60; y++) {
        portfolio = portfolio * (1 + r) + annualContribution;
        const ageAtYear = currentAge + y;
        const cpfActive = ageAtYear >= CPF_PAYOUT_AGE;
        const effectiveNeed = cpfActive
          ? Math.max(0, targetMonthlyIncome - cpfLifePayout)
          : targetMonthlyIncome;
        const targetAtYear = (effectiveNeed * 12) / swr;
        if (portfolio >= targetAtYear) { yearsB = y; fiYearB = CURRENT_YEAR + y; break; }
      }
    }
  } else {
    yearsB = yearsA;
    fiYearB = fiYearA;
    alreadyFIWithCPF = alreadyFI;
  }

  // Effective need with CPF (for display)
  const effectiveMonthlyNeedWithCPF = Math.max(0, targetMonthlyIncome - cpfLifePayout);
  const targetPortfolioWithCPF = (effectiveMonthlyNeedWithCPF * 12) / swr;

  // ── CPF LIFE impact ──────────────────────────────────────────────────────
  const cpfImpactYears = (yearsA != null && yearsB != null) ? yearsA - yearsB : null;

  // ── Required savings to reach FI by target retirement age ───────────────
  let requiredAnnualSavingsForAge = null;
  if (retirementAge != null && currentAge != null && retirementAge > currentAge) {
    const n = retirementAge - currentAge;
    requiredAnnualSavingsForAge = requiredAnnualSavings(
      investablePortfolio, n, targetPortfolioFull, annualReturnPct
    );
    if (requiredAnnualSavingsForAge != null) {
      requiredAnnualSavingsForAge = Math.max(0, Math.round(requiredAnnualSavingsForAge));
    }
  }

  // ── Portfolio progress % ─────────────────────────────────────────────────
  const progressPct = targetPortfolioFull > 0
    ? Math.min(1, investablePortfolio / targetPortfolioFull)
    : 0;
  const progressPctWithCPF = targetPortfolioWithCPF > 0
    ? Math.min(1, investablePortfolio / targetPortfolioWithCPF)
    : 0;

  // ── Projection series (for chart) ────────────────────────────────────────
  const projectionSeries = buildProjectionSeries({
    investablePortfolio,
    annualContribution,
    targetMonthlyIncome,
    cpfLifePayout,
    currentAge,
    annualReturnPct,
    swrPct,
    maxYears: 40,
  });

  return {
    ready: true,
    investablePortfolio,
    currentPassiveMonthly,
    currentPassiveAnnual,
    targetMonthlyIncome,
    cpfLifePayout,
    swrPct,
    fiGapMonthly,
    alreadyFI,
    // Scenario A — without CPF
    targetPortfolioFull,
    yearsWithoutCPF: yearsA,
    fiYearWithoutCPF: fiYearA,
    impliedFIAge,
    progressPct,
    // Scenario B — with CPF LIFE from age 65
    effectiveMonthlyNeedWithCPF,
    targetPortfolioWithCPF,
    yearsWithCPF: yearsB,
    fiYearWithCPF: fiYearB,
    alreadyFIWithCPF,
    progressPctWithCPF,
    // Linked inputs inference
    requiredAnnualSavingsForAge,
    // Summary
    cpfImpactYears,
    annualReturnPct,
    annualSavings: annualSavings ?? 0,
    cpfPersons: cpfPersons ?? 1,
    // Chart data
    projectionSeries,
  };
}
