import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../../lib/db.ts';
import { jsonResponse } from '../../../middleware.ts';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const db = getDb(env);

  const trades = await dbQuery(
    db,
    `SELECT * FROM trades 
     WHERE market_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [marketId, limit]
  );

  return jsonResponse({ trades });
};
