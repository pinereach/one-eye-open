import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../middleware';
import type { Order, Position } from '../../../lib/matching';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const db = getDb(env);

  // Get market by market_id (text)
  const market = await dbFirst(db, 'SELECT * FROM markets WHERE market_id = ?', [marketId]);
  if (!market) {
    return errorResponse('Market not found', 404);
  }

  // Get outcomes for this market
  const outcomes = await dbQuery(
    db,
    'SELECT * FROM outcomes WHERE market_id = ? ORDER BY created_date ASC',
    [market.market_id]
  );

  // Get orderbook grouped by outcome (bids and asks per outcome)
  const orderbookByOutcome: Record<string, { bids: Order[]; asks: Order[] }> = {};
  
  for (const outcome of outcomes) {
    // Use outcome_id (text) to match orders
    const bids = await dbQuery<Order>(
      db,
      `SELECT * FROM orders 
       WHERE outcome = ? AND side = 0 AND status IN ('open', 'partial')
       ORDER BY price DESC, create_time ASC`,
      [outcome.outcome_id]
    );

    const asks = await dbQuery<Order>(
      db,
      `SELECT * FROM orders 
       WHERE outcome = ? AND side = 1 AND status IN ('open', 'partial')
       ORDER BY price ASC, create_time ASC`,
      [outcome.outcome_id]
    );

    orderbookByOutcome[outcome.outcome_id] = { bids, asks };
  }

  // Note: Trades no longer have direct market/order references
  // For now, return all recent trades. To filter by market, you would need to:
  // 1. Add market_id back to trades, or
  // 2. Create a trades_orders junction table, or
  // 3. Store market_id in the trade token somehow
  const trades = await dbQuery(
    db,
    `SELECT * FROM trades 
     ORDER BY create_time DESC
     LIMIT 50`,
    []
  );

  return jsonResponse({
    market,
    outcomes,
    orderbook: orderbookByOutcome,
    recentTrades: trades,
  });
};
