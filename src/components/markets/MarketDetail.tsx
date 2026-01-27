import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Orderbook } from './Orderbook';
import { ToastContainer, useToast } from '../ui/Toast';
import { BottomSheet } from '../ui/BottomSheet';
import { Tabs } from '../ui/Tabs';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import type { Market, Order, Trade, Position, Outcome } from '../../types';
import { format } from 'date-fns';

export function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const { user } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
  const [orderbookByOutcome, setOrderbookByOutcome] = useState<Record<string, { bids: Order[]; asks: Order[] }>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [orderSide, setOrderSide] = useState<'bid' | 'ask'>('bid');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState<'price' | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'outcomes' | 'orderbook' | 'trades' | 'positions'>('outcomes');

  useEffect(() => {
    if (id) {
      loadMarket();
      loadTrades();
      loadPositions();
    }
  }, [id]);

  async function loadMarket() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getMarket(id);
      setMarket(data?.market || null);
      setOutcomes(data?.outcomes || []);
      setOrderbookByOutcome(data?.orderbook || {});
      
      // Sort outcomes by chance and select the highest chance outcome
      if (data.outcomes && data.outcomes.length > 0 && data.orderbook) {
        const sorted = [...data.outcomes].sort((a, b) => {
          const orderbookA = data.orderbook[a.outcome_id];
          const orderbookB = data.orderbook[b.outcome_id];
          const bestBidA = orderbookA?.bids?.[0];
          const bestAskA = orderbookA?.asks?.[0];
          const bestBidB = orderbookB?.bids?.[0];
          const bestAskB = orderbookB?.asks?.[0];
          
          const avgPriceA = bestBidA && bestAskA ? (bestBidA.price + bestAskA.price) / 2 : (bestBidA?.price || 0);
          const avgPriceB = bestBidB && bestAskB ? (bestBidB.price + bestAskB.price) / 2 : (bestBidB?.price || 0);
          
          return avgPriceB - avgPriceA; // Descending
        });
        
        if (!selectedOutcomeId && sorted.length > 0) {
          setSelectedOutcomeId(sorted[0].outcome_id);
        }
      }
    } catch (err) {
      console.error('Failed to load market:', err);
      showToast('Failed to load market data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadTrades() {
    if (!id) return;
    setLoadingTrades(true);
    try {
      const { trades } = await api.getTrades(id, 20);
      setTrades(trades || []);
    } catch (err) {
      console.error('Failed to load trades:', err);
      setTrades([]);
    } finally {
      setLoadingTrades(false);
    }
  }

  async function loadPositions() {
    if (!id) return;
    setLoadingPositions(true);
    try {
      const { positions } = await api.getPositions(id);
      setPositions(positions || []);
    } catch (err) {
      console.error('Failed to load positions:', err);
      setPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !selectedOutcomeId) {
      showToast('Please select an outcome', 'error');
      return;
    }

    const price = parseInt(orderPrice, 10);
    const qty = parseInt(orderQty, 10);

    if (isNaN(price) || price < 1 || price > 99) {
      showToast('Price must be a whole number between $1 and $99', 'error');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      showToast('Quantity must be at least 1', 'error');
      return;
    }

    // Check if this order would match against user's own orders
    const priceCents = price * 100;
    const orderbook = selectedOutcomeId ? (orderbookByOutcome?.[selectedOutcomeId] || null) : null;
    if (orderbook && user?.id) {
      if (orderSide === 'bid') {
        // Check if user has any asks at or below this bid price
        const userAsks = orderbook.asks.filter(
          ask => ask.user_id === user.id && 
          (ask.status === 'open' || ask.status === 'partial') &&
          ask.price <= priceCents
        );
        if (userAsks.length > 0) {
          showToast('Cannot place bid: You have existing sell orders at this price or better', 'error');
          return;
        }
      } else {
        // Check if user has any bids at or above this ask price
        const userBids = orderbook.bids.filter(
          bid => bid.user_id === user.id && 
          (bid.status === 'open' || bid.status === 'partial') &&
          bid.price >= priceCents
        );
        if (userBids.length > 0) {
          showToast('Cannot place ask: You have existing buy orders at this price or better', 'error');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await api.placeOrder(id, {
        outcome_id: selectedOutcomeId,
        side: orderSide,
        price: priceCents, // Already converted to cents
        contract_size: qty,
        tif: 'GTC',
      });
      setOrderPrice('');
      setOrderQty('');
      setAutoFilled(null);
      showToast('Order placed successfully!', 'success');
      
      // Add small delay to ensure order is committed to database
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh all data to show new order in orderbook
      await Promise.all([
        loadMarket(),
        loadTrades(),
        loadPositions(),
      ]);
    } catch (err: any) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBidClick(outcomeId: string, price: number | null) {
    setSelectedOutcomeId(outcomeId);
    setOrderSide('bid');
    if (price) {
      const priceDollars = Math.round(price / 100);
      // Clamp to 1-99 range
      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
      setOrderPrice(clampedPrice.toString());
      setAutoFilled('price');
      setTimeout(() => setAutoFilled(null), 2000);
    }
  }

  function handleAskClick(outcomeId: string, price: number | null) {
    setSelectedOutcomeId(outcomeId);
    setOrderSide('ask');
    if (price) {
      const priceDollars = Math.round(price / 100);
      // Clamp to 1-99 range
      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
      setOrderPrice(clampedPrice.toString());
      setAutoFilled('price');
      setTimeout(() => setAutoFilled(null), 2000);
    }
  }

  function handleQuickQuantity(qty: number) {
    setOrderQty(qty.toString());
  }

  function getChanceColor(chance: number): string {
    if (chance >= 70) return 'text-green-600 dark:text-green-400';
    if (chance >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getChanceBgColor(chance: number): string {
    if (chance >= 70) return 'bg-green-100 dark:bg-green-900/30';
    if (chance >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  }

  // Calculate market stats
  const marketStats = (() => {
    let totalVolume = 0;

    Object.values(orderbookByOutcome || {}).forEach(({ bids = [], asks = [] }) => {
      (bids || []).forEach(bid => totalVolume += (bid.contract_size || 0) * bid.price);
      (asks || []).forEach(ask => totalVolume += (ask.contract_size || 0) * ask.price);
    });

    return {
      totalVolume: totalVolume / 100, // Convert cents to dollars
    };
  })();

  // Calculate order summary
  const orderSummary = (() => {
    const price = parseInt(orderPrice, 10) || 0;
    const qty = parseInt(orderQty, 10) || 0;
    return {
      totalCost: price * qty,
      price,
      qty,
    };
  })();

  // Get selected outcome data
  const selectedOrderbook = selectedOutcomeId ? (orderbookByOutcome?.[selectedOutcomeId] || null) : null;
  const bestBid = selectedOrderbook?.bids?.[0];
  const bestAsk = selectedOrderbook?.asks?.[0];

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" height="400px" className="rounded-lg" />
      </div>
    );
  }

  if (!market) {
    return <div className="text-center py-8">Market not found</div>;
  }

  const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;
  const formatPriceBasis = (cents: number) => `$${(cents / 100).toFixed(1)}`;
  const formatPriceDecimal = (cents: number) => `$${(cents / 100).toFixed(1)}`;
  const formatPriceCents = (cents: number) => {
    const dollars = cents / 100;
    if (dollars < 1) {
      return `${Math.round(cents / 10)}¢`;
    }
    return `$${Math.round(dollars)}`;
  };

  // Sort outcomes by chance (descending) before rendering
  const sortedOutcomes = (outcomes || []).length > 0 ? [...(outcomes || [])].sort((a, b) => {
    const orderbookA = orderbookByOutcome?.[a.outcome_id];
    const orderbookB = orderbookByOutcome?.[b.outcome_id];
    const bestBidA = orderbookA?.bids?.[0];
    const bestAskA = orderbookA?.asks?.[0];
    const bestBidB = orderbookB?.bids?.[0];
    const bestAskB = orderbookB?.asks?.[0];
    
    const avgPriceA = bestBidA && bestAskA ? (bestBidA.price + bestAskA.price) / 2 : (bestBidA?.price || 0);
    const avgPriceB = bestBidB && bestAskB ? (bestBidB.price + bestAskB.price) / 2 : (bestBidB?.price || 0);
    
    return avgPriceB - avgPriceA;
  }) : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => navigate('/markets')}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition touch-manipulation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back to Markets</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{market.short_name}</h1>
        
        {/* Market Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Volume</div>
            <div className="text-sm sm:text-lg font-semibold">{formatPrice(marketStats.totalVolume * 100)}</div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden">
        <Tabs
          tabs={[
            { id: 'outcomes', label: 'Outcomes' },
            { id: 'orderbook', label: 'Orderbook' },
            { id: 'trades', label: 'Trades' },
            { id: 'positions', label: 'Positions' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
        />
      </div>

      {/* Mobile Tab Content */}
      <div className="md:hidden">
        {activeTab === 'outcomes' && outcomes && outcomes.length > 0 && (
          <div className="mt-4">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full min-w-[320px] sm:min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Team</th>
                      <th className="py-2 px-1 sm:py-3 sm:px-4 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Chance</th>
                      <th className="py-2 px-1 sm:py-3 sm:px-4 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Bid</th>
                      <th className="py-2 px-1 sm:py-3 sm:px-4 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Ask</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOutcomes.map((outcome, index) => {
                        const orderbook = orderbookByOutcome[outcome.outcome_id];
                        const bestBid = orderbook?.bids?.[0];
                        const bestAsk = orderbook?.asks?.[0];
                        const yesPrice = bestBid ? bestBid.price : null;
                        const avgPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : (yesPrice || 0);
                        const chance = avgPrice ? Math.round((avgPrice / 10000) * 100) : 0;
                        const isSelected = selectedOutcomeId === outcome.outcome_id;
                        
                        return (
                          <tr
                            key={outcome.id}
                            className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer touch-manipulation transition-colors ${
                              isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600 dark:border-l-primary-400' : ''
                            }`}
                            onClick={() => setSelectedOutcomeId(outcome.outcome_id)}
                          >
                            <td className="py-2 px-2 sm:py-3 sm:px-4">
                              <div className="flex items-center gap-1 sm:gap-3">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4 sm:w-8 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs sm:text-base text-gray-900 dark:text-gray-100 truncate">
                                    {outcome.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getChanceBgColor(chance).replace('bg-', 'bg-').split(' ')[0]}`} style={{ backgroundColor: chance >= 70 ? '#22c55e' : chance >= 40 ? '#eab308' : '#ef4444' }}></div>
                                <span className={`font-medium text-xs sm:text-base ${getChanceColor(chance)}`}>
                                  {chance}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBidClick(outcome.outcome_id, yesPrice);
                                  }}
                                  className="w-[70px] sm:w-[120px] px-1 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold whitespace-nowrap bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 active:bg-green-300 dark:active:bg-green-700 touch-manipulation h-[36px] sm:h-[44px] flex items-center justify-center transition-colors"
                                >
                                  {yesPrice ? formatPriceCents(yesPrice) : '-'}
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAskClick(outcome.outcome_id, bestAsk?.price || null);
                                  }}
                                  className="w-[70px] sm:w-[120px] px-1 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold whitespace-nowrap bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 active:bg-red-300 dark:active:bg-red-700 touch-manipulation h-[36px] sm:h-[44px] flex items-center justify-center transition-colors"
                                >
                                  {bestAsk ? formatPriceCents(bestAsk.price) : '-'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orderbook' && (
          <div className="mt-4">
            {selectedOutcomeId && selectedOrderbook ? (
              <Orderbook
                bids={selectedOrderbook.bids}
                asks={selectedOrderbook.asks}
                userId={user?.id}
                onPriceClick={(price, side) => {
                  const priceDollars = Math.round(price / 100);
                  const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                  setOrderPrice(clampedPrice.toString());
                  setOrderSide(side);
                  setAutoFilled('price');
                  setTimeout(() => setAutoFilled(null), 2000);
                  setBottomSheetOpen(true);
                }}
                onCancelOrder={async (orderId) => {
                  try {
                    await api.cancelOrder(orderId);
                    showToast('Order canceled successfully', 'success');
                    await loadMarket();
                  } catch (err: any) {
                    console.error('Failed to cancel order:', err);
                    showToast(err.message || 'Failed to cancel order', 'error');
                  }
                }}
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                Select an outcome to view orderbook
              </div>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="mt-4">
            {loadingTrades ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : trades.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No recent trades
              </div>
            ) : (
              <div className="space-y-2">
                {trades.map((trade) => {
                  const isBuy = trade.side === 0;
                  const isSell = trade.side === 1;
                  const sideLabel = isBuy ? 'Buy' : isSell ? 'Sell' : '—';
                  const sideColor = isBuy ? 'text-green-600 dark:text-green-400' : isSell ? 'text-red-600 dark:text-red-400' : '';

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {trade.outcome_ticker && (
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {trade.outcome_ticker}
                          </span>
                        )}
                        <span className={`font-medium ${sideColor}`}>
                          {sideLabel}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {trade.contracts} contracts
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(trade.price)}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {trade.create_time ? format(new Date(trade.create_time * 1000), 'h:mm:ss a') : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="mt-4">
            {loadingPositions ? (
              <div className="animate-pulse space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : positions.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No positions
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((position) => {
                  const currentPrice = position.current_price !== null && position.current_price !== undefined 
                    ? position.current_price 
                    : null;
                  const positionValue = currentPrice !== null 
                    ? position.net_position * (currentPrice - position.price_basis)
                    : null;

                  return (
                    <div key={position.id} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <div className="font-bold text-sm mb-2">{position.market_name || 'N/A'}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">{position.outcome_ticker || position.outcome_name || position.outcome}</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Net Position:</span>
                          <span className="font-medium">{position.net_position}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Price Basis:</span>
                          <span>{formatPriceBasis(position.price_basis)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Current:</span>
                          <span>{currentPrice !== null ? formatPriceDecimal(currentPrice) : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Position Value:</span>
                          <span className={`font-bold ${
                            positionValue !== null 
                              ? (positionValue > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                              : ''
                          }`}>
                            {positionValue !== null ? formatPriceDecimal(positionValue) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Closed Profit:</span>
                          <span className={`font-bold ${position.closed_profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatPrice(position.closed_profit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Settled Profit:</span>
                          <span className={`font-bold ${position.settled_profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatPrice(position.settled_profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Layout (unchanged) */}
      <div className="hidden md:block">
        {outcomes && outcomes.length > 0 ? (
          <div>
            {/* Outcomes Table */}
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full min-w-[320px] sm:min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Team</th>
                      <th className="py-2 px-1 sm:py-3 sm:px-4 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Chance</th>
                      <th className="py-2 px-1 sm:py-3 sm:px-4 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Bid</th>
                      <th className="py-2 px-1 sm:py-3 sm:px-4 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Ask</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOutcomes.map((outcome, index) => {
                        const orderbook = orderbookByOutcome[outcome.outcome_id];
                        const bestBid = orderbook?.bids?.[0];
                        const bestAsk = orderbook?.asks?.[0];
                        const yesPrice = bestBid ? bestBid.price : null;
                        const avgPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : (yesPrice || 0);
                        const chance = avgPrice ? Math.round((avgPrice / 10000) * 100) : 0;
                        const isSelected = selectedOutcomeId === outcome.outcome_id;
                        
                        return (
                          <tr
                            key={outcome.id}
                            className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer touch-manipulation transition-colors ${
                              isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600 dark:border-l-primary-400' : ''
                            }`}
                            onClick={() => setSelectedOutcomeId(outcome.outcome_id)}
                          >
                            <td className="py-2 px-2 sm:py-3 sm:px-4">
                              <div className="flex items-center gap-1 sm:gap-3">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4 sm:w-8 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs sm:text-base text-gray-900 dark:text-gray-100 truncate">
                                    {outcome.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getChanceBgColor(chance).replace('bg-', 'bg-').split(' ')[0]}`} style={{ backgroundColor: chance >= 70 ? '#22c55e' : chance >= 40 ? '#eab308' : '#ef4444' }}></div>
                                <span className={`font-medium text-xs sm:text-base ${getChanceColor(chance)}`}>
                                  {chance}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBidClick(outcome.outcome_id, yesPrice);
                                  }}
                                  className="w-[70px] sm:w-[120px] px-1 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold whitespace-nowrap bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 active:bg-green-300 dark:active:bg-green-700 touch-manipulation h-[36px] sm:h-[44px] flex items-center justify-center transition-colors"
                                >
                                  {yesPrice ? formatPriceCents(yesPrice) : '-'}
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAskClick(outcome.outcome_id, bestAsk?.price || null);
                                  }}
                                  className="w-[70px] sm:w-[120px] px-1 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold whitespace-nowrap bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 active:bg-red-300 dark:active:bg-red-700 touch-manipulation h-[36px] sm:h-[44px] flex items-center justify-center transition-colors"
                                >
                                  {bestAsk ? formatPriceCents(bestAsk.price) : '-'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No outcomes available for this market
          </div>
        )}

        {/* Orderbook and Order Form */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mt-6">
          {/* Orderbook Section */}
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Orderbook</h2>
            {selectedOutcomeId && selectedOrderbook ? (
              <Orderbook
                bids={selectedOrderbook.bids}
                asks={selectedOrderbook.asks}
                userId={user?.id}
                onPriceClick={(price, side) => {
                  const priceDollars = Math.round(price / 100);
                  // Clamp to 1-99 range
                  const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                  setOrderPrice(clampedPrice.toString());
                  setOrderSide(side);
                  setAutoFilled('price');
                  setTimeout(() => setAutoFilled(null), 2000);
                }}
                onCancelOrder={async (orderId) => {
                  try {
                    await api.cancelOrder(orderId);
                    showToast('Order canceled successfully', 'success');
                    // Refresh market data to update orderbook
                    await loadMarket();
                  } catch (err: any) {
                    console.error('Failed to cancel order:', err);
                    showToast(err.message || 'Failed to cancel order', 'error');
                  }
                }}
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                Select an outcome to view orderbook
              </div>
            )}
          </div>

        {/* Order Form Section */}
        <div className="min-w-0">
          {/* Mobile: Floating Action Button */}
          <button
            onClick={() => setBottomSheetOpen(true)}
            className="md:hidden fixed bottom-20 right-4 z-30 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-full p-4 shadow-lg touch-manipulation min-h-[56px] min-w-[56px] flex items-center justify-center"
            aria-label="Place Order"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Desktop: Inline Form */}
          <div className="hidden md:block">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Place Order</h2>
            <form onSubmit={handlePlaceOrder} className="space-y-3 sm:space-y-4">
              {outcomes && outcomes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Outcome</label>
                  <select
                    value={selectedOutcomeId}
                    onChange={(e) => setSelectedOutcomeId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 touch-manipulation"
                  >
                    <option value="">Select an outcome</option>
                    {outcomes.map((outcome) => (
                      <option key={outcome.id} value={outcome.outcome_id}>
                        {outcome.name} ({outcome.ticker})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Side</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderSide('bid')}
                    className={`flex-1 py-3 px-4 rounded font-medium text-sm sm:text-base min-h-[44px] touch-manipulation ${
                      orderSide === 'bid'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Bid (Buy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('ask')}
                    className={`flex-1 py-3 px-4 rounded font-medium text-sm sm:text-base min-h-[44px] touch-manipulation ${
                      orderSide === 'ask'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Ask (Sell)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Price ($)</label>
            <input
              type="tel"
              inputMode="numeric"
              step="1"
              min="1"
              max="99"
              value={orderPrice}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow whole numbers 1-99
                if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) {
                  setOrderPrice(value);
                  setAutoFilled(null);
                }
              }}
              required
              className={`w-full px-4 py-3 text-base border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                autoFilled === 'price' ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
                {autoFilled === 'price' && (
                  <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                    Auto-filled from table
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity</label>
                <div className="flex gap-2 mb-2">
                  {[1, 5, 10, 25].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => handleQuickQuantity(qty)}
                      className="flex-1 py-2 px-3 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 touch-manipulation"
                    >
                      {qty}
                    </button>
                  ))}
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px]"
                />
              </div>

              {/* Order Summary */}
              {orderPrice && orderQty && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Total:</span>
                    <span className="text-lg font-semibold">{formatPrice(orderSummary.totalCost * 100)}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 min-h-[44px] text-base touch-manipulation"
              >
                {submitting ? 'Placing...' : 'Place Order'}
              </button>
            </form>
          </div>
        </div>

          {/* Positions Section */}
          {positions && positions.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Your Positions</h2>
              {loadingPositions ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  ))}
                </div>
              ) : positions.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No positions
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((position) => {
                    const currentPrice = position.current_price !== null && position.current_price !== undefined 
                      ? position.current_price 
                      : null;
                    const positionValue = currentPrice !== null 
                      ? position.net_position * (currentPrice - position.price_basis)
                      : null;
                    
                    return (
                      <div key={position.id} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <div className="font-bold text-sm mb-2">{position.market_name || 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">{position.outcome_ticker || position.outcome_name || position.outcome}</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Net Position:</span>
                            <span className="font-medium">{position.net_position}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Price Basis:</span>
                            <span>{formatPriceBasis(position.price_basis)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Current:</span>
                            <span>{currentPrice !== null ? formatPriceDecimal(currentPrice) : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Position Value:</span>
                            <span className={`font-bold ${
                              positionValue !== null 
                                ? (positionValue > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                                : ''
                            }`}>
                              {positionValue !== null ? formatPriceDecimal(positionValue) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Closed Profit:</span>
                            <span className={`font-bold ${position.closed_profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatPrice(position.closed_profit)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Settled Profit:</span>
                            <span className={`font-bold ${position.settled_profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatPrice(position.settled_profit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recent Trades Section */}
          <div className="mt-6">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Recent Trades</h2>
            {loadingTrades ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : !trades || trades.length === 0 ? (
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No trades yet
              </div>
            ) : (
              <div className="space-y-2">
                {trades.map((trade) => {
                  const isBuy = trade.side === 0;
                  const isSell = trade.side === 1;
                  const sideLabel = isBuy ? 'Buy' : isSell ? 'Sell' : '—';
                  const sideColor = isBuy ? 'text-green-600 dark:text-green-400' : isSell ? 'text-red-600 dark:text-red-400' : '';
                  
                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between gap-2 p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {trade.outcome_ticker && (
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {trade.outcome_ticker}
                          </span>
                        )}
                        <span className={`font-medium ${sideColor}`}>
                          {sideLabel}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {trade.contracts} contracts
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(trade.price)}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {trade.create_time ? format(new Date(trade.create_time * 1000), 'h:mm:ss a') : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet for Order Form */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => {
          setBottomSheetOpen(false);
          setOrderPrice('');
          setOrderQty('');
        }}
        title="Place Order"
      >
        <form onSubmit={(e) => {
          handlePlaceOrder(e);
          setBottomSheetOpen(false);
        }} className="space-y-4">
          {outcomes && outcomes.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Outcome</label>
              <select
                value={selectedOutcomeId}
                onChange={(e) => setSelectedOutcomeId(e.target.value)}
                required
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 touch-manipulation min-h-[44px]"
              >
                <option value="">Select an outcome</option>
                {outcomes.map((outcome) => (
                  <option key={outcome.outcome_id} value={outcome.outcome_id}>
                    {outcome.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Side</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderSide('bid')}
                className={`flex-1 py-3 px-4 rounded font-medium text-base min-h-[44px] touch-manipulation ${
                  orderSide === 'bid'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                Bid (Buy)
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('ask')}
                className={`flex-1 py-3 px-4 rounded font-medium text-base min-h-[44px] touch-manipulation ${
                  orderSide === 'ask'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                Ask (Sell)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price ($)</label>
            {bestBid && orderSide === 'bid' && (
              <button
                type="button"
                onClick={() => {
                  const priceDollars = Math.round(bestBid.price / 100);
                  const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                  setOrderPrice(clampedPrice.toString());
                  setAutoFilled('price');
                  setTimeout(() => setAutoFilled(null), 2000);
                }}
                className="mb-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Use Best Bid: ${Math.round(bestBid.price / 100)}
              </button>
            )}
            {bestAsk && orderSide === 'ask' && (
              <button
                type="button"
                onClick={() => {
                  const priceDollars = Math.round(bestAsk.price / 100);
                  const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                  setOrderPrice(clampedPrice.toString());
                  setAutoFilled('price');
                  setTimeout(() => setAutoFilled(null), 2000);
                }}
                className="mb-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Use Best Ask: ${Math.round(bestAsk.price / 100)}
              </button>
            )}
            <input
              type="tel"
              inputMode="numeric"
              step="1"
              min="1"
              max="99"
              value={orderPrice}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) {
                  setOrderPrice(value);
                  setAutoFilled(null);
                }
              }}
              required
              className={`w-full px-4 py-3 text-base border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                autoFilled === 'price' ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="1-99"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 5, 10, 25].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleQuickQuantity(qty)}
                  className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 touch-manipulation min-h-[44px]"
                >
                  {qty}
                </button>
              ))}
            </div>
            <input
              type="tel"
              inputMode="numeric"
              min="1"
              value={orderQty}
              onChange={(e) => setOrderQty(e.target.value)}
              required
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px]"
              placeholder="Enter quantity"
            />
          </div>

          {/* Order Summary */}
          {orderPrice && orderQty && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Total:</span>
                <span className="text-lg font-semibold">{formatPrice(orderSummary.totalCost * 100)}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 min-h-[44px] text-base touch-manipulation"
          >
            {submitting ? 'Placing...' : 'Place Order'}
          </button>
        </form>
      </BottomSheet>

      {/* Spacer for mobile bottom nav and FAB */}
      <div className="md:hidden h-24"></div>
    </div>
  );
}
