import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import SaveRestoreModal from '../SaveRestoreModal';

const LINKS = [
  { to: '/',            label: 'Net Worth',  short: 'Net Worth'  },
  { to: '/portfolio',   label: 'Portfolio',  short: 'Portfolio'  },
  { to: '/fi-forecast', label: 'FI Forecast', short: 'FI'        },
];

export default function NavBar() {
  const [showCloud, setShowCloud] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 gap-2">

          {/* Brand — full on desktop, emoji only on mobile */}
          <span className="font-semibold text-gray-900 tracking-tight text-sm shrink-0">
            <span className="sm:hidden">🏠</span>
            <span className="hidden sm:inline">🏠 Household FI Tracker</span>
          </span>

          {/* Module nav */}
          <nav className="flex gap-0.5 sm:gap-1 overflow-x-auto">
            {LINKS.map(({ to, label, short }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
                  ].join(' ')
                }
              >
                {/* Shorter label on very small screens */}
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Save / Load — icon + label on desktop, icon only on mobile */}
          <button
            onClick={() => setShowCloud(true)}
            title="Save / Load data"
            className="shrink-0 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium
                       bg-green-600 text-white hover:bg-green-700
                       transition-colors flex items-center gap-1 sm:gap-1.5"
          >
            💾
            <span className="hidden sm:inline">Save / Load</span>
          </button>

        </div>
      </header>

      {showCloud && <SaveRestoreModal onClose={() => setShowCloud(false)} />}
    </>
  );
}
