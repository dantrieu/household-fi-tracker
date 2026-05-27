import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';
import Card from '../../components/ui/Card';

export default function CPFLifePanel() {
  const fi           = useStore((s) => s.fi_settings);
  const setFiSetting = useStore((s) => s.setFiSetting);
  const state        = useStore();
  const metrics      = selectors.fiMetrics(state);

  const {
    estimatedFRS,
    cpfMonthlyPerPerson,
    cpfLifePayout,       // total (= perPerson × cpfPersons)
    cpfImpactYears,
    fiYearWithoutCPF,
    fiYearWithCPF,
  } = metrics;

  const persons       = fi.cpf_persons ?? 1;
  const currentAge    = fi.current_age;
  const isCouple      = persons === 2;
  const eligible      = currentAge != null && currentAge < 55;

  return (
    <Card title="CPF LIFE Estimate">
      <div className="flex flex-col gap-4">

        {/* ── Single / Couple toggle ──────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Who's covered by CPF LIFE?
          </label>
          <div className="flex gap-2">
            {[{ value: 1, label: '👤 Single' }, { value: 2, label: '👫 Couple' }].map((opt) => {
              const active = persons === opt.value;
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
          {isCouple && (
            <p className="text-xs text-gray-400">
              Couple total = 2× the per-person estimate.
            </p>
          )}
        </div>

        {/* ── Estimates ──────────────────────────────────────────────────── */}
        {!eligible ? (
          <div className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-3">
            {currentAge == null
              ? 'Enter your current age in Inputs to see CPF LIFE estimates.'
              : 'CPF LIFE estimates require current age below 55 (FRS lock-in at 55).'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">

            {/* FRS at 55 */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-gray-700">Est. FRS at age 55</p>
                <p className="text-xs text-gray-400">
                  Based on FRS 2025 ({formatSGD(213000)}) growing ~3.5%/yr
                </p>
              </div>
              <span className="font-bold tabular-nums text-gray-900">
                {estimatedFRS != null ? formatSGD(estimatedFRS) : '—'}
              </span>
            </div>

            {/* Monthly payout per person */}
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-blue-800">Est. CPF LIFE payout at 65</p>
                <p className="text-xs text-blue-600/70">
                  ~0.73% of FRS per month · per person
                </p>
              </div>
              <span className="font-bold tabular-nums text-blue-800">
                {cpfMonthlyPerPerson > 0 ? `${formatSGD(cpfMonthlyPerPerson)} / mo` : '—'}
              </span>
            </div>

            {/* Total for couple (if applicable) */}
            {isCouple && cpfLifePayout > 0 && (
              <div className="flex items-center justify-between border border-blue-200 bg-blue-50/50 rounded-lg px-3 py-2.5 text-sm">
                <p className="text-blue-700 font-medium">Couple total payout</p>
                <span className="font-bold tabular-nums text-blue-800">
                  {formatSGD(cpfLifePayout)} / mo
                </span>
              </div>
            )}

            {/* Impact on passive income */}
            {cpfLifePayout > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-800">
                <p className="font-medium mb-0.5">
                  → Adds <strong>{formatSGD(cpfLifePayout)}/mo</strong> to passive income from age 65
                </p>
                {cpfImpactYears != null && cpfImpactYears > 0 && fiYearWithoutCPF && fiYearWithCPF && (
                  <p className="text-xs text-green-700/80">
                    Brings your FI date from {fiYearWithoutCPF} to {fiYearWithCPF}
                    &nbsp;(+{cpfImpactYears} yr{cpfImpactYears !== 1 ? 's' : ''} earlier).
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 leading-relaxed">
          ⚠ Directional estimate only. Actual payout depends on your CPF balance, plan chosen,
          escalation elections, and policy changes. Payout starts at age 65, not retirement.
        </p>
      </div>
    </Card>
  );
}
