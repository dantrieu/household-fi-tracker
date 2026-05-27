import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/',           label: 'Net Worth' },
  { to: '/portfolio',  label: 'Portfolio' },
  { to: '/fi-forecast', label: 'FI Forecast' },
];

export default function NavBar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Brand */}
        <span className="font-semibold text-gray-900 tracking-tight text-sm">
          🏠 Household FI Tracker
        </span>

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
      </div>
    </header>
  );
}
