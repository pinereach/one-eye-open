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

  // Batched best bid/ask: 2 queries for all outcomes (no N+1)
  let positionsWithPrice = positionsDb.map(p => ({
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
    current_price: null as number | null,
  }));

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
    const clampPriceBasis = (cents: number, netPosition: number) =>
      netPosition !== 0 && cents > 0 ? Math.max(100, Math.min(9900, cents)) : cents;
    positionsWithPrice = positionsDb.map(p => {
      const bidPrice = bestBidByOutcome[p.outcome] ?? null;
      const askPrice = bestAskByOutcome[p.outcome] ?? null;
      const current_price = (bidPrice !== null && askPrice !== null) ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
      return {
        id: p.id,
        user_id: p.user_id,
        outcome: p.outcome,
        create_time: p.create_time,
        closed_profit: p.closed_profit,
        settled_profit: p.settled_profit,
        net_position: p.net_position,
        price_basis: clampPriceBasis(p.price_basis, p.net_position),
        is_settled: p.is_settled,
        market_name: p.market_name,
        outcome_name: p.outcome_name,
        outcome_ticker: p.outcome_ticker,
        current_price,
      };
    });
  }

  return jsonResponse({ positions: positionsWithPrice });
};
