import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../middleware';

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
    const bidsDb = await dbQuery<{
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
    }>(
      db,
      `SELECT * FROM orders 
       WHERE outcome = ? AND side = 0 AND status IN ('open', 'partial')
       ORDER BY price DESC, create_time ASC`,
      [outcome.outcome_id]
    );

    const asksDb = await dbQuery<{
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
    }>(
      db,
      `SELECT * FROM orders 
       WHERE outcome = ? AND side = 1 AND status IN ('open', 'partial')
       ORDER BY price ASC, create_time ASC`,
      [outcome.outcome_id]
    );

    // Convert to frontend Order interface format (not matching engine format)
    const bids = bidsDb.map(o => ({
      id: o.id,
      create_time: o.create_time,
      user_id: o.user_id,
      token: o.token,
      order_id: o.order_id,
      outcome: o.outcome,
      price: o.price, // Price in cents, as expected by frontend
      status: o.status as 'open' | 'partial' | 'filled' | 'canceled',
      tif: o.tif,
      side: o.side, // 0 = bid, 1 = ask
      contract_size: o.contract_size,
    }));

    const asks = asksDb.map(o => ({
      id: o.id,
      create_time: o.create_time,
      user_id: o.user_id,
      token: o.token,
      order_id: o.order_id,
      outcome: o.outcome,
      price: o.price, // Price in cents, as expected by frontend
      status: o.status as 'open' | 'partial' | 'filled' | 'canceled',
      tif: o.tif,
      side: o.side, // 0 = bid, 1 = ask
      contract_size: o.contract_size,
    }));

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
