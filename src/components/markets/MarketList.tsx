import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { MARKET_TYPE_ORDER, getMarketTypeLabel } from '../../lib/marketTypes';
import { PullToRefresh } from '../ui/PullToRefresh';
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
        {/* Matchup: two sides with vs in the middle */}
        <circle cx="6" cy="12" r="4" strokeWidth={2} />
        <circle cx="18" cy="12" r="4" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v6M10.5 12h3" />
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
  if (marketId.includes('eagles')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Bird: head, body, wing */}
        <circle cx="12" cy="9" r="2.5" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11.5v4c0 1.5-.8 2.8-2 3.5-1.2-.7-2-2-2-3.5v-4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11c0 0 2-3 4-3s4 3 4 3" />
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

const MARKETS_FRESH_KEY = 'markets_prefer_fresh_at';
const MARKETS_FRESH_MS = 15 * 60 * 1000; // 15 min: after refresh, bypass cache on next visit

function shouldBypassCacheOnLoad(): boolean {
  try {
    const raw = sessionStorage.getItem(MARKETS_FRESH_KEY);
    if (!raw) return false;
    const at = parseInt(raw, 10);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < MARKETS_FRESH_MS;
  } catch {
    return false;
  }
}

function setPreferFresh() {
  try {
    sessionStorage.setItem(MARKETS_FRESH_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function MarketList({ tripId }: { tripId?: string }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadMarkets(false, shouldBypassCacheOnLoad());
  }, [tripId]);

  async function loadMarkets(retry = false, cacheBust = false) {
    const isRefresh = cacheBust && markets.length > 0;
    if (!retry && !isRefresh) {
      setLoading(true);
      setError(null);
    }
    if (isRefresh) setRefreshing(true);
    try {
      const { markets: data } = await api.getMarkets(cacheBust ? { cacheBust: true } : undefined);
      setMarkets(data ?? []);
      setError(null);
      setRetryCount(0);
    } catch (err: any) {
      console.error('Failed to load markets:', err);
      const errorMessage = err?.message || 'Failed to load markets';
      setError(errorMessage);
      if (!retry && retryCount === 0) {
        setTimeout(() => {
          setRetryCount(1);
          loadMarkets(true, false);
        }, 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    await loadMarkets(false, true);
    setPreferFresh();
  }

  // Group markets by type (use market_id for Total Birdies/Pars when market_type is missing)
  const marketsByType = markets.reduce((acc, market) => {
    let type = market.market_type || 'other';
    if (type === 'other' && (market.market_id === 'market-total-birdies' || market.market_id === 'market_total_birdies')) {
      type = 'market_total_birdies';
    }
    if (type === 'other' && (market.market_id === 'market-total-pars' || market.market_id === 'market_total_pars')) {
      type = 'market_total_pars';
    }
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(market);
    return acc;
  }, {} as Record<string, Market[]>);

  // Display order for market types (shared with Positions/Orders/Trades filter chips)
  const typeOrder = [...MARKET_TYPE_ORDER];
  // Within Matchups section: tournament (H2H) first, then round, then special
  const matchupMarketOrder = ['market-h2h-matchups', 'market-round-matchups', 'market-special-matchups'];

  // Get all types that have markets, preserving order for known types, then adding any unknown types
  const knownTypes = typeOrder.filter(type => marketsByType[type]?.length > 0);
  const unknownTypes = Object.keys(marketsByType).filter(type => !typeOrder.includes(type) && marketsByType[type]?.length > 0);
  const sortedTypes = [...knownTypes, ...unknownTypes];

  function sortMarketsForType(type: string, list: Market[]): Market[] {
    if (type !== 'matchups' || list.length <= 1) return list;
    return [...list].sort((a, b) => {
      const i = matchupMarketOrder.indexOf(a.market_id);
      const j = matchupMarketOrder.indexOf(b.market_id);
      const ai = i === -1 ? 999 : i;
      const aj = j === -1 ? 999 : j;
      return ai - aj;
    });
  }

  let content: ReactNode;
  if (loading && markets.length === 0) {
    content = <div className="text-center py-8">Loading markets...</div>;
  } else if (error && markets.length === 0) {
    content = (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <p className="font-semibold">Error loading markets</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
        <button
          onClick={() => loadMarkets()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  } else {
    content = (
    <div className="space-y-4 sm:space-y-6">
      {sortedTypes.map((type) => {
        const typeMarkets = sortMarketsForType(type, marketsByType[type]);
        const typeLabel = getMarketTypeLabel(type);
        
        return (
          <div key={type} className="space-y-2 sm:space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-1.5">
              {typeLabel}
            </h2>
            <div className="grid gap-2 sm:gap-3">
              {typeMarkets.map((market) => (
                <Link
                  key={market.id}
                  to={`/markets/${market.market_id}`}
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-md transition-all cursor-pointer touch-manipulation active:bg-gray-100 dark:active:bg-gray-700 active:scale-[0.98]"
                >
                  <div className="flex-shrink-0 text-primary-600 dark:text-primary-400">
                    <div className="w-8 h-8 sm:w-7 sm:h-7">
                      {getMarketIcon(market.market_id)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                      {market.short_name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {(market.volume_contracts ?? 0).toLocaleString()} shares
                      {' · '}
                      ${((market.volume_contracts ?? 0) * 100).toLocaleString()} volume
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Markets</h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 transition-colors touch-manipulation"
          title="Bypass cache and reload markets"
          aria-label="Refresh markets"
        >
          <svg
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      {content}
    </PullToRefresh>
  );
}
