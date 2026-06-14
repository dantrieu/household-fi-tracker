import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import SaveRestoreModal from '../SaveRestoreModal';
import { useDarkMode } from '../../hooks/useDarkMode';

const LINKS = [
  { to: '/',            label: 'Net Worth',  short: 'Net Worth'  },
  { to: '/portfolio',   label: 'Portfolio',  short: 'Portfolio'  },
  { to: '/fi-forecast', label: 'FI Forecast', short: 'FI'        },
];

export default function NavBar() {
  const [showCloud, setShowCloud] = useState(false);
  const [dark, setDark] = useDarkMode();

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 gap-2">

          {/* Brand — full on desktop, emoji only on mobile */}
          <span className="font-semibold text-gray-900 dark:text-gray-100 tracking-tight text-sm shrink-0">
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
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                  ].join(' ')
                }
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="px-2 py-1.5 rounded-md text-sm text-gray-500 dark:text-gray-400
                         hover:text-gray-800 dark:hover:text-gray-200
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {dark ? '☀️' : '🌙'}
            </button>

            {/* Save / Load — icon + label on desktop, icon only on mobile */}
            <button
              onClick={() => setShowCloud(true)}
              title="Save / Load data"
              className="px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium
                         bg-green-600 text-white hover:bg-green-700
                         transition-colors flex items-center gap-1 sm:gap-1.5"
            >
              💾
              <span className="hidden sm:inline">Save / Load</span>
            </button>
          </div>

        </div>
      </header>

      {showCloud && <SaveRestoreModal onClose={() => setShowCloud(false)} />}
    </>
  );
}
