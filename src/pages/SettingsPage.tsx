import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';

const APP_VERSION = '1.0.0';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/markets');
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={handleBack}
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
        <Card>
          <CardContent>
            <h2 className="text-base sm:text-lg font-bold mb-4">Profile</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Signed in as <strong className="text-gray-900 dark:text-gray-100">{user.username}</strong>
            </p>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Username:</span> {user.username}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">ID:</span> {user.id}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-4">Shortcuts</h2>
          <nav className="flex flex-col gap-2">
            <Link to="/markets" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Markets</Link>
            <Link to="/orders" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Orders</Link>
            <Link to="/trades" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Trades</Link>
            <Link to="/positions" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Positions</Link>
            {user?.view_scores && (
              <Link to="/scoring" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Scoring</Link>
            )}
            {user?.view_market_creation && (
              <Link to="/market-suggestions" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Market suggestions</Link>
            )}
          </nav>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-4">Appearance</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Dark mode</span>
            <DarkModeToggle />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-4">Account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Version {APP_VERSION}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition touch-manipulation"
          >
            Log out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
