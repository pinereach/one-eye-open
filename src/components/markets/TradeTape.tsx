import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';
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
        const { trades: data } = await api.getTape(TAPE_LIMIT);
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
      <div className={`pb-3 ${isFullPage ? 'pt-3' : 'max-h-[280px] overflow-y-auto'}`}>
        <div className="space-y-0">
          {trades.map((trade) => {
            const buyer = trade.buyer_username ?? '—';
            const seller = trade.seller_username ?? '—';
            const shares = trade.contracts;
            const shareWord = shares === 1 ? 'share' : 'shares';
            const outcomeName = trade.outcome_name || trade.outcome_ticker || trade.outcome || '—';
            const marketName = trade.market_short_name || trade.market_id || '—';
            const execTime = trade.create_time ? format(new Date(trade.create_time * 1000), 'M/d h:mm a') : '—';

            return (
              <div
                key={trade.id}
                className="border-b border-gray-200 dark:border-gray-700 last:border-0 overflow-hidden"
              >
                <div className="px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium text-green-600 dark:text-green-400">{buyer}</span>
                  {' bought '}
                  {shares} {shareWord} of {outcomeName} at {formatPrice(trade.price)} from{' '}
                  <span className="font-medium text-red-600 dark:text-red-400">{seller}</span>.
                </div>
                <div className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between gap-2">
                  <span className="truncate min-w-0" title={marketName}>
                    {marketName}
                  </span>
                  <span className="whitespace-nowrap flex-shrink-0">{execTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
