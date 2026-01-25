import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbFirst, dbRun } from './db';

export interface Order {
  id: number;
  create_time: number;
  user_id: number | null;
  token: string;
  order_id: number;
  outcome: string;
  price: number;
  status: 'open' | 'partial' | 'filled' | 'canceled';
  tif: string;
  side: number; // 0 = bid, 1 = ask
  contract_size: number | null;
}

export interface Trade {
  id: number;
  token: string;
  price: number;
  contracts: number;
  create_time: number;
  risk_off_contracts: number;
  risk_off_price_diff: number;
}

export interface Position {
  id: number;
  user_id: string | null;
  outcome: string;
  create_time: number;
  closed_profit: number;
  settled_profit: number;
  net_position: number;
  price_basis: number;
  is_settled: number; // 0 = false, 1 = true
}

export interface Fill {
  price: number;
  contracts: number;
  maker_order_id: string;
}

export async function getOppositeOrders(
  db: D1Database,
  outcome: string,
  side: number, // 0 = bid, 1 = ask
  excludeUserId?: number
): Promise<Order[]> {
  const oppositeSide = side === 0 ? 1 : 0; // 0 = bid, so opposite is 1 = ask
  let sql = `
    SELECT * FROM orders
    WHERE outcome = ? AND side = ? AND status IN ('open', 'partial')
    ORDER BY 
      CASE WHEN side = 0 THEN price END DESC,
      CASE WHEN side = 1 THEN price END ASC,
      create_time ASC
  `;

  const params: any[] = [outcome, oppositeSide];
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
  _db: D1Database,
  takerOrder: Order,
  oppositeOrders: Order[]
): Promise<Fill[]> {
  const fills: Fill[] = [];
  let remainingQty = takerOrder.contract_size || 0;

  for (const makerOrder of oppositeOrders) {
    if (remainingQty <= 0) break;

    // Check if orders can match
    const canMatchOrders =
      takerOrder.side === 0 // bid
        ? canMatch(takerOrder.price, makerOrder.price)
        : canMatch(makerOrder.price, takerOrder.price);

    if (!canMatchOrders) {
      continue;
    }

    // Match at maker's price (price-time priority)
    const matchPrice = makerOrder.price;
    const makerRemaining = makerOrder.contract_size || 0;
    const matchQty = Math.min(remainingQty, makerRemaining);

    fills.push({
      price: matchPrice,
      contracts: matchQty,
      maker_order_id: makerOrder.id.toString(),
    });

    remainingQty -= matchQty;
  }

  return fills;
}

export async function updateOrderStatus(
  db: D1Database,
  orderId: number,
  qtyFilled: number
): Promise<void> {
  const order = await dbFirst<Order>(db, 'SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return;

  const currentSize = order.contract_size || 0;
  const newSize = currentSize - qtyFilled;
  let newStatus: Order['status'];

  if (newSize <= 0) {
    newStatus = 'filled';
    await dbRun(
      db,
      'UPDATE orders SET contract_size = 0, status = ? WHERE id = ?',
      [newStatus, orderId]
    );
  } else if (newSize < currentSize) {
    newStatus = 'partial';
    await dbRun(
      db,
      'UPDATE orders SET contract_size = ?, status = ? WHERE id = ?',
      [newSize, newStatus, orderId]
    );
  }
}

export async function createTrade(
  db: D1Database,
  token: string,
  price: number,
  contracts: number
): Promise<number> {
  const result = await dbRun(
    db,
    `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [token, price, contracts, Math.floor(Date.now() / 1000), 0, 0]
  );
  
  if (!result.meta.last_row_id) {
    throw new Error('Failed to create trade');
  }
  
  return result.meta.last_row_id;
}

export async function getOrCreatePosition(
  db: D1Database,
  outcome: string,
  userId: string
): Promise<Position> {
  let position = await dbFirst<Position>(
    db,
    'SELECT * FROM positions WHERE outcome = ? AND user_id = ?',
    [outcome, userId]
  );

  if (!position) {
    const result = await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, create_time, closed_profit, settled_profit, net_position, price_basis, is_settled)
       VALUES (?, ?, ?, 0, 0, 0, 0, 0)`,
      [userId, outcome, Math.floor(Date.now() / 1000)]
    );
    
    if (!result.meta.last_row_id) {
      throw new Error('Failed to create position');
    }
    
    position = await dbFirst<Position>(
      db,
      'SELECT * FROM positions WHERE id = ?',
      [result.meta.last_row_id]
    )!;
  }

  return position!;
}

export async function updatePosition(
  db: D1Database,
  outcome: string,
  userId: number,
  side: number, // 0 = bid, 1 = ask
  price: number,
  contracts: number
): Promise<void> {
  const position = await getOrCreatePosition(db, outcome, userId);

  // Calculate new net position
  // bid (side=0) increases net_position (going long), ask (side=1) decreases it (going short)
  const positionDelta = side === 0 ? contracts : -contracts;
  const newNetPosition = position.net_position + positionDelta;

  let newClosedProfit = position.closed_profit;
  let newPriceBasis = position.price_basis;

  // Handle position updates
  if (position.net_position === 0) {
    // Opening new position
    newPriceBasis = price;
  } else if (position.net_position > 0 && side === 0) {
    // Adding to long position - weighted average
    const totalValue = position.price_basis * position.net_position + price * contracts;
    newPriceBasis = Math.round(totalValue / newNetPosition);
  } else if (position.net_position < 0 && side === 1) {
    // Adding to short position - weighted average
    const totalValue = position.price_basis * Math.abs(position.net_position) + price * contracts;
    newPriceBasis = Math.round(totalValue / Math.abs(newNetPosition));
  } else if (position.net_position > 0 && side === 1) {
    // Closing/reducing long position (selling)
    const closingQty = Math.min(position.net_position, contracts);
    const remainingQty = contracts - closingQty;
    
    // Calculate profit from closing
    const profitPerContract = price - position.price_basis;
    newClosedProfit += profitPerContract * closingQty;
    
    if (remainingQty > 0) {
      // Going short after closing long
      newPriceBasis = price;
    } else if (newNetPosition > 0) {
      // Partially closed, keep same basis
      newPriceBasis = position.price_basis;
    } else {
      // Fully closed
      newPriceBasis = 0;
    }
  } else if (position.net_position < 0 && side === 0) {
    // Closing/reducing short position (buying)
    const closingQty = Math.min(Math.abs(position.net_position), contracts);
    const remainingQty = contracts - closingQty;
    
    // Calculate profit from closing (short profit = entry price - exit price)
    const profitPerContract = position.price_basis - price;
    newClosedProfit += profitPerContract * closingQty;
    
    if (remainingQty > 0) {
      // Going long after closing short
      newPriceBasis = price;
    } else if (newNetPosition < 0) {
      // Partially closed, keep same basis
      newPriceBasis = position.price_basis;
    } else {
      // Fully closed
      newPriceBasis = 0;
    }
  }

  await dbRun(
    db,
    `UPDATE positions 
     SET net_position = ?, closed_profit = ?, price_basis = ?
     WHERE outcome = ? AND user_id = ?`,
    [
      newNetPosition,
      newClosedProfit,
      newPriceBasis,
      outcome,
      userId,
    ]
  );
}

export async function calculateExposure(
  db: D1Database,
  userId: number,
  _maxExposureCents: number
): Promise<{ currentExposure: number; worstCaseLoss: number }> {
  // Get all positions
  const positions = await dbQuery<Position>(
    db,
    'SELECT * FROM positions WHERE user_id = ? AND is_settled = 0',
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
    if (position.net_position > 0) {
      // Long position: lose if market settles at 0
      worstCaseLoss += position.net_position * position.price_basis;
    } else if (position.net_position < 0) {
      // Short position: lose if market settles at 10000
      worstCaseLoss += Math.abs(position.net_position) * (10000 - position.price_basis);
    }
  }

  // Calculate worst-case loss from open orders
  for (const order of openOrders) {
    const contractSize = order.contract_size || 0;
    if (order.side === 0) { // bid
      // If filled, worst case is market settles at 0
      worstCaseLoss += contractSize * order.price;
    } else { // ask
      // If filled, worst case is market settles at 10000
      worstCaseLoss += contractSize * (10000 - order.price);
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

  if (!takerOrder.outcome) {
    throw new Error('Order must have an outcome');
  }

  // Get opposite side orders sorted by price-time priority
  const oppositeOrders = await getOppositeOrders(db, takerOrder.outcome, takerOrder.side, takerOrder.user_id || undefined);

  // Match the order
  const matchedFills = await matchOrder(db, takerOrder, oppositeOrders);

  // Execute all matches in a transaction-like manner
  // Note: D1 doesn't support explicit transactions, so we'll do it sequentially
  for (const fill of matchedFills) {
    // Update maker order
    await updateOrderStatus(db, parseInt(fill.maker_order_id), fill.contracts);

    // Generate unique token for this trade
    const tradeToken = crypto.randomUUID();

    // Create trade
    const tradeId = await createTrade(
      db,
      tradeToken,
      fill.price,
      fill.contracts
    );

    // Update positions for both users
    const makerOrder = await dbFirst<Order>(db, 'SELECT * FROM orders WHERE id = ?', [fill.maker_order_id]);
    if (makerOrder && takerOrder.user_id) {
      // Taker position
      await updatePosition(
        db,
        takerOrder.outcome,
        takerOrder.user_id,
        takerOrder.side,
        fill.price,
        fill.contracts
      );

      // Maker position (opposite side)
      if (makerOrder.user_id) {
        await updatePosition(
          db,
          makerOrder.outcome,
          makerOrder.user_id,
          makerOrder.side,
          fill.price,
          fill.contracts
        );
      }
    }

    const trade = await dbFirst<Trade>(db, 'SELECT * FROM trades WHERE id = ?', [tradeId]);
    if (trade) {
      trades.push(trade);
    }

    fills.push(fill);
  }

  // Update taker order status
  const totalFilled = fills.reduce((sum, f) => sum + f.contracts, 0);
  if (totalFilled > 0) {
    await updateOrderStatus(db, takerOrder.id, totalFilled);
  }

  return { fills, trades };
}
