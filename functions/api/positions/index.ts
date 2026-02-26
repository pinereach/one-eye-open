import type { OnRequest } from '@cloudflare/pages';
import type { D1Database } from '@cloudflare/workers-types';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';
import type { Position } from '../../lib/matching';

/** Valid price_basis range in cents ($1–$99). Clamp so we never return invalid values. */
const PRICE_BASIS_MIN_CENTS = 100;
const PRICE_BASIS_MAX_CENTS = 9900;
function clampPriceBasis(cents: number): number {
  if (cents <= 0) return cents;
  return Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, cents));
}

/** When outcome has settled_price, compute settled_profit from position (matches settlement.ts). Use when DB settled_profit was never written. */
function computedSettledProfitCents(netPosition: number, priceBasis: number, settledPrice: number): number {
  if (netPosition > 0 && priceBasis > 0) {
    return netPosition * (settledPrice - priceBasis);
  }
  if (netPosition < 0 && priceBasis > 0) {
    return Math.abs(netPosition) * (priceBasis - settledPrice);
  }
  return 0;
}

// Recalculate price_basis from trades (source of truth for fills)
async function recalculatePriceBasisFromTrades(
  db: D1Database,
  userId: number,
  outcomeId: string,
  currentNetPosition: number
): Promise<number | null> {
  const rows = await dbQuery<{ price: number; contracts: number; taker_user_id: number | null; maker_user_id: number | null; taker_side: number }>(
    db,
    `SELECT price, contracts, taker_user_id, maker_user_id, taker_side
     FROM trades
     WHERE outcome = ? AND (taker_user_id = ? OR maker_user_id = ?)
     ORDER BY create_time ASC, id ASC`,
    [outcomeId, userId, userId]
  );
  if (rows.length === 0) return null;

  let longContracts: Array<{ price: number; qty: number }> = [];
  let shortContracts: Array<{ price: number; qty: number }> = [];

  for (const row of rows) {
    const isTaker = row.taker_user_id === userId;
    const side = isTaker ? row.taker_side : (1 - row.taker_side); // 0 = buy, 1 = sell
    const qty = row.contracts || 0;
    if (qty === 0) continue;
    const price = row.price;

    if (side === 0) {
      if (shortContracts.length > 0) {
        let remaining = qty;
        while (remaining > 0 && shortContracts.length > 0) {
          const first = shortContracts[0];
          if (first.qty <= remaining) {
            remaining -= first.qty;
            shortContracts.shift();
          } else {
            first.qty -= remaining;
            remaining = 0;
          }
        }
        if (remaining > 0) longContracts.push({ price, qty: remaining });
      } else {
        longContracts.push({ price, qty });
      }
    } else {
      if (longContracts.length > 0) {
        let remaining = qty;
        while (remaining > 0 && longContracts.length > 0) {
          const first = longContracts[0];
          if (first.qty <= remaining) {
            remaining -= first.qty;
            longContracts.shift();
          } else {
            first.qty -= remaining;
            remaining = 0;
          }
        }
        if (remaining > 0) shortContracts.push({ price, qty: remaining });
      } else {
        shortContracts.push({ price, qty });
      }
    }
  }

  const netFromTrades = longContracts.reduce((s, c) => s + c.qty, 0) - shortContracts.reduce((s, c) => s + c.qty, 0);
  if (Math.abs(netFromTrades - currentNetPosition) > 1) return null;

  if (currentNetPosition > 0 && longContracts.length > 0) {
    let totalValue = 0, totalQty = 0;
    for (const c of longContracts) {
      totalValue += c.price * c.qty;
      totalQty += c.qty;
    }
    if (totalQty > 0) return clampPriceBasis(Math.round(totalValue / totalQty));
  } else if (currentNetPosition < 0 && shortContracts.length > 0) {
    let totalValue = 0, totalQty = 0;
    for (const c of shortContracts) {
      totalValue += c.price * c.qty;
      totalQty += c.qty;
    }
    if (totalQty > 0) return clampPriceBasis(Math.round(totalValue / totalQty));
  }
  return null;
}

// Helper function to recalculate price_basis from order history (uses filled qty = original - remaining)
async function recalculatePriceBasis(
  db: D1Database,
  userId: number,
  outcomeId: string,
  currentNetPosition: number
): Promise<number | null> {
  const orders = await dbQuery<{
    price: number;
    side: number;
    contract_size: number | null;
    original_contract_size: number | null;
    create_time: number;
  }>(
    db,
    `SELECT price, side, contract_size, original_contract_size, create_time
     FROM orders
     WHERE outcome = ? AND user_id = ? AND status IN ('filled', 'partial')
     ORDER BY create_time ASC`,
    [outcomeId, userId]
  );

  if (orders.length === 0) {
    return null;
  }

  let longContracts: Array<{ price: number; qty: number }> = [];
  let shortContracts: Array<{ price: number; qty: number }> = [];

  for (const order of orders) {
    const remaining = order.contract_size ?? 0;
    const original = order.original_contract_size ?? order.contract_size ?? 0;
    const qty = Math.max(0, original - remaining);
    if (qty === 0) continue;

    if (order.side === 0) {
      // Bid (buy) - increases long position or closes short
      if (shortContracts.length > 0) {
        // Close short positions first (FIFO)
        let remainingToClose = qty;
        while (remainingToClose > 0 && shortContracts.length > 0) {
          const firstShort = shortContracts[0];
          if (firstShort.qty <= remainingToClose) {
            // Fully close this short position
            remainingToClose -= firstShort.qty;
            shortContracts.shift();
          } else {
            // Partially close
            firstShort.qty -= remainingToClose;
            remainingToClose = 0;
          }
        }
        // If still have remaining, go long
        if (remainingToClose > 0) {
          longContracts.push({ price: order.price, qty: remainingToClose });
        }
      } else {
        // No shorts to close, add to long
        longContracts.push({ price: order.price, qty });
      }
    } else {
      // Ask (sell) - increases short position or closes long
      if (longContracts.length > 0) {
        // Close long positions first (FIFO)
        let remainingToClose = qty;
        while (remainingToClose > 0 && longContracts.length > 0) {
          const firstLong = longContracts[0];
          if (firstLong.qty <= remainingToClose) {
            // Fully close this long position
            remainingToClose -= firstLong.qty;
            longContracts.shift();
          } else {
            // Partially close
            firstLong.qty -= remainingToClose;
            remainingToClose = 0;
          }
        }
        // If still have remaining, go short
        if (remainingToClose > 0) {
          shortContracts.push({ price: order.price, qty: remainingToClose });
        }
      } else {
        // No longs to close, add to short
        shortContracts.push({ price: order.price, qty });
      }
    }
  }

  // Calculate weighted average price_basis based on current net_position
  if (currentNetPosition > 0 && longContracts.length > 0) {
    // Long position: weighted average of remaining long contracts
    let totalValue = 0;
    let totalQty = 0;
    for (const contract of longContracts) {
      totalValue += contract.price * contract.qty;
      totalQty += contract.qty;
    }
    if (totalQty > 0 && Math.abs(totalQty - currentNetPosition) <= 1) {
      // Allow small rounding differences; clamp to valid range
      return clampPriceBasis(Math.round(totalValue / totalQty));
    }
  } else if (currentNetPosition < 0 && shortContracts.length > 0) {
    // Short position: weighted average of remaining short contracts
    let totalValue = 0;
    let totalQty = 0;
    for (const contract of shortContracts) {
      totalValue += contract.price * contract.qty;
      totalQty += contract.qty;
    }
    if (totalQty > 0 && Math.abs(totalQty - Math.abs(currentNetPosition)) <= 1) {
      // Allow small rounding differences; clamp to valid range
      return clampPriceBasis(Math.round(totalValue / totalQty));
    }
  }

  return null;
}

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const db = getDb(env);

  try {

  const url = new URL(request.url);
  if (url.searchParams.get('summary') === '1') {
    const rows = await dbQuery<{ count: number }>(
      db,
      'SELECT COUNT(*) AS count FROM positions WHERE user_id = ?',
      [userIdNum]
    );
    return jsonResponse({ count: rows[0]?.count ?? 0 });
  }

  // Get all positions for the user, joined with outcomes and markets.
  // Total Birdies: outcomes may have market_id 'market_total_birdies' while markets row is 'market-total-birdies'; join both so all positions show.
  const positionsDb = await dbQuery<Position & { outcome_name: string; outcome_ticker: string; market_id: string; market_name: string; outcome_id: string; market_type: string | null; outcome_settled_price: number | null }>(
    db,
    `SELECT 
      p.*,
      o.name as outcome_name,
      o.ticker as outcome_ticker,
      o.outcome_id,
      o.market_id,
      o.settled_price as outcome_settled_price,
      m.short_name as market_name,
      m.market_type
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     JOIN markets m ON (m.market_id = o.market_id OR (o.market_id = 'market_total_birdies' AND m.market_id = 'market-total-birdies'))
     WHERE p.user_id = ?
     ORDER BY p.create_time DESC`,
    [userIdNum]
  );

  // Skip recalc on every GET to reduce D1 reads. Return stored price_basis (clamped for display).
  // Run a one-off or scheduled job to backfill bad price_basis if needed.

  // Normalize Total Birdies market_id for frontend links (canonical: market-total-birdies)
  const normalizeMarketId = (p: typeof positionsDb[0]) => p.market_id === 'market_total_birdies' ? 'market-total-birdies' : p.market_id;

  // Batched best bid/ask: 2 queries for all outcomes (no N+1)
  const clampBasis = (p: typeof positionsDb[0]) => p.net_position !== 0 && p.price_basis > 0 ? clampPriceBasis(p.price_basis) : p.price_basis;
  let positionsWithOrderbook: any[] = positionsDb.map(p => {
    const outcomeSettled = p.outcome_settled_price != null;
    const priceBasis = clampBasis(p);
    const settledProfit = outcomeSettled && p.outcome_settled_price != null
      ? computedSettledProfitCents(p.net_position, priceBasis, p.outcome_settled_price)
      : p.settled_profit;
    const current_price = outcomeSettled ? p.outcome_settled_price : null;
    const { outcome_settled_price, ...rest } = p;
    return { ...rest, market_id: normalizeMarketId(p), price_basis: priceBasis, settled_profit: settledProfit, current_price, settled_price: outcome_settled_price ?? null, best_bid: null, best_ask: null };
  });

  if (positionsDb.length > 0) {
    const posOutcomeIds = [...new Set(positionsDb.map(p => p.outcome))];
    const ph = posOutcomeIds.map(() => '?').join(',');
    const bidsRows = await dbQuery<{ outcome: string; price: number }>(
      db,
      `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 0 AND status IN ('open','partial') ORDER BY outcome, price DESC, create_time ASC`,
      posOutcomeIds
    );
    const asksRows = await dbQuery<{ outcome: string; price: number }>(
      db,
      `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 1 AND status IN ('open','partial') ORDER BY outcome, price ASC, create_time ASC`,
      posOutcomeIds
    );
    const bestBidByOutcome: Record<string, number> = {};
    bidsRows.forEach(r => { if (bestBidByOutcome[r.outcome] == null) bestBidByOutcome[r.outcome] = r.price; });
    const bestAskByOutcome: Record<string, number> = {};
    asksRows.forEach(r => { if (bestAskByOutcome[r.outcome] == null) bestAskByOutcome[r.outcome] = r.price; });
    positionsWithOrderbook = positionsDb.map(p => {
      const outcomeSettled = p.outcome_settled_price != null;
      const priceBasis = clampBasis(p);
      const settledProfit = outcomeSettled && p.outcome_settled_price != null
        ? computedSettledProfitCents(p.net_position, priceBasis, p.outcome_settled_price)
        : p.settled_profit;
      const bidPrice = bestBidByOutcome[p.outcome] ?? null;
      const askPrice = bestAskByOutcome[p.outcome] ?? null;
      const midPrice = (bidPrice !== null && askPrice !== null) ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
      const current_price = outcomeSettled ? p.outcome_settled_price : midPrice;
      const best_bid = outcomeSettled ? null : bidPrice;
      const best_ask = outcomeSettled ? null : askPrice;
      const { outcome_settled_price, ...rest } = p;
      return { ...rest, market_id: normalizeMarketId(p), price_basis: priceBasis, settled_profit: settledProfit, current_price, settled_price: outcome_settled_price ?? null, best_bid, best_ask };
    });
  }

  return jsonResponse({ positions: positionsWithOrderbook });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error('Positions error:', errorMessage);
    if (errorStack) console.error('Stack trace:', errorStack);
    return jsonResponse({ error: 'Failed to load positions', debug: errorMessage }, 500);
  }
};
