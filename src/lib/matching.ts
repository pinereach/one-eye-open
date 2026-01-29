import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbFirst, dbRun } from './db';

/** Valid price_basis range in cents ($1–$99). Used to clamp position cost basis. */
const PRICE_BASIS_MIN_CENTS = 100;
const PRICE_BASIS_MAX_CENTS = 9900;

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
  outcomeId: string, // Filter by specific outcome, not just market
  side: 'bid' | 'ask',
  excludeUserId?: string
): Promise<Order[]> {
  // Local DB uses outcome, not market_id. Query orders by outcome with integer side (0=bid, 1=ask)
  const oppositeSideNum = side === 'bid' ? 1 : 0; // 0 = bid, 1 = ask in local DB
  
  const params: any[] = [outcomeId, oppositeSideNum];
  let userExclusion = '';
  
  if (excludeUserId) {
    // Handle NULL user_ids: include them, but exclude the specific user_id
    // In SQL, NULL != value evaluates to NULL (not true), so we need: (user_id IS NULL OR user_id != ?)
    userExclusion = ' AND (o.user_id IS NULL OR o.user_id != ?)';
    // Convert excludeUserId to number if it's a string
    const excludeUserIdNum = typeof excludeUserId === 'string' ? parseInt(excludeUserId, 10) : excludeUserId;
    if (isNaN(excludeUserIdNum as number)) {
      console.error('Invalid excludeUserId:', excludeUserId, 'parsed as:', excludeUserIdNum);
      throw new Error(`Invalid excludeUserId: ${excludeUserId}`);
    }
    params.push(excludeUserIdNum);
  }
  
  const sql = `
    SELECT o.*, oc.market_id
    FROM orders o
    JOIN outcomes oc ON o.outcome = oc.outcome_id
    WHERE o.outcome = ? AND o.side = ? AND o.status IN ('open', 'partial')${userExclusion}
    ORDER BY 
      CASE WHEN o.side = 0 THEN o.price END DESC,
      CASE WHEN o.side = 1 THEN o.price END ASC,
      o.create_time ASC
  `;

  try {
    const dbOrders = await dbQuery<{
      id: number;
      create_time: number;
      user_id: number | null;
      token: string;
      order_id: number;
      outcome: string;
      price: number;
      status: string;
      tif: string;
      side: number;
      contract_size: number | null;
      market_id: string;
    }>(db, sql, params);

    // Convert database orders to matching engine Order format
    return dbOrders.map(o => ({
      id: o.id.toString(),
      market_id: o.market_id,
      user_id: o.user_id?.toString() || '',
      side: o.side === 0 ? 'bid' : 'ask',
      price_cents: o.price,
      qty_contracts: o.contract_size || 0,
      qty_remaining: o.contract_size || 0, // Use contract_size as qty_remaining
      status: o.status as 'open' | 'partial' | 'filled' | 'canceled',
      created_at: o.create_time,
    }));
  } catch (error) {
    throw error;
  }
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
  orderId: string | number,
  qtyFilled: number
): Promise<void> {
  // No-op: never mark as filled when no quantity was actually filled
  if (qtyFilled <= 0) return;

  const orderIdNum = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
  // Local DB uses contract_size, not qty_remaining
  const order = await dbFirst<{
    id: number;
    contract_size: number | null;
    status: string;
  }>(db, 'SELECT id, contract_size, status FROM orders WHERE id = ?', [orderIdNum]);
  if (!order) return;

  const currentQty = order.contract_size ?? 0;
  // Clamp qtyFilled so we never subtract more than current remaining (defensive)
  const effectiveFilled = Math.min(qtyFilled, currentQty);
  const newRemaining = currentQty - effectiveFilled;
  let newStatus: 'open' | 'partial' | 'filled' | 'canceled';

  if (newRemaining <= 0) {
    newStatus = 'filled';
  } else if (newRemaining < currentQty) {
    newStatus = 'partial';
  } else {
    newStatus = (order.status as 'open' | 'partial' | 'filled' | 'canceled') || 'open';
  }

  // Update contract_size to reflect remaining quantity (local DB uses contract_size, not qty_remaining)
  // IMPORTANT: We NEVER update original_contract_size here - it must remain immutable after order creation
  // original_contract_size preserves the original order size even when the order is filled
  await dbRun(
    db,
    'UPDATE orders SET contract_size = ?, status = ? WHERE id = ?',
    [Math.max(0, newRemaining), newStatus, orderIdNum]
  );
}

export async function createTrade(
  db: D1Database,
  _marketId: string, // Keep for reference but trades table doesn't have market_id
  _takerOrderId: string | number,
  _makerOrderId: string | number,
  priceCents: number,
  qtyContracts: number,
  outcomeId?: string, // Optional outcome_id to link trade to outcome
  takerUserId?: number | null,
  makerUserId?: number | null,
  takerSide?: number | null // 0 = buy (bid), 1 = sell (ask) from taker's perspective
): Promise<number> {
  // Local DB uses token, price, contracts, create_time, outcome (not id, market_id, etc.)
  const token = crypto.randomUUID();
  const createTime = Math.floor(Date.now() / 1000);

  // Try insert with taker_user_id/maker_user_id/taker_side first (migration 0033). maker_user_id can be null (e.g. system maker).
  if (takerUserId != null && takerSide != null) {
    try {
      const result = await dbRun(
        db,
        `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff, outcome, taker_user_id, maker_user_id, taker_side)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
        [token, priceCents, qtyContracts, createTime, outcomeId || null, takerUserId, makerUserId ?? null, takerSide]
      );
      const tradeId = result.meta.last_row_id || 0;
      console.log(`[createTrade] Created trade id=${tradeId}, price=${priceCents}, contracts=${qtyContracts}, outcome=${outcomeId || 'null'}, taker_side=${takerSide}`);
      return tradeId;
    } catch (err: unknown) {
      if (!(err as Error)?.message?.includes('no such column')) throw err;
      // Fall through to insert without taker/maker columns
    }
  }

  // Try to insert with outcome column (migration 0021)
  try {
    const result = await dbRun(
      db,
      `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff, outcome)
       VALUES (?, ?, ?, ?, 0, 0, ?)`,
      [token, priceCents, qtyContracts, createTime, outcomeId || null]
    );
    const tradeId = result.meta.last_row_id || 0;
    console.log(`[createTrade] Created trade id=${tradeId}, price=${priceCents}, contracts=${qtyContracts}, outcome=${outcomeId || 'null'}`);
    return tradeId;
  } catch (error: unknown) {
    const msg = (error as Error)?.message ?? '';
    if (msg.includes('no such column: outcome')) {
      const result = await dbRun(
        db,
        `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff)
         VALUES (?, ?, ?, ?, 0, 0)`,
        [token, priceCents, qtyContracts, createTime]
      );
      return result.meta.last_row_id || 0;
    }
    throw error;
  }
}

export async function getOrCreatePosition(
  db: D1Database,
  outcomeId: string, // Local DB uses outcome, not market_id
  userId: string | number
): Promise<Position> {
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  // Local DB uses outcome, net_position, price_basis (not market_id, qty_long, qty_short)
  let positionDb = await dbFirst<{
    id: number;
    user_id: number | null;
    outcome: string;
    net_position: number;
    price_basis: number;
    closed_profit: number;
    settled_profit: number;
    is_settled: number;
  }>(
    db,
    'SELECT * FROM positions WHERE outcome = ? AND user_id = ?',
    [outcomeId, userIdNum]
  );

  if (!positionDb) {
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, 0, 0, 0, 0, 0, ?)`,
      [userIdNum, outcomeId, Math.floor(Date.now() / 1000)]
    );
    positionDb = await dbFirst<{
      id: number;
      user_id: number | null;
      outcome: string;
      net_position: number;
      price_basis: number;
      closed_profit: number;
      settled_profit: number;
      is_settled: number;
    }>(
      db,
      'SELECT * FROM positions WHERE outcome = ? AND user_id = ?',
      [outcomeId, userIdNum]
    )!;
  }

  // Convert to Position interface format (for compatibility)
  // positionDb is guaranteed to be non-null here because we just created it if it didn't exist
  return {
    id: positionDb!.id.toString(),
    market_id: outcomeId, // Use outcomeId as market_id for compatibility
    user_id: positionDb!.user_id?.toString() || '',
    qty_long: Math.max(0, positionDb!.net_position),
    qty_short: Math.max(0, -positionDb!.net_position),
    avg_price_long_cents: positionDb!.net_position > 0 ? positionDb!.price_basis : null,
    avg_price_short_cents: positionDb!.net_position < 0 ? positionDb!.price_basis : null,
    updated_at: Math.floor(Date.now() / 1000),
  };
}

export async function updatePosition(
  db: D1Database,
  outcomeId: string, // Local DB uses outcome, not market_id
  userId: string | number,
  side: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): Promise<void> {
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  // Local DB uses outcome, net_position, price_basis (not market_id, qty_long, qty_short)
  const positionDb = await dbFirst<{
    id: number;
    user_id: number | null;
    outcome: string;
    net_position: number;
    price_basis: number;
    closed_profit: number;
  }>(
    db,
    'SELECT * FROM positions WHERE outcome = ? AND user_id = ?',
    [outcomeId, userIdNum]
  );

  let currentNetPosition = positionDb?.net_position || 0;
  let currentPriceBasis = positionDb?.price_basis || 0;
  let currentClosedProfit = positionDb?.closed_profit || 0;
  let newNetPosition = currentNetPosition;
  let newPriceBasis = currentPriceBasis;
  let newClosedProfit = currentClosedProfit;

  if (side === 'bid') {
    // Buying - increase net position (more long, less short)
    if (currentNetPosition < 0) {
      // Currently short, close some/all of short position
      const closeQty = Math.min(qtyContracts, Math.abs(currentNetPosition));
      const remainingQty = qtyContracts - closeQty;
      newNetPosition = currentNetPosition + closeQty; // Move toward 0
      
      // Calculate closed profit: profit = (price_basis - buy_price) * closeQty
      // For short positions, profit when buying to close at lower price
      if (closeQty > 0 && currentPriceBasis > 0) {
        const profit = (currentPriceBasis - priceCents) * closeQty;
        newClosedProfit = currentClosedProfit + profit;
      }
      
      if (remainingQty > 0) {
        // Go long with remaining (we closed short; new long's basis is this fill price only)
        newNetPosition = newNetPosition + remainingQty;
        newPriceBasis = priceCents;
      } else if (newNetPosition === 0) {
        // Fully closed short (net position is now 0), price_basis resets
        newPriceBasis = 0;
      } else {
        // Partially closed short (still have remaining position), price_basis stays the same
        newPriceBasis = currentPriceBasis;
      }
    } else {
      // Currently long or flat, increase long position
      newNetPosition = currentNetPosition + qtyContracts;
      // Calculate weighted average
      if (currentNetPosition > 0 && currentPriceBasis > 0) {
        const totalValue = currentNetPosition * currentPriceBasis + qtyContracts * priceCents;
        newPriceBasis = Math.round(totalValue / newNetPosition);
      } else {
        newPriceBasis = priceCents;
      }
    }
  } else {
    // Selling - decrease net position (less long, more short)
    if (currentNetPosition > 0) {
      // Currently long, close some/all of long position
      const closeQty = Math.min(qtyContracts, currentNetPosition);
      const remainingQty = qtyContracts - closeQty;
      newNetPosition = currentNetPosition - closeQty; // Move toward 0
      
      // Calculate closed profit: profit = (sell_price - price_basis) * closeQty
      // For long positions, profit when selling to close at higher price
      if (closeQty > 0 && currentPriceBasis > 0) {
        const profit = (priceCents - currentPriceBasis) * closeQty;
        newClosedProfit = currentClosedProfit + profit;
      }
      
      if (remainingQty > 0) {
        // Go short with remaining (we closed long; new short's basis is this fill price only)
        newNetPosition = newNetPosition - remainingQty;
        newPriceBasis = priceCents;
      } else if (newNetPosition === 0) {
        // Fully closed long (net position is now 0), price_basis resets
        newPriceBasis = 0;
      } else {
        // Partially closed long (still have remaining position), price_basis stays the same
        newPriceBasis = currentPriceBasis;
      }
    } else {
      // Currently short or flat, increase short position
      newNetPosition = currentNetPosition - qtyContracts;
      // Calculate weighted average for short
      if (currentNetPosition < 0 && currentPriceBasis > 0) {
        const totalValue = Math.abs(currentNetPosition) * currentPriceBasis + qtyContracts * priceCents;
        newPriceBasis = Math.round(totalValue / Math.abs(newNetPosition));
      } else {
        newPriceBasis = priceCents;
      }
    }
  }

  // Clamp price_basis to valid range ($1–$99) so we never persist invalid values
  if (newNetPosition !== 0 && newPriceBasis > 0) {
    newPriceBasis = Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, newPriceBasis));
  }

  // Create position if it doesn't exist
  if (!positionDb) {
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
      [userIdNum, outcomeId, newNetPosition, newPriceBasis, Math.floor(Date.now() / 1000)]
    );
  } else {
    // Update existing position
    await dbRun(
      db,
      `UPDATE positions 
       SET net_position = ?, price_basis = ?, closed_profit = ?
       WHERE outcome = ? AND user_id = ?`,
      [
        newNetPosition,
        newPriceBasis,
        newClosedProfit,
        outcomeId,
        userIdNum,
      ]
    );
  }
}

export async function calculateExposure(
  db: D1Database,
  userId: string,
  _maxExposureCents: number
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
  takerOrder: Order,
  outcomeId: string // Local DB uses outcome for positions, need to pass it
): Promise<{ fills: Fill[]; trades: Trade[] }> {
  console.log(`[executeMatching] Starting matching for order ${takerOrder.id}, outcomeId=${outcomeId}, side=${takerOrder.side}`);
  const fills: Fill[] = [];
  const trades: Trade[] = [];

  // Get opposite side orders sorted by price-time priority
  // Pass outcomeId to filter by the specific outcome, not just market
  const oppositeOrders = await getOppositeOrders(db, outcomeId, takerOrder.side, takerOrder.user_id);
  console.log(`[executeMatching] Found ${oppositeOrders.length} opposite orders`);

  // Match the order
  const matchedFills = await matchOrder(db, takerOrder, oppositeOrders);
  console.log(`[executeMatching] Matched ${matchedFills.length} fills`);

  // Exclude self-matches: if the taker order somehow appeared in oppositeOrders (bug), ignore that fill
  const takerIdStr = String(takerOrder.id);
  const validFills = matchedFills.filter((f) => String(f.maker_order_id) !== takerIdStr);

  // Execute all matches in a transaction-like manner
  // Note: D1 doesn't support explicit transactions, so we'll do it sequentially
  for (const fill of validFills) {
    // Update maker order
    await updateOrderStatus(db, fill.maker_order_id, fill.qty_contracts);

    // Get maker order for position updates and for trade taker/maker/side (migration 0033)
    const makerOrderId = typeof fill.maker_order_id === 'string' ? parseInt(fill.maker_order_id, 10) : fill.maker_order_id;
    const makerOrderDb = await dbFirst<{
      id: number;
      user_id: number | null;
      outcome: string;
      side: number;
    }>(db, 'SELECT id, user_id, outcome, side FROM orders WHERE id = ?', [makerOrderId]);

    const takerUserId = typeof takerOrder.user_id === 'string' ? parseInt(takerOrder.user_id, 10) : Number(takerOrder.user_id);
    const takerSideNum = takerOrder.side === 'bid' ? 0 : 1; // 0 = buy, 1 = sell
    const makerUserId = makerOrderDb?.user_id ?? null;

    // Create trade - pass outcomeId and taker/maker/side so UI can show Buy/Sell (migration 0033)
    const tradeId = await createTrade(
      db,
      takerOrder.market_id,
      takerOrder.id,
      fill.maker_order_id,
      fill.price_cents,
      fill.qty_contracts,
      outcomeId,
      Number.isNaN(takerUserId) ? null : takerUserId,
      makerUserId,
      takerSideNum
    );

    // Update positions for both users (skip when same user is both taker and maker — net effect is zero)
    const makerUserIdNum = makerUserId != null ? (typeof makerUserId === 'string' ? parseInt(makerUserId, 10) : makerUserId) : null;
    const sameUserBothSides = makerOrderDb && makerUserIdNum != null && !Number.isNaN(takerUserId) && takerUserId === makerUserIdNum;

    if (makerOrderDb && !sameUserBothSides) {
      // Taker position - use outcomeId since positions table uses outcome
      if (!Number.isNaN(takerUserId)) {
        await updatePosition(
          db,
          outcomeId,
          takerUserId,
          takerOrder.side,
          fill.price_cents,
          fill.qty_contracts
        );
      }

      // Maker position: when your order is filled you did that side (bid filled → you bought, ask filled → you sold)
      if (makerUserId != null) {
        await updatePosition(
          db,
          outcomeId,
          makerUserId,
          makerOrderDb.side === 0 ? 'bid' : 'ask',
          fill.price_cents,
          fill.qty_contracts
        );
      }
    }

    const tradeDb = await dbFirst<{
      id: number;
      token: string;
      price: number;
      contracts: number;
      create_time: number;
    }>(db, 'SELECT * FROM trades WHERE id = ?', [tradeId]);
    if (tradeDb) {
      // Convert to Trade interface format
      trades.push({
        id: tradeDb.id.toString(),
        market_id: takerOrder.market_id,
        taker_order_id: takerOrder.id,
        maker_order_id: fill.maker_order_id,
        price_cents: tradeDb.price,
        qty_contracts: tradeDb.contracts,
        created_at: tradeDb.create_time,
      });
    }

    fills.push(fill);
  }

  // Update taker order status (only if we actually had fills and didn't double-count self)
  const totalFilled = fills.reduce((sum, f) => sum + f.qty_contracts, 0);
  if (totalFilled > 0 && totalFilled <= takerOrder.qty_remaining) {
    await updateOrderStatus(db, takerOrder.id, totalFilled);
  }

  console.log(`[executeMatching] Completed: ${fills.length} fills, ${trades.length} trades created`);
  return { fills, trades };
}
