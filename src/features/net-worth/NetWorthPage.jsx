import SummaryCards from './SummaryCards';
import AssetGrid from './AssetGrid';
import AssetAllocationChart from './AssetAllocationChart';
import SnapshotSection from './snapshots/SnapshotSection';

export default function NetWorthPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Net Worth</h1>
        <p className="text-sm text-gray-500">
          Track total, investable, and ex-CPF net worth. Click any value to edit it. Drag to reorder.
        </p>
      </div>

      {/* Three summary totals */}
      <SummaryCards />

      {/* Asset grid + pie chart side by side on md+ screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AssetGrid />
        </div>
        <div className="lg:col-span-1">
          <AssetAllocationChart />
        </div>
      </div>

      {/* Year-end snapshots + trend chart + history */}
      <SnapshotSection />
    </div>
  );
}
