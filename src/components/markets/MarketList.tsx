import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Market } from '../../types';

function getMarketIcon(marketId: string) {
  if (marketId.includes('team-champion') || (marketId.includes('champion') && !marketId.includes('individual'))) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    );
  }
  if (marketId.includes('individual') && (marketId.includes('net') || marketId.includes('gross'))) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  }
  if (marketId.includes('round') || marketId.includes('ou')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Plus symbol */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v8M8 8h8" />
        {/* Minus symbol */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16h8" />
      </svg>
    );
  }
  if (marketId.includes('birdies') || marketId.includes('birdie')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  }
  if (marketId.includes('h2h') || marketId.includes('matchup')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    );
  }
  if (marketId.includes('hole-in-one') || marketId.includes('hio')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <circle cx="12" cy="12" r="3" strokeWidth={2} />
      </svg>
    );
  }
  // Default icon
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

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

  function getMarketTypeLabel(marketType: string | null | undefined): string {
    if (!marketType) return 'Other';
    const labels: Record<string, string> = {
      'team_champion': 'Team',
      'individual_champion': 'Individual',
      'round_ou': 'Round Over/Under',
      'total_birdies': 'Totals',
      'h2h_matchups': 'Head-to-Head',
      'hole_in_one': 'Special Events',
    };
    return labels[marketType] || 'Other';
  }

  // Group markets by type
  const marketsByType = markets.reduce((acc, market) => {
    const type = market.market_type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(market);
    return acc;
  }, {} as Record<string, Market[]>);

  // Define display order for market types
  const typeOrder = ['team_champion', 'individual_champion', 'round_ou', 'total_birdies', 'h2h_matchups', 'hole_in_one', 'other'];
  
  // Get all types that have markets, preserving order for known types, then adding any unknown types
  const knownTypes = typeOrder.filter(type => marketsByType[type]?.length > 0);
  const unknownTypes = Object.keys(marketsByType).filter(type => !typeOrder.includes(type) && marketsByType[type]?.length > 0);
  const sortedTypes = [...knownTypes, ...unknownTypes];

  if (loading) {
    return <div className="text-center py-8">Loading markets...</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {sortedTypes.map((type) => {
        const typeMarkets = marketsByType[type];
        const typeLabel = getMarketTypeLabel(type);
        
        return (
          <div key={type} className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-2">
              {typeLabel}
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {typeMarkets.map((market) => (
                <Link
                  key={market.id}
                  to={`/markets/${market.market_id}`}
                  className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-md transition-all cursor-pointer touch-manipulation active:bg-gray-100 dark:active:bg-gray-700 active:scale-[0.98]"
                >
                  <div className="flex-shrink-0 text-primary-600 dark:text-primary-400">
                    <div className="w-10 h-10 sm:w-8 sm:h-8">
                      {getMarketIcon(market.market_id)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 truncate">
                      {market.short_name}
                    </h3>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {markets.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No markets found
        </div>
      )}
    </div>
  );
}
