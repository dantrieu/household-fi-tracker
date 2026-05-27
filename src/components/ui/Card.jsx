/**
 * Generic white rounded card.
 *
 * Props:
 *   title      – optional header string
 *   action     – optional ReactNode placed in the top-right of the header
 *   padding    – 'default' (p-5) | 'none' (no padding, caller controls)
 *   className  – extra classes on the outer div
 */
export default function Card({ title, action, padding = 'default', className = '', children }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          {title && (
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {title}
            </h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={padding === 'none' ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
