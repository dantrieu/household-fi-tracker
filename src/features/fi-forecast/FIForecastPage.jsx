import FIMetricsCards from './FIMetricsCards';
import FIInputsPanel from './FIInputsPanel';
import FIScenarioPanel from './FIScenarioPanel';
import FIProjectionChart from './FIProjectionChart';

export default function FIForecastPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">FI Forecast</h1>
        <p className="text-sm text-gray-500">
          Based on 4% SWR applied to your investable portfolio. Adjust inputs to explore scenarios.
        </p>
      </div>

      {/* Key metrics — update live as inputs change */}
      <FIMetricsCards />

      {/* Inputs + Scenarios side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FIInputsPanel />
        <FIScenarioPanel />
      </div>

      {/* Portfolio growth projection chart */}
      <FIProjectionChart />
    </div>
  );
}
