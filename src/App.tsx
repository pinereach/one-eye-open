import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { MarketList } from './components/markets/MarketList';
import { MarketDetail } from './components/markets/MarketDetail';
import { DarkModeToggle } from './components/ui/DarkModeToggle';

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
                Golf Trip Exchange
              </Link>
              {user && (
                <>
                  <Link
                    to="/markets"
                    className="text-sm hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Markets
                  </Link>
                  <Link
                    to="/export"
                    className="text-sm hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Export
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              {user ? (
                <>
                  <Link
                    to="/settings"
                    className="text-sm hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {user.username}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Logout
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
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}

function LandingPage() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/markets" replace />;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Golf Trip Exchange</h1>
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

function MarketsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Markets</h1>
      <MarketList />
    </div>
  );
}

function ExportPage() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const response = await api.exportTrades();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trades.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Export Data</h1>
      <div className="space-y-4">
        <button
          onClick={handleExport}
          disabled={loading}
          className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          Export Trades
        </button>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
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
            path="/export"
            element={
              <ProtectedRoute>
                <ExportPage />
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
