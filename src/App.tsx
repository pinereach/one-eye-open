import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { MarketList } from './components/markets/MarketList';
import { MarketDetail } from './components/markets/MarketDetail';
import { DarkModeToggle } from './components/ui/DarkModeToggle';
import { BottomNav } from './components/ui/BottomNav';
import { Card, CardContent, CardHeader } from './components/ui/Card';
import { Skeleton, SkeletonCard, SkeletonTable } from './components/ui/Skeleton';
import { EmptyState } from './components/ui/EmptyState';
import { SwipeableCard } from './components/ui/SwipeableCard';
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
                      {user?.username || 'User'}
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
                to="/market-suggestions"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                  location.pathname === '/market-suggestions' ? 'text-primary-600 dark:text-primary-400 font-medium' : ''
                }`}
              >
                Market Suggestions
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
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 pb-20 md:pb-4 sm:pb-6 lg:pb-8">{children}</main>
      {(user || isDevelopment) && <BottomNav />}
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
  const [scores, setScores] = useState<Array<{ id: number; course: string; year: number; player: string; score: number | null; index_number: number | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [averagesExpanded, setAveragesExpanded] = useState(false);
  const [averagesByYearExpanded, setAveragesByYearExpanded] = useState(false);
  const [averagesByCourseExpanded, setAveragesByCourseExpanded] = useState(false);

  const players = ['Loop', 'Boose', 'Krass', 'TK', 'CTH', 'Avayou', 'Alex', 'Huffman', 'Jon', 'Tim', 'Doc', 'Will'];

  // Load scores from database
  useEffect(() => {
    loadScores();
  }, [selectedCourse, selectedYear]);

  async function loadScores() {
    setLoading(true);
    try {
      const { scores: scoresData } = await api.getScores(
        selectedCourse !== 'all' ? selectedCourse : undefined,
        selectedYear !== 'all' ? selectedYear : undefined
      );
      setScores(scoresData || []);
    } catch (err) {
      console.error('Failed to load scores:', err);
    } finally {
      setLoading(false);
    }
  }

  // Transform flat scores array into row-based format for display
  type RowData = {
    course: string;
    year: number;
    [player: string]: string | number | null | undefined;
  };

  const getRowData = (): RowData[] => {
    const rowMap = new Map<string, RowData>();
    
    scores.forEach(score => {
      const key = `${score.course}-${score.year}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, { course: score.course, year: score.year });
      }
      const row = rowMap.get(key)!;
      row[score.player] = score.score;
    });

    // Initialize all players to null for each row
    rowMap.forEach((row) => {
      players.forEach(player => {
        if (!(player in row)) {
          row[player] = null;
        }
      });
    });

    return Array.from(rowMap.values());
  };

  const historicalData = getRowData();
  const courses = Array.from(new Set(historicalData.map(d => d.course as string))).filter((c): c is string => typeof c === 'string');
  const years = Array.from(new Set(historicalData.map(d => d.year as number))).filter((y): y is number => typeof y === 'number').sort((a, b) => b - a);

  const filteredData = historicalData.filter(row => {
    if (selectedCourse !== 'all' && row.course !== selectedCourse) return false;
    if (selectedYear !== 'all' && row.year !== parseInt(selectedYear)) return false;
    return true;
  });

  // Calculate averages per player
  const playerAverages = players.map(player => {
    const scores = filteredData
      .map(row => row[player] as number | null)
      .filter(score => score !== null && score !== undefined) as number[];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { player, avg, count: scores.length };
  });

  // Average scores by year (all players)
  const averagesByYear = (() => {
    const byYear = new Map<number, number[]>();
    filteredData.forEach(row => {
      players.forEach(player => {
        const s = row[player] as number | null;
        if (s != null) {
          const year = row.year as number;
          if (!byYear.has(year)) byYear.set(year, []);
          byYear.get(year)!.push(s);
        }
      });
    });
    return Array.from(byYear.entries())
      .map(([year, scores]) => ({
        year,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => b.year - a.year);
  })();

  // Average scores by course (all players)
  const averagesByCourse = (() => {
    const byCourse = new Map<string, number[]>();
    filteredData.forEach(row => {
      const course = row.course as string;
      players.forEach(player => {
        const s = row[player] as number | null;
        if (s != null) {
          if (!byCourse.has(course)) byCourse.set(course, []);
          byCourse.get(course)!.push(s);
        }
      });
    });
    return Array.from(byCourse.entries())
      .map(([course, scores]) => ({
        course,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => a.course.localeCompare(b.course));
  })();

  const currentYear = new Date().getFullYear();
  const isHistoricalYear = (year: number) => year < currentYear;

  // Handler to update a score value (only current year is editable)
  const updateScore = async (course: string, year: number | null, player: string, value: string) => {
    if (year === null) return; // Can't update if year is null
    if (isHistoricalYear(year)) return; // Historical scores are read-only

    const numValue = value === '' ? null : parseInt(value, 10);
    if (isNaN(numValue as number) && value !== '') return; // Invalid input, don't update

    try {
      await api.updateScoreValue({
        course,
        year,
        player,
        score: numValue,
      });
      
      // Reload scores to get updated data
      await loadScores();
    } catch (err) {
      console.error('Failed to update score:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading scores...</div>;
  }

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
              <option key={course} value={String(course)}>{course}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation"
          >
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Player Averages - Collapsible */}
      {filteredData.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAveragesExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={averagesExpanded}
          >
            <h2 className="text-sm font-bold">Average Scores</h2>
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${averagesExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {averagesExpanded && (
            <div className="px-4 pb-4 pt-0">
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
        </div>
      )}

      {/* Average Scores by Year - Collapsible */}
      {filteredData.length > 0 && averagesByYear.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAveragesByYearExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={averagesByYearExpanded}
          >
            <h2 className="text-sm font-bold">Average Scores by Year</h2>
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${averagesByYearExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {averagesByYearExpanded && (
            <div className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {averagesByYear.map(({ year, avg, count }) => (
                  <div key={year} className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{year}</div>
                    <div className="text-lg font-semibold">{avg.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">({count} rounds)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Average Scores by Course - Collapsible */}
      {filteredData.length > 0 && averagesByCourse.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAveragesByCourseExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={averagesByCourseExpanded}
          >
            <h2 className="text-sm font-bold">Average Scores by Course</h2>
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${averagesByCourseExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {averagesByCourseExpanded && (
            <div className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {averagesByCourse.map(({ course, avg, count }) => (
                  <div key={course} className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{course}</div>
                    <div className="text-lg font-semibold">{avg.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">({count} rounds)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {filteredData.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="No Data Available"
            message="Try adjusting your filters to see more results."
          />
        ) : (
          filteredData.map((row, idx) => (
            <Card key={`${row.course}-${row.year}-${idx}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                    {row.course}
                  </h3>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {row.year}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {players.map(player => {
                    const score = row[player] as number | null;
                    return (
                      <div key={player} className="flex flex-col">
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {player}
                        </label>
                        <input
                          type="number"
                          value={score === null || score === undefined ? '' : score}
                          readOnly={isHistoricalYear(row.year as number)}
                          onChange={(e) => !isHistoricalYear(row.year as number) && updateScore(row.course, row.year as number, player, e.target.value)}
                          onBlur={(e) => {
                            if (!isHistoricalYear(row.year as number)) updateScore(row.course, row.year as number, player, e.target.value);
                          }}
                          className={`w-full text-center text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-2 min-h-[44px] ${
                            isHistoricalYear(row.year as number)
                              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-500 dark:text-gray-400'
                              : 'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ' + (
                            score === null || score === undefined
                              ? 'text-gray-400 dark:text-gray-600'
                              : score < 85
                              ? 'text-green-600 dark:text-green-400 font-semibold'
                              : score < 95
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-gray-100'
                          )}
                          `}
                          placeholder="—"
                          min="0"
                          max="200"
                          inputMode="numeric"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">Course</th>
                <th className="py-3 px-2 sm:px-3 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Year</th>
                {players.map(player => (
                  <th key={player} className="py-3 px-2 sm:px-3 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 min-w-[60px]">
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
                      const score = row[player] as number | null;
                      return (
                        <td
                          key={player}
                          className="py-1 px-1 sm:py-2 sm:px-2 text-center"
                        >
                          <input
                            type="number"
                            value={score === null || score === undefined ? '' : score}
                            readOnly={isHistoricalYear(row.year as number)}
                            onChange={(e) => !isHistoricalYear(row.year as number) && updateScore(row.course, row.year as number, player, e.target.value)}
                            onBlur={(e) => {
                              if (!isHistoricalYear(row.year as number)) updateScore(row.course, row.year as number, player, e.target.value);
                            }}
                            className={`w-full text-center text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded px-2 py-2 min-h-[44px] ${
                              isHistoricalYear(row.year as number)
                                ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-500 dark:text-gray-400'
                                : 'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ' + (
                              score === null || score === undefined
                                ? 'text-gray-400 dark:text-gray-600'
                                : score < 85
                                ? 'text-green-600 dark:text-green-400 font-semibold'
                                : score < 95
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-900 dark:text-gray-100'
                            )}
                            `}
                            placeholder="—"
                            min="0"
                            max="200"
                          />
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
  const formatPricePercent = (cents: number) => `${(cents / 100).toFixed(1)}%`;

  // Separate orders into active and completed
  const activeOrders = orders.filter(order => order.status === 'open' || order.status === 'partial');
  const completedOrders = orders.filter(order => order.status === 'filled' || order.status === 'canceled');

  async function handleCancelAll() {
    if (!confirm('Are you sure you want to cancel all open orders?')) {
      return;
    }

    try {
      const cancelPromises = activeOrders.map(order => api.cancelOrder(order.id));
      await Promise.all(cancelPromises);
      showToast('All orders canceled successfully', 'success');
      await loadOrders();
    } catch (err: any) {
      console.error('Failed to cancel orders:', err);
      showToast(err.message || 'Failed to cancel all orders', 'error');
    }
  }

  const renderOrderCard = (order: any) => {
    const isSell = order.side === 1;
    const orderType = isSell ? 'SELL ORDER' : 'BUY ORDER';
    // Match exact colors from image: yellow rgb(255, 204, 0) and green rgb(0, 204, 0)
    const orderTypeColor = isSell ? 'text-[#FFCC00]' : 'text-[#00CC00]';
    
    const originalSize = order.original_size !== undefined && order.original_size !== null 
      ? order.original_size 
      : order.contract_size || 0;
    const remainingSize = order.remaining_size !== undefined && order.remaining_size !== null 
      ? order.remaining_size 
      : (order.status === 'filled' ? 0 : originalSize);
    const filledSize = Math.max(0, originalSize - remainingSize);
    
    const pricePercent = order.price ? formatPricePercent(order.price) : '0.0%';
    const actionText = isSell 
      ? `Sell ${originalSize} shares for ${pricePercent}`
      : `Buy ${originalSize} shares for ${pricePercent}`;
    
    // Format fill status - show fractional if partially filled, whole number if filled
    const fillStatus = order.status === 'filled' 
      ? `${originalSize} of ${originalSize} filled`
      : filledSize > 0 && filledSize < originalSize
      ? `${filledSize.toFixed(4)} of ${originalSize} filled`
      : `${filledSize} of ${originalSize} filled`;
    
    const timestamp = order.create_time 
      ? format(new Date(order.create_time * 1000), 'MM/dd/yy, h:mm:ss a')
      : '—';

    const cardContent = (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-300 dark:border-gray-600">
        {/* Top row: order type (left) and X (right) for open/partial */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className={`font-bold text-sm ${orderTypeColor}`}>
            {orderType}
          </div>
          {(order.status === 'open' || order.status === 'partial') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelOrder(order.id);
              }}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xl font-bold p-1 touch-manipulation flex-shrink-0"
              title="Cancel order"
              aria-label="Cancel order"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex items-stretch gap-4">
          {/* Left Section: market, outcome name, action summary */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">
              {order.market_name || 'N/A'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {order.outcome_name || order.outcome}
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {actionText}
            </p>
          </div>
          {/* Right Section: fill status and time */}
          <div className="flex flex-col items-end text-right flex-shrink-0">
            <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
              {fillStatus}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {timestamp}
            </p>
          </div>
        </div>
      </div>
    );

    // Wrap in SwipeableCard only for mobile and only for active orders
    if (order.status === 'open' || order.status === 'partial') {
      return (
        <SwipeableCard
          key={order.id}
          onSwipeLeft={() => handleCancelOrder(order.id)}
          leftAction={<span className="text-white font-medium text-sm">Cancel</span>}
        >
          {cardContent}
        </SwipeableCard>
      );
    }

    return <div key={order.id}>{cardContent}</div>;
  };

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
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium">
        {order.original_size !== undefined && order.original_size !== null ? order.original_size : order.contract_size || 0}
      </td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">
        {order.remaining_size !== undefined && order.remaining_size !== null ? order.remaining_size : (order.status === 'filled' ? 0 : order.contract_size || 0)}
      </td>
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
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Time</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Market</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Outcome</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Side</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Price</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Qty</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Remaining</th>
              <th className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
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
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton variant="text" width="200px" height="32px" />
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="hidden md:block">
          <SkeletonTable rows={5} cols={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Active Orders Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
            Open Orders
          </h2>
          {activeOrders.length > 0 && (
            <button
              onClick={handleCancelAll}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-full text-sm touch-manipulation transition-colors"
              aria-label="Cancel all orders"
            >
              Cancel All
            </button>
          )}
        </div>
        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-3">
          {activeOrders.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
              title="No Open Orders"
              message="You don't have any open orders at the moment. Place an order from a market to get started."
            />
          ) : (
            activeOrders.map(renderOrderCard)
          )}
        </div>
        {/* Desktop Table Layout */}
        <div className="hidden md:block">
          {renderOrderTable(activeOrders, 'No open orders')}
        </div>
      </div>

      {/* Completed Orders Section */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
          Order History
        </h2>
        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-3">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                  No completed orders
                </p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map(renderOrderCard)
          )}
        </div>
        {/* Desktop Table Layout */}
        <div className="hidden md:block">
          {renderOrderTable(completedOrders, 'No completed orders')}
        </div>
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
  const formatPricePercent = (cents: number) => `${(cents / 100).toFixed(1)}%`;
  const formatNotional = (price: number, contracts: number) => {
    const totalCents = price * contracts;
    return `$${Math.round(totalCents / 100)}`;
  };
  const formatIf100 = (price: number, contracts: number) => {
    const priceDollars = price / 100;
    const value = contracts * (100 - priceDollars);
    return Math.round(value);
  };
  const formatIf0 = (price: number, contracts: number) => {
    const priceDollars = price / 100;
    const value = contracts * (0 - priceDollars);
    return Math.round(value);
  };

  const renderTradeCard = (trade: any) => {
    const isSell = trade.side === 1;
    const tradeType = isSell ? 'Sell' : 'Buy';
    const pricePercent = trade.price ? formatPricePercent(trade.price) : '0.0%';
    const unit = trade.contracts === 1 ? 'share' : 'shares';
    const actionText = isSell
      ? `Sold ${trade.contracts} ${unit} at ${pricePercent}`
      : `Bought ${trade.contracts} ${unit} at ${pricePercent}`;
    const purchaseCost = formatNotional(trade.price, trade.contracts);
    const timePurchased = trade.create_time
      ? format(new Date(trade.create_time * 1000), 'M/d, h:mm a')
      : '—';

    return (
      <div
        key={trade.id}
        className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-2 border border-gray-300 dark:border-gray-600"
      >
        <span
          className={`inline-block font-bold text-xs sm:text-sm uppercase tracking-wide mb-1.5 px-2 py-0.5 rounded-md ${isSell ? 'bg-[#FFCC00] text-gray-900' : 'bg-[#00CC00] text-white'}`}
          aria-label={`${tradeType} trade`}
        >
          {tradeType}
        </span>
        {/* Market name and cost on same row */}
        <div className="flex items-center justify-between gap-4 mb-1">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">
            {trade.market_short_name || trade.market_id || '—'}
          </h3>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
            {purchaseCost}
          </p>
        </div>
        <div className="flex flex-col">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-0.5">
            {trade.outcome_name || trade.outcome || '—'}
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {actionText}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
              {timePurchased}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading trades...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Trades</h1>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-2">
        {trades.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
            title="No Trades Yet"
            message="Your executed trades will appear here once you start trading."
          />
        ) : (
          trades.map(renderTradeCard)
        )}
      </div>
      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600">
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Time</th>
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Market</th>
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Outcome</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Price</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Contracts</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">Notional Value</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">If 0</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">If 100</th>
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
                    <span className="font-medium">{trade.outcome_name || '—'}</span>
                  </td>
                  <td className="py-3 px-2 sm:px-3 text-right font-medium text-xs sm:text-sm">{formatPrice(trade.price)}</td>
                  <td className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm">{trade.contracts}</td>
                  <td className="py-3 px-2 sm:px-3 text-right font-medium text-xs sm:text-sm">{formatNotional(trade.price, trade.contracts)}</td>
                  <td className={`py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold ${formatIf0(trade.price, trade.contracts) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${formatIf0(trade.price, trade.contracts)}
                  </td>
                  <td className={`py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold ${formatIf100(trade.price, trade.contracts) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${formatIf100(trade.price, trade.contracts)}
                  </td>
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
  const formatPriceDecimal = (cents: number) => `$${(cents / 100).toFixed(1)}`;

  // Total position value: sum of (+/- P&L) for each position (unrealized gain/loss)
  const totalPositionValueCents = positions.reduce((sum, position) => {
    const currentPrice = position.current_price !== null && position.current_price !== undefined
      ? position.current_price
      : null;
    const costCents = position.net_position * position.price_basis;
    const positionValueCents = currentPrice !== null
      ? position.net_position * currentPrice
      : null;
    const diffCents = positionValueCents !== null ? positionValueCents - costCents : 0;
    return sum + diffCents;
  }, 0);

  const renderPositionCard = (position: any) => {
    const currentPrice = position.current_price !== null && position.current_price !== undefined 
      ? position.current_price 
      : null;
    const costCents = position.net_position * position.price_basis;
    const positionValueCents = currentPrice !== null 
      ? position.net_position * currentPrice 
      : null;
    const diffCents = positionValueCents !== null 
      ? positionValueCents - costCents 
      : null;

    return (
      <Card key={position.id} className="mb-3">
        <CardContent>
          <div className="flex items-start justify-between">
            {/* Left Side */}
            <div className="flex-1 min-w-0 pr-4">
              {/* Outcome - Large, Bold */}
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">
                {position.outcome_ticker || position.outcome_name || position.outcome}
              </h3>
              
              {/* Market - Smaller, Lighter */}
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                {position.market_name || 'N/A'}
              </p>
              
              {/* Shares and Price Basis */}
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                {position.net_position} shares at {formatPriceBasis(position.price_basis)}
              </div>
            </div>

            {/* Right Side */}
            <div className="flex flex-col items-end text-right">
              {/* Position Value or Cost - Large, Bold */}
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {positionValueCents !== null ? formatPriceDecimal(positionValueCents) : formatPriceDecimal(costCents)}
              </div>
              
              {/* Difference (position value - cost) */}
              <div className={`text-sm sm:text-base font-semibold ${
                diffCents !== null
                  ? diffCents > 0 ? 'text-green-600 dark:text-green-400' 
                    : diffCents < 0 ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {diffCents !== null ? (
                  <>{diffCents > 0 ? '↑' : diffCents < 0 ? '↓' : ''} {formatPrice(Math.abs(diffCents))}</>
                ) : (
                  '—'
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton variant="text" width="200px" height="32px" />
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="hidden md:block">
          <SkeletonTable rows={5} cols={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Positions</h1>
      {positions.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-600 dark:text-gray-400">Portfolio value</span>
          <span
            className={`text-lg sm:text-xl font-bold ${
              totalPositionValueCents > 0
                ? 'text-green-600 dark:text-green-400'
                : totalPositionValueCents < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {totalPositionValueCents > 0 ? '+' : ''}
            {formatPrice(totalPositionValueCents)}
          </span>
        </div>
      )}
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {positions.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                No positions found
              </p>
            </CardContent>
          </Card>
        ) : (
          positions.map(renderPositionCard)
        )}
      </div>
      {/* Desktop Card Layout */}
      <div className="hidden md:block space-y-3">
        {positions.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                No positions found
              </p>
            </CardContent>
          </Card>
        ) : (
          positions.map(renderPositionCard)
        )}
      </div>
    </div>
  );
}

function MarketSuggestionsPage() {
  const [submitting, setSubmitting] = useState(false);
  const [tbSubmitting, setTbSubmitting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  // Round O/U specific state
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [strike, setStrike] = useState<string>('');
  const [participants, setParticipants] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [outcomes, setOutcomes] = useState<Array<{ name: string; ticker: string; strike: string }>>([]);

  // Total Birdies specific state (round-agnostic, whole event)
  const [tbParticipant, setTbParticipant] = useState<string>('');
  const [tbStrike, setTbStrike] = useState<string>('');
  const [tbOutcomes, setTbOutcomes] = useState<Array<{ name: string; ticker: string; strike: string }>>([]);

  // Head-to-Head matchup state
  const [h2hParticipant1, setH2hParticipant1] = useState<string>('');
  const [h2hParticipant2, setH2hParticipant2] = useState<string>('');
  const [h2hOutcomes, setH2hOutcomes] = useState<Array<{ name: string; ticker: string; strike: string }>>([]);
  const [h2hSubmitting, setH2hSubmitting] = useState(false);

  // Load participants on mount
  useEffect(() => {
    async function loadParticipants() {
      setLoadingParticipants(true);
      try {
        const { participants: participantsData } = await api.getParticipants();
        // Participants have id and name fields
        const mappedParticipants = (participantsData || []).map((p: any) => ({
          id: p.id || p.name, // Use id if available, fallback to name
          name: p.name,
        }));
        setParticipants(mappedParticipants);
      } catch (err) {
        console.error('Failed to load participants:', err);
        // Silently fail - don't show toast on mount
      } finally {
        setLoadingParticipants(false);
      }
    }
    loadParticipants();
  }, []); // Empty dependency array - only run once on mount


  // Generate Round O/U outcome when participant, round, and strike are filled
  useEffect(() => {
    if (selectedParticipant && roundNumber && strike.trim()) {
      const participant = participants.find(p => p.id === selectedParticipant);
      if (participant) {
        const participantName = participant.name;
        const overName = `${participantName} Over ${strike.trim()} - Round ${roundNumber}`;
        
        // Generate ticker (e.g., "AK-OV-R2-86.5")
        const initials = participantName.split(' ').map(n => n[0]).join('').toUpperCase();
        const overTicker = `${initials}-OV-R${roundNumber}-${strike.trim().replace('.', '_')}`;
        
        setOutcomes([
          { name: overName, ticker: overTicker, strike: strike.trim() },
        ]);
      }
    } else {
      setOutcomes([]);
    }
  }, [selectedParticipant, roundNumber, strike, participants]);

  // Generate Total Birdies outcome when participant and strike are filled (no round)
  useEffect(() => {
    if (tbParticipant && tbStrike.trim()) {
      const participant = participants.find(p => p.id === tbParticipant);
      if (participant) {
        const participantName = participant.name;
        const overName = `${participantName} Over ${tbStrike.trim()} - Total Birdies`;
        const initials = participantName.split(' ').map(n => n[0]).join('').toUpperCase();
        const overTicker = `${initials}-OV-${tbStrike.trim().replace('.', '_')}`;
        setTbOutcomes([
          { name: overName, ticker: overTicker, strike: tbStrike.trim() },
        ]);
      }
    } else {
      setTbOutcomes([]);
    }
  }, [tbParticipant, tbStrike, participants]);

  // Slug for ticker/outcome_id: full name in order so "Alex Over Avayou" ≠ "Avayou Over Alex"
  const nameToSlug = (name: string) =>
    name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase() || 'X';

  // Generate Head-to-Head outcome when both participants are selected (and different): only "Participant1 Over Participant2"
  useEffect(() => {
    if (h2hParticipant1 && h2hParticipant2 && h2hParticipant1 !== h2hParticipant2) {
      const p1 = participants.find(p => p.id === h2hParticipant1);
      const p2 = participants.find(p => p.id === h2hParticipant2);
      if (p1 && p2) {
        const name1 = p1.name;
        const name2 = p2.name;
        const slug1 = nameToSlug(name1);
        const slug2 = nameToSlug(name2);
        setH2hOutcomes([
          { name: `${name1} Over ${name2}`, ticker: `${slug1}-OV-${slug2}`, strike: '' },
        ]);
      }
    } else {
      setH2hOutcomes([]);
    }
  }, [h2hParticipant1, h2hParticipant2, participants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate required fields
    if (!selectedParticipant || !roundNumber || !strike.trim()) {
      showToast('Please fill in all required fields (Participant, Round, and Strike)', 'error');
      setSubmitting(false);
      return;
    }

    if (outcomes.length !== 1) {
      showToast('Please ensure outcome is generated correctly', 'error');
      setSubmitting(false);
      return;
    }

    const participant = participants.find(p => p.id === selectedParticipant);
    if (!participant) {
      showToast('Invalid participant selected', 'error');
      setSubmitting(false);
      return;
    }

    // Generate market name and symbol (just the round, not participant-specific)
    const shortName = `Round ${roundNumber} Over/Under`;
    const symbol = `R${roundNumber}OU`;

    try {
      await api.suggestMarket({
        short_name: shortName,
        symbol,
        max_winners: 1,
        min_winners: 1,
        round_number: roundNumber,
        outcomes: outcomes.map(o => ({
          name: o.name.trim(),
          ticker: o.ticker.trim(),
          strike: o.strike.trim() || undefined,
        })),
      });

      showToast('Market suggestion submitted successfully!', 'success');
      // Reset form
      setRoundNumber(1);
      setSelectedParticipant('');
      setStrike('');
      setOutcomes([]);
    } catch (err: any) {
      console.error('Failed to submit market suggestion:', err);
      showToast(err.message || 'Failed to submit market suggestion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTotalBirdies = async (e: React.FormEvent) => {
    e.preventDefault();
    setTbSubmitting(true);
    if (!tbParticipant || !tbStrike.trim()) {
      showToast('Please fill in Participant and Strike', 'error');
      setTbSubmitting(false);
      return;
    }
    if (tbOutcomes.length !== 1) {
      showToast('Please ensure outcome is generated correctly', 'error');
      setTbSubmitting(false);
      return;
    }
    const participant = participants.find(p => p.id === tbParticipant);
    if (!participant) {
      showToast('Invalid participant selected', 'error');
      setTbSubmitting(false);
      return;
    }
    try {
      await api.suggestMarket({
        short_name: 'Total Birdies',
        symbol: 'BIRDIES',
        max_winners: 1,
        min_winners: 1,
        outcomes: tbOutcomes.map(o => ({
          name: o.name.trim(),
          ticker: o.ticker.trim(),
          strike: o.strike.trim() || undefined,
        })),
      });
      showToast('Total Birdies suggestion submitted successfully!', 'success');
      setTbParticipant('');
      setTbStrike('');
      setTbOutcomes([]);
    } catch (err: any) {
      console.error('Failed to submit Total Birdies suggestion:', err);
      showToast(err.message || 'Failed to submit suggestion', 'error');
    } finally {
      setTbSubmitting(false);
    }
  };

  const handleSubmitH2H = async (e: React.FormEvent) => {
    e.preventDefault();
    setH2hSubmitting(true);
    if (!h2hParticipant1 || !h2hParticipant2 || h2hParticipant1 === h2hParticipant2) {
      showToast('Please select two different participants', 'error');
      setH2hSubmitting(false);
      return;
    }
    if (h2hOutcomes.length !== 1) {
      showToast('Please ensure the outcome is generated', 'error');
      setH2hSubmitting(false);
      return;
    }
    const p1 = participants.find(p => p.id === h2hParticipant1);
    const p2 = participants.find(p => p.id === h2hParticipant2);
    if (!p1 || !p2) {
      showToast('Invalid participant selected', 'error');
      setH2hSubmitting(false);
      return;
    }
    const shortName = `${p1.name} Over ${p2.name}`;
    const symbol = `H2H-${p1.name.split(' ').map(n => n[0]).join('')}-${p2.name.split(' ').map(n => n[0]).join('')}`.replace(/\s/g, '').toUpperCase().slice(0, 12);
    const slug1 = nameToSlug(p1.name);
    const slug2 = nameToSlug(p2.name);
    try {
      await api.suggestMarket({
        short_name: shortName,
        symbol: symbol || 'H2H',
        max_winners: 1,
        min_winners: 1,
        outcomes: h2hOutcomes.map(o => ({
          name: o.name.trim(),
          ticker: o.ticker.trim(),
          strike: o.strike.trim() || undefined,
          outcome_id: `outcome-h2h-${slug1}-${slug2}`,
        })),
      });
      showToast('Head-to-Head suggestion submitted successfully!', 'success');
      setH2hParticipant1('');
      setH2hParticipant2('');
      setH2hOutcomes([]);
    } catch (err: any) {
      console.error('Failed to submit Head-to-Head suggestion:', err);
      showToast(err.message || 'Failed to submit suggestion', 'error');
    } finally {
      setH2hSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h1 className="text-xl sm:text-2xl font-bold">Market Suggestions</h1>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
        Create Round Over/Under, Total Birdies, or Head-to-Head matchup outcomes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Round Over/Under Quick Create */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">Round Over/Under Market</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a Round Over/Under outcome by selecting a participant, round, and strike.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="round_number" className="block text-sm font-medium mb-1.5">
                Round # <span className="text-red-500">*</span>
              </label>
              <select
                id="round_number"
                value={roundNumber}
                onChange={(e) => setRoundNumber(parseInt(e.target.value, 10))}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
              >
                <option value={1}>Round 1</option>
                <option value={2}>Round 2</option>
                <option value={3}>Round 3</option>
                <option value={4}>Round 4</option>
                <option value={5}>Round 5</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="participant" className="block text-sm font-medium mb-1.5">
                Participant <span className="text-red-500">*</span>
              </label>
              <select
                id="participant"
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="strike" className="block text-sm font-medium mb-1.5">
                Strike <span className="text-red-500">*</span>
              </label>
              <input
                id="strike"
                type="text"
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                placeholder="e.g., 86.5"
              />
            </div>
          </div>
          
          {selectedParticipant && roundNumber && strike.trim() && outcomes.length === 1 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Generated Outcome:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {outcomes.map((outcome, idx) => (
                  <li key={idx}>• {outcome.name} ({outcome.ticker})</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium touch-manipulation"
          >
            {submitting ? 'Submitting...' : 'Submit Round O/U'}
          </button>
        </div>
      </form>

      {/* Total Birdies (round-agnostic, whole event) */}
      <form onSubmit={handleSubmitTotalBirdies} className="space-y-4 sm:space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">Total Birdies Market</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a Total Birdies outcome for the whole event (all rounds). Select participant and strike.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tb_participant" className="block text-sm font-medium mb-1.5">
                Participant <span className="text-red-500">*</span>
              </label>
              <select
                id="tb_participant"
                value={tbParticipant}
                onChange={(e) => setTbParticipant(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tb_strike" className="block text-sm font-medium mb-1.5">
                Strike (birdies) <span className="text-red-500">*</span>
              </label>
              <input
                id="tb_strike"
                type="text"
                value={tbStrike}
                onChange={(e) => setTbStrike(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                placeholder="e.g., 3"
              />
            </div>
          </div>
          {tbParticipant && tbStrike.trim() && tbOutcomes.length === 1 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Generated Outcome:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {tbOutcomes.map((outcome, idx) => (
                  <li key={idx}>• {outcome.name} ({outcome.ticker})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={tbSubmitting}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium touch-manipulation"
          >
            {tbSubmitting ? 'Submitting...' : 'Submit Total Birdies'}
          </button>
        </div>
      </form>

      {/* Head-to-Head Matchup */}
      <form onSubmit={handleSubmitH2H} className="space-y-4 sm:space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">Head-to-Head Matchup</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a matchup market: Participant 1 Over Participant 2. Select two participants; the first is &quot;Over&quot; the second.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="h2h_participant1" className="block text-sm font-medium mb-1.5">
                Participant 1 (Over) <span className="text-red-500">*</span>
              </label>
              <select
                id="h2h_participant1"
                value={h2hParticipant1}
                onChange={(e) => setH2hParticipant1(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === h2hParticipant2}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="h2h_participant2" className="block text-sm font-medium mb-1.5">
                Participant 2 <span className="text-red-500">*</span>
              </label>
              <select
                id="h2h_participant2"
                value={h2hParticipant2}
                onChange={(e) => setH2hParticipant2(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === h2hParticipant1}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {h2hOutcomes.length === 1 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Generated outcome:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {h2hOutcomes.map((outcome, idx) => (
                  <li key={idx}>• {outcome.name} ({outcome.ticker})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={h2hSubmitting || h2hOutcomes.length !== 1}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium touch-manipulation"
          >
            {h2hSubmitting ? 'Submitting...' : 'Submit Head-to-Head'}
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
          <h2 className="text-xl font-bold mb-4">Profile</h2>
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
        <h2 className="text-xl font-bold mb-4">Appearance</h2>
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
