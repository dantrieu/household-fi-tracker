import useStore from '../../store/useStore';
import FIMetricsCards from './FIMetricsCards';
import FIInputsPanel from './FIInputsPanel';
import FIScenarioPanel from './FIScenarioPanel';
import CPFLifePanel from './CPFLifePanel';
import FIProjectionChart from './FIProjectionChart';

export default function FIForecastPage() {
  const swrPct = useStore((s) => s.fi_settings.swr_pct ?? 4);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">FI Forecast</h1>
        <p className="text-sm text-gray-500">
          Passive income estimated at <strong>{swrPct}% SWR</strong> on your investable portfolio.
          Adjust inputs to explore your path to financial independence.
        </p>
      </div>

      {/* Key metrics — investable portfolio → passive income → gap → FI year */}
      <FIMetricsCards />

      {/* Projection inputs + FI scenario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FIInputsPanel />
        <FIScenarioPanel />
      </div>

      {/* CPF LIFE — separate section since it's a different income source (not portfolio-based) */}
      <CPFLifePanel />

      {/* Monthly passive income projection chart */}
      <FIProjectionChart />
    </div>
  );
}
