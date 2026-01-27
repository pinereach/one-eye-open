import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';
import type { Position } from '../../lib/matching';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  // Get all positions for the user, joined with outcomes and markets
  const positions = await dbQuery<Position & { outcome_name: string; market_id: string; market_name: string }>(
    db,
    `SELECT 
      p.*,
      o.name as outcome_name,
      o.market_id,
      m.short_name as market_name
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     JOIN markets m ON o.market_id = m.market_id
     WHERE p.user_id = ?
     ORDER BY p.create_time DESC`,
    [userId]
  );

  return jsonResponse({ positions });
};
