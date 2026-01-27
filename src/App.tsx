import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { MarketList } from './components/markets/MarketList';
import { MarketDetail } from './components/markets/MarketDetail';
import { DarkModeToggle } from './components/ui/DarkModeToggle';
import { api } from './lib/api';
import { format } from 'date-fns';
import { ToastContainer, useToast } from './components/ui/Toast';

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Feature flag: disable auth in development
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '8788' ||
                       window.location.port === '3000';

  async function handleLogout() {
    // Skip logout in development
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
                  {/* Desktop Navigation */}
                  <div className="hidden md:flex items-center gap-3 lg:gap-4">
                    <Link
                      to="/scoring"
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${
                        location.pathname === '/scoring' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                      }`}
                    >
                      Scoring
                    </Link>
                    <Link
                      to="/markets"
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${
                        location.pathname.startsWith('/markets') ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                      }`}
                    >
                      Markets
                    </Link>
                    <Link
                      to="/orders"
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${
                        location.pathname === '/orders' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                      }`}
                    >
                      Orders
                    </Link>
                    <Link
                      to="/trades"
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${
                        location.pathname === '/trades' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                      }`}
                    >
                      Trades
                    </Link>
                    <Link
                      to="/positions"
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${
                        location.pathname === '/positions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                      }`}
                    >
                      Positions
                    </Link>
                    <Link
                      to="/market-suggestions"
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${
                        location.pathname === '/market-suggestions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                      }`}
                    >
                      Market Suggestions
                    </Link>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <DarkModeToggle />
              {(user || isDevelopment) ? (
                <>
                  {/* Desktop User Menu */}
                  <div className="hidden md:flex items-center gap-3 lg:gap-4">
                    <Link
                      to="/settings"
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center ${
                        location.pathname === '/settings' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                      }`}
                    >
                      {user?.username || 'dev-user'}
                    </Link>
                    {!isDevelopment && (
                      <button
                        onClick={handleLogout}
                        className="text-sm hover:text-primary-600 dark:hover:text-primary-400 leading-none flex items-center"
                      >
                        Logout
                      </button>
                    )}
                  </div>
                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mobileMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>
                </>
              ) : (
                <Link
                  to="/"
                  className="text-sm hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
          {/* Mobile Menu */}
          {(user || isDevelopment) && mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-300 dark:border-gray-700 py-3 space-y-2">
              <Link
                to="/scoring"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                  location.pathname === '/scoring' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                }`}
              >
                Scoring
              </Link>
              <Link
                to="/markets"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                  location.pathname.startsWith('/markets') ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                }`}
              >
                Markets
              </Link>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                  location.pathname === '/orders' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                }`}
              >
                Orders
              </Link>
              <Link
                to="/trades"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                  location.pathname === '/trades' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                }`}
              >
                Trades
              </Link>
              <Link
                to="/positions"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                  location.pathname === '/positions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                }`}
              >
                Positions
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                  location.pathname === '/settings' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                }`}
                    >
                      {user?.username || 'User'}
                    </Link>
              {!isDevelopment && (
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">{children}</main>
    </div>
  );
}

function LandingPage() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();

  // Feature flag: disable auth in development
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '8788' ||
                       window.location.port === '3000';

  // In development, redirect to markets automatically
  if (isDevelopment) {
    return <Navigate to="/markets" replace />;
  }

  if (user) {
    return <Navigate to="/markets" replace />;
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">One Eye Open</h1>
      {showRegister ? (
        <RegisterForm
          onSuccess={() => navigate('/markets')}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      ) : (
        <LoginForm
          onSuccess={() => navigate('/markets')}
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
    </div>
  );
}

function HistoricalScoringPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Historical scoring data
  const historicalData = [
    { course: 'Harbour Town', year: 2022, Loop: 91, Boose: 99, Krass: 84, TK: 102, CTH: 99, Avayou: 97, Alex: 93, Huffman: 89, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Harbour Town', year: 2023, Loop: 89, Boose: 117, Krass: 81, TK: 91, CTH: 92, Avayou: 92, Alex: 96, Huffman: 87, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Harbour Town', year: 2024, Loop: 93, Boose: 113, Krass: 79, TK: 97, CTH: 99, Avayou: 97, Alex: 97, Huffman: null, Jon: 102, Tim: null, Doc: null, Will: null },
    { course: 'Harbour Town', year: 2025, Loop: 82, Boose: 115, Krass: 90, TK: 90, CTH: 92, Avayou: 96, Alex: 87, Huffman: null, Jon: 94, Tim: null, Doc: null, Will: null },
    { course: 'Heron Point', year: 2022, Loop: 83, Boose: 99, Krass: 86, TK: 97, CTH: 90, Avayou: 103, Alex: 93, Huffman: 89, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Heron Point', year: 2023, Loop: 90, Boose: 113, Krass: 83, TK: 93, CTH: 101, Avayou: 91, Alex: 93, Huffman: 97, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Heron Point', year: 2024, Loop: 78, Boose: 109, Krass: 86, TK: 109, CTH: 85, Avayou: 90, Alex: 88, Huffman: null, Jon: 110, Tim: null, Doc: null, Will: null },
    { course: 'Heron Point', year: 2025, Loop: 75, Boose: 104, Krass: 85, TK: 93, CTH: 93, Avayou: 85, Alex: 94, Huffman: null, Jon: 92, Tim: null, Doc: null, Will: null },
    { course: 'RTJ', year: 2022, Loop: 80, Boose: 105, Krass: 92, TK: 97, CTH: 97, Avayou: 97, Alex: 95, Huffman: 94, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'RTJ', year: 2023, Loop: 91, Boose: 117, Krass: 86, TK: 95, CTH: 88, Avayou: 90, Alex: 86, Huffman: 94, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'RTJ', year: 2024, Loop: 82, Boose: 105, Krass: 81, TK: 97, CTH: 93, Avayou: 94, Alex: 84, Huffman: null, Jon: 101, Tim: null, Doc: null, Will: null },
    { course: 'RTJ', year: 2025, Loop: 81, Boose: 113, Krass: 80, TK: 97, CTH: 96, Avayou: 93, Alex: 92, Huffman: null, Jon: 98, Tim: null, Doc: null, Will: null },
    { course: 'Fazio', year: 2022, Loop: 84, Boose: 104, Krass: 83, TK: 93, CTH: 99, Avayou: 86, Alex: 84, Huffman: 95, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Fazio', year: 2023, Loop: 78, Boose: 93, Krass: 87, TK: 83, CTH: 87, Avayou: 88, Alex: 89, Huffman: 90, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Fazio', year: 2024, Loop: 84, Boose: 108, Krass: 85, TK: 96, CTH: 97, Avayou: 94, Alex: 85, Huffman: null, Jon: 99, Tim: null, Doc: null, Will: null },
    { course: 'Fazio', year: 2025, Loop: 81, Boose: 112, Krass: 88, TK: 98, CTH: 92, Avayou: 87, Alex: 96, Huffman: null, Jon: 102, Tim: null, Doc: null, Will: null },
    { course: 'Hills', year: 2022, Loop: 89, Boose: 98, Krass: 79, TK: 100, CTH: 98, Avayou: 92, Alex: null, Huffman: null, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Hills', year: 2023, Loop: 77, Boose: 100, Krass: 78, TK: 94, CTH: 94, Avayou: 92, Alex: 87, Huffman: 87, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Hills', year: 2024, Loop: null, Boose: null, Krass: null, TK: null, CTH: null, Avayou: null, Alex: null, Huffman: null, Jon: null, Tim: null, Doc: null, Will: null },
    { course: 'Hills', year: 2025, Loop: null, Boose: null, Krass: null, TK: null, CTH: null, Avayou: null, Alex: null, Huffman: null, Jon: null, Tim: null, Doc: null, Will: null },
  ];

  const players = ['Loop', 'Boose', 'Krass', 'TK', 'CTH', 'Avayou', 'Alex', 'Huffman', 'Jon', 'Tim', 'Doc', 'Will'];
  const courses = Array.from(new Set(historicalData.map(d => d.course)));
  const years = Array.from(new Set(historicalData.map(d => d.year))).sort((a, b) => b - a);

  const filteredData = historicalData.filter(row => {
    if (selectedCourse !== 'all' && row.course !== selectedCourse) return false;
    if (selectedYear !== 'all' && row.year !== parseInt(selectedYear)) return false;
    return true;
  });

  // Calculate averages per player
  const playerAverages = players.map(player => {
    const scores = filteredData
      .map(row => row[player as keyof typeof row] as number)
      .filter(score => score !== null && score !== undefined) as number[];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { player, avg, count: scores.length };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Scoring</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Player Averages */}
      {filteredData.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-sm font-semibold mb-3">Average Scores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {playerAverages
              .filter(p => p.count > 0)
              .sort((a, b) => (a.avg || 0) - (b.avg || 0))
              .map(({ player, avg, count }) => (
                <div key={player} className="text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">{player}</div>
                  <div className="text-lg font-semibold">{avg?.toFixed(1)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">({count} rounds)</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">Course</th>
                <th className="py-3 px-2 sm:px-3 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Year</th>
                {players.map(player => (
                  <th key={player} className="py-3 px-2 sm:px-3 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[60px]">
                    {player}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={players.length + 2} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No data available for selected filters
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr
                    key={`${row.course}-${row.year}-${idx}`}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium sticky left-0 bg-white dark:bg-gray-900 z-10">
                      {row.course}
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center text-xs sm:text-sm">{row.year}</td>
                    {players.map(player => {
                      const score = row[player as keyof typeof row] as number | null;
                      return (
                        <td
                          key={player}
                          className={`py-3 px-2 sm:px-3 text-center text-xs sm:text-sm ${
                            score === null || score === undefined
                              ? 'text-gray-400 dark:text-gray-600'
                              : score < 85
                              ? 'text-green-600 dark:text-green-400 font-semibold'
                              : score < 95
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {score === null || score === undefined ? '—' : score}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarketsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Markets</h1>
      </div>
      <MarketList />
    </div>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const { orders } = await api.getAllOrders(100);
      setOrders(orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId: number) {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await api.cancelOrder(orderId);
      showToast('Order canceled successfully', 'success');
      // Reload orders to reflect the cancellation
      await loadOrders();
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      showToast(err.message || 'Failed to cancel order', 'error');
    }
  }

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;

  // Separate orders into active and completed
  const activeOrders = orders.filter(order => order.status === 'open' || order.status === 'partial');
  const completedOrders = orders.filter(order => order.status === 'filled' || order.status === 'canceled');

  const renderOrderRow = (order: any) => (
    <tr key={order.id} className="border-b border-gray-200 dark:border-gray-700">
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">
        {order.create_time ? format(new Date(order.create_time * 1000), 'MMM d, yyyy h:mm a') : '—'}
      </td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">{order.market_name || 'N/A'}</td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">{order.outcome_name || order.outcome}</td>
      <td className="py-3 px-3 sm:px-4 text-center">
        <span className={`text-xs sm:text-sm font-medium ${
          order.side === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {order.side === 0 ? 'Buy' : 'Sell'}
        </span>
      </td>
      <td className="py-3 px-3 sm:px-4 text-center font-medium text-xs sm:text-sm">
        {order.price ? formatPrice(order.price) : '—'}
      </td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">{order.contract_size || 0}</td>
      <td className="py-3 px-3 sm:px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className={`text-xs sm:text-sm px-2 py-1 rounded ${
            order.status === 'filled' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
            order.status === 'open' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
            order.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            {order.status}
          </span>
          {order.status === 'open' || order.status === 'partial' ? (
            <button
              onClick={() => handleCancelOrder(order.id)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs sm:text-sm font-bold px-1 py-1 rounded touch-manipulation"
              title="Cancel order"
              aria-label="Cancel order"
            >
              ×
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );

  const renderOrderTable = (orderList: any[], emptyMessage: string) => (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Time</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Market</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Outcome</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Side</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Price</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Size</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              orderList.map(renderOrderRow)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
      
      {/* Active Orders Section */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
          Active Orders
        </h2>
        {renderOrderTable(activeOrders, 'No active orders')}
      </div>

      {/* Completed Orders Section */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
          Order History
        </h2>
        {renderOrderTable(completedOrders, 'No completed orders')}
      </div>
    </div>
  );
}

function TradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrades();
  }, []);

  async function loadTrades() {
    setLoading(true);
    try {
      const { trades } = await api.getAllTrades(100);
      setTrades(trades);
    } catch (err) {
      console.error('Failed to load trades:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;
  const formatTotal = (price: number, contracts: number) => {
    const totalCents = price * contracts;
    return `$${Math.round(totalCents / 100)}`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading trades...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Trades</h1>
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600">
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Time</th>
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Market</th>
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Outcome</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Price</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Contracts</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap">
                    {trade.create_time ? format(new Date(trade.create_time * 1000), 'MMM d, h:mm a') : '—'}
                  </td>
                  <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm">
                    {trade.market_short_name || trade.market_id || '—'}
                  </td>
                  <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{trade.outcome_name || trade.outcome_ticker || '—'}</span>
                      {trade.outcome_ticker && trade.outcome_name && (
                        <span className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs">{trade.outcome_ticker}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 sm:px-3 text-right font-medium text-xs sm:text-sm">{formatPrice(trade.price)}</td>
                  <td className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm">{trade.contracts}</td>
                  <td className="py-3 px-2 sm:px-3 text-right font-medium text-xs sm:text-sm">{formatTotal(trade.price, trade.contracts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trades.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No trades found
          </div>
        )}
      </div>
    </div>
  );
}

function PositionsPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPositions();
  }, []);

  async function loadPositions() {
    setLoading(true);
    try {
      const { positions } = await api.getAllPositions();
      setPositions(positions);
    } catch (err) {
      console.error('Failed to load positions:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;
  const formatPriceBasis = (cents: number) => `$${(cents / 100).toFixed(1)}`;

  if (loading) {
    return <div className="text-center py-8">Loading positions...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Positions</h1>
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600">
                <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Market</th>
                <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Outcome</th>
                <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Net Position</th>
                <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Price Basis</th>
                <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Closed Profit</th>
                <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Settled Profit</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm">{position.market_name || 'N/A'}</td>
                  <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm">{position.outcome_name || position.outcome}</td>
                  <td className="py-3 px-3 sm:px-4 text-right font-medium text-xs sm:text-sm">{position.net_position}</td>
                  <td className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm">{formatPriceBasis(position.price_basis)}</td>
                  <td className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm">{formatPrice(position.closed_profit)}</td>
                  <td className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm">{formatPrice(position.settled_profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {positions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No positions found
          </div>
        )}
      </div>
    </div>
  );
}

function MarketSuggestionsPage() {
  const [shortName, setShortName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [maxWinners, setMaxWinners] = useState(1);
  const [minWinners, setMinWinners] = useState(1);
  const [outcomes, setOutcomes] = useState<Array<{ name: string; ticker: string; strike: string }>>([
    { name: '', ticker: '', strike: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const addOutcome = () => {
    if (outcomes.length < 12) {
      setOutcomes([...outcomes, { name: '', ticker: '', strike: '' }]);
    }
  };

  const removeOutcome = (index: number) => {
    if (outcomes.length > 1) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, field: 'name' | 'ticker' | 'strike', value: string) => {
    const updated = [...outcomes];
    updated[index] = { ...updated[index], [field]: value };
    setOutcomes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Filter out empty outcomes
    const validOutcomes = outcomes.filter(o => o.name.trim() && o.ticker.trim());

    if (validOutcomes.length === 0) {
      showToast('At least one outcome with name and ticker is required', 'error');
      setSubmitting(false);
      return;
    }

    try {
      await api.suggestMarket({
        short_name: shortName,
        symbol,
        max_winners: maxWinners,
        min_winners: minWinners,
        outcomes: validOutcomes.map(o => ({
          name: o.name.trim(),
          ticker: o.ticker.trim(),
          strike: o.strike.trim() || undefined,
        })),
      });

      showToast('Market suggestion submitted successfully!', 'success');
      // Reset form
      setShortName('');
      setSymbol('');
      setMaxWinners(1);
      setMinWinners(1);
      setOutcomes([{ name: '', ticker: '', strike: '' }]);
    } catch (err: any) {
      console.error('Failed to submit market suggestion:', err);
      showToast(err.message || 'Failed to submit market suggestion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h1 className="text-xl sm:text-2xl font-bold">Market Suggestions</h1>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
        Suggest a new market with up to 12 outcomes. Your suggestion will be reviewed and may be added to the platform.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Market Information */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Market Information</h2>
          
          <div>
            <label htmlFor="short_name" className="block text-sm font-medium mb-1.5">
              Market Name <span className="text-red-500">*</span>
            </label>
            <input
              id="short_name"
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
              placeholder="e.g., Team Champion"
            />
          </div>

          <div>
            <label htmlFor="symbol" className="block text-sm font-medium mb-1.5">
              Symbol <span className="text-red-500">*</span>
            </label>
            <input
              id="symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
              placeholder="e.g., TEAM"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="min_winners" className="block text-sm font-medium mb-1.5">
                Min Winners
              </label>
              <input
                id="min_winners"
                type="number"
                min="1"
                max="12"
                value={minWinners}
                onChange={(e) => setMinWinners(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
              />
            </div>
            <div>
              <label htmlFor="max_winners" className="block text-sm font-medium mb-1.5">
                Max Winners
              </label>
              <input
                id="max_winners"
                type="number"
                min="1"
                max="12"
                value={maxWinners}
                onChange={(e) => setMaxWinners(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Outcomes */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold">Outcomes</h2>
            {outcomes.length < 12 && (
              <button
                type="button"
                onClick={addOutcome}
                className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 touch-manipulation"
              >
                + Add Outcome
              </button>
            )}
          </div>

          <div className="space-y-3">
            {outcomes.map((outcome, index) => (
              <div key={index} className="bg-white dark:bg-gray-700 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Outcome {index + 1}
                  </span>
                  {outcomes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOutcome(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-bold touch-manipulation"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={outcome.name}
                      onChange={(e) => updateOutcome(index, 'name', e.target.value)}
                      required={index === 0}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm"
                      placeholder="Outcome name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">
                      Ticker <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={outcome.ticker}
                      onChange={(e) => updateOutcome(index, 'ticker', e.target.value)}
                      required={index === 0}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm"
                      placeholder="Ticker symbol"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5">
                      Strike (Optional)
                    </label>
                    <input
                      type="text"
                      value={outcome.strike}
                      onChange={(e) => updateOutcome(index, 'strike', e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm"
                      placeholder="Strike value"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium touch-manipulation"
          >
            {submitting ? 'Submitting...' : 'Submit Market Suggestion'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => navigate('/markets')}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition touch-manipulation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back to Markets</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
      {user && (
        <div className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Username:</span> {user.username}
            </div>
            <div>
              <span className="font-medium">User ID:</span> {user.id}
            </div>
          </div>
        </div>
      )}
      <div className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="flex items-center gap-4">
          <span>Dark Mode:</span>
          <DarkModeToggle />
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  // Feature flag: disable auth in development
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '8788' ||
                       window.location.port === '3000';

  // Skip auth check in development
  if (isDevelopment) {
    return <>{children}</>;
  }

  // Require auth in production
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
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/scoring"
            element={
              <ProtectedRoute>
                <HistoricalScoringPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/markets"
            element={
              <ProtectedRoute>
                <MarketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/markets/:id"
            element={
              <ProtectedRoute>
                <MarketDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades"
            element={
              <ProtectedRoute>
                <TradesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/positions"
            element={
              <ProtectedRoute>
                <PositionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/market-suggestions"
            element={
              <ProtectedRoute>
                <MarketSuggestionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
