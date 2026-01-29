import type { OnRequest } from '@cloudflare/pages';
import type { D1Database } from '@cloudflare/workers-types';
import { getDb, dbQuery, dbRun, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';
import type { Position } from '../../lib/matching';

/** Valid price_basis range in cents ($1–$99). Clamp so we never return invalid values. */
const PRICE_BASIS_MIN_CENTS = 100;
const PRICE_BASIS_MAX_CENTS = 9900;
function clampPriceBasis(cents: number): number {
  if (cents <= 0) return cents;
  return Math.max(PRICE_BASIS_MIN_CENTS, Math.min(PRICE_BASIS_MAX_CENTS, cents));
}

// Helper function to recalculate price_basis from order history
async function recalculatePriceBasis(
  db: D1Database,
  userId: number,
  outcomeId: string,
  currentNetPosition: number
): Promise<number | null> {
  // Get all filled/partial orders for this user/outcome, ordered by time
  // We need to look at orders that have been filled (contract_size > 0)
  const orders = await dbQuery<{
    price: number;
    side: number; // 0 = bid, 1 = ask
    contract_size: number | null;
    create_time: number;
  }>(
    db,
    `SELECT price, side, contract_size, create_time
     FROM orders
     WHERE outcome = ? AND user_id = ? AND status IN ('filled', 'partial') AND contract_size > 0
     ORDER BY create_time ASC`,
    [outcomeId, userId]
  );

  if (orders.length === 0) {
    return null;
  }

  // Simulate position building using FIFO to determine which contracts are still open
  // Track long and short positions separately using FIFO queues
  let longContracts: Array<{ price: number; qty: number }> = [];
  let shortContracts: Array<{ price: number; qty: number }> = [];

  for (const order of orders) {
    const qty = order.contract_size || 0;
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

  // Get all positions for the user, joined with outcomes and markets
  const positionsDb = await dbQuery<Position & { outcome_name: string; outcome_ticker: string; market_id: string; market_name: string; outcome_id: string }>(
    db,
    `SELECT 
      p.*,
      o.name as outcome_name,
      o.ticker as outcome_ticker,
      o.outcome_id,
      o.market_id,
      m.short_name as market_name
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     JOIN markets m ON o.market_id = m.market_id
     WHERE p.user_id = ?
     ORDER BY p.create_time DESC`,
    [userIdNum]
  );

  // Fix positions with price_basis = 0 but net_position != 0
  for (const position of positionsDb) {
    if (position.price_basis === 0 && position.net_position !== 0) {
      const recalculatedBasis = await recalculatePriceBasis(
        db,
        userIdNum,
        position.outcome,
        position.net_position
      );
      if (recalculatedBasis !== null && recalculatedBasis > 0) {
        // Update the position with recalculated price_basis
        await dbRun(
          db,
          `UPDATE positions SET price_basis = ? WHERE id = ?`,
          [recalculatedBasis, position.id]
        );
        // Update the position object for this response
        position.price_basis = recalculatedBasis;
      }
    }
  }

  // Batched best bid/ask: 2 queries for all outcomes (no N+1)
  const clampBasis = (p: typeof positionsDb[0]) => p.net_position !== 0 && p.price_basis > 0 ? clampPriceBasis(p.price_basis) : p.price_basis;
  let positionsWithOrderbook: any[] = positionsDb.map(p => ({ ...p, price_basis: clampBasis(p), current_price: null as number | null }));

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
      const bidPrice = bestBidByOutcome[p.outcome] ?? null;
      const askPrice = bestAskByOutcome[p.outcome] ?? null;
      const current_price = (bidPrice !== null && askPrice !== null) ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
      return { ...p, price_basis: clampBasis(p), current_price };
    });
  }

  return jsonResponse({ positions: positionsWithOrderbook });
};
