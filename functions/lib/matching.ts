import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbFirst, dbRun, dbBatch } from './db';

/** Valid price_basis range in cents ($1–$99). Used to clamp position cost basis. */
const PRICE_BASIS_MIN_CENTS = 100;
const PRICE_BASIS_MAX_CENTS = 9900;

/** Pure: compute new position state from one fill. Used for in-memory simulation and batch writes. */
export function computePositionDelta(
  currentNetPosition: number,
  currentPriceBasis: number,
  currentClosedProfit: number,
  side: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): { net_position: number; price_basis: number; closed_profit: number } {
  let newNetPosition = currentNetPosition;
  let newPriceBasis = currentPriceBasis;
  let newClosedProfit = currentClosedProfit;

  if (side === 'bid') {
    if (currentNetPosition < 0) {
      const closeQty = Math.min(qtyContracts, Math.abs(currentNetPosition));
      const remainingQty = qtyContracts - closeQty;
      newNetPosition = currentNetPosition + closeQty;
      if (closeQty > 0 && currentPriceBasis > 0) {
        newClosedProfit = currentClosedProfit + (currentPriceBasis - priceCents) * closeQty;
      }
      if (remainingQty > 0) {
        newNetPosition += remainingQty;
        newPriceBasis = priceCents;
      } else if (newNetPosition === 0) {
        newPriceBasis = 0;
      }
    } else {
      newNetPosition = currentNetPosition + qtyContracts;
      if (currentNetPosition > 0 && currentPriceBasis > 0) {
        const totalValue = currentNetPosition * currentPriceBasis + qtyContracts * priceCents;
        newPriceBasis = Math.round(totalValue / newNetPosition);
      } else {
        newPriceBasis = priceCents;
      }
    }
  } else {
    if (currentNetPosition > 0) {
      const closeQty = Math.min(qtyContracts, currentNetPosition);
      const remainingQty = qtyContracts - closeQty;
      newNetPosition = currentNetPosition - closeQty;
      if (closeQty > 0 && currentPriceBasis > 0) {
        newClosedProfit = currentClosedProfit + (priceCents - currentPriceBasis) * closeQty;
      }
      if (remainingQty > 0) {
        newNetPosition -= remainingQty;
        newPriceBasis = priceCents;
      } else if (newNetPosition === 0) {
        newPriceBasis = 0;
      }
    } else {
      newNetPosition = currentNetPosition - qtyContracts;
      if (currentNetPosition < 0 && currentPriceBasis > 0) {
        const totalValue = Math.abs(currentNetPosition) * currentPriceBasis + qtyContracts * priceCents;
        newPriceBasis = Math.round(totalValue / Math.abs(newNetPosition));
      } else {
        newPriceBasis = priceCents;
      }
    }
  }

  if (newNetPosition !== 0 && newPriceBasis > 0) {
    newPriceBasis = Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, newPriceBasis));
  }
  return { net_position: newNetPosition, price_basis: newPriceBasis, closed_profit: newClosedProfit };
}

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
  outcomeId: string,
  userId: string | number,
  side: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): Promise<void> {
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const positionDb = await dbFirst<{
    id: number;
    net_position: number;
    price_basis: number;
    closed_profit: number;
  }>(db, 'SELECT id, net_position, price_basis, closed_profit FROM positions WHERE outcome = ? AND user_id = ?', [outcomeId, userIdNum]);

  const currentNet = positionDb?.net_position ?? 0;
  const currentBasis = positionDb?.price_basis ?? 0;
  const currentClosed = positionDb?.closed_profit ?? 0;
  const delta = computePositionDelta(currentNet, currentBasis, currentClosed, side, priceCents, qtyContracts);
  const createTime = Math.floor(Date.now() / 1000);

  if (!positionDb) {
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
      [userIdNum, outcomeId, delta.net_position, delta.price_basis, createTime]
    );
  } else {
    await dbRun(
      db,
      `UPDATE positions SET net_position = ?, price_basis = ?, closed_profit = ? WHERE outcome = ? AND user_id = ?`,
      [delta.net_position, delta.price_basis, delta.closed_profit, outcomeId, userIdNum]
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
  outcomeId: string
): Promise<{ fills: Fill[]; trades: Trade[] }> {
  const oppositeOrders = await getOppositeOrders(db, outcomeId, takerOrder.side, takerOrder.user_id);
  const matchedFills = await matchOrder(db, takerOrder, oppositeOrders);
  const takerIdStr = String(takerOrder.id);
  const validFills = matchedFills.filter((f) => String(f.maker_order_id) !== takerIdStr);

  if (validFills.length === 0) {
    return { fills: [], trades: [] };
  }

  const takerUserId = typeof takerOrder.user_id === 'string' ? parseInt(takerOrder.user_id, 10) : Number(takerOrder.user_id);
  const takerSideNum = takerOrder.side === 'bid' ? 0 : 1;
  const makerOrderIds = [...new Set(validFills.map((f) => (typeof f.maker_order_id === 'string' ? parseInt(f.maker_order_id, 10) : f.maker_order_id)))];
  const placeholders = makerOrderIds.map(() => '?').join(',');
  const makerOrdersList = await dbQuery<{
    id: number;
    user_id: number | null;
    side: number;
    contract_size: number | null;
    status: string;
  }>(db, `SELECT id, user_id, side, contract_size, status FROM orders WHERE id IN (${placeholders})`, makerOrderIds);
  const makerOrdersMap = new Map(makerOrdersList.map((o) => [o.id, o]));

  const userIdsForPositions = new Set<number>();
  if (!Number.isNaN(takerUserId)) userIdsForPositions.add(takerUserId);
  makerOrdersList.forEach((o) => { if (o.user_id != null) userIdsForPositions.add(o.user_id); });
  const userIdsArr = [...userIdsForPositions];
  const posPlaceholders = userIdsArr.map(() => '?').join(',');
  const positionRows = await dbQuery<{
    user_id: number;
    net_position: number;
    price_basis: number;
    closed_profit: number;
  }>(db, 'SELECT user_id, net_position, price_basis, closed_profit FROM positions WHERE outcome = ? AND user_id IN (' + posPlaceholders + ')', [outcomeId, ...userIdsArr]);
  const positionByUser = new Map(positionRows.map((p) => [p.user_id, p]));

  const totalFilled = validFills.reduce((sum, f) => sum + f.qty_contracts, 0);
  const createTime = Math.floor(Date.now() / 1000);

  const totalFilledPerMaker = new Map<number, number>();
  for (const fill of validFills) {
    const mid = typeof fill.maker_order_id === 'string' ? parseInt(fill.maker_order_id, 10) : fill.maker_order_id;
    totalFilledPerMaker.set(mid, (totalFilledPerMaker.get(mid) ?? 0) + fill.qty_contracts);
  }

  const positionState = new Map<number, { net_position: number; price_basis: number; closed_profit: number }>();
  for (const uid of userIdsArr) {
    const row = positionByUser.get(uid);
    positionState.set(uid, {
      net_position: row?.net_position ?? 0,
      price_basis: row?.price_basis ?? 0,
      closed_profit: row?.closed_profit ?? 0,
    });
  }

  const statements: { sql: string; params: any[] }[] = [];

  for (const makerId of makerOrderIds) {
    const maker = makerOrdersMap.get(makerId);
    if (!maker) continue;
    const filled = totalFilledPerMaker.get(makerId) ?? 0;
    const current = maker.contract_size ?? 0;
    const newRemaining = Math.max(0, current - filled);
    const newStatus = newRemaining <= 0 ? 'filled' : 'partial';
    statements.push({
      sql: 'UPDATE orders SET contract_size = ?, status = ? WHERE id = ?',
      params: [newRemaining, newStatus, makerId],
    });
  }

  const tradeInsertSql = `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff, outcome, taker_user_id, maker_user_id, taker_side)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`;
  for (const fill of validFills) {
    const maker = makerOrdersMap.get(typeof fill.maker_order_id === 'string' ? parseInt(fill.maker_order_id, 10) : fill.maker_order_id);
    statements.push({
      sql: tradeInsertSql,
      params: [
        crypto.randomUUID(),
        fill.price_cents,
        fill.qty_contracts,
        createTime,
        outcomeId ?? null,
        Number.isNaN(takerUserId) ? null : takerUserId,
        maker?.user_id ?? null,
        takerSideNum,
      ],
    });
  }

  for (const fill of validFills) {
    const maker = makerOrdersMap.get(typeof fill.maker_order_id === 'string' ? parseInt(fill.maker_order_id, 10) : fill.maker_order_id);
    const makerUserId = maker?.user_id ?? null;
    const sameUser = makerUserId != null && takerUserId === makerUserId;
    if (!Number.isNaN(takerUserId)) {
      const cur = positionState.get(takerUserId)!;
      const next = computePositionDelta(cur.net_position, cur.price_basis, cur.closed_profit, takerOrder.side, fill.price_cents, fill.qty_contracts);
      positionState.set(takerUserId, next);
    }
    if (makerUserId != null && !sameUser) {
      const cur = positionState.get(makerUserId)!;
      const makerSide = maker!.side === 0 ? 'bid' : 'ask';
      const next = computePositionDelta(cur.net_position, cur.price_basis, cur.closed_profit, makerSide, fill.price_cents, fill.qty_contracts);
      positionState.set(makerUserId, next);
    }
  }

  for (const [uid, state] of positionState) {
    const hadRow = positionByUser.has(uid);
    if (hadRow) {
      statements.push({
        sql: 'UPDATE positions SET net_position = ?, price_basis = ?, closed_profit = ? WHERE outcome = ? AND user_id = ?',
        params: [state.net_position, state.price_basis, state.closed_profit, outcomeId, uid],
      });
    } else if (state.net_position !== 0 || state.price_basis !== 0 || state.closed_profit !== 0) {
      statements.push({
        sql: `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
             VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
        params: [uid, outcomeId, state.net_position, state.price_basis, createTime],
      });
    }
  }

  if (totalFilled > 0 && totalFilled <= takerOrder.qty_remaining) {
    const takerNewRemaining = Math.max(0, (takerOrder.qty_remaining ?? takerOrder.qty_contracts) - totalFilled);
    const takerNewStatus = takerNewRemaining <= 0 ? 'filled' : 'partial';
    statements.push({
      sql: 'UPDATE orders SET contract_size = ?, status = ? WHERE id = ?',
      params: [takerNewRemaining, takerNewStatus, takerOrder.id],
    });
  }

  const results = await dbBatch(db, statements);

  const numMakerUpdates = makerOrderIds.length;
  const tradeResults = results.slice(numMakerUpdates, numMakerUpdates + validFills.length);
  const trades: Trade[] = tradeResults.map((r, i) => {
    const fill = validFills[i];
    const id = r.meta?.last_row_id ?? 0;
    return {
      id: String(id),
      market_id: takerOrder.market_id,
      taker_order_id: takerOrder.id,
      maker_order_id: fill.maker_order_id,
      price_cents: fill.price_cents,
      qty_contracts: fill.qty_contracts,
      created_at: createTime,
    };
  });

  return { fills: validFills, trades };
}
