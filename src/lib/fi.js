// ─── FI Model Logic (base model) ──────────────────────────────────────────────
// Based on PRD Section 10 (Appendix — FI Model Logic)
// Uses 4% Safe Withdrawal Rate applied to the investable asset pool only.

const CURRENT_YEAR   = new Date().getFullYear();
const CPF_PAYOUT_AGE = 65;        // CPF LIFE starts at 65

// ─── CPF LIFE auto-estimate ────────────────────────────────────────────────────
// Approximation: FRS 2025 ($213,000) grows at 3.5% p.a. to age 55,
// then CPF LIFE pays out ≈ 0.73% of ERS/FRS monthly.
// This is a directional estimate — actual payout depends on CPF balance,
// escalation elections, and policy changes.

const FRS_2025       = 213_000;   // Full Retirement Sum 2025
const FRS_GROWTH_PCT = 0.035;     // ~3.5% p.a. historical escalation
const PAYOUT_RATE    = 0.0073;    // ~0.73% of FRS → monthly payout

/**
 * Estimate monthly CPF LIFE payout at age 65 for someone currently age `currentAge`.
 * Returns 0 if age is unknown or already past 55 (too late to project from FRS).
 *
 * @param {number|null} currentAge
 * @returns {number}  Estimated monthly payout (SGD)
 */
export function estimateCpfLifePayout(currentAge) {
  if (!currentAge || currentAge >= 55) return 0;
  const yearsTo55 = 55 - currentAge;
  const projectedFRS = FRS_2025 * Math.pow(1 + FRS_GROWTH_PCT, yearsTo55);
  return Math.round(projectedFRS * PAYOUT_RATE);
}

// ─── Simulation ────────────────────────────────────────────────────────────────

/**
 * Simulate year-by-year portfolio growth until target is reached.
 * @param {number} currentPortfolio  Starting investable portfolio (SGD)
 * @param {number} annualContribution  Annual savings added (SGD)
 * @param {number} targetPortfolio  Portfolio size needed for FI (SGD)
 * @param {number} annualReturnPct  Assumed annual return, e.g. 6 for 6%
 * @param {number} maxYears  Cap to avoid infinite loop (default 60)
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
  return null; // not reachable within maxYears
}

/**
 * Build a year-by-year projection series for the chart.
 * Returns an array of data points, one per year for up to maxYears.
 *
 * Each point:
 *   { year, age, portfolio, targetWithoutCPF, targetWithCPF }
 *
 * The CPF-offset target (targetWithCPF) steps DOWN once the person turns 65,
 * because CPF LIFE then covers part of the income need.
 *
 * @param {object} params
 * @returns {{ year, age, portfolio, targetWithoutCPF, targetWithCPF }[]}
 */
export function buildProjectionSeries({
  investablePortfolio,
  annualContribution,
  targetMonthlyIncome,
  cpfLifePayout,
  currentAge,
  annualReturnPct,
  maxYears = 60,
}) {
  const r = annualReturnPct / 100;
  const targetFull = (targetMonthlyIncome * 12) / 0.04;
  const effectiveMonthlyNeedWithCPF = Math.max(0, targetMonthlyIncome - cpfLifePayout);
  const targetWithCPF = (effectiveMonthlyNeedWithCPF * 12) / 0.04;

  const series = [];
  let portfolio = investablePortfolio;

  for (let y = 0; y <= maxYears; y++) {
    const age  = currentAge ? currentAge + y : null;
    const year = CURRENT_YEAR + y;
    // CPF LIFE reduces required portfolio only once user is ≥ 65
    const cpfActive = age != null && age >= CPF_PAYOUT_AGE;

    series.push({
      year,
      age,
      portfolio: Math.round(portfolio),
      targetWithoutCPF: Math.round(targetFull),
      targetWithCPF: Math.round(cpfActive ? targetWithCPF : targetFull),
    });

    // Grow portfolio for next year
    portfolio = portfolio * (1 + r) + annualContribution;
  }

  return series;
}

// ─── Main metrics computation ──────────────────────────────────────────────────

/**
 * Compute all FI metrics from current state values.
 *
 * @param {object} params
 * @param {number}  params.investablePortfolio   Current investable NW (SGD)
 * @param {number|null} params.targetMonthlyIncome  User's FI target (SGD/month)
 * @param {number|null} params.currentAge
 * @param {number|null} params.retirementAge       Target retirement age
 * @param {number|null} params.monthlySavings      Monthly contributions (SGD)
 * @param {number}  params.annualReturnPct        Assumed annual return %
 * @returns {object}  All derived FI metrics
 */
export function computeFIMetrics({
  investablePortfolio,
  targetMonthlyIncome,
  currentAge = null,
  retirementAge = null,
  annualSavings = 0,
  annualReturnPct = 6,
  cpfPersons = 1,           // 1 = single, 2 = couple (doubles CPF LIFE payout)
}) {
  // ── Current passive income (4% SWR on investable pool) ──────────────────
  const currentPassiveMonthly = (investablePortfolio * 0.04) / 12;
  const currentPassiveAnnual  = investablePortfolio * 0.04;

  // Auto-estimate CPF LIFE payout based on age (CPF LIFE kicks in at 65)
  // Multiply by cpfPersons so couples get 2× the payout
  const cpfLifePayout = estimateCpfLifePayout(currentAge) * (cpfPersons ?? 1);

  // If no target set yet, return partial metrics
  if (!targetMonthlyIncome) {
    return {
      investablePortfolio,
      currentPassiveMonthly,
      currentPassiveAnnual,
      targetMonthlyIncome: null,
      cpfLifePayout,
      ready: false,
    };
  }

  const annualContribution = annualSavings ?? 0;

  // ── FI Target portfolio (25× annual expenses = target × 12 / 4%) ────────
  const targetPortfolioFull = targetMonthlyIncome * 12 / 0.04; // without CPF

  // FI gap (monthly) — without CPF
  const fiGapMonthly = targetMonthlyIncome - currentPassiveMonthly;
  const alreadyFI    = fiGapMonthly <= 0;

  // ── Scenario A: without CPF ──────────────────────────────────────────────
  const yearsA = alreadyFI
    ? 0
    : yearsToFI(investablePortfolio, annualContribution, targetPortfolioFull, annualReturnPct);
  const fiYearA = yearsA != null ? CURRENT_YEAR + yearsA : null;

  // ── Scenario B: with CPF LIFE (only applies from age 65) ─────────────────
  // CPF LIFE reduces the required portfolio — but only counted once the user
  // is projected to be ≥65. We simulate year-by-year to find when portfolio
  // crosses the "age-aware" target line.
  let yearsB = null;
  let fiYearB = null;
  let alreadyFIWithCPF = false;

  if (cpfLifePayout > 0 && currentAge != null) {
    // Check if already FI considering CPF is already active (age ≥ 65)
    if (currentAge >= CPF_PAYOUT_AGE) {
      const effectiveNeed = Math.max(0, targetMonthlyIncome - cpfLifePayout);
      const targetWithCPF = (effectiveNeed * 12) / 0.04;
      alreadyFIWithCPF = investablePortfolio >= targetWithCPF;
      if (alreadyFIWithCPF) {
        yearsB = 0;
        fiYearB = CURRENT_YEAR;
      }
    }

    if (!alreadyFIWithCPF && yearsB === null) {
      // Year-by-year simulation where CPF kicks in at 65
      const r = annualReturnPct / 100;
      let portfolio = investablePortfolio;
      for (let y = 1; y <= 60; y++) {
        portfolio = portfolio * (1 + r) + annualContribution;
        const ageAtYear = currentAge + y;
        const cpfActive = ageAtYear >= CPF_PAYOUT_AGE;
        const effectiveNeed = cpfActive
          ? Math.max(0, targetMonthlyIncome - cpfLifePayout)
          : targetMonthlyIncome;
        const targetAtYear = (effectiveNeed * 12) / 0.04;
        if (portfolio >= targetAtYear) {
          yearsB = y;
          fiYearB = CURRENT_YEAR + y;
          break;
        }
      }
    }
  } else {
    // No CPF or unknown age — scenario B same as A
    yearsB = yearsA;
    fiYearB = fiYearA;
    alreadyFIWithCPF = alreadyFI;
  }

  // Effective need with CPF active (for display)
  const effectiveMonthlyNeedWithCPF = Math.max(0, targetMonthlyIncome - cpfLifePayout);
  const targetPortfolioWithCPF = (effectiveMonthlyNeedWithCPF * 12) / 0.04;

  // ── CPF LIFE impact ──────────────────────────────────────────────────────
  const cpfImpactYears = (yearsA != null && yearsB != null) ? yearsA - yearsB : null;

  // ── Years to retirement age (optional) ──────────────────────────────────
  const yearsToRetirement = (currentAge && retirementAge)
    ? Math.max(0, retirementAge - currentAge)
    : null;

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
    maxYears: 40,
  });

  return {
    ready: true,
    investablePortfolio,
    currentPassiveMonthly,
    currentPassiveAnnual,
    targetMonthlyIncome,
    cpfLifePayout,
    fiGapMonthly,
    alreadyFI,
    // Scenario A — without CPF
    targetPortfolioFull,
    yearsWithoutCPF: yearsA,
    fiYearWithoutCPF: fiYearA,
    progressPct,
    // Scenario B — with CPF LIFE from age 65
    effectiveMonthlyNeedWithCPF,
    targetPortfolioWithCPF,
    yearsWithCPF: yearsB,
    fiYearWithCPF: fiYearB,
    alreadyFIWithCPF,
    progressPctWithCPF,
    // Summary
    cpfImpactYears,
    yearsToRetirement,
    annualReturnPct,
    annualSavings: annualSavings ?? 0,
    cpfPersons: cpfPersons ?? 1,
    // Chart data
    projectionSeries,
  };
}
