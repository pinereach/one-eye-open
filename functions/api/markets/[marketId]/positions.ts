import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { requireAuth, jsonResponse } from '../../../middleware';
import type { Position } from '../../../lib/matching';

/** When outcome has settled_price, compute settled_profit from position (matches settlement.ts logic). Use when DB settled_profit was never written (e.g. outcome settled manually). */
function computedSettledProfitCents(netPosition: number, priceBasis: number, settledPrice: number): number {
  if (netPosition > 0 && priceBasis > 0) {
    return netPosition * (settledPrice - priceBasis);
  }
  if (netPosition < 0 && priceBasis > 0) {
    return Math.abs(netPosition) * (priceBasis - settledPrice);
  }
  return 0;
}

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  // Get positions for all outcomes in this market, with outcome and market display names. Include outcome.settled_price for settled logic.
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
    outcome_settled_price: number | null;
  }>(
    db,
    `SELECT 
       p.*,
       o.name as outcome_name,
       o.ticker as outcome_ticker,
       o.settled_price as outcome_settled_price,
       m.short_name as market_name
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     JOIN markets m ON o.market_id = m.market_id
     WHERE o.market_id = ? AND p.user_id = ?`,
    [marketId, userId]
  );

  const clampPriceBasis = (cents: number, netPosition: number) =>
    netPosition !== 0 && cents > 0 ? Math.max(100, Math.min(9900, cents)) : cents;

  let positionsWithPrice = positionsDb.map(p => {
    const outcomeSettled = p.outcome_settled_price != null;
    const priceBasis = clampPriceBasis(p.price_basis, p.net_position);
    const settledProfit = outcomeSettled && p.outcome_settled_price != null
      ? computedSettledProfitCents(p.net_position, priceBasis, p.outcome_settled_price)
      : p.settled_profit;
    return {
      id: p.id,
      user_id: p.user_id,
      outcome: p.outcome,
      create_time: p.create_time,
      closed_profit: p.closed_profit,
      settled_profit: settledProfit,
      net_position: p.net_position,
      price_basis: priceBasis,
      is_settled: p.is_settled,
      market_name: p.market_name,
      outcome_name: p.outcome_name,
      outcome_ticker: p.outcome_ticker,
      current_price: outcomeSettled ? p.outcome_settled_price : null,
      settled_price: p.outcome_settled_price ?? null,
      best_bid: null as number | null,
      best_ask: null as number | null,
    };
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
    positionsWithPrice = positionsDb.map(p => {
      const outcomeSettled = p.outcome_settled_price != null;
      const priceBasis = clampPriceBasis(p.price_basis, p.net_position);
      const settledProfit = outcomeSettled && p.outcome_settled_price != null
        ? computedSettledProfitCents(p.net_position, priceBasis, p.outcome_settled_price)
        : p.settled_profit;
      const bidPrice = bestBidByOutcome[p.outcome] ?? null;
      const askPrice = bestAskByOutcome[p.outcome] ?? null;
      const midPrice = (bidPrice !== null && askPrice !== null) ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
      const current_price = outcomeSettled ? p.outcome_settled_price : midPrice;
      return {
        id: p.id,
        user_id: p.user_id,
        outcome: p.outcome,
        create_time: p.create_time,
        closed_profit: p.closed_profit,
        settled_profit: settledProfit,
        net_position: p.net_position,
        price_basis: priceBasis,
        is_settled: p.is_settled,
        market_name: p.market_name,
        outcome_name: p.outcome_name,
        outcome_ticker: p.outcome_ticker,
        current_price,
        settled_price: p.outcome_settled_price ?? null,
        best_bid: outcomeSettled ? null : bidPrice,
        best_ask: outcomeSettled ? null : askPrice,
      };
    });
  }

  return jsonResponse({ positions: positionsWithPrice });
};
