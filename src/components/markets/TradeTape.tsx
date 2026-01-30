import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { format } from 'date-fns';
import type { Trade } from '../../types';

const TAPE_LIMIT = 40;

// Theme-safe palette: darker in light mode, lighter in dark mode for readability
const PLAYER_COLORS = [
  'text-blue-600 dark:text-blue-400',
  'text-green-600 dark:text-green-400',
  'text-red-600 dark:text-red-400',
  'text-amber-600 dark:text-amber-400',
  'text-violet-600 dark:text-violet-400',
  'text-teal-600 dark:text-teal-400',
  'text-pink-600 dark:text-pink-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-orange-600 dark:text-orange-400',
  'text-cyan-600 dark:text-cyan-400',
  'text-fuchsia-600 dark:text-fuchsia-400',
  'text-rose-600 dark:text-rose-400',
  'text-sky-600 dark:text-sky-400',
  'text-lime-600 dark:text-lime-400',
] as const;

function hashUsername(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getPlayerColorClass(username: string): string {
  if (!username || username === '—') return 'text-gray-600 dark:text-gray-400';
  return PLAYER_COLORS[hashUsername(username) % PLAYER_COLORS.length];
}

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
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm p-4">
        {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">Trade tape</h2>}
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm p-6">
        {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">Trade tape</h2>}
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">No recent trades</p>
        </div>
      </div>
    );
  }

  const isFullPage = !showTitle;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm overflow-hidden">
      {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 px-4 pt-3 pb-2">Trade tape</h2>}
      <div className={`px-3 sm:px-4 ${isFullPage ? 'py-3' : 'py-2 max-h-[280px] overflow-y-auto'}`}>
        <div className="space-y-2">
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
                className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/30 overflow-hidden border-l-4 border-l-green-500 dark:border-l-green-500"
              >
                <div className="px-3 sm:px-4 py-3 text-sm text-gray-800 dark:text-gray-200 leading-snug">
                  <span className={`font-medium ${getPlayerColorClass(buyer)}`}>{buyer}</span>
                  {' bought '}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{shares}</span> {shareWord} of <span className="font-medium text-gray-900 dark:text-gray-100">{outcomeName}</span>
                  {' at '}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{formatPrice(trade.price)}</span>
                  {' from '}
                  <span className={`font-medium ${getPlayerColorClass(seller)}`}>{seller}</span>.
                </div>
                <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-600/50">
                  <span className="truncate min-w-0 text-xs text-gray-500 dark:text-gray-400" title={marketName}>
                    {marketName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0 px-2 py-0.5 rounded bg-gray-200/80 dark:bg-gray-600/50">
                    {execTime}
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
