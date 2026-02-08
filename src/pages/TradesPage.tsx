import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MARKET_TYPE_ORDER, getMarketTypeLabel } from '../lib/marketTypes';
import { useTradeNotifications } from '../contexts/TradeNotificationsContext';
import { PullToRefresh } from '../components/ui/PullToRefresh';
import { formatPrice, formatPricePercent, formatNotionalBySide } from '../lib/format';
import { format } from 'date-fns';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';

export function TradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarketType, setSelectedMarketType] = useState<string>('all');
  const { clearUnread } = useTradeNotifications();

  useEffect(() => {
    loadTrades();
  }, []);

  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  const tradesToShow =
    selectedMarketType === 'all'
      ? trades
      : trades.filter((t) => (t.market_type ?? 'other') === selectedMarketType);

  const marketTypeFilterOptions = useMemo(() => {
    const types = new Set(trades.map((t) => t.market_type ?? 'other'));
    const sorted = [...types].sort((a, b) => {
      const i = MARKET_TYPE_ORDER.indexOf(a);
      const j = MARKET_TYPE_ORDER.indexOf(b);
      const ai = i === -1 ? MARKET_TYPE_ORDER.length : i;
      const aj = j === -1 ? MARKET_TYPE_ORDER.length : j;
      return ai - aj;
    });
    return [{ value: 'all', label: 'All' }, ...sorted.map((t) => ({ value: t, label: getMarketTypeLabel(t) }))];
  }, [trades]);

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

  const formatIf100 = (price: number, contracts: number) => {
    const priceDollars = price / 100;
    return Math.round(contracts * (100 - priceDollars));
  };
  const formatIf0 = (price: number, contracts: number) => {
    const priceDollars = price / 100;
    return Math.round(contracts * (0 - priceDollars));
  };

  const renderTradeCard = (trade: any) => {
    const displaySide = trade.side ?? trade.taker_side;
    const isSell = displaySide === 1;
    const tradeType = isSell ? 'Sell' : 'Buy';
    const pricePercent = trade.price ? formatPricePercent(trade.price) : '0.0%';
    const unit = trade.contracts === 1 ? 'share' : 'shares';
    const actionText = isSell ? `Sold ${trade.contracts} ${unit} at ${pricePercent}` : `Bought ${trade.contracts} ${unit} at ${pricePercent}`;
    const purchaseCost = formatNotionalBySide(trade.price, trade.contracts, displaySide ?? 0);
    const timePurchased = trade.create_time ? format(new Date(trade.create_time * 1000), 'M/d, h:mm a') : '—';

    return (
      <div key={trade.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-2 border border-gray-300 dark:border-gray-600">
        <span className={`inline-block font-bold text-xs sm:text-sm uppercase tracking-wide mb-1.5 px-2 py-0.5 rounded-md ${isSell ? 'bg-red-500 text-white' : 'bg-primary-500 text-white'}`} aria-label={`${tradeType} trade`}>{tradeType}</span>
        <div className="flex items-center justify-between gap-4 mb-1">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{trade.market_short_name || trade.market_id || '—'}</h3>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">{purchaseCost}</p>
        </div>
        <div className="flex flex-col">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-0.5">{trade.outcome_name || trade.outcome || '—'}</p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-900 dark:text-gray-100">{actionText}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{timePurchased}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton variant="text" width="200px" height="32px" />
        <div className="md:hidden space-y-3">{[1, 2, 3].map(i => (<SkeletonCard key={i} />))}</div>
        <div className="hidden md:block"><SkeletonTable rows={5} cols={8} /></div>
      </div>
    );
  }

  const emptyTrades = (
    <EmptyState
      icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
      title="No Trades Yet"
      message="Your executed trades will appear here once you start trading."
      action={<Link to="/markets" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Browse markets</Link>}
    />
  );

  return (
    <PullToRefresh onRefresh={loadTrades}>
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Trades</h1>
      {trades.length > 0 && (
        <div className="space-y-2" role="group" aria-label="Filter by market type">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Market type</span>
          <div className="flex flex-wrap gap-2">
            {marketTypeFilterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedMarketType(opt.value)}
                aria-pressed={selectedMarketType === opt.value}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium touch-manipulation transition-colors ${
                  selectedMarketType === opt.value
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="md:hidden space-y-2">
        {trades.length === 0 ? emptyTrades : tradesToShow.map(renderTradeCard)}
      </div>
      <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
        {trades.length === 0 ? emptyTrades : (
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600">
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">Time</th>
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">Side</th>
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">Market</th>
                <th className="py-3 px-2 sm:px-3 text-left text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">Outcome</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">Price</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">Contracts</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">Notional Value</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">If 0</th>
                <th className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">If 100</th>
              </tr>
            </thead>
            <tbody>
              {tradesToShow.map((trade) => {
                const displaySide = trade.side ?? trade.taker_side ?? null;
                const isSell = displaySide === 1;
                const sideLabel = displaySide === 0 ? 'Buy' : displaySide === 1 ? 'Sell' : '—';
                return (
                <tr key={trade.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap">{trade.create_time ? format(new Date(trade.create_time * 1000), 'MMM d, h:mm a') : '—'}</td>
                  <td className="py-3 px-2 sm:px-3">
                    <span className={`inline-block font-bold text-xs uppercase px-2 py-0.5 rounded ${isSell ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                      {sideLabel}
                    </span>
                  </td>
                  <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm">{trade.market_short_name || trade.market_id || '—'}</td>
                  <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm"><span className="font-medium">{trade.outcome_name || '—'}</span></td>
                  <td className="py-3 px-2 sm:px-3 text-right font-medium text-xs sm:text-sm">{formatPrice(trade.price)}</td>
                  <td className="py-3 px-2 sm:px-3 text-right text-xs sm:text-sm">{trade.contracts}</td>
                  <td className="py-3 px-2 sm:px-3 text-right font-medium text-xs sm:text-sm">{formatNotionalBySide(trade.price, trade.contracts, displaySide ?? 0)}</td>
                  <td className={`py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold ${formatIf0(trade.price, trade.contracts) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>${formatIf0(trade.price, trade.contracts)}</td>
                  <td className={`py-3 px-2 sm:px-3 text-right text-xs sm:text-sm font-bold ${formatIf100(trade.price, trade.contracts) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>${formatIf100(trade.price, trade.contracts)}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
