import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbFirst, dbRun } from './db';

/** Valid price_basis range in cents ($1–$99). Used to clamp position cost basis. */
const PRICE_BASIS_MIN_CENTS = 100;
const PRICE_BASIS_MAX_CENTS = 9900;

/** Reserved user_id for the "system" position (counterparty when maker has no user, rounding residuals). Every position has a non-null user_id. */
export const SYSTEM_USER_ID = 0;

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

/** Compute risk-off (position-closing) stats for a fill: contracts closed per side and each side's realized P&L in cents. */
export function computeRiskOffForFill(
  takerNet: number,
  takerBasis: number,
  makerNet: number,
  makerBasis: number,
  takerSide: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): {
  riskOffContracts: number;
  riskOffContractsTaker: number;
  riskOffContractsMaker: number;
  riskOffPriceDiffCents: number;
  riskOffPriceDiffMakerCents: number;
} {
  const makerSide = takerSide === 'bid' ? 'ask' : 'bid';
  const closeQtyTaker =
    takerSide === 'bid' && takerNet < 0
      ? Math.min(qtyContracts, Math.abs(takerNet))
      : takerSide === 'ask' && takerNet > 0
        ? Math.min(qtyContracts, takerNet)
        : 0;
  const closeQtyMaker =
    makerSide === 'bid' && makerNet < 0
      ? Math.min(qtyContracts, Math.abs(makerNet))
      : makerSide === 'ask' && makerNet > 0
        ? Math.min(qtyContracts, makerNet)
        : 0;
  const riskOffContracts = closeQtyTaker + closeQtyMaker;
  let riskOffPriceDiffCents = 0;
  if (closeQtyTaker > 0 && takerBasis > 0) {
    riskOffPriceDiffCents =
      takerNet < 0 ? (takerBasis - priceCents) * closeQtyTaker : (priceCents - takerBasis) * closeQtyTaker;
  }
  let riskOffPriceDiffMakerCents = 0;
  if (closeQtyMaker > 0 && makerBasis > 0) {
    riskOffPriceDiffMakerCents =
      makerNet < 0 ? (makerBasis - priceCents) * closeQtyMaker : (priceCents - makerBasis) * closeQtyMaker;
  }
  return {
    riskOffContracts,
    riskOffContractsTaker: closeQtyTaker,
    riskOffContractsMaker: closeQtyMaker,
    riskOffPriceDiffCents,
    riskOffPriceDiffMakerCents,
  };
}

export async function createTrade(
  db: D1Database,
  _marketId: string, // Keep for reference but trades table doesn't have market_id
  _takerOrderId: string | number,
  makerOrderIdParam: string | number | null | undefined,
  priceCents: number,
  qtyContracts: number,
  outcomeId?: string, // Optional outcome_id to link trade to outcome
  takerUserId?: number | null,
  makerUserId?: number | null,
  takerSide?: number | null, // 0 = buy (bid), 1 = sell (ask) from taker's perspective
  riskOffContractsTaker: number = 0,
  riskOffContractsMaker: number = 0,
  riskOffPriceDiffTakerCents: number = 0,
  riskOffPriceDiffMakerCents: number = 0
): Promise<number> {
  const token = crypto.randomUUID();
  const createTime = Math.floor(Date.now() / 1000);
  const totalContracts = riskOffContractsTaker + riskOffContractsMaker;
  const makerOrderId =
    makerOrderIdParam != null && makerOrderIdParam !== '' && Number(makerOrderIdParam) > 0
      ? (typeof makerOrderIdParam === 'string' ? parseInt(makerOrderIdParam, 10) : makerOrderIdParam)
      : null;

  if (takerUserId != null && takerSide != null) {
    try {
      const result = await dbRun(
        db,
        `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff_taker, risk_off_price_diff_maker, outcome, taker_user_id, maker_user_id, taker_side, maker_order_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [token, priceCents, qtyContracts, createTime, riskOffContractsTaker, riskOffContractsMaker, riskOffPriceDiffTakerCents, riskOffPriceDiffMakerCents, outcomeId || null, takerUserId, makerUserId ?? null, takerSide, makerOrderId]
      );
      return result.meta.last_row_id || 0;
    } catch (err: unknown) {
      if (!(err as Error)?.message?.includes('no such column')) throw err;
      try {
        const result = await dbRun(
          db,
          `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff, risk_off_price_diff_maker, outcome, taker_user_id, maker_user_id, taker_side)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [token, priceCents, qtyContracts, createTime, totalContracts, riskOffContractsTaker, riskOffContractsMaker, riskOffPriceDiffTakerCents, riskOffPriceDiffMakerCents, outcomeId || null, takerUserId, makerUserId ?? null, takerSide]
        );
        return result.meta.last_row_id || 0;
      } catch {
        const result = await dbRun(
          db,
          `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff, outcome, taker_user_id, maker_user_id, taker_side)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [token, priceCents, qtyContracts, createTime, totalContracts, riskOffPriceDiffTakerCents, outcomeId || null, takerUserId, makerUserId ?? null, takerSide]
        );
        return result.meta.last_row_id || 0;
      }
    }
  }

  try {
    const result = await dbRun(
      db,
      `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff_taker, risk_off_price_diff_maker, outcome, maker_order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [token, priceCents, qtyContracts, createTime, riskOffContractsTaker, riskOffContractsMaker, riskOffPriceDiffTakerCents, riskOffPriceDiffMakerCents, outcomeId || null, makerOrderId]
    );
    return result.meta.last_row_id || 0;
  } catch (err: unknown) {
    if (!(err as Error)?.message?.includes('no such column')) throw err;
    const result = await dbRun(
      db,
      `INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff_taker, risk_off_price_diff_maker, outcome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [token, priceCents, qtyContracts, createTime, riskOffContractsTaker, riskOffContractsMaker, riskOffPriceDiffTakerCents, riskOffPriceDiffMakerCents, outcomeId || null]
    );
    return result.meta.last_row_id || 0;
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

/** Compute new position state and exact total cost (basis * |net|) for one fill, without rounding basis. Used for coordinated zero-sum rounding. */
function computePositionUpdate(
  currentNet: number,
  currentBasis: number,
  currentClosedProfit: number,
  side: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): { newNet: number; newClosedProfit: number; totalValueExact: number } {
  let newNet = currentNet;
  let newClosedProfit = currentClosedProfit;
  let totalValueExact = 0;

  if (side === 'bid') {
    if (currentNet < 0) {
      const closeQty = Math.min(qtyContracts, Math.abs(currentNet));
      const remainingQty = qtyContracts - closeQty;
      newNet = currentNet + closeQty;
      if (closeQty > 0 && currentBasis > 0) {
        newClosedProfit = currentClosedProfit + (currentBasis - priceCents) * closeQty;
      }
      if (remainingQty > 0) {
        newNet = newNet + remainingQty;
        totalValueExact = newNet * priceCents;
      } else if (newNet === 0) {
        totalValueExact = 0;
      } else {
        totalValueExact = Math.abs(newNet) * currentBasis;
      }
    } else {
      newNet = currentNet + qtyContracts;
      if (currentNet > 0 && currentBasis > 0) {
        totalValueExact = currentNet * currentBasis + qtyContracts * priceCents;
      } else {
        totalValueExact = newNet * priceCents;
      }
    }
  } else {
    if (currentNet > 0) {
      const closeQty = Math.min(qtyContracts, currentNet);
      const remainingQty = qtyContracts - closeQty;
      newNet = currentNet - closeQty;
      if (closeQty > 0 && currentBasis > 0) {
        newClosedProfit = currentClosedProfit + (priceCents - currentBasis) * closeQty;
      }
      if (remainingQty > 0) {
        newNet = newNet - remainingQty;
        totalValueExact = Math.abs(newNet) * priceCents;
      } else if (newNet === 0) {
        totalValueExact = 0;
      } else {
        totalValueExact = Math.abs(newNet) * currentBasis;
      }
    } else {
      newNet = currentNet - qtyContracts;
      if (currentNet < 0 && currentBasis > 0) {
        totalValueExact = Math.abs(currentNet) * currentBasis + qtyContracts * priceCents;
      } else {
        totalValueExact = Math.abs(newNet) * priceCents;
      }
    }
  }
  return { newNet, newClosedProfit, totalValueExact };
}

/**
 * Update both taker and maker positions for a single fill with coordinated rounding
 * so that (taker_basis * taker_net + maker_basis * maker_net) equals the exact total cost,
 * preserving zero-sum P&L. Rounding residual (makerClosedAdjust) is applied to the system position so unrealized P&L stays zero-sum.
 */
export async function updatePositionsForFill(
  db: D1Database,
  outcomeId: string,
  takerUserId: number,
  makerUserId: number,
  takerSide: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const takerDb = await dbFirst<{ id: number; net_position: number; price_basis: number; closed_profit: number }>(
    db,
    'SELECT id, net_position, price_basis, closed_profit FROM positions WHERE outcome = ? AND user_id = ?',
    [outcomeId, takerUserId]
  );
  const makerDb = await dbFirst<{ id: number; net_position: number; price_basis: number; closed_profit: number }>(
    db,
    'SELECT id, net_position, price_basis, closed_profit FROM positions WHERE outcome = ? AND user_id = ?',
    [outcomeId, makerUserId]
  );

  const takerCur = { net: takerDb?.net_position ?? 0, basis: takerDb?.price_basis ?? 0, closed: takerDb?.closed_profit ?? 0 };
  const makerCur = { net: makerDb?.net_position ?? 0, basis: makerDb?.price_basis ?? 0, closed: makerDb?.closed_profit ?? 0 };
  const makerSide = takerSide === 'bid' ? 'ask' : 'bid';

  const takerState = computePositionUpdate(takerCur.net, takerCur.basis, takerCur.closed, takerSide, priceCents, qtyContracts);
  const makerState = computePositionUpdate(makerCur.net, makerCur.basis, makerCur.closed, makerSide, priceCents, qtyContracts);

  const exactTotal = takerState.totalValueExact + makerState.totalValueExact;

  let takerBasis: number;
  let makerBasis: number;
  let makerClosedAdjust = 0;

  if (takerState.newNet !== 0) {
    takerBasis = Math.round(takerState.totalValueExact / Math.abs(takerState.newNet));
    takerBasis = Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, takerBasis));
    const takerCost = Math.abs(takerState.newNet) * takerBasis;
    const makerCost = exactTotal - takerCost;
    if (makerState.newNet !== 0) {
      makerBasis = Math.round(makerCost / Math.abs(makerState.newNet));
      makerBasis = Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, makerBasis));
      const makerCostStored = makerBasis * Math.abs(makerState.newNet);
      makerClosedAdjust = makerCost - makerCostStored;
    } else {
      makerBasis = 0;
    }
  } else {
    takerBasis = 0;
    if (makerState.newNet !== 0) {
      makerBasis = Math.round(makerState.totalValueExact / Math.abs(makerState.newNet));
      makerBasis = Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, makerBasis));
    } else {
      makerBasis = 0;
    }
  }

  // Use each side's actual realized closed profit from the fill. Closed profit is per-user realized P&L;
  // we no longer force sum(closed_profit) = 0 (total may be non-zero).
  const takerClosed = takerState.newClosedProfit;
  const makerClosed = makerState.newClosedProfit;

  if (!takerDb) {
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [takerUserId, outcomeId, takerState.newNet, takerBasis, takerClosed, now]
    );
  } else {
    await dbRun(
      db,
      `UPDATE positions SET net_position = ?, price_basis = ?, closed_profit = ? WHERE outcome = ? AND user_id = ?`,
      [takerState.newNet, takerBasis, takerClosed, outcomeId, takerUserId]
    );
  }
  if (!makerDb) {
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [makerUserId, outcomeId, makerState.newNet, makerBasis, makerClosed, now]
    );
  } else {
    await dbRun(
      db,
      `UPDATE positions SET net_position = ?, price_basis = ?, closed_profit = ? WHERE outcome = ? AND user_id = ?`,
      [makerState.newNet, makerBasis, makerClosed, outcomeId, makerUserId]
    );
  }

  // Put rounding residual into system row so total cost basis is preserved and unrealized P&L stays zero-sum.
  if (makerClosedAdjust !== 0) {
    await addSystemClosedProfitOffset(db, outcomeId, -makerClosedAdjust);
  }
}

/** Returns the change in closed_profit (delta) so callers can keep system closed profit zero-sum. */
export async function updatePosition(
  db: D1Database,
  outcomeId: string, // Local DB uses outcome, not market_id
  userId: string | number,
  side: 'bid' | 'ask',
  priceCents: number,
  qtyContracts: number
): Promise<{ closedProfitDelta: number }> {
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

  const closedProfitDelta = newClosedProfit - currentClosedProfit;

  // Create position if it doesn't exist
  if (!positionDb) {
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [userIdNum, outcomeId, newNetPosition, newPriceBasis, newClosedProfit, Math.floor(Date.now() / 1000)]
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
  return { closedProfitDelta };
}

/**
 * Apply an optional closed_profit offset and/or (when provided) opposite net_position/price_basis to the system
 * position (user_id = SYSTEM_USER_ID). Used for: (1) cost-basis rounding residual (makerClosedAdjust) so unrealized P&L stays zero-sum;
 * (2) when maker has no user, pass netPositionDelta and fillPriceCents so the system holds the opposite position and
 * sum(net_position)=0. Every position has a non-null user_id; system uses reserved SYSTEM_USER_ID.
 */
export async function addSystemClosedProfitOffset(
  db: D1Database,
  outcomeId: string,
  closedProfitOffsetCents: number,
  netPositionDelta?: number,
  fillPriceCents?: number
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const existing = await dbFirst<{ id: number; closed_profit: number; net_position: number; price_basis: number }>(
    db,
    'SELECT id, closed_profit, net_position, price_basis FROM positions WHERE outcome = ? AND user_id = ?',
    [outcomeId, SYSTEM_USER_ID]
  );

  const updateNetAndBasis = netPositionDelta != null && netPositionDelta !== 0 && fillPriceCents != null;
  const systemNetDelta = updateNetAndBasis ? -netPositionDelta : 0;
  if (closedProfitOffsetCents === 0 && !updateNetAndBasis) return;

  if (existing) {
    let newClosed = existing.closed_profit + closedProfitOffsetCents;
    let newNet = existing.net_position;
    let newBasis = existing.price_basis;
    if (updateNetAndBasis) {
      newNet = existing.net_position + systemNetDelta;
      const denom = existing.net_position + systemNetDelta;
      if (denom === 0) {
        newBasis = 0;
      } else {
        const totalValue = existing.net_position * existing.price_basis + systemNetDelta * fillPriceCents;
        newBasis = Math.round(totalValue / denom);
      }
      if (newNet !== 0 && newBasis > 0) {
        newBasis = Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, newBasis));
      }
    }
    await dbRun(
      db,
      'UPDATE positions SET closed_profit = ?, net_position = ?, price_basis = ? WHERE outcome = ? AND user_id = ?',
      [newClosed, newNet, newBasis, outcomeId, SYSTEM_USER_ID]
    );
  } else {
    const initialNet = updateNetAndBasis ? systemNetDelta : 0;
    const initialBasis = updateNetAndBasis ? fillPriceCents : 0;
    const basisClamped =
      initialNet !== 0 && initialBasis > 0
        ? Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, initialBasis))
        : initialBasis;
    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [SYSTEM_USER_ID, outcomeId, initialNet, basisClamped, closedProfitOffsetCents, now]
    );
  }
}

type TradeRowReplay = {
  id: number;
  outcome: string;
  price: number;
  contracts: number;
  taker_user_id: number | null;
  maker_user_id: number | null;
  taker_side: number | null;
};

/**
 * Replay all trades for one outcome in order to recompute net_position, price_basis, closed_profit.
 * Zeros those fields for every position in the outcome, then reapplies each trade.
 * Use after deleting a trade (e.g. backout) so positions reflect the correct prior state.
 * Does not change settled_profit or is_settled.
 */
export async function replayOutcomePositions(db: D1Database, outcomeId: string): Promise<void> {
  const trades = await dbQuery<TradeRowReplay>(
    db,
    `SELECT id, outcome, price, contracts, taker_user_id, maker_user_id, taker_side
     FROM trades WHERE outcome = ? AND taker_user_id IS NOT NULL AND taker_side IS NOT NULL
     ORDER BY id ASC`,
    [outcomeId]
  );

  await dbRun(
    db,
    'UPDATE positions SET net_position = 0, price_basis = 0, closed_profit = 0 WHERE outcome = ?',
    [outcomeId]
  );

  for (const t of trades) {
    const takerUserId = t.taker_user_id!;
    const makerUserId = t.maker_user_id ?? null;
    const takerSide = t.taker_side === 1 ? 'ask' : 'bid';
    const price = Number(t.price) || 0;
    const contracts = Number(t.contracts) || 0;
    if (contracts < 1) continue;

    const sameUser = makerUserId != null && makerUserId === takerUserId;

    if (makerUserId != null && !sameUser) {
      await updatePositionsForFill(db, outcomeId, takerUserId, makerUserId, takerSide, price, contracts);
    } else if (sameUser) {
      await updatePosition(db, outcomeId, takerUserId, takerSide, price, contracts);
      const makerSide = takerSide === 'bid' ? 'ask' : 'bid';
      await updatePosition(db, outcomeId, takerUserId, makerSide, price, contracts);
    } else {
      const { closedProfitDelta } = await updatePosition(db, outcomeId, takerUserId, takerSide, price, contracts);
      const netPositionDelta = takerSide === 'bid' ? contracts : -contracts;
      await addSystemClosedProfitOffset(db, outcomeId, -closedProfitDelta, netPositionDelta, price);
    }
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
    const makerUserIdNum = makerUserId != null ? (typeof makerUserId === 'string' ? parseInt(makerUserId, 10) : makerUserId) : null;
    const sameUserBothSides = makerOrderDb && makerUserIdNum != null && !Number.isNaN(takerUserId) && takerUserId === makerUserIdNum;

    // Risk-off: contracts and realized P&L per side (for trade record)
    let riskOffPriceDiffCents = 0;
    let riskOffPriceDiffMakerCents = 0;
    let riskOffContractsTaker = 0;
    let riskOffContractsMaker = 0;
    if (outcomeId && !Number.isNaN(takerUserId) && makerUserIdNum != null && !sameUserBothSides) {
      const takerPos = await dbFirst<{ net_position: number; price_basis: number }>(
        db,
        'SELECT net_position, price_basis FROM positions WHERE outcome = ? AND user_id = ?',
        [outcomeId, takerUserId]
      );
      const makerPos = await dbFirst<{ net_position: number; price_basis: number }>(
        db,
        'SELECT net_position, price_basis FROM positions WHERE outcome = ? AND user_id = ?',
        [outcomeId, makerUserIdNum]
      );
      const takerCur = { net: takerPos?.net_position ?? 0, basis: takerPos?.price_basis ?? 0 };
      const makerCur = { net: makerPos?.net_position ?? 0, basis: makerPos?.price_basis ?? 0 };
      const riskOff = computeRiskOffForFill(
        takerCur.net,
        takerCur.basis,
        makerCur.net,
        makerCur.basis,
        takerOrder.side,
        fill.price_cents,
        fill.qty_contracts
      );
      riskOffPriceDiffCents = riskOff.riskOffPriceDiffCents;
      riskOffPriceDiffMakerCents = riskOff.riskOffPriceDiffMakerCents;
      riskOffContractsTaker = riskOff.riskOffContractsTaker;
      riskOffContractsMaker = riskOff.riskOffContractsMaker;
    } else if (outcomeId && !Number.isNaN(takerUserId) && (makerUserId == null || sameUserBothSides)) {
      const takerPos = await dbFirst<{ net_position: number; price_basis: number }>(
        db,
        'SELECT net_position, price_basis FROM positions WHERE outcome = ? AND user_id = ?',
        [outcomeId, takerUserId]
      );
      const takerCur = { net: takerPos?.net_position ?? 0, basis: takerPos?.price_basis ?? 0 };
      const riskOff = computeRiskOffForFill(takerCur.net, takerCur.basis, 0, 0, takerOrder.side, fill.price_cents, fill.qty_contracts);
      riskOffPriceDiffCents = riskOff.riskOffPriceDiffCents;
      riskOffPriceDiffMakerCents = riskOff.riskOffPriceDiffMakerCents;
      riskOffContractsTaker = riskOff.riskOffContractsTaker;
      riskOffContractsMaker = riskOff.riskOffContractsMaker;
    }

    // Create trade - pass outcomeId, taker/maker/side, and risk-off so UI/export can show closing activity
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
      takerSideNum,
      riskOffContractsTaker,
      riskOffContractsMaker,
      riskOffPriceDiffCents,
      riskOffPriceDiffMakerCents
    );

    // Update positions for both users with coordinated rounding so taker_cost + maker_cost is exact (zero-sum).
    if (makerOrderDb && !sameUserBothSides && !Number.isNaN(takerUserId) && makerUserIdNum != null) {
      await updatePositionsForFill(
        db,
        outcomeId,
        takerUserId,
        makerUserIdNum,
        takerOrder.side,
        fill.price_cents,
        fill.qty_contracts
      );
    } else if (makerOrderDb && sameUserBothSides && !Number.isNaN(takerUserId)) {
      await updatePosition(db, outcomeId, takerUserId, takerOrder.side, fill.price_cents, fill.qty_contracts);
      const makerSideForPos = takerOrder.side === 'bid' ? 'ask' : 'bid';
      await updatePosition(db, outcomeId, takerUserId, makerSideForPos, fill.price_cents, fill.qty_contracts);
    } else if (makerOrderDb && !sameUserBothSides) {
      if (!Number.isNaN(takerUserId)) {
        const { closedProfitDelta } = await updatePosition(db, outcomeId, takerUserId, takerOrder.side, fill.price_cents, fill.qty_contracts);
        if (makerUserId == null) {
          const netPositionDelta = takerOrder.side === 'bid' ? fill.qty_contracts : -fill.qty_contracts;
          // Update system position only (net_position/price_basis) so unrealized P&L stays zero-sum; do not offset closed profit.
          await addSystemClosedProfitOffset(db, outcomeId, 0, netPositionDelta, fill.price_cents);
        }
      }
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
