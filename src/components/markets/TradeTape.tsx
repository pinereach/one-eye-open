import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
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

function formatRelativeTime(ts: number): string {
  const diffSec = Math.floor((Date.now() / 1000) - ts);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return format(new Date(ts * 1000), 'M/d h:mm a');
}

export const TradeTape = forwardRef<
  { refresh: () => Promise<void> },
  { showTitle?: boolean }
>(function TradeTape({ showTitle = true }, ref) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
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
  }, []);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm p-4">
        {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">Trade tape</h2>}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} variant="rectangular" height={48} className="rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm p-6">
        {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3">Trade tape</h2>}
        <EmptyState
          icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
          title="No recent trades"
          message="Trades will appear here as they happen across all markets."
        />
      </div>
    );
  }

  const isFullPage = !showTitle;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm overflow-hidden">
      {showTitle && <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 px-4 pt-3 pb-2">Trade tape</h2>}
      <div className={`px-3 sm:px-4 ${isFullPage ? 'py-3' : 'py-2 max-h-[280px] overflow-y-auto'}`}>
        <div className="space-y-3">
          {trades.map((trade) => {
            const buyer = trade.buyer_username ?? '—';
            const seller = trade.seller_username ?? '—';
            const takerSide = trade.taker_side ?? trade.side ?? 0;
            const isBuy = takerSide === 0;
            const taker = isBuy ? buyer : seller;
            const maker = isBuy ? seller : buyer;
            const takerColor = getPlayerColor(taker);
            const makerColor = getPlayerColor(maker);
            const shares = trade.contracts;
            const outcomeName = trade.outcome_name || trade.outcome_ticker || trade.outcome || '—';
            // Normalize Total Birdies: link and display use canonical market (hyphens)
            const rawMarketId = trade.market_id ?? '';
            const marketId = rawMarketId === 'market_total_birdies' ? 'market-total-birdies' : rawMarketId;
            const marketName = trade.market_short_name || (rawMarketId === 'market_total_birdies' ? 'Total Birdies (6R)' : rawMarketId) || '—';
            const timeStr = trade.create_time ? formatRelativeTime(trade.create_time) : '—';
            const priceStr = formatPrice(trade.price);

            return (
              <div key={trade.id} className="relative group">
                <Link
                  to={marketId ? `/markets/${marketId}` : '#'}
                  className="block py-2.5 px-3 pr-9 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors touch-manipulation"
                >
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-semibold" style={takerColor ? { color: takerColor } : undefined}>{taker}</span>
                    {' '}
                    {isBuy ? 'bought' : 'sold'}
                    {' '}
                    <span className="font-semibold">{shares} {shares === 1 ? 'share' : 'shares'}</span>
                    {' of '}
                    <span className="font-medium">{outcomeName}</span>
                    {isBuy ? ' from ' : ' to '}
                    <span className="font-semibold" style={makerColor ? { color: makerColor } : undefined}>{maker}</span>
                    {' @ '}
                    <span className="font-bold">{priceStr}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" title={trade.create_time ? format(new Date(trade.create_time * 1000), 'MMM d, h:mm a') : undefined}>
                    on {marketName} {timeStr}
                  </div>
                </Link>
                {user?.admin && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (deletingId !== null) return;
                      setDeletingId(trade.id);
                      try {
                        await api.adminDeleteTrade(trade.id);
                        setTrades((prev) => prev.filter((t) => t.id !== trade.id));
                      } catch {
                        setDeletingId(null);
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === trade.id}
                    className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 text-lg font-bold touch-manipulation disabled:opacity-50"
                    aria-label="Delete trade"
                  >
                    {deletingId === trade.id ? '…' : '×'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
