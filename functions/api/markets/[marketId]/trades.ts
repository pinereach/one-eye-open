import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse } from '../../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const db = getDb(env);

  // Note: Trades no longer have direct market/order references
  // For now, return all recent trades. To filter by market, you would need to:
  // 1. Add market_id back to trades, or
  // 2. Create a trades_orders junction table, or  
  // 3. Store market_id in the trade token somehow
  const trades = await dbQuery(
    db,
    `SELECT * FROM trades 
     ORDER BY create_time DESC
     LIMIT ?`,
    [limit]
  );

  return jsonResponse({ trades });
};
