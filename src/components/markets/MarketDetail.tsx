import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Orderbook } from './Orderbook';
import type { Market, Order, Trade, Position } from '../../types';
import { format } from 'date-fns';

export function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const [market, setMarket] = useState<Market | null>(null);
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSide, setOrderSide] = useState<'bid' | 'ask'>('bid');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setMarket(data.market);
      setBids(data.orderbook.bids);
      setAsks(data.orderbook.asks);
    } catch (err) {
      console.error('Failed to load market:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrades() {
    if (!id) return;
    try {
      const { trades } = await api.getTrades(id, 20);
      setTrades(trades);
    } catch (err) {
      console.error('Failed to load trades:', err);
    }
  }

  async function loadPositions() {
    if (!id) return;
    try {
      const { positions } = await api.getPositions(id);
      setPositions(positions);
    } catch (err) {
      console.error('Failed to load positions:', err);
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    try {
      await api.placeOrder(id, {
        side: orderSide,
        price_cents: Math.round(parseFloat(orderPrice) * 100),
        qty_contracts: parseInt(orderQty, 10),
      });
      setOrderPrice('');
      setOrderQty('');
      await loadMarket();
      await loadTrades();
      await loadPositions();
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading market...</div>;
  }

  if (!market) {
    return <div className="text-center py-8">Market not found</div>;
  }

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{market.title}</h1>
        {market.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">{market.description}</p>
        )}
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          Status: <span className="font-medium">{market.status}</span> • Type:{' '}
          {market.type.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Orderbook</h2>
          <Orderbook bids={bids} asks={asks} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Place Order</h2>
          <form onSubmit={handlePlaceOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Side</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrderSide('bid')}
                  className={`flex-1 py-2 px-4 rounded ${
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
                  className={`flex-1 py-2 px-4 rounded ${
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
              <label className="block text-sm font-medium mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || market.status !== 'open'}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Placing...' : 'Place Order'}
            </button>
          </form>
        </div>
      </div>

      {positions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Positions</h2>
          <div className="space-y-2">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <div className="flex justify-between">
                  <span>Long: {pos.qty_long}</span>
                  <span>Short: {pos.qty_short}</span>
                </div>
                {pos.avg_price_long_cents && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Long: {formatPrice(pos.avg_price_long_cents)}
                  </div>
                )}
                {pos.avg_price_short_cents && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Short: {formatPrice(pos.avg_price_short_cents)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
        <div className="space-y-2">
          {trades.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              No trades yet
            </div>
          ) : (
            trades.map((trade) => (
              <div
                key={trade.id}
                className="flex justify-between p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
              >
                <span>{formatPrice(trade.price_cents)}</span>
                <span>{trade.qty_contracts} contracts</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {format(new Date(trade.created_at * 1000), 'HH:mm:ss')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
