import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbFirst, dbRun } from './db';

export interface Order {
  id: string;
  market_id: string;
  user_id: string;
  side: 'bid' | 'ask';
  price_cents: number;
  qty_contracts: number;
  qty_remaining: number;
  status: 'open' | 'partial' | 'filled' | 'canceled';
  created_at: number;
}

export interface Trade {
  id: string;
  market_id: string;
  taker_order_id: string;
  maker_order_id: string;
  price_cents: number;
  qty_contracts: number;
  created_at: number;
}

export interface Position {
  id: string;
  market_id: string;
  user_id: string;
  qty_long: number;
  qty_short: number;
  avg_price_long_cents: number | null;
  avg_price_short_cents: number | null;
  updated_at: number;
}

export interface Fill {
  price_cents: number;
  qty_contracts: number;
  maker_order_id: string;
}

export async function getOppositeOrders(
  db: D1Database,
  marketId: string,
  side: 'bid' | 'ask',
  excludeUserId?: string
): Promise<Order[]> {
  const oppositeSide = side === 'bid' ? 'ask' : 'bid';
  let sql = `
    SELECT * FROM orders
    WHERE market_id = ? AND side = ? AND status IN ('open', 'partial')
    ORDER BY 
      CASE WHEN side = 'bid' THEN price_cents END DESC,
      CASE WHEN side = 'ask' THEN price_cents END ASC,
      created_at ASC
  `;

  const params: any[] = [marketId, oppositeSide];
  if (excludeUserId) {
    sql += ' AND user_id != ?';
    params.push(excludeUserId);
  }

  return dbQuery<Order>(db, sql, params);
}

export function canMatch(bidPrice: number, askPrice: number): boolean {
  return bidPrice >= askPrice;
}

export async function matchOrder(
  db: D1Database,
  takerOrder: Order,
  oppositeOrders: Order[]
): Promise<Fill[]> {
  const fills: Fill[] = [];
  let remainingQty = takerOrder.qty_remaining;

  for (const makerOrder of oppositeOrders) {
    if (remainingQty <= 0) break;

    // Check if orders can match
    const canMatchOrders =
      takerOrder.side === 'bid'
        ? canMatch(takerOrder.price_cents, makerOrder.price_cents)
        : canMatch(makerOrder.price_cents, takerOrder.price_cents);

    if (!canMatchOrders) {
      continue;
    }

    // Match at maker's price (price-time priority)
    const matchPrice = makerOrder.price_cents;
    const matchQty = Math.min(remainingQty, makerOrder.qty_remaining);

    fills.push({
      price_cents: matchPrice,
      qty_contracts: matchQty,
      maker_order_id: makerOrder.id,
    });

    remainingQty -= matchQty;
  }

  return fills;
}

export async function updateOrderStatus(
  db: D1Database,
  orderId: string,
  qtyFilled: number
): Promise<void> {
  const order = await dbFirst<Order>(db, 'SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return;

  const newRemaining = order.qty_remaining - qtyFilled;
  let newStatus: Order['status'];

  if (newRemaining === 0) {
    newStatus = 'filled';
  } else if (newRemaining < order.qty_remaining) {
    newStatus = 'partial';
  } else {
    newStatus = order.status;
  }

  await dbRun(
    db,
    'UPDATE orders SET qty_remaining = ?, status = ? WHERE id = ?',
    [newRemaining, newStatus, orderId]
  );
}

export async function createTrade(
  db: D1Database,
  marketId: string,
  takerOrderId: string,
  makerOrderId: string,
  priceCents: number,
  qtyContracts: number
): Promise<string> {
  const tradeId = crypto.randomUUID();
  await dbRun(
    db,
    `INSERT INTO trades (id, market_id, taker_order_id, maker_order_id, price_cents, qty_contracts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tradeId, marketId, takerOrderId, makerOrderId, priceCents, qtyContracts, Math.floor(Date.now() / 1000)]
  );
  return tradeId;
}

export async function getOrCreatePosition(
  db: D1Database,
  marketId: string,
  userId: string
): Promise<Position> {
  let position = await dbFirst<Position>(
    db,
    'SELECT * FROM positions WHERE market_id = ? AND user_id = ?',
    [marketId, userId]
  );

  if (!position) {
    const positionId = crypto.randomUUID();
    await dbRun(
      db,
      `INSERT INTO positions (id, market_id, user_id, qty_long, qty_short, avg_price_long_cents, avg_price_short_cents, updated_at)
       VALUES (?, ?, ?, 0, 0, NULL, NULL, ?)`,
      [positionId, marketId, userId, Math.floor(Date.now() / 1000)]
    );
    position = await dbFirst<Position>(
      db,
      'SELECT * FROM positions WHERE market_id = ? AND user_id = ?',
      [marketId, userId]
    )!;
  }

  return position!;
}

export async function updatePosition(
  db: D1Database,
  marketId: string,
  userId: string,
  side: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): Promise<void> {
  const position = await getOrCreatePosition(db, marketId, userId);

  let newQtyLong = position.qty_long;
  let newQtyShort = position.qty_short;
  let newAvgPriceLong = position.avg_price_long_cents;
  let newAvgPriceShort = position.avg_price_short_cents;

  if (side === 'bid') {
    // Buying - increase long position or decrease short position
    if (position.qty_short > 0) {
      // Close short position first
      const closeQty = Math.min(qtyContracts, position.qty_short);
      newQtyShort = position.qty_short - closeQty;
      const remainingQty = qtyContracts - closeQty;

      if (remainingQty > 0) {
        // Open new long position
        newQtyLong = position.qty_long + remainingQty;
        if (newAvgPriceLong === null) {
          newAvgPriceLong = priceCents;
        } else {
          // Weighted average
          const totalValue = newAvgPriceLong * position.qty_long + priceCents * remainingQty;
          newAvgPriceLong = Math.round(totalValue / newQtyLong);
        }
      }
    } else {
      // Open new long position
      newQtyLong = position.qty_long + qtyContracts;
      if (newAvgPriceLong === null) {
        newAvgPriceLong = priceCents;
      } else {
        // Weighted average
        const totalValue = newAvgPriceLong * position.qty_long + priceCents * qtyContracts;
        newAvgPriceLong = Math.round(totalValue / newQtyLong);
      }
    }
  } else {
    // Selling - increase short position or decrease long position
    if (position.qty_long > 0) {
      // Close long position first
      const closeQty = Math.min(qtyContracts, position.qty_long);
      newQtyLong = position.qty_long - closeQty;
      const remainingQty = qtyContracts - closeQty;

      if (remainingQty > 0) {
        // Open new short position
        newQtyShort = position.qty_short + remainingQty;
        if (newAvgPriceShort === null) {
          newAvgPriceShort = priceCents;
        } else {
          // Weighted average
          const totalValue = newAvgPriceShort * position.qty_short + priceCents * remainingQty;
          newAvgPriceShort = Math.round(totalValue / newQtyShort);
        }
      }
    } else {
      // Open new short position
      newQtyShort = position.qty_short + qtyContracts;
      if (newAvgPriceShort === null) {
        newAvgPriceShort = priceCents;
      } else {
        // Weighted average
        const totalValue = newAvgPriceShort * position.qty_short + priceCents * qtyContracts;
        newAvgPriceShort = Math.round(totalValue / newQtyShort);
      }
    }
  }

  await dbRun(
    db,
    `UPDATE positions 
     SET qty_long = ?, qty_short = ?, avg_price_long_cents = ?, avg_price_short_cents = ?, updated_at = ?
     WHERE market_id = ? AND user_id = ?`,
    [
      newQtyLong,
      newQtyShort,
      newAvgPriceLong,
      newAvgPriceShort,
      Math.floor(Date.now() / 1000),
      marketId,
      userId,
    ]
  );
}

export async function calculateExposure(
  db: D1Database,
  userId: string,
  maxExposureCents: number
): Promise<{ currentExposure: number; worstCaseLoss: number }> {
  // Get all positions
  const positions = await dbQuery<Position>(
    db,
    'SELECT * FROM positions WHERE user_id = ?',
    [userId]
  );

  // Get all open orders
  const openOrders = await dbQuery<Order>(
    db,
    "SELECT * FROM orders WHERE user_id = ? AND status IN ('open', 'partial')",
    [userId]
  );

  let worstCaseLoss = 0;

  // Calculate worst-case loss from positions
  for (const position of positions) {
    // Long position: lose if market settles at 0
    if (position.qty_long > 0 && position.avg_price_long_cents !== null) {
      worstCaseLoss += position.qty_long * position.avg_price_long_cents;
    }
    // Short position: lose if market settles at 10000
    if (position.qty_short > 0 && position.avg_price_short_cents !== null) {
      worstCaseLoss += position.qty_short * (10000 - position.avg_price_short_cents);
    }
  }

  // Calculate worst-case loss from open orders
  for (const order of openOrders) {
    if (order.side === 'bid') {
      // If filled, worst case is market settles at 0
      worstCaseLoss += order.qty_remaining * order.price_cents;
    } else {
      // If filled, worst case is market settles at 10000
      worstCaseLoss += order.qty_remaining * (10000 - order.price_cents);
    }
  }

  return {
    currentExposure: worstCaseLoss,
    worstCaseLoss,
  };
}

export async function executeMatching(
  db: D1Database,
  takerOrder: Order
): Promise<{ fills: Fill[]; trades: Trade[] }> {
  const fills: Fill[] = [];
  const trades: Trade[] = [];

  // Get opposite side orders sorted by price-time priority
  const oppositeOrders = await getOppositeOrders(db, takerOrder.market_id, takerOrder.side, takerOrder.user_id);

  // Match the order
  const matchedFills = await matchOrder(db, takerOrder, oppositeOrders);

  // Execute all matches in a transaction-like manner
  // Note: D1 doesn't support explicit transactions, so we'll do it sequentially
  for (const fill of matchedFills) {
    // Update maker order
    await updateOrderStatus(db, fill.maker_order_id, fill.qty_contracts);

    // Create trade
    const tradeId = await createTrade(
      db,
      takerOrder.market_id,
      takerOrder.id,
      fill.maker_order_id,
      fill.price_cents,
      fill.qty_contracts
    );

    // Update positions for both users
    const makerOrder = await dbFirst<Order>(db, 'SELECT * FROM orders WHERE id = ?', [fill.maker_order_id]);
    if (makerOrder) {
      // Taker position
      await updatePosition(
        db,
        takerOrder.market_id,
        takerOrder.user_id,
        takerOrder.side,
        fill.price_cents,
        fill.qty_contracts
      );

      // Maker position (opposite side)
      await updatePosition(
        db,
        makerOrder.market_id,
        makerOrder.user_id,
        makerOrder.side,
        fill.price_cents,
        fill.qty_contracts
      );
    }

    const trade = await dbFirst<Trade>(db, 'SELECT * FROM trades WHERE id = ?', [tradeId]);
    if (trade) {
      trades.push(trade);
    }

    fills.push(fill);
  }

  // Update taker order status
  const totalFilled = fills.reduce((sum, f) => sum + f.qty_contracts, 0);
  if (totalFilled > 0) {
    await updateOrderStatus(db, takerOrder.id, totalFilled);
  }

  return { fills, trades };
}
