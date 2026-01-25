import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbQuery, type Env } from '../lib/db';
import { jsonResponse, errorResponse } from '../../../middleware';
import type { Order, Position } from '../lib/matching';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const db = getDb(env);

  // Get market
  const market = await dbFirst(db, 'SELECT * FROM markets WHERE id = ?', [marketId]);
  if (!market) {
    return errorResponse('Market not found', 404);
  }

  // Get orderbook (bids and asks)
  const bids = await dbQuery<Order>(
    db,
    `SELECT * FROM orders 
     WHERE market_id = ? AND side = 'bid' AND status IN ('open', 'partial')
     ORDER BY price_cents DESC, created_at ASC`,
    [marketId]
  );

  const asks = await dbQuery<Order>(
    db,
    `SELECT * FROM orders 
     WHERE market_id = ? AND side = 'ask' AND status IN ('open', 'partial')
     ORDER BY price_cents ASC, created_at ASC`,
    [marketId]
  );

  // Get recent trades
  const trades = await dbQuery(
    db,
    `SELECT * FROM trades 
     WHERE market_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [marketId]
  );

  return jsonResponse({
    market,
    orderbook: {
      bids,
      asks,
    },
    recentTrades: trades,
  });
};
