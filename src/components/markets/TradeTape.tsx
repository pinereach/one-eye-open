import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPrice, formatNotionalBySide } from '../../lib/format';
import { format } from 'date-fns';
import type { Trade } from '../../types';

const TAPE_LIMIT = 40;

export function TradeTape({ showTitle = true }: { showTitle?: boolean }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { trades: data } = await api.getAllTrades(TAPE_LIMIT);
        setTrades(data ?? []);
      } catch (err) {
        console.error('Failed to load trade tape:', err);
        setTrades([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4">
        {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">Trade tape</h2>}
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4">
        {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">Trade tape</h2>}
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent trades</p>
      </div>
    );
  }

  const isFullPage = !showTitle;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
      {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 px-4 pt-3 pb-2">Trade tape</h2>}
      <div className={`px-4 pb-3 ${isFullPage ? 'pt-3' : 'max-h-[280px] overflow-y-auto'}`}>
        <div className="space-y-1.5">
          {trades.map((trade) => {
            const displaySide = trade.taker_side ?? trade.side;
            const isBuy = displaySide === 0;
            const isSell = displaySide === 1;
            const sideLabel = isBuy ? 'Buy' : isSell ? 'Sell' : '—';
            const sideClass = isBuy
              ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
              : isSell
                ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                : 'bg-gray-400 text-white dark:bg-gray-500 dark:text-white';
            const marketName = trade.market_short_name || trade.market_id || '—';
            const outcomeName = trade.outcome_name || trade.outcome_ticker || trade.outcome || '—';

            return (
              <div
                key={trade.id}
                className="py-2.5 border-b border-gray-200 dark:border-gray-700 last:border-0 text-xs sm:text-sm"
              >
                <div className="mb-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${sideClass}`}
                    aria-label={sideLabel !== '—' ? sideLabel : 'Unknown side'}
                  >
                    {sideLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-900 dark:text-gray-100 truncate min-w-0" title={marketName}>
                    {marketName}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap flex-shrink-0">
                    {trade.contracts} @ {formatPrice(trade.price)} · {formatNotionalBySide(trade.price, trade.contracts, trade.taker_side ?? trade.side ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-0.5">
                  <span className="text-gray-600 dark:text-gray-400 truncate min-w-0" title={outcomeName}>
                    {outcomeName}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500 text-xs whitespace-nowrap flex-shrink-0">
                    {trade.create_time ? format(new Date(trade.create_time * 1000), 'M/d h:mm a') : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
