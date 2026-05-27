import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import NetWorthPage from './features/net-worth/NetWorthPage';
import PortfolioPage from './features/portfolio/PortfolioPage';
import FIForecastPage from './features/fi-forecast/FIForecastPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,         element: <NetWorthPage /> },
      { path: 'portfolio',   element: <PortfolioPage /> },
      { path: 'fi-forecast', element: <FIForecastPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
