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

  const impliedFIAge          = metrics.impliedFIAge;
  const requiredAnnualSavings = metrics.requiredAnnualSavingsForAge;
  const stopAtRetirement      = fi.stop_contributions_at_retirement ?? true;

  return (
    <Card title="Inputs">
      <div className="flex flex-col gap-5">

        {/* ── Row 1: Target income + SWR ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <InputRow
            label="Target monthly passive income"
            hint="What you need per month in retirement (SGD)."
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

        {/* ── Row 2: Current age + Annual return ───────────────────────────── */}
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
            Changing either shows the consequence on the other in real-time.  */}
        <div className="rounded-xl border-2 border-green-100 bg-green-50/40 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
            ⟷ Linked — adjust either to see the trade-off
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
              <div className={[
                'mt-1 text-xs rounded px-2 py-1.5 leading-snug',
                impliedFIAge != null
                  ? 'bg-white border border-green-200 text-green-800'
                  : 'text-gray-400',
              ].join(' ')}>
                {impliedFIAge != null
                  ? <>→ FI at <strong>age {impliedFIAge}</strong></>
                  : '→ FI age: fill all inputs'}
              </div>
            </div>

            {/* Link icon */}
            <div className="flex items-center justify-center pt-5 text-green-400 text-lg select-none">⟷</div>

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
                  : '→ Required savings: fill all inputs'}
              </div>
            </div>
          </div>

          {/* Stop contributions toggle */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1 border-t border-green-100">
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
                  ? 'Chart shows portfolio drawn down at target income rate after retirement.'
                  : 'Chart assumes contributions continue indefinitely (optimistic scenario).'}
              </p>
            </div>
          </label>
        </div>

      </div>
    </Card>
  );
}
