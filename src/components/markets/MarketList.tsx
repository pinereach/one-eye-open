import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Market } from '../../types';
import { format } from 'date-fns';

export function MarketList({ tripId }: { tripId?: string }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarkets();
  }, [tripId]);

  async function loadMarkets() {
    setLoading(true);
    try {
      const { markets } = await api.getMarkets();
      setMarkets(markets);
    } catch (err) {
      console.error('Failed to load markets:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading markets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {markets.map((market) => (
          <Link
            key={market.id}
            to={`/markets/${market.market_id}`}
            className="block p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{market.short_name}</h3>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  <div>Symbol: {market.symbol}</div>
                  <div>Winners: {market.min_winners} - {market.max_winners}</div>
                  <div>Created: {format(new Date(market.created_date * 1000), 'MMM d, yyyy')}</div>
                </div>
              </div>
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
