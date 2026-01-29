import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MarketDetail } from './components/markets/MarketDetail';
import { DarkModeToggle } from './components/ui/DarkModeToggle';
import { BottomNav } from './components/ui/BottomNav';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { isDevelopment } from './lib/env';
import {
  LandingPage,
  HistoricalScoringPage,
  MarketsPage,
  TapePage,
  OrdersPage,
  TradesPage,
  PositionsPage,
  MarketSuggestionsPage,
  SettingsPage,
  AdminPage,
} from './pages';

const DEFAULT_TITLE = 'One Eye Open';

function getPageTitle(pathname: string): string {
  if (pathname === '/') return DEFAULT_TITLE;
  if (pathname === '/scoring') return 'Scoring | One Eye Open';
  if (pathname === '/markets' || pathname === '/markets/') return 'Markets | One Eye Open';
  if (pathname.startsWith('/markets/')) return 'Market | One Eye Open';
  if (pathname === '/tape') return 'Trade Tape | One Eye Open';
  if (pathname === '/orders') return 'Orders | One Eye Open';
  if (pathname === '/trades') return 'Trades | One Eye Open';
  if (pathname === '/positions') return 'Positions | One Eye Open';
  if (pathname === '/market-suggestions') return 'Market Suggestions | One Eye Open';
  if (pathname === '/settings') return 'Settings | One Eye Open';
  if (pathname === '/admin') return 'Admin | One Eye Open';
  return DEFAULT_TITLE;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = getPageTitle(location.pathname);
  }, [location.pathname]);

  async function handleLogout() {
    if (isDevelopment) {
      navigate('/');
      setMobileMenuOpen(false);
      return;
    }
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/"
                className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400 leading-none flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                One Eye Open
              </Link>
              {(user || isDevelopment) && (
                <>
                  <div className="hidden md:flex items-center gap-3 lg:gap-4">
                    {user?.view_scores && (
                      <Link to="/scoring" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/scoring' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Scoring</Link>
                    )}
                    <Link to="/markets" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname.startsWith('/markets') ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Markets</Link>
                    <Link to="/tape" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/tape' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Tape</Link>
                    <Link to="/orders" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/orders' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Orders</Link>
                    <Link to="/trades" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/trades' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Trades</Link>
                    <Link to="/positions" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/positions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Positions</Link>
                    {user?.view_market_creation && (
                      <Link to="/market-suggestions" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/market-suggestions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Market Suggestions</Link>
                    )}
                    {user?.admin && (
                      <Link to="/admin" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/admin' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Admin</Link>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <DarkModeToggle />
              {(user || isDevelopment) ? (
                <>
                  <div className="hidden md:flex items-center gap-3 lg:gap-4">
                    <Link to="/settings" className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${location.pathname === '/settings' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>{user?.username || 'User'}</Link>
                    {!isDevelopment && (
                      <button onClick={handleLogout} className="text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center">Logout</button>
                    )}
                  </div>
                  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Toggle menu">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                    </svg>
                  </button>
                </>
              ) : (
                <Link to="/" className="text-sm hover:text-primary-600 dark:hover:text-primary-400">Login</Link>
              )}
            </div>
          </div>
          {(user || isDevelopment) && mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-300 dark:border-gray-700 py-3 space-y-2">
              {user?.view_scores && (
                <Link to="/scoring" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/scoring' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Scoring</Link>
              )}
              <Link to="/markets" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname.startsWith('/markets') ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Markets</Link>
              <Link to="/tape" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/tape' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Tape</Link>
              <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/orders' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Orders</Link>
              <Link to="/trades" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/trades' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Trades</Link>
              <Link to="/positions" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/positions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Positions</Link>
              {user?.view_market_creation && (
                <Link to="/market-suggestions" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/market-suggestions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Market Suggestions</Link>
              )}
              {user?.admin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/admin' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>Admin</Link>
              )}
              <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${location.pathname === '/settings' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>{user?.username || 'User'}</Link>
              {!isDevelopment && (
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400">Logout</button>
              )}
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 pb-20 md:pb-4 sm:pb-6 lg:pb-8">{children}</main>
      {(user || isDevelopment) && <BottomNav />}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (isDevelopment) {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary onRetry={() => window.location.reload()}>
        <AuthProvider>
          <Layout>
            <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/scoring" element={<ProtectedRoute><HistoricalScoringPage /></ProtectedRoute>} />
          <Route path="/markets" element={<ProtectedRoute><MarketsPage /></ProtectedRoute>} />
          <Route path="/markets/:id" element={<ProtectedRoute><MarketDetail /></ProtectedRoute>} />
          <Route path="/tape" element={<ProtectedRoute><TapePage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/trades" element={<ProtectedRoute><TradesPage /></ProtectedRoute>} />
          <Route path="/positions" element={<ProtectedRoute><PositionsPage /></ProtectedRoute>} />
          <Route path="/market-suggestions" element={<ProtectedRoute><MarketSuggestionsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          </Routes>
          </Layout>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
