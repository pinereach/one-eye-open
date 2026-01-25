import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Market } from '../../types';
import { format } from 'date-fns';

export function MarketList({ tripId }: { tripId?: string }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'settled'>('all');

  useEffect(() => {
    loadMarkets();
  }, [tripId, filter]);

  async function loadMarkets() {
    setLoading(true);
    try {
      const params: any = {};
      if (tripId) params.tripId = tripId;
      if (filter !== 'all') params.status = filter;
      const { markets } = await api.getMarkets(params);
      setMarkets(markets);
    } catch (err) {
      console.error('Failed to load markets:', err);
    } finally {
      setLoading(false);
    }
  }

  const statusColors = {
    open: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    closed: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    settled: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    void: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  };

  if (loading) {
    return <div className="text-center py-8">Loading markets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['all', 'open', 'closed', 'settled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {markets.map((market) => (
          <Link
            key={market.id}
            to={`/markets/${market.id}`}
            className="block p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{market.title}</h3>
                {market.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {market.description}
                  </p>
                )}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Type: {market.type.replace(/_/g, ' ')} • Created:{' '}
                  {format(new Date(market.created_at * 1000), 'MMM d, yyyy')}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[market.status]}`}
              >
                {market.status}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {markets.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No markets found
        </div>
      )}
    </div>
  );
}
