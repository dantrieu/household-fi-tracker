import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import { APP_VERSION, BUILD_DATE } from '../../version';

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
        <span className="text-[11px] text-gray-300 tabular-nums">
          v{APP_VERSION} · {BUILD_DATE}
        </span>
      </footer>
    </div>
  );
}
