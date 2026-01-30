import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PullToRefresh } from '../components/ui/PullToRefresh';
import { formatPrice, formatPricePercent } from '../lib/format';
import { format } from 'date-fns';
import { Card, CardContent } from '../components/ui/Card';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SwipeableCard } from '../components/ui/SwipeableCard';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const INITIAL_LIMIT = 30;
const HISTORY_PAGE_SIZE = 10;
const INITIAL_HISTORY_VISIBLE = 10;

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [completedVisibleCount, setCompletedVisibleCount] = useState(INITIAL_HISTORY_VISIBLE);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancelAllOpen, setCancelAllOpen] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders(append = false) {
    if (!append) setLoading(true);
    try {
      const offset = append ? orders.length : 0;
      const limit = append ? HISTORY_PAGE_SIZE : INITIAL_LIMIT;
      const { orders: data, hasMore: more } = await api.getAllOrders({ limit, offset });
      if (append) {
        setOrders((prev) => [...prev, ...data]);
      } else {
        setOrders(data ?? []);
        setCompletedVisibleCount(INITIAL_HISTORY_VISIBLE);
      }
      setHasMore(more ?? false);
    } catch (err) {
      console.error('Failed to load orders:', err);
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function doCancelOrder(orderId: number) {
    // Optimistic update: remove from active list immediately so UI updates before refetch
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'canceled' } : o)));
    setCancelOrderId(null);
    try {
      await api.cancelOrder(orderId);
      showToast('Order canceled successfully', 'success');
      await loadOrders(false);
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      showToast(err.message || 'Failed to cancel order', 'error');
      await loadOrders(false);
    }
  }

  async function handleCancelOrder(orderId: number) {
    setCancelOrderId(orderId);
  }

  const activeOrders = orders.filter(order => order.status === 'open' || order.status === 'partial');
  const completedOrders = orders.filter(order => order.status === 'filled' || order.status === 'canceled');
  const completedVisible = completedOrders.slice(0, completedVisibleCount);
  const canShowMore = completedOrders.length > completedVisibleCount || hasMore;

  async function handleShowMore() {
    if (completedOrders.length > completedVisibleCount) {
      setCompletedVisibleCount((c) => c + HISTORY_PAGE_SIZE);
      return;
    }
    if (!hasMore) return;
    setLoadingMore(true);
    try {
      const { orders: data, hasMore: more } = await api.getAllOrders({
        limit: HISTORY_PAGE_SIZE,
        offset: orders.length,
      });
      setOrders((prev) => [...prev, ...(data ?? [])]);
      setHasMore(more ?? false);
      setCompletedVisibleCount((c) => c + HISTORY_PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load more orders:', err);
      showToast('Failed to load more orders', 'error');
    } finally {
      setLoadingMore(false);
    }
  }

  async function doCancelAll() {
    try {
      const cancelPromises = activeOrders.map(order => api.cancelOrder(order.id));
      await Promise.all(cancelPromises);
      showToast('All orders canceled successfully', 'success');
      await loadOrders(false);
    } catch (err: any) {
      console.error('Failed to cancel orders:', err);
      showToast(err.message || 'Failed to cancel all orders', 'error');
    }
  }

  function handleCancelAll() {
    setCancelAllOpen(true);
  }

  const renderOrderCard = (order: any) => {
    const isSell = order.side === 1;
    const orderType = isSell ? 'SELL ORDER' : 'BUY ORDER';
    const orderTypeColor = isSell ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400';
    const originalSize = order.original_size !== undefined && order.original_size !== null ? order.original_size : order.contract_size || 0;
    const remainingSize = order.remaining_size !== undefined && order.remaining_size !== null ? order.remaining_size : (order.status === 'filled' ? 0 : originalSize);
    const filledSize = Math.max(0, originalSize - remainingSize);
    const pricePercent = order.price ? formatPricePercent(order.price) : '0.0%';
    const actionText = isSell ? `Sell ${originalSize} shares for ${pricePercent}` : `Buy ${originalSize} shares for ${pricePercent}`;
    const fillStatus = order.status === 'filled' ? `${originalSize} of ${originalSize} filled` : filledSize > 0 && filledSize < originalSize ? `${filledSize.toFixed(4)} of ${originalSize} filled` : `${filledSize} of ${originalSize} filled`;
    const timestamp = order.create_time ? format(new Date(order.create_time * 1000), 'MM/dd/yy, h:mm:ss a') : '—';

    const cardContent = (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className={`font-bold text-sm ${orderTypeColor}`}>{orderType}</div>
          {(order.status === 'open' || order.status === 'partial') && (
            <button onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-base font-bold p-1 touch-manipulation flex-shrink-0" title="Cancel order" aria-label="Cancel order">×</button>
          )}
        </div>
        <div className="flex items-stretch gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 mb-1">{order.market_name || 'N/A'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{order.outcome_name || order.outcome}</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{actionText}</p>
          </div>
          <div className="flex flex-col items-end text-right flex-shrink-0">
            <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">{fillStatus}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{timestamp}</p>
          </div>
        </div>
      </div>
    );

    if (order.status === 'open' || order.status === 'partial') {
      return (
        <SwipeableCard key={order.id} onSwipeLeft={() => handleCancelOrder(order.id)} leftAction={<span className="text-white font-medium text-sm">Cancel</span>}>
          {cardContent}
        </SwipeableCard>
      );
    }
    return <div key={order.id}>{cardContent}</div>;
  };

  const renderOrderRow = (order: any) => (
    <tr key={order.id} className="border-b border-gray-200 dark:border-gray-700">
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">{order.create_time ? format(new Date(order.create_time * 1000), 'MMM d, yyyy h:mm a') : '—'}</td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">{order.market_name || 'N/A'}</td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">{order.outcome_name || order.outcome}</td>
      <td className="py-3 px-3 sm:px-4 text-center">
        <span className={`text-xs sm:text-sm font-medium ${order.side === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{order.side === 0 ? 'Buy' : 'Sell'}</span>
      </td>
      <td className="py-3 px-3 sm:px-4 text-center font-medium text-xs sm:text-sm">{order.price ? formatPrice(order.price) : '—'}</td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-medium">{order.original_size !== undefined && order.original_size !== null ? order.original_size : order.contract_size || 0}</td>
      <td className="py-3 px-3 sm:px-4 text-center text-xs sm:text-sm">{order.remaining_size !== undefined && order.remaining_size !== null ? order.remaining_size : (order.status === 'filled' ? 0 : order.contract_size || 0)}</td>
      <td className="py-3 px-3 sm:px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className={`text-xs sm:text-sm px-2 py-1 rounded ${order.status === 'filled' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : order.status === 'open' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : order.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>{order.status}</span>
          {order.status === 'open' || order.status === 'partial' ? (
            <button onClick={() => handleCancelOrder(order.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs sm:text-sm font-bold px-1 py-1 rounded touch-manipulation" title="Cancel order" aria-label="Cancel order">×</button>
          ) : null}
        </div>
      </td>
    </tr>
  );

  const thClass = 'py-3 px-3 sm:px-4 text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600';
  const renderOrderTable = (orderList: any[], emptyMessage: string) => (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className={thClass}>Time</th>
              <th className={thClass}>Market</th>
              <th className={thClass}>Outcome</th>
              <th className={thClass}>Side</th>
              <th className={thClass}>Price</th>
              <th className={thClass}>Qty</th>
              <th className={thClass}>Remaining</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{emptyMessage}</td></tr>
            ) : (
              orderList.map(renderOrderRow)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton variant="text" width="200px" height="32px" />
        <div className="md:hidden space-y-3">{[1, 2, 3].map(i => (<SkeletonCard key={i} />))}</div>
        <div className="hidden md:block"><SkeletonTable rows={5} cols={8} /></div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadOrders}>
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Open Orders</h2>
          {activeOrders.length > 0 && (
            <button onClick={handleCancelAll} className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-700 touch-manipulation transition-colors" aria-label="Cancel all orders">Cancel All</button>
          )}
        </div>
        <div className="md:hidden space-y-3">
          {activeOrders.length === 0 ? (
            <EmptyState
              icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
              title="No Open Orders"
              message="You don't have any open orders at the moment. Place an order from a market to get started."
              action={<Link to="/markets" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Browse markets</Link>}
            />
          ) : (
            activeOrders.map(renderOrderCard)
          )}
        </div>
        <div className="hidden md:block">{renderOrderTable(activeOrders, 'No open orders')}</div>
      </div>
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Order History</h2>
        <div className="md:hidden space-y-3">
          {completedVisible.length === 0 ? (
            <Card><CardContent><p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No completed orders</p></CardContent></Card>
          ) : (
            completedVisible.map(renderOrderCard)
          )}
        </div>
        <div className="hidden md:block">{renderOrderTable(completedVisible, 'No completed orders')}</div>
        {canShowMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleShowMore}
              disabled={loadingMore}
              className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg border border-primary-300 dark:border-primary-700 touch-manipulation disabled:opacity-50 transition-colors"
              aria-label="Show more orders"
            >
              {loadingMore ? 'Loading…' : 'Show more'}
            </button>
          </div>
        )}
      </div>
    </div>

    <ConfirmModal
      isOpen={cancelOrderId != null}
      onClose={() => setCancelOrderId(null)}
      onConfirm={() => { if (cancelOrderId != null) doCancelOrder(cancelOrderId); }}
      title="Cancel order"
      message="Are you sure you want to cancel this order?"
      confirmLabel="Cancel order"
      cancelLabel="Keep"
      variant="danger"
    />
    <ConfirmModal
      isOpen={cancelAllOpen}
      onClose={() => setCancelAllOpen(false)}
      onConfirm={doCancelAll}
      title="Cancel all orders"
      message="Are you sure you want to cancel all open orders?"
      confirmLabel="Cancel all"
      cancelLabel="Keep"
      variant="danger"
    />
    </PullToRefresh>
  );
}
