import type { Order } from '../../types';

interface OrderbookProps {
  bids: Order[];
  asks: Order[];
}

export function Orderbook({ bids, asks }: OrderbookProps) {
  const formatPrice = (price: number) => `$${(price / 100).toFixed(2)}`;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-semibold mb-2 text-green-600 dark:text-green-400">Bids</h3>
        <div className="space-y-1">
          {bids.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              No bids
            </div>
          ) : (
            bids.map((bid) => (
              <div
                key={bid.id}
                className="flex justify-between text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded"
              >
                <span className="font-medium">{formatPrice(bid.price)}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {bid.contract_size || 0}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">Asks</h3>
        <div className="space-y-1">
          {asks.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              No asks
            </div>
          ) : (
            asks.map((ask) => (
              <div
                key={ask.id}
                className="flex justify-between text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded"
              >
                <span className="font-medium">{formatPrice(ask.price)}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {ask.contract_size || 0}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
