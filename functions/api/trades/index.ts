import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  // Get all recent trades with outcome and market information
  const trades = await dbQuery<{
    id: number;
    token: string;
    price: number;
    contracts: number;
    create_time: number;
    risk_off_contracts: number;
    risk_off_price_diff: number;
    outcome: string | null;
    outcome_name: string | null;
    outcome_ticker: string | null;
    market_id: string | null;
    market_short_name: string | null;
  }>(
    db,
    `SELECT 
       t.*,
       o.name as outcome_name,
       o.ticker as outcome_ticker,
       o.market_id,
       m.short_name as market_short_name
     FROM trades t
     LEFT JOIN outcomes o ON t.outcome = o.outcome_id
     LEFT JOIN markets m ON o.market_id = m.market_id
     ORDER BY t.create_time DESC
     LIMIT ?`,
    [limit]
  );

  return jsonResponse({ trades });
};
