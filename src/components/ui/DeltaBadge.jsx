import { formatDelta, formatDeltaPct } from '../../lib/format';

/**
 * Coloured badge showing absolute + percentage delta vs prior year.
 *
 * Props:
 *   delta     – number | null  (absolute SGD change)
 *   deltaPct  – number | null  (ratio, e.g. 0.083 = +8.3%)
 *   size      – 'sm' | 'md'
 */
export default function DeltaBadge({ delta, deltaPct, size = 'sm' }) {
  if (delta == null) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const positive = delta >= 0;
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-medium rounded-full px-2 py-0.5',
        textSize,
        positive
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-600',
      ].join(' ')}
    >
      <span>{positive ? '▲' : '▼'}</span>
      <span>{formatDelta(delta)}</span>
      {deltaPct != null && (
        <span className="opacity-70">({formatDeltaPct(deltaPct)})</span>
      )}
    </span>
  );
}
