import useStore, { selectors } from '../../store/useStore';
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

function NumberInput({ value, onChange, placeholder, min = 0, step = 1, prefix }) {
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
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        placeholder={placeholder}
        className={[
          'w-full border border-gray-300 rounded-md py-1.5 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
          prefix ? 'pl-8 pr-3' : 'px-3',
        ].join(' ')}
      />
    </div>
  );
}

export default function FIInputsPanel() {
  const fi           = useStore((s) => s.fi_settings);
  const setFiSetting = useStore((s) => s.setFiSetting);
  const state        = useStore();
  const metrics      = selectors.fiMetrics(state);
  const investable   = useStore((s) => {
    const cats = s.net_worth.categories;
    return Object.values(cats).reduce((sum, c) => sum + (c.investable ? c.value : 0), 0);
  });

  // Auto-calculated CPF LIFE payout (from fi.js estimateCpfLifePayout)
  const estimatedCpfPayout = metrics.cpfLifePayout ?? 0;

  return (
    <Card title="Inputs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Target monthly income */}
        <InputRow
          label="Target monthly passive income"
          hint="Your lifestyle target — what you need per month in retirement (SGD)."
        >
          <NumberInput
            value={fi.target_monthly_income_sgd}
            onChange={(v) => setFiSetting('target_monthly_income_sgd', v)}
            placeholder="e.g. 8000"
            step={500}
            prefix="S$"
          />
        </InputRow>

        {/* Current age */}
        <InputRow label="Current age">
          <NumberInput
            value={fi.current_age}
            onChange={(v) => setFiSetting('current_age', v)}
            placeholder="e.g. 35"
            min={18}
            step={1}
          />
        </InputRow>

        {/* CPF LIFE — persons selector */}
        <InputRow
          label="CPF LIFE — who's covered?"
          hint="Couple = both partners each get the estimated payout, doubling the CPF contribution."
        >
          <div className="flex gap-2">
            {[
              { value: 1, label: 'Single', icon: '👤' },
              { value: 2, label: 'Couple', icon: '👫' },
            ].map((opt) => {
              const active = (fi.cpf_persons ?? 1) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFiSetting('cpf_persons', opt.value)}
                  className={[
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium border transition-all',
                    active
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-green-400',
                  ].join(' ')}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </InputRow>

        {/* CPF LIFE auto-estimate (read-only) */}
        <InputRow
          label="CPF LIFE est. payout at 65"
          hint={
            fi.current_age && fi.current_age < 55
              ? `Auto-calculated per person. ${(fi.cpf_persons ?? 1) === 2 ? 'Couple total = 2×.' : 'Single.'} Only applies from age 65.`
              : 'Enter your current age above to auto-estimate.'
          }
        >
          <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-md px-3 py-1.5">
            <span className="text-sm text-gray-400">S$</span>
            <span className={`text-sm font-semibold tabular-nums ${estimatedCpfPayout > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
              {estimatedCpfPayout > 0 ? estimatedCpfPayout.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-gray-400 ml-auto">/mo · estimated</span>
          </div>
        </InputRow>

        {/* Target retirement age */}
        <InputRow label="Target retirement age">
          <NumberInput
            value={fi.target_retirement_age}
            onChange={(v) => setFiSetting('target_retirement_age', v)}
            placeholder="e.g. 55"
            min={18}
            step={1}
          />
        </InputRow>

        {/* Annual savings */}
        <InputRow
          label="Annual savings / contributions"
          hint="Total amount added to investable assets per year (SGD)."
        >
          <NumberInput
            value={fi.annual_savings_sgd}
            onChange={(v) => setFiSetting('annual_savings_sgd', v)}
            placeholder="e.g. 36000"
            step={1000}
            prefix="S$"
          />
        </InputRow>

        {/* Assumed annual return */}
        <InputRow
          label="Assumed annual return"
          hint="Nominal return rate for projection. Default 6% is a conservative long-run estimate."
        >
          <div className="relative">
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={fi.assumed_annual_return_pct ?? 6}
              onChange={(e) => setFiSetting('assumed_annual_return_pct', parseFloat(e.target.value) || 6)}
              className="w-full border border-gray-300 rounded-md px-3 pr-8 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
          </div>
        </InputRow>

      </div>

      {/* Current investable (read-only, from Net Worth) */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-500">Current investable portfolio (from Net Worth)</span>
        <span className="font-semibold tabular-nums text-gray-900">
          {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(investable)}
        </span>
      </div>
    </Card>
  );
}
