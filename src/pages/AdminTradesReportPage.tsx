import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { formatPricePercent, formatPriceTwoDecimals } from '../lib/format';
import { format } from 'date-fns';
import { Skeleton } from '../components/ui/Skeleton';

type TradeRow = {
  trade_id: number;
  time: number;
  user_id: number;
  username: string;
  side: 'Buy' | 'Sell';
  market: string;
  outcome: string;
  price: number;
  contracts: number;
  settled_price: number | null;
  settled_pnl: number | null;
};

export function AdminTradesReportPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterMarket, setFilterMarket] = useState<string>('all');

  useEffect(() => {
    if (!user?.admin) return;
    loadReport();
  }, [user?.admin]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.adminGetTradesReport();
      setTrades(res.trades);
    } catch (err) {
      console.error('Failed to load trades report:', err);
    } finally {
      setLoading(false);
    }
  }

  const uniqueUsers = useMemo(() => {
    const users = new Map<number, string>();
    trades.forEach((t) => users.set(t.user_id, t.username));
    return Array.from(users.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [trades]);

  const uniqueMarkets = useMemo(() => {
    const markets = new Set<string>();
    trades.forEach((t) => markets.add(t.market));
    return Array.from(markets).sort();
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (filterUser !== 'all' && t.user_id !== parseInt(filterUser)) return false;
      if (filterMarket !== 'all' && t.market !== filterMarket) return false;
      return true;
    });
  }, [trades, filterUser, filterMarket]);

  const exportToCSV = () => {
    const headers = ['Time', 'User', 'Side', 'Market', 'Outcome', 'Price', 'Contracts', 'Settled Price', 'Settled PNL'];
    const rows = filteredTrades.map((t) => [
      format(new Date(t.time * 1000), 'yyyy-MM-dd HH:mm:ss'),
      t.username,
      t.side,
      t.market,
      t.outcome,
      (t.price / 100).toFixed(0) + '%',
      t.contracts.toString(),
      t.settled_price != null ? (t.settled_price / 100).toFixed(0) + '%' : '',
      t.settled_pnl != null ? (t.settled_pnl / 100).toFixed(2) : '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trades-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user?.admin) {
    return <Navigate to="/markets" replace />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" height="400px" className="rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Trades Report</h1>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition text-sm font-medium"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">User</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-sm min-w-[150px]"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Market</label>
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-sm min-w-[200px]"
          >
            <option value="all">All Markets</option>
            {uniqueMarkets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="py-2 px-2 text-left font-bold text-gray-600 dark:text-gray-400">Time</th>
              <th className="py-2 px-2 text-left font-bold text-gray-600 dark:text-gray-400">User</th>
              <th className="py-2 px-2 text-center font-bold text-gray-600 dark:text-gray-400">Side</th>
              <th className="py-2 px-2 text-left font-bold text-gray-600 dark:text-gray-400">Market</th>
              <th className="py-2 px-2 text-left font-bold text-gray-600 dark:text-gray-400">Outcome</th>
              <th className="py-2 px-2 text-right font-bold text-gray-600 dark:text-gray-400">Price</th>
              <th className="py-2 px-2 text-right font-bold text-gray-600 dark:text-gray-400">Contracts</th>
              <th className="py-2 px-2 text-right font-bold text-gray-600 dark:text-gray-400">Settled</th>
              <th className="py-2 px-2 text-right font-bold text-gray-600 dark:text-gray-400">Settled PNL</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((t, idx) => (
              <tr
                key={`${t.trade_id}-${t.user_id}`}
                className={`border-b border-gray-200 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
              >
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {format(new Date(t.time * 1000), 'M/d/yy h:mm a')}
                </td>
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{t.username}</td>
                <td className="py-2 px-2 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      t.side === 'Buy'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100 max-w-[200px] truncate" title={t.market}>
                  {t.market}
                </td>
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100 max-w-[200px] truncate" title={t.outcome}>
                  {t.outcome}
                </td>
                <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100">
                  {formatPricePercent(t.price)}
                </td>
                <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100">{t.contracts}</td>
                <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100">
                  {t.settled_price != null ? formatPricePercent(t.settled_price) : '—'}
                </td>
                <td
                  className={`py-2 px-2 text-right font-medium ${
                    t.settled_pnl == null
                      ? 'text-gray-400'
                      : t.settled_pnl >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {t.settled_pnl != null ? formatPriceTwoDecimals(t.settled_pnl) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTrades.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No trades found</div>
      )}
    </div>
  );
}
