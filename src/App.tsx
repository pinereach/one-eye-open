import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { MarketList } from './components/markets/MarketList';
import { MarketDetail } from './components/markets/MarketDetail';
import { ScoreEntry } from './components/scoring/ScoreEntry';
import { Scoreboard } from './components/scoring/Scoreboard';
import { LedgerView } from './components/ledger/LedgerView';
import { DarkModeToggle } from './components/ui/DarkModeToggle';
import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { Trip, Round } from './types';

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
                    to="/scoring"
                    className="text-sm hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Scoring
                  </Link>
                  <Link
                    to="/ledger"
                    className="text-sm hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Ledger
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
                    {user.display_name}
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

function TripDashboard() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id]);

  async function loadTrip() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getTrip(id);
      setTrip(data.trip);
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading trip...</div>;
  }

  if (!trip) {
    return <div className="text-center py-8">Trip not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{trip.name}</h1>
      <MarketList tripId={id} />
    </div>
  );
}

function ScoringPage() {
  const { user } = useAuth();
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRounds();
  }, []);

  async function loadRounds() {
    setLoading(true);
    try {
      const { rounds } = await api.getRounds();
      if (rounds) {
        setRounds(rounds);
        const active = rounds.find((r: Round) => r.is_active === 1);
        if (active) {
          setActiveRound(active);
        }
      }
    } catch (err) {
      console.error('Failed to load rounds:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scoring</h1>
      {activeRound && user && <ScoreEntry round={activeRound} onUpdate={loadRounds} />}
      <Scoreboard />
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

function LedgerPage() {
  return <LedgerView />;
}

function ExportPage() {
  const [tripId, setTripId] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExport(type: 'scores' | 'trades' | 'ledger') {
    setLoading(true);
    try {
      let response;
      if (type === 'scores') {
        response = await api.exportScores(tripId || undefined);
      } else if (type === 'trades') {
        response = await api.exportTrades(tripId || undefined);
      } else {
        response = await api.exportLedger(tripId || undefined);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
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
        <div>
          <label className="block text-sm font-medium mb-1">Trip ID (optional)</label>
          <input
            type="text"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            placeholder="Leave empty for all trips"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExport('scores')}
            disabled={loading}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Export Scores
          </button>
          <button
            onClick={() => handleExport('trades')}
            disabled={loading}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Export Trades
          </button>
          <button
            onClick={() => handleExport('ledger')}
            disabled={loading}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Export Ledger
          </button>
        </div>
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
              <span className="font-medium">Display Name:</span> {user.display_name}
            </div>
            <div>
              <span className="font-medium">Email:</span> {user.email}
            </div>
            <div>
              <span className="font-medium">Role:</span> {user.role}
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
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <TripDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scoring"
            element={
              <ProtectedRoute>
                <ScoringPage />
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
            path="/ledger"
            element={
              <ProtectedRoute>
                <LedgerPage />
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
