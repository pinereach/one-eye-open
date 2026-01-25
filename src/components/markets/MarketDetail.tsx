import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Orderbook } from './Orderbook';
import type { Market, Order, Trade, Position, Outcome } from '../../types';
import { format } from 'date-fns';

export function MarketDetail() {
  const { id } = useParams<{ id: string }>();
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
      setOutcomes(data.outcomes || []);
      setOrderbookByOutcome(data.orderbook || {});
      // Set first outcome as selected by default
      if (data.outcomes && data.outcomes.length > 0 && !selectedOutcomeId) {
        setSelectedOutcomeId(data.outcomes[0].outcome_id);
      }
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
    if (!id || !selectedOutcomeId) {
      alert('Please select an outcome');
      return;
    }

    setSubmitting(true);
    try {
      await api.placeOrder(id, {
        outcome_id: selectedOutcomeId,
        side: orderSide,
        price: Math.round(parseFloat(orderPrice) * 100),
        contract_size: parseInt(orderQty, 10),
        tif: 'GTC',
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
        <h1 className="text-2xl font-bold">{market.short_name}</h1>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          <div>Symbol: <span className="font-medium">{market.symbol}</span></div>
          <div>Market ID: <span className="font-medium">{market.market_id}</span></div>
          <div>Winners: <span className="font-medium">{market.min_winners} - {market.max_winners}</span></div>
        </div>
      </div>

      {outcomes.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Outcomes</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {outcomes.map((outcome) => (
              <div
                key={outcome.id}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedOutcomeId === outcome.outcome_id
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onClick={() => setSelectedOutcomeId(outcome.outcome_id)}
              >
                <h3 className="font-semibold">{outcome.name}</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <div>Ticker: {outcome.ticker}</div>
                  <div>Strike: {outcome.strike}</div>
                </div>
                {outcome.settled_price !== null && (
                  <div className="text-sm mt-2">
                    Settled: <span className="font-medium">{formatPrice(outcome.settled_price)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Orderbook</h2>
          {selectedOutcomeId && orderbookByOutcome[selectedOutcomeId] ? (
            <Orderbook
              bids={orderbookByOutcome[selectedOutcomeId].bids}
              asks={orderbookByOutcome[selectedOutcomeId].asks}
            />
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              Select an outcome to view orderbook
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Place Order</h2>
          <form onSubmit={handlePlaceOrder} className="space-y-4">
            {outcomes.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Outcome</label>
                <select
                  value={selectedOutcomeId}
                  onChange={(e) => setSelectedOutcomeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
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
              disabled={submitting}
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
                  <span>Outcome: {pos.outcome}</span>
                  <span>Net Position: {pos.net_position}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <div>Price Basis: {formatPrice(pos.price_basis)}</div>
                  <div>Closed Profit: {formatPrice(pos.closed_profit)}</div>
                  {pos.is_settled === 1 && (
                    <div>Settled Profit: {formatPrice(pos.settled_profit)}</div>
                  )}
                  <div>Status: {pos.is_settled === 1 ? 'Settled' : 'Open'}</div>
                </div>
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
                <span>{formatPrice(trade.price)}</span>
                <span>{trade.contracts} contracts</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {format(new Date(trade.create_time * 1000), 'HH:mm:ss')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
