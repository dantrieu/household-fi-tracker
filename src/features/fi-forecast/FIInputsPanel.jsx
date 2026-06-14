import { NumericFormat } from 'react-number-format';
import useStore, { selectors } from '../../store/useStore';
import { yearsToFI, requiredAnnualSavings } from '../../lib/fi';
import Card from '../../components/ui/Card';

function InputRow({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 leading-snug">{hint}</p>}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder, min = 0, max, step = 1, prefix, suffix }) {
  const inputClass = [
    'w-full border border-gray-300 rounded-md py-1.5 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
    prefix ? 'pl-8' : 'pl-3',
    suffix ? 'pr-8' : 'pr-3',
  ].join(' ');

  // Dollar inputs: use NumericFormat for thousand-separator display
  if (prefix === 'S$') {
    return (
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          S$
        </span>
        <NumericFormat
          value={value ?? ''}
          onValueChange={(vals) => onChange(vals.floatValue ?? null)}
          thousandSeparator=","
          allowNegative={false}
          placeholder={placeholder}
          className={inputClass}
        />
      </div>
    );
  }

  // Non-dollar inputs (%, age): plain number input
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        placeholder={placeholder}
        className={inputClass}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export default function FIInputsPanel() {
  const fi               = useStore((s) => s.fi_settings);
  const setFiSetting     = useStore((s) => s.setFiSetting);
  const state            = useStore();
  const investablePortfolio = selectors.investableNetWorth(state);

  const stopAtRetirement = fi.stop_contributions_at_retirement ?? true;

  // Pre-compute FI target portfolio for live linkage
  const swr             = (fi.swr_pct ?? 4) / 100;
  const annualReturnPct = fi.assumed_annual_return_pct ?? 6;
  const r               = annualReturnPct / 100;
  const inf             = (fi.apply_inflation ?? true) ? (fi.inflation_rate_pct ?? 2.5) / 100 : 0;
  const targetPortfolio = fi.target_monthly_income_sgd
    ? (fi.target_monthly_income_sgd * 12) / swr
    : null;

  // ── Annual savings → auto-update retirement age ────────────────────────────
  function handleSavingsChange(newSavings) {
    setFiSetting('annual_savings_sgd', newSavings);
    if (newSavings != null && fi.target_monthly_income_sgd != null && fi.current_age != null) {
      let years = null;
      if (inf > 0) {
        // Inflation-aware: target NW rises each year — mirror computeFIMetrics Scenario A
        let p = investablePortfolio;
        for (let y = 1; y <= 60; y++) {
          p = p * (1 + r) + newSavings;
          if (p >= (fi.target_monthly_income_sgd * Math.pow(1 + inf, y) * 12) / swr) {
            years = y; break;
          }
        }
      } else {
        years = yearsToFI(investablePortfolio, newSavings, targetPortfolio, annualReturnPct);
      }
      if (years != null) {
        setFiSetting('target_retirement_age', Math.round(fi.current_age + years));
      }
    }
  }

  // ── Retirement age → auto-update annual savings ────────────────────────────
  function handleRetirementAgeChange(newAge) {
    setFiSetting('target_retirement_age', newAge);
    if (newAge != null && fi.current_age != null && newAge > fi.current_age && fi.target_monthly_income_sgd != null) {
      const n = newAge - fi.current_age;
      // When inflation is on, solve for the nominal target at year n
      const effectiveTarget = inf > 0
        ? (fi.target_monthly_income_sgd * Math.pow(1 + inf, n) * 12) / swr
        : targetPortfolio;
      const required = requiredAnnualSavings(investablePortfolio, n, effectiveTarget, annualReturnPct);
      if (required != null) {
        // Ceiling (not round) so savings always guarantee FI by the target year
        setFiSetting('annual_savings_sgd', Math.max(0, Math.ceil(required / 1000) * 1000));
      }
    }
  }

  // Inflation preview — show what today's target grows to by retirement year
  const previewYears = fi.target_retirement_age != null && fi.current_age != null
    ? Math.max(1, fi.target_retirement_age - fi.current_age) : null;
  const inflatedAtFI = previewYears && fi.target_monthly_income_sgd
    ? Math.round(fi.target_monthly_income_sgd * Math.pow(1 + (fi.inflation_rate_pct ?? 2.5) / 100, previewYears))
    : null;
  const fiYear = fi.current_age != null && fi.target_retirement_age != null
    ? new Date().getFullYear() + (fi.target_retirement_age - fi.current_age) : null;

  return (
    <Card title="Inputs">
      <div className="flex flex-col gap-5">

        {/* ── Target income + SWR ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <InputRow
            label="Target monthly passive income"
            hint="Enter in today's dollars — inflation is accounted for below."
          >
            <NumberInput
              value={fi.target_monthly_income_sgd}
              onChange={(v) => setFiSetting('target_monthly_income_sgd', v)}
              placeholder="e.g. 8000"
              step={500}
              prefix="S$"
            />
          </InputRow>

          <InputRow
            label="Safe withdrawal rate"
            hint="4% is the classic rule. Lower = larger required portfolio."
          >
            <NumberInput
              value={fi.swr_pct ?? 4}
              onChange={(v) => setFiSetting('swr_pct', v)}
              placeholder="4"
              min={1}
              max={10}
              step={0.5}
              suffix="%"
            />
          </InputRow>
        </div>

        {/* ── Inflation — tied to the target income above ─────────────────── */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/30 px-3.5 py-3 flex flex-col gap-2.5">
          <div className="flex items-start gap-4">
            <div className="w-36 flex-shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Inflation rate
              </label>
              <NumberInput
                value={fi.inflation_rate_pct ?? 2.5}
                onChange={(v) => setFiSetting('inflation_rate_pct', v)}
                min={0}
                max={20}
                step={0.5}
                suffix="%"
              />
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none mt-5">
              <input
                type="checkbox"
                checked={fi.apply_inflation ?? true}
                onChange={(e) => setFiSetting('apply_inflation', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600
                           focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
              />
              <div>
                <p className="text-xs font-medium text-gray-700">Account for inflation in projection</p>
                <p className="text-xs text-gray-400 leading-snug mt-0.5">
                  Show actual nominal amount needed at FI year
                </p>
              </div>
            </label>
          </div>
          <p className="text-xs text-gray-400 leading-snug">
            {(fi.apply_inflation ?? true) && inflatedAtFI
              ? `S$${(fi.target_monthly_income_sgd ?? 0).toLocaleString('en-SG')}/mo today → ~S$${inflatedAtFI.toLocaleString('en-SG')}/mo needed at ${fiYear ?? 'FI year'} (${fi.inflation_rate_pct ?? 2.5}% p.a.). Projection targets adjust each year.`
              : 'Target income stays flat in today\'s dollars throughout the projection.'}
          </p>
        </div>

        {/* ── Current age + Annual return ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <InputRow label="Current age">
            <NumberInput
              value={fi.current_age}
              onChange={(v) => setFiSetting('current_age', v)}
              placeholder="e.g. 36"
              min={18}
              step={1}
            />
          </InputRow>

          <InputRow
            label="Assumed annual return"
            hint="Nominal return for projection. 6% is a conservative estimate."
          >
            <NumberInput
              value={fi.assumed_annual_return_pct ?? 6}
              onChange={(v) => setFiSetting('assumed_annual_return_pct', parseFloat(v) || 6)}
              min={0}
              max={30}
              step={0.5}
              suffix="%"
            />
          </InputRow>
        </div>

        {/* ══ Linked: Annual savings ↔ Retirement age ════════════════════════
            Each field updates the other automatically.
            Savings ↑ → retirement age drops (reach target earlier).
            Retirement age ↓ → required savings rises.              */}
        <div className="rounded-xl border-2 border-green-100 bg-green-50/40 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
              ⟷ Linked
            </span>
            <span className="text-xs text-green-700/70">
              — changing either updates the other automatically
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

            {/* Annual savings */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Annual savings / contributions
              </label>
              <NumberInput
                value={fi.annual_savings_sgd}
                onChange={handleSavingsChange}
                placeholder="e.g. 36000"
                step={1000}
                prefix="S$"
              />
              <p className="text-[11px] text-green-700/70">↑ savings → retirement age drops</p>
            </div>

            {/* Link icon */}
            <div className="text-green-400 text-xl select-none mt-3">⟷</div>

            {/* Target retirement age */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Target retirement age
              </label>
              <NumberInput
                value={fi.target_retirement_age}
                onChange={handleRetirementAgeChange}
                placeholder="e.g. 55"
                min={18}
                step={1}
              />
              <p className="text-[11px] text-green-700/70">↓ age → savings required rises</p>
            </div>
          </div>

          {/* Stop contributions toggle */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none pt-2 border-t border-green-100">
            <input
              type="checkbox"
              checked={stopAtRetirement}
              onChange={(e) => setFiSetting('stop_contributions_at_retirement', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600
                         focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
            />
            <div>
              <p className="text-xs font-medium text-gray-700">
                Stop contributions &amp; begin withdrawal at retirement age
              </p>
              <p className="text-xs text-gray-400 leading-snug mt-0.5">
                {stopAtRetirement
                  ? 'Portfolio drawn down at target income rate after retirement (realistic).'
                  : 'Contributions assumed to continue past retirement (optimistic).'}
              </p>
            </div>
          </label>
        </div>

      </div>
    </Card>
  );
}
