import useStore, { selectors } from '../../store/useStore';
import PositionRow from './PositionRow';
import Card from '../../components/ui/Card';

export default function PositionsTable() {
  const state     = useStore();
  const positions = selectors.enrichedPositions(state);
  const totalSGD  = positions.reduce((s, p) => s + (p.valueSGD ?? 0), 0);

  if (positions.length === 0) {
    return (
      <Card title="Positions">
        <p className="text-sm text-gray-400 text-center py-6">
          No positions yet — add your first one above.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Positions" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-right">
              <th className="py-2 pl-4 pr-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Ticker / Company</th>
              <th className="py-2 px-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Exch</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Shares</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Value (SGD)</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Weight</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cost/share</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Unreal. P&L</th>
              <th className="py-2 pr-4 pl-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {positions.map((pos) => (
              <PositionRow key={pos.id} position={pos} totalSGD={totalSGD} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td colSpan={4} className="py-3 pl-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</td>
              <td className="py-3 px-2 text-right font-bold tabular-nums text-gray-900 text-sm">
                {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(totalSGD)}
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
