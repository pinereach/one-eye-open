import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatPrice, formatPriceBasis, formatPriceDecimal, formatPriceCents } from '../../lib/format';
import { Orderbook } from './Orderbook';
import { ToastContainer, useToast } from '../ui/Toast';
import { BottomSheet } from '../ui/BottomSheet';
import { Tabs } from '../ui/Tabs';
import { Skeleton } from '../ui/Skeleton';
import { Card, CardContent } from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useIsDesktop } from '../../hooks/useIsDesktop';
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
  const [orderSide, setOrderSide] = useState<'bid' | 'ask'>('bid');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState<'price' | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [showOrderbookInForm, setShowOrderbookInForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'outcomes' | 'orderbook' | 'orders' | 'trades' | 'positions'>('outcomes');
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);
  const [cancelingAll, setCancelingAll] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (id) loadMarket();
  }, [id]);

  async function loadMarket() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getMarket(id);
      setMarket(data?.market || null);
      setOutcomes(data?.outcomes || []);
      setOrderbookByOutcome(data?.orderbook || {});
      setTrades(data?.trades ?? []);
      setPositions(data?.positions ?? []);

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
      ]);
    } catch (err: any) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBidClick(outcomeId: string, price: number | null) {
    setSelectedOutcomeId(outcomeId);
    setOrderSide('ask'); // Clicking on a bid = sell to that bid → opens "No" (ask)
    if (price) {
      const priceDollars = Math.round(price / 100);
      // Clamp to 1-99 range
      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
      setOrderPrice(clampedPrice.toString());
      setAutoFilled('price');
      setTimeout(() => setAutoFilled(null), 2000);
    }
    // Open bottom sheet for order form
    setBottomSheetOpen(true);
  }

  function handleAskClick(outcomeId: string, price: number | null) {
    setSelectedOutcomeId(outcomeId);
    setOrderSide('bid'); // Clicking on an ask = buy at that ask → opens "Yes" (bid)
    if (price) {
      const priceDollars = Math.round(price / 100);
      // Clamp to 1-99 range
      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
      setOrderPrice(clampedPrice.toString());
      setAutoFilled('price');
      setTimeout(() => setAutoFilled(null), 2000);
    }
    // Open bottom sheet for order form
    setBottomSheetOpen(true);
  }

  function handleSideChange(newSide: 'bid' | 'ask') {
    setOrderSide(newSide);
    // Auto-update price based on selected side
    if (selectedOrderbook) {
      if (newSide === 'bid' && bestBid) {
        const priceDollars = Math.round(bestBid.price / 100);
        const clampedPrice = Math.max(1, Math.min(99, priceDollars));
        setOrderPrice(clampedPrice.toString());
      } else if (newSide === 'ask' && bestAsk) {
        const priceDollars = Math.round(bestAsk.price / 100);
        const clampedPrice = Math.max(1, Math.min(99, priceDollars));
        setOrderPrice(clampedPrice.toString());
      }
    }
  }

  // Calculate market stats from executed trades only (open orders do not count as volume)
  const marketStats = (() => {
    const totalVolume =
      (trades || []).reduce(
        (sum, t) => sum + (t.contracts || 0) * (t.price ?? 0),
        0
      ) / 100; // price in cents -> dollars

    return {
      totalVolume,
    };
  })();

  // Calculate order summary
  const orderSummary = (() => {
    const price = parseInt(orderPrice, 10) || 0;
    const qty = parseInt(orderQty, 10) || 0;
    // For buy (Yes/bid side): cost = price * quantity
    // For sell (No/ask side): cost = quantity * (100 - price)
    const totalCost = orderSide === 'bid' 
      ? price * qty 
      : qty * (100 - price);
    return {
      totalCost,
      price,
      qty,
    };
  })();

  // Get selected outcome data
  const selectedOrderbook = selectedOutcomeId ? (orderbookByOutcome?.[selectedOutcomeId] || null) : null;
  const bestBid = selectedOrderbook?.bids?.[0];
  const bestAsk = selectedOrderbook?.asks?.[0];

  // Resolve position display names (API may not return market_name/outcome_name for market-scoped positions)
  function getPositionDisplayNames(position: Position) {
    const marketName = position.market_name ?? market?.short_name ?? 'N/A';
    const outcomeMatch = outcomes?.find(o => o.outcome_id === position.outcome);
    const outcomeLabel = position.outcome_ticker ?? position.outcome_name ?? outcomeMatch?.name ?? outcomeMatch?.ticker ?? position.outcome;
    return { marketName, outcomeLabel };
  }

  // Map outcome_id -> position for current user (to show "±N @ $X.X" below outcome name)
  const positionByOutcome = (positions || []).reduce<Record<string, { net_position: number; price_basis: number }>>((acc, p) => {
    acc[p.outcome] = { net_position: p.net_position, price_basis: p.price_basis };
    return acc;
  }, {});

  const formatPositionChip = (netPosition: number, priceBasisCents: number) => {
    const sign = netPosition >= 0 ? '+' : '';
    const priceStr = (priceBasisCents / 100).toFixed(1);
    return `${sign}${netPosition} @ $${priceStr}`;
  };

  // My open orders for this market (lazy: only when Open orders tab is active or desktop)
  const myOpenOrders = useMemo(() => {
    if (!user?.id || !(activeTab === 'orders' || isDesktop)) return [];
    const list: Order[] = [];
    for (const ob of Object.values(orderbookByOutcome)) {
      for (const o of [...(ob.bids || []), ...(ob.asks || [])]) {
        if (o.user_id === user.id && (o.status === 'open' || o.status === 'partial')) list.push(o);
      }
    }
    return list;
  }, [activeTab, isDesktop, orderbookByOutcome, user?.id]);

  async function handleCancelOrder(orderId: number) {
    setCancelingOrderId(orderId);
    try {
      await api.cancelOrder(orderId);
      showToast('Order canceled successfully', 'success');
      await loadMarket();
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelingOrderId(null);
    }
  }

  async function handleCancelAllOrders() {
    if (myOpenOrders.length === 0) return;
    setCancelingAll(true);
    try {
      for (const order of myOpenOrders) {
        await api.cancelOrder(order.id);
      }
      showToast('All orders in this market canceled', 'success');
      await loadMarket();
    } catch (err: any) {
      console.error('Failed to cancel orders:', err);
      showToast(err.message || 'Failed to cancel some orders', 'error');
    } finally {
      setCancelingAll(false);
    }
  }

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
            { id: 'orders', label: 'Open orders' },
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
                      <th className="py-1.5 px-2 sm:py-2 sm:px-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Team</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Chance</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Bid/Sell</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Ask/Buy</th>
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
                            <td className="py-1.5 px-2 sm:py-2 sm:px-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4 sm:w-6 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {outcome.name}
                                  </div>
                                  {positionByOutcome[outcome.outcome_id] && (() => {
                                    const { net_position } = positionByOutcome[outcome.outcome_id];
                                    const isLong = net_position > 0;
                                    return (
                                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold ${isLong ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                        {formatPositionChip(positionByOutcome[outcome.outcome_id].net_position, positionByOutcome[outcome.outcome_id].price_basis)}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                {chance}%
                              </span>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBidClick(outcome.outcome_id, yesPrice);
                                  }}
                                  className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 active:bg-red-300 dark:active:bg-red-700 touch-manipulation min-h-[32px] sm:min-h-[38px] flex flex-col items-center justify-center transition-colors"
                                >
                                  {yesPrice ? formatPriceCents(yesPrice) : '-'}
                                  {bestBid?.contract_size != null && bestBid.contract_size > 0 && (
                                    <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestBid.contract_size}</span>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAskClick(outcome.outcome_id, bestAsk?.price || null);
                                  }}
                                  className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 active:bg-green-300 dark:active:bg-green-700 touch-manipulation min-h-[32px] sm:min-h-[38px] flex flex-col items-center justify-center transition-colors"
                                >
                                  {bestAsk ? formatPriceCents(bestAsk.price) : '-'}
                                  {bestAsk?.contract_size != null && bestAsk.contract_size > 0 && (
                                    <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestAsk.contract_size}</span>
                                  )}
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

        {activeTab === 'orders' && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-bold">Your open orders</h2>
              {myOpenOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleCancelAllOrders}
                  disabled={cancelingAll}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-700 disabled:opacity-50"
                >
                  {cancelingAll ? 'Canceling…' : 'Cancel all'}
                </button>
              )}
            </div>
            {myOpenOrders.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No open orders in this market. Place orders from the Outcomes or Orderbook tab.
              </div>
            ) : (
              <div className="space-y-2">
                {myOpenOrders.map((order) => {
                  const outcomeName = outcomes?.find(o => o.outcome_id === order.outcome)?.name ?? order.outcome;
                  const sideLabel = order.side === 0 ? 'Bid' : 'Sell';
                  const size = order.remaining_size ?? order.contract_size ?? 0;
                  const isCanceling = cancelingOrderId === order.id;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
                        {outcomeName}
                      </span>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                        order.side === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {sideLabel}
                      </span>
                      <span className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                        {formatPriceCents(order.price)} × {size}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isCanceling}
                        className="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                      >
                        {isCanceling ? 'Canceling…' : 'Cancel'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="mt-4">
            {loading ? (
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
                  const sidePillClass = isBuy
                    ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
                    : isSell
                    ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                    : 'bg-gray-400 text-white dark:bg-gray-500 dark:text-white';

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    >
                      <span
                        className={`flex-shrink-0 px-3 py-1 rounded-md text-sm font-bold uppercase ${sidePillClass}`}
                        aria-label={sideLabel !== '—' ? sideLabel : 'Unknown side'}
                      >
                        {sideLabel}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {trade.outcome_ticker && (
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {trade.outcome_ticker}
                          </span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {trade.contracts} @ {formatPrice(trade.price)}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap flex-shrink-0">
                        {trade.create_time ? format(new Date(trade.create_time * 1000), 'M/d h:mm a') : '—'}
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
            {loading ? (
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
                  const { marketName, outcomeLabel } = getPositionDisplayNames(position);
                  const currentPrice = position.current_price !== null && position.current_price !== undefined 
                    ? position.current_price 
                    : null;
                  const costCents = position.net_position * position.price_basis;
                  const positionValueCents = currentPrice !== null 
                    ? position.net_position * currentPrice 
                    : null;
                  const diffCents = positionValueCents !== null 
                    ? positionValueCents - costCents 
                    : null;

                  return (
                    <Card key={position.id} className="mb-3">
                      <CardContent>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">
                              {marketName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {outcomeLabel}
                            </p>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                              {position.net_position} shares at {formatPriceBasis(position.price_basis)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                              {positionValueCents !== null ? formatPriceDecimal(positionValueCents) : formatPriceDecimal(costCents)}
                            </div>
                            <div className={`text-sm sm:text-base font-semibold ${
                              diffCents !== null
                                ? diffCents > 0 ? 'text-green-600 dark:text-green-400' 
                                  : diffCents < 0 ? 'text-red-600 dark:text-red-400' 
                                  : 'text-gray-600 dark:text-gray-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {diffCents !== null ? (
                                <>{(diffCents > 0 ? '↑' : diffCents < 0 ? '↓' : '')} {formatPrice(Math.abs(diffCents))}</>
                              ) : (
                                '—'
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
                      <th className="py-1.5 px-2 sm:py-2 sm:px-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Team</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Chance</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Bid/Sell</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Ask/Buy</th>
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
                            <td className="py-1.5 px-2 sm:py-2 sm:px-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4 sm:w-6 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {outcome.name}
                                  </div>
                                  {positionByOutcome[outcome.outcome_id] && (() => {
                                    const { net_position } = positionByOutcome[outcome.outcome_id];
                                    const isLong = net_position > 0;
                                    return (
                                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold ${isLong ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                        {formatPositionChip(positionByOutcome[outcome.outcome_id].net_position, positionByOutcome[outcome.outcome_id].price_basis)}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                {chance}%
                              </span>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBidClick(outcome.outcome_id, yesPrice);
                                  }}
                                  className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 active:bg-red-300 dark:active:bg-red-700 touch-manipulation min-h-[32px] sm:min-h-[38px] flex flex-col items-center justify-center transition-colors"
                                >
                                  {yesPrice ? formatPriceCents(yesPrice) : '-'}
                                  {bestBid?.contract_size != null && bestBid.contract_size > 0 && (
                                    <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestBid.contract_size}</span>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAskClick(outcome.outcome_id, bestAsk?.price || null);
                                  }}
                                  className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 active:bg-green-300 dark:active:bg-green-700 touch-manipulation min-h-[32px] sm:min-h-[38px] flex flex-col items-center justify-center transition-colors"
                                >
                                  {bestAsk ? formatPriceCents(bestAsk.price) : '-'}
                                  {bestAsk?.contract_size != null && bestAsk.contract_size > 0 && (
                                    <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestAsk.contract_size}</span>
                                  )}
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
                        {outcome.name ?? outcome.ticker}
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
                    onClick={() => handleSideChange('ask')}
                    className={`flex-1 py-3 px-4 rounded font-medium text-sm sm:text-base min-h-[44px] touch-manipulation ${
                      orderSide === 'ask'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Bid/Sell {bestBid ? `$${Math.round(bestBid.price / 100)}` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSideChange('bid')}
                    className={`flex-1 py-3 px-4 rounded font-medium text-sm sm:text-base min-h-[44px] touch-manipulation ${
                      orderSide === 'bid'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Yes/Buy {bestAsk ? `$${Math.round(bestAsk.price / 100)}` : ''}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity</label>
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

              <div>
                <label className="block text-sm font-medium mb-1.5">Price ($)</label>
                {selectedOrderbook && (bestBid || bestAsk) && (
                  <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 flex gap-4">
                    {bestBid && (
                      <span>
                        Yes/Buy: <span className="font-medium text-red-600 dark:text-red-400">{formatPriceCents(bestBid.price)}</span>
                      </span>
                    )}
                    {bestAsk && (
                      <span>
                        Bid/Sell: <span className="font-medium text-green-600 dark:text-green-400">{formatPriceCents(bestAsk.price)}</span>
                      </span>
                    )}
                  </div>
                )}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
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
                className={`w-full pl-8 pr-4 py-3 text-base border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  autoFilled === 'price' ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
                {autoFilled === 'price' && (
                  <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                    Auto-filled from table
                  </div>
                )}
              </div>

              {/* View orderbook toggle */}
              {selectedOutcomeId && selectedOrderbook && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOrderbookInForm((v) => !v)}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    {showOrderbookInForm ? 'Hide orderbook' : 'View orderbook'}
                    <svg className={`w-4 h-4 transition-transform ${showOrderbookInForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showOrderbookInForm && (
                    <div className="mt-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 max-h-[200px] overflow-y-auto">
                      <Orderbook
                        bids={selectedOrderbook.bids}
                        asks={selectedOrderbook.asks}
                        userId={user?.id}
                        onPriceClick={(price, side) => {
                          const priceDollars = Math.round(price / 100);
                          const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                          setOrderPrice(clampedPrice.toString());
                          setOrderSide(side);
                        }}
                        onCancelOrder={async (orderId) => {
                          try {
                            await api.cancelOrder(orderId);
                            showToast('Order canceled successfully', 'success');
                            await loadMarket();
                          } catch (err: any) {
                            showToast(err?.message || 'Failed to cancel order', 'error');
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

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

          {/* Your open orders (desktop) */}
          <div className="mt-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg sm:text-xl font-bold">Your open orders</h2>
              {myOpenOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleCancelAllOrders}
                  disabled={cancelingAll}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-700 disabled:opacity-50"
                >
                  {cancelingAll ? 'Canceling…' : 'Cancel all'}
                </button>
              )}
            </div>
            {myOpenOrders.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No open orders in this market.
              </div>
            ) : (
              <div className="space-y-2">
                {myOpenOrders.map((order) => {
                  const outcomeName = outcomes?.find(o => o.outcome_id === order.outcome)?.name ?? order.outcome;
                  const sideLabel = order.side === 0 ? 'Bid' : 'Sell';
                  const size = order.remaining_size ?? order.contract_size ?? 0;
                  const isCanceling = cancelingOrderId === order.id;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
                        {outcomeName}
                      </span>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                        order.side === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {sideLabel}
                      </span>
                      <span className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                        {formatPriceCents(order.price)} × {size}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isCanceling}
                        className="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                      >
                        {isCanceling ? 'Canceling…' : 'Cancel'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Positions Section */}
          {positions && positions.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Your Positions</h2>
              {loading ? (
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
                    const { marketName, outcomeLabel } = getPositionDisplayNames(position);
                    const currentPrice = position.current_price !== null && position.current_price !== undefined 
                      ? position.current_price 
                      : null;
                    const costCents = position.net_position * position.price_basis;
                    const positionValueCents = currentPrice !== null 
                      ? position.net_position * currentPrice 
                      : null;
                    const diffCents = positionValueCents !== null 
                      ? positionValueCents - costCents 
                      : null;

                    return (
                      <Card key={position.id} className="mb-3">
                        <CardContent>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">
                                {marketName}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {outcomeLabel}
                              </p>
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                                {position.net_position} shares at {formatPriceBasis(position.price_basis)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end text-right">
                              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                                {positionValueCents !== null ? formatPriceDecimal(positionValueCents) : formatPriceDecimal(costCents)}
                              </div>
                              <div className={`text-sm sm:text-base font-semibold ${
                                diffCents !== null
                                  ? diffCents > 0 ? 'text-green-600 dark:text-green-400' 
                                    : diffCents < 0 ? 'text-red-600 dark:text-red-400' 
                                    : 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {diffCents !== null ? (
                                  <>{(diffCents > 0 ? '↑' : diffCents < 0 ? '↓' : '')} {formatPrice(Math.abs(diffCents))}</>
                                ) : (
                                  '—'
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recent Trades Section */}
          <div className="mt-6">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Recent Trades</h2>
            {loading ? (
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
                  const sidePillClass = isBuy
                    ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
                    : isSell
                    ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                    : 'bg-gray-400 text-white dark:bg-gray-500 dark:text-white';

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center gap-3 p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm"
                    >
                      <span
                        className={`flex-shrink-0 px-3 py-1 rounded-md text-xs sm:text-sm font-bold uppercase ${sidePillClass}`}
                        aria-label={sideLabel !== '—' ? sideLabel : 'Unknown side'}
                      >
                        {sideLabel}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {trade.outcome_ticker && (
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {trade.outcome_ticker}
                          </span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {trade.contracts} @ {formatPrice(trade.price)}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap flex-shrink-0">
                        {trade.create_time ? format(new Date(trade.create_time * 1000), 'M/d h:mm a') : '—'}
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
          setShowOrderbookInForm(false);
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
                    {outcome.name ?? outcome.ticker}
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
                onClick={() => handleSideChange('ask')}
                className={`flex-1 py-3 px-4 rounded font-medium text-base min-h-[44px] touch-manipulation ${
                  orderSide === 'ask'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                No {bestBid ? `$${Math.round(bestBid.price / 100)}` : ''}
              </button>
              <button
                type="button"
                onClick={() => handleSideChange('bid')}
                className={`flex-1 py-3 px-4 rounded font-medium text-base min-h-[44px] touch-manipulation ${
                  orderSide === 'bid'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                Yes {bestAsk ? `$${Math.round(bestAsk.price / 100)}` : ''}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
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

          <div>
            <label className="block text-sm font-medium mb-2">Price ($)</label>
            {selectedOrderbook && (bestBid || bestAsk) && (
              <div className="mb-2 text-xs text-gray-600 dark:text-gray-400 flex gap-4">
                {bestBid && (
                  <span>
                    Yes/Buy: <span className="font-medium text-red-600 dark:text-red-400">{formatPriceCents(bestBid.price)}</span>
                  </span>
                )}
                {bestAsk && (
                  <span>
                    Bid/Sell: <span className="font-medium text-green-600 dark:text-green-400">{formatPriceCents(bestAsk.price)}</span>
                  </span>
                )}
              </div>
            )}
          <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
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
                className={`w-full pl-8 pr-4 py-3 text-base border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  autoFilled === 'price' ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="1-99"
              />
            </div>
          </div>

          {/* View orderbook toggle */}
          {selectedOutcomeId && selectedOrderbook && (
            <div>
              <button
                type="button"
                onClick={() => setShowOrderbookInForm((v) => !v)}
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                {showOrderbookInForm ? 'Hide orderbook' : 'View orderbook'}
                <svg className={`w-4 h-4 transition-transform ${showOrderbookInForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showOrderbookInForm && (
                <div className="mt-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 max-h-[200px] overflow-y-auto">
                  <Orderbook
                    bids={selectedOrderbook.bids}
                    asks={selectedOrderbook.asks}
                    userId={user?.id}
                    onPriceClick={(price, side) => {
                      const priceDollars = Math.round(price / 100);
                      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                      setOrderPrice(clampedPrice.toString());
                      setOrderSide(side);
                    }}
                    onCancelOrder={async (orderId) => {
                      try {
                        await api.cancelOrder(orderId);
                        showToast('Order canceled successfully', 'success');
                        await loadMarket();
                      } catch (err: any) {
                        showToast(err?.message || 'Failed to cancel order', 'error');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

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
