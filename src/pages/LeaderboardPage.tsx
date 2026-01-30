import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { PullToRefresh } from '../components/ui/PullToRefresh';

type LeaderboardRow = {
  user_id: number;
  username: string;
  trade_count: number;
  open_orders_count: number;
  shares_traded: number;
  portfolio_value_cents: number;
};

function formatPortfolio(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLeaderboard() {
    setLoading(true);
    setError(null);
    try {
      const { leaderboard: data } = await api.adminGetLeaderboard();
      setLeaderboard(data ?? []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.admin) loadLeaderboard();
  }, [user?.admin]);

  if (user && !user.admin) {
    return <Navigate to="/markets" replace />;
  }

  if (loading && leaderboard.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Leaderboard</h1>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Leaderboard</h1>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadLeaderboard}>
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Leaderboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Per-user stats: trades, open orders, shares traded, portfolio value (cost basis).</p>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No users.</p>
          ) : (
            leaderboard.map((row) => (
              <Card key={row.user_id}>
                <CardContent className="p-4">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{row.username}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Trades</span>
                    <span className="text-right font-medium">{row.trade_count}</span>
                    <span className="text-gray-500 dark:text-gray-400">Open orders</span>
                    <span className="text-right font-medium">{row.open_orders_count}</span>
                    <span className="text-gray-500 dark:text-gray-400">Shares traded</span>
                    <span className="text-right font-medium">{row.shares_traded}</span>
                    <span className="text-gray-500 dark:text-gray-400">Portfolio value</span>
                    <span className="text-right font-medium">{formatPortfolio(row.portfolio_value_cents)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400">User</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">Trades</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">Open orders</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">Shares traded</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">Portfolio value</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No users.
                  </td>
                </tr>
              ) : (
                leaderboard.map((row) => (
                  <tr key={row.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{row.username}</td>
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.trade_count}</td>
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.open_orders_count}</td>
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.shares_traded}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatPortfolio(row.portfolio_value_cents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PullToRefresh>
  );
}
