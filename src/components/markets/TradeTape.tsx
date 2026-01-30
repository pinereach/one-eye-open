import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { format } from 'date-fns';
import type { Trade } from '../../types';

const TAPE_LIMIT = 20;

// Distinct hex colors visible on both light and dark backgrounds (24 colors to reduce collisions)
const PLAYER_COLORS: string[] = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0d9488',
  '#db2777', '#4f46e5', '#059669', '#ea580c', '#0891b2', '#c026d3',
  '#e11d48', '#0284c7', '#65a30d', '#9333ea', '#0e7490', '#c2410c',
  '#0f766e', '#be185d', '#ca8a04', '#1d4ed8', '#15803d', '#b91c1c',
];

function hashUsername(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getPlayerColor(username: string): string | undefined {
  if (!username || username === '—') return undefined;
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
            const buyerColor = getPlayerColor(buyer);
            const sellerColor = getPlayerColor(seller);
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
                  <span className="font-bold" style={buyerColor ? { color: buyerColor } : undefined}>{buyer}</span>
                  {' bought '}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{shares}</span> {shareWord} of <span className="font-medium text-gray-900 dark:text-gray-100">{outcomeName}</span>
                  {' at '}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{formatPrice(trade.price)}</span>
                  {' from '}
                  <span className="font-bold" style={sellerColor ? { color: sellerColor } : undefined}>{seller}</span>.
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
