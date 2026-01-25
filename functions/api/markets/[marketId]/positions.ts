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
  const positions = await dbQuery<Position>(
    db,
    `SELECT p.* 
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     WHERE o.market_id = ? AND p.user_id = ?`,
    [marketId, userId]
  );

  return jsonResponse({ positions });
};
