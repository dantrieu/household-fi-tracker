import useStore, { selectors } from '../../store/useStore';
import { formatSGD } from '../../lib/format';

function SummaryCard({ label, value, highlight = false, tooltip }) {
  return (
    <div
      className="rounded-xl border bg-white p-5 flex flex-col gap-1 border-gray-200"
      title={tooltip}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {formatSGD(value)}
      </p>
    </div>
  );
}

export default function SummaryCards() {
  const state = useStore();
  const total      = selectors.totalNetWorth(state);
  const investable = selectors.investableNetWorth(state);
  const exCpf      = selectors.netWorthExCpf(state);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SummaryCard
        label="Total Net Worth"
        value={total}
        highlight
        tooltip="Sum of all asset categories"
      />
      <SummaryCard
        label="Investable Net Worth"
        value={investable}
        tooltip="Assets flagged as investable — the pool used to generate passive income in FI Forecast"
      />
      <SummaryCard
        label="Net Worth ex-CPF"
        value={exCpf}
        tooltip="Total minus CPF — shows liquid wealth excluding retirement savings"
      />
    </div>
  );
}
