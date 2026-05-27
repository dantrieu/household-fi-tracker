import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import SaveRestoreModal from '../SaveRestoreModal';

const LINKS = [
  { to: '/',           label: 'Net Worth' },
  { to: '/portfolio',  label: 'Portfolio' },
  { to: '/fi-forecast', label: 'FI Forecast' },
];

export default function NavBar() {
  const [showCloud, setShowCloud] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

          {/* Brand */}
          <span className="font-semibold text-gray-900 tracking-tight text-sm">
            🏠 Household FI Tracker
          </span>

          <div className="flex items-center gap-2">
            {/* Module nav */}
            <nav className="flex gap-1">
              {LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    [
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Cloud save / restore */}
            <button
              onClick={() => setShowCloud(true)}
              title="Cloud Save / Restore (optional)"
              className="ml-2 px-3 py-1.5 rounded-md text-sm font-medium
                         bg-green-600 text-white hover:bg-green-700
                         transition-colors flex items-center gap-1.5 shadow-sm"
            >
              ☁️ <span className="text-xs">Cloud Save</span>
            </button>
          </div>
        </div>
      </header>

      {showCloud && <SaveRestoreModal onClose={() => setShowCloud(false)} />}
    </>
  );
}
