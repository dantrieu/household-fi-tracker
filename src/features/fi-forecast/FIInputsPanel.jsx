import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
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
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        placeholder={placeholder}
        className={[
          'w-full border border-gray-300 rounded-md py-1.5 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
          prefix ? 'pl-8' : 'pl-3',
          suffix ? 'pr-8' : 'pr-3',
        ].join(' ')}
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
  const fi           = useStore((s) => s.fi_settings);
  const setFiSetting = useStore((s) => s.setFiSetting);
  const state        = useStore();
  const metrics      = selectors.fiMetrics(state);

  const estimatedCpfPayout       = metrics.cpfLifePayout ?? 0;
  const impliedFIAge              = metrics.impliedFIAge;          // from annual savings
  const requiredAnnualSavings     = metrics.requiredAnnualSavingsForAge; // from retirement age

  return (
    <Card title="Inputs">
      <div className="flex flex-col gap-5">

        {/* ── Row 1: Target income + SWR (directly linked) ─────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <InputRow
            label="Target monthly passive income"
            hint="What you need to live on per month in retirement (SGD)."
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
            hint="4% is the classic rule. Lower = more conservative target portfolio."
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

        {/* ── Row 2: Current age + CPF persons ─────────────────────────────── */}
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
            label="CPF LIFE — covered persons"
            hint="Couple doubles the est. payout."
          >
            <div className="flex gap-2">
              {[{ value: 1, label: '👤 Single' }, { value: 2, label: '👫 Couple' }].map((opt) => {
                const active = (fi.cpf_persons ?? 1) === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFiSetting('cpf_persons', opt.value)}
                    className={[
                      'flex-1 py-1.5 rounded-md text-sm font-medium border transition-all',
                      active
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-green-400',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </InputRow>
        </div>

        {/* ── Row 3: CPF LIFE payout (read-only, auto-calculated) ──────────── */}
        {fi.current_age && fi.current_age < 55 && (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500">
              Est. CPF LIFE payout at 65 {(fi.cpf_persons ?? 1) === 2 ? '(couple)' : '(single)'}
            </span>
            <span className="font-semibold tabular-nums text-gray-800">
              {estimatedCpfPayout > 0 ? `${formatSGD(estimatedCpfPayout)} / mo` : '—'}
            </span>
          </div>
        )}

        {/* ── Row 4: Assumed annual return ──────────────────────────────────── */}
        <InputRow
          label="Assumed annual return"
          hint="Nominal return for projection. 6% is a conservative long-run estimate."
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

        {/* ══ Linked: Retirement age ↔ Annual savings ══════════════════════════
            Changing either one shows the implication on the other in real-time. */}
        <div className="rounded-xl border-2 border-green-100 bg-green-50/40 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
            ⟷ Linked inputs — adjust either to see the trade-off
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">

            {/* Annual savings */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Annual savings / contributions
              </label>
              <NumberInput
                value={fi.annual_savings_sgd}
                onChange={(v) => setFiSetting('annual_savings_sgd', v)}
                placeholder="e.g. 36000"
                step={1000}
                prefix="S$"
              />
              {/* Implication: inferred FI age from this savings rate */}
              <div className={[
                'mt-1 text-xs rounded px-2 py-1.5 leading-snug',
                impliedFIAge != null
                  ? 'bg-white border border-green-200 text-green-800'
                  : 'text-gray-400',
              ].join(' ')}>
                {impliedFIAge != null
                  ? <>→ FI at <strong>age {impliedFIAge}</strong></>
                  : '→ FI age: set all inputs'}
              </div>
            </div>

            {/* Link icon */}
            <div className="flex items-center justify-center pt-6 text-green-400 text-lg select-none">
              ⟷
            </div>

            {/* Target retirement age */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Target retirement age
              </label>
              <NumberInput
                value={fi.target_retirement_age}
                onChange={(v) => setFiSetting('target_retirement_age', v)}
                placeholder="e.g. 55"
                min={18}
                step={1}
              />
              {/* Implication: required savings to hit FI by this age */}
              <div className={[
                'mt-1 text-xs rounded px-2 py-1.5 leading-snug',
                requiredAnnualSavings != null
                  ? 'bg-white border border-green-200 text-green-800'
                  : 'text-gray-400',
              ].join(' ')}>
                {requiredAnnualSavings != null
                  ? requiredAnnualSavings === 0
                    ? <>→ Already on track 🎉</>
                    : <>→ Need <strong>{formatSGD(requiredAnnualSavings)} / yr</strong></>
                  : '→ Required savings: set all inputs'}
              </div>
            </div>
          </div>

          <p className="text-xs text-green-700/70 leading-snug">
            Tip: raise annual savings to see your FI age drop. Lower your target age to see the savings required.
          </p>
        </div>

      </div>
    </Card>
  );
}
