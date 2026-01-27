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

  // Get positions for all outcomes in this market
  // Local DB uses outcome, net_position, price_basis (not market_id, qty_long, qty_short)
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
  }>(
    db,
    `SELECT p.* 
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     WHERE o.market_id = ? AND p.user_id = ?`,
    [marketId, userId]
  );

  // Convert to frontend Position interface format
  const positions = positionsDb.map(p => ({
    id: p.id,
    user_id: p.user_id,
    outcome: p.outcome,
    create_time: p.create_time,
    closed_profit: p.closed_profit,
    settled_profit: p.settled_profit,
    net_position: p.net_position,
    price_basis: p.price_basis,
    is_settled: p.is_settled,
  }));

  return jsonResponse({ positions });
};
