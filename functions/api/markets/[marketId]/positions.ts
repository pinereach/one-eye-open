import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { requireAuth, jsonResponse } from '../../../middleware';
import type { Position } from '../../../lib/matching';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  // Get positions for all outcomes in this market, with outcome and market display names
  const positionsDb = await dbQuery<{
    id: number;
    user_id: number | null;
    outcome: string;
    net_position: number;
    price_basis: number;
    closed_profit: number;
    settled_profit: number;
    is_settled: number;
    create_time: number;
    outcome_name: string;
    outcome_ticker: string;
    market_name: string;
  }>(
    db,
    `SELECT 
       p.*,
       o.name as outcome_name,
       o.ticker as outcome_ticker,
       m.short_name as market_name
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     JOIN markets m ON o.market_id = m.market_id
     WHERE o.market_id = ? AND p.user_id = ?`,
    [marketId, userId]
  );

  // Get best bid/ask for each outcome to compute current_price
  const positionsWithPrice = await Promise.all(
    positionsDb.map(async (p) => {
      const bestBid = await dbQuery<{ price: number }>(
        db,
        `SELECT price FROM orders 
         WHERE outcome = ? AND side = 0 AND status IN ('open', 'partial')
         ORDER BY price DESC, create_time ASC LIMIT 1`,
        [p.outcome]
      );
      const bestAsk = await dbQuery<{ price: number }>(
        db,
        `SELECT price FROM orders 
         WHERE outcome = ? AND side = 1 AND status IN ('open', 'partial')
         ORDER BY price ASC, create_time ASC LIMIT 1`,
        [p.outcome]
      );
      const bidPrice = bestBid[0]?.price ?? null;
      const askPrice = bestAsk[0]?.price ?? null;
      const current_price = (bidPrice !== null && askPrice !== null)
        ? (bidPrice + askPrice) / 2
        : bidPrice ?? askPrice ?? null;

      return {
        id: p.id,
        user_id: p.user_id,
        outcome: p.outcome,
        create_time: p.create_time,
        closed_profit: p.closed_profit,
        settled_profit: p.settled_profit,
        net_position: p.net_position,
        price_basis: p.price_basis,
        is_settled: p.is_settled,
        market_name: p.market_name,
        outcome_name: p.outcome_name,
        outcome_ticker: p.outcome_ticker,
        current_price,
      };
    })
  );

  return jsonResponse({ positions: positionsWithPrice });
};
