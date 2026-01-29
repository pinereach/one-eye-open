import { useState } from 'react';
import type { Order } from '../../types';
import { formatPrice } from '../../lib/format';

interface OrderbookProps {
  bids: Order[];
  asks: Order[];
  userId?: number;
  onPriceClick?: (price: number, side: 'bid' | 'ask') => void;
  onCancelOrder?: (orderId: number) => void;
}

interface PriceLevel {
  price: number;
  totalSize: number;
  orders: Order[];
  userOrders: Order[];
}

interface CancelDialogProps {
  isOpen: boolean;
  orders: Order[];
  price: number;
  onClose: () => void;
  onCancel: (orderId: number) => void;
}

function CancelDialog({ isOpen, orders, price, onClose, onCancel }: CancelDialogProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold">Cancel Order</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You have multiple orders at {formatPrice(price)}. Select which one to cancel:
          </p>
          <div className="space-y-2">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => {
                  onCancel(order.id);
                  onClose();
                }}
                className="w-full text-left p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm sm:text-base">
                      {order.contract_size || 0} contracts
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {order.create_time ? formatDate(order.create_time) : '—'}
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm">
                    <span className={`px-2 py-1 rounded ${
                      order.status === 'open' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                      order.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Orderbook({ bids, asks, userId, onPriceClick, onCancelOrder }: OrderbookProps) {
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; orders: Order[]; price: number }>({
    isOpen: false,
    orders: [],
    price: 0,
  });

  // Group orders by price level
  const groupByPrice = (orders: Order[]): PriceLevel[] => {
    const priceMap = new Map<number, PriceLevel>();
    
    orders.forEach((order) => {
      const price = order.price || 0;
      if (!priceMap.has(price)) {
        priceMap.set(price, {
          price,
          totalSize: 0,
          orders: [],
          userOrders: [],
        });
      }
      const level = priceMap.get(price)!;
      level.orders.push(order);
      level.totalSize += order.contract_size || 0;
      if (userId !== undefined && order.user_id === userId) {
        level.userOrders.push(order);
      }
    });

    return Array.from(priceMap.values()).sort((a, b) => b.price - a.price);
  };

  // Group asks by price (ascending for asks)
  const groupAsksByPrice = (orders: Order[]): PriceLevel[] => {
    const priceMap = new Map<number, PriceLevel>();
    
    orders.forEach((order) => {
      const price = order.price || 0;
      if (!priceMap.has(price)) {
        priceMap.set(price, {
          price,
          totalSize: 0,
          orders: [],
          userOrders: [],
        });
      }
      const level = priceMap.get(price)!;
      level.orders.push(order);
      level.totalSize += order.contract_size || 0;
      if (userId !== undefined && order.user_id === userId) {
        level.userOrders.push(order);
      }
    });

    return Array.from(priceMap.values()).sort((a, b) => a.price - b.price);
  };

  const bidLevels = groupByPrice(bids);
  const askLevels = groupAsksByPrice(asks);

  // Calculate cumulative volume for depth visualization
  const calculateCumulative = (levels: PriceLevel[]) => {
    let cumulative = 0;
    return levels.map((level) => {
      cumulative += level.totalSize;
      return { ...level, cumulative };
    });
  };

  const bidsWithCumulative = calculateCumulative(bidLevels);
  const asksWithCumulative = calculateCumulative(askLevels);
  const maxCumulative = Math.max(
    ...bidsWithCumulative.map(b => b.cumulative),
    ...asksWithCumulative.map(a => a.cumulative),
    1
  );

  const handleCancelClick = (level: PriceLevel) => {
    const userOrders = level.userOrders.filter(o => o.status === 'open' || o.status === 'partial');
    if (userOrders.length === 0) return;
    
    if (userOrders.length === 1) {
      // Single order, cancel directly
      if (onCancelOrder) {
        onCancelOrder(userOrders[0].id);
      }
    } else {
      // Multiple orders, show dialog
      setCancelDialog({
        isOpen: true,
        orders: userOrders,
        price: level.price,
      });
    }
  };

  return (
    <>
      <CancelDialog
        isOpen={cancelDialog.isOpen}
        orders={cancelDialog.orders}
        price={cancelDialog.price}
        onClose={() => setCancelDialog({ isOpen: false, orders: [], price: 0 })}
        onCancel={(orderId) => {
          if (onCancelOrder) {
            onCancelOrder(orderId);
          }
        }}
      />
      <div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <h3 className="font-bold mb-2 text-sm sm:text-base text-green-600 dark:text-green-400">Yes/Buy</h3>
            <div className="space-y-1">
              {bidLevels.length === 0 ? (
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No bids
                </div>
              ) : (
                bidsWithCumulative.map((level) => {
                  const widthPercent = (level.cumulative / maxCumulative) * 100;
                  const hasUserOrders = level.userOrders.length > 0;
                  const userOrdersAtPrice = level.userOrders.filter(o => o.status === 'open' || o.status === 'partial');
                  const canCancel = hasUserOrders && userOrdersAtPrice.length > 0;
                  
                  return (
                    <div
                      key={level.price}
                      className={`relative flex items-center justify-between text-xs sm:text-sm p-2 rounded transition-colors touch-manipulation ${
                        hasUserOrders
                          ? 'bg-green-100 dark:bg-green-900/40 border-2 border-primary-500 dark:border-primary-400'
                          : 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                      }`}
                      onClick={() => !hasUserOrders && onPriceClick?.(level.price, 'bid')}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-green-200 dark:bg-green-800/40 rounded opacity-30"
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                      <div className="relative z-10 flex items-center gap-1 flex-1">
                        {hasUserOrders && (
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600 dark:text-primary-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canCancel) {
                                handleCancelClick(level);
                              }
                            }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        <span className="font-medium">{formatPrice(level.price)}</span>
                      </div>
                      <div className="relative z-10 flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          {level.totalSize}
                        </span>
                        {canCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelClick(level);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs sm:text-sm font-bold px-1 py-0.5 rounded touch-manipulation"
                            title={userOrdersAtPrice.length > 1 ? `Cancel order (${userOrdersAtPrice.length} at this price)` : 'Cancel order'}
                            aria-label="Cancel order"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2 text-sm sm:text-base text-red-600 dark:text-red-400">No/Sell</h3>
            <div className="space-y-1">
              {askLevels.length === 0 ? (
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No asks
                </div>
              ) : (
                asksWithCumulative.map((level) => {
                  const widthPercent = (level.cumulative / maxCumulative) * 100;
                  const hasUserOrders = level.userOrders.length > 0;
                  const userOrdersAtPrice = level.userOrders.filter(o => o.status === 'open' || o.status === 'partial');
                  const canCancel = hasUserOrders && userOrdersAtPrice.length > 0;
                  
                  return (
                    <div
                      key={level.price}
                      className={`relative flex items-center justify-between text-xs sm:text-sm p-2 rounded transition-colors touch-manipulation ${
                        hasUserOrders
                          ? 'bg-red-100 dark:bg-red-900/40 border-2 border-primary-500 dark:border-primary-400'
                          : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer'
                      }`}
                      onClick={() => !hasUserOrders && onPriceClick?.(level.price, 'ask')}
                    >
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-red-200 dark:bg-red-800/40 rounded opacity-30"
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                      <div className="relative z-10 flex items-center gap-1 flex-1">
                        {hasUserOrders && (
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600 dark:text-primary-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canCancel) {
                                handleCancelClick(level);
                              }
                            }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        <span className="font-medium">{formatPrice(level.price)}</span>
                      </div>
                      <div className="relative z-10 flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          {level.totalSize}
                        </span>
                        {canCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelClick(level);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs sm:text-sm font-bold px-1 py-0.5 rounded touch-manipulation"
                            title={userOrdersAtPrice.length > 1 ? `Cancel order (${userOrdersAtPrice.length} at this price)` : 'Cancel order'}
                            aria-label="Cancel order"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
