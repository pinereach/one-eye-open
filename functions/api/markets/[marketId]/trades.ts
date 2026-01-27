import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse } from '../../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const db = getDb(env);

  // Local DB uses token, price, contracts, create_time
  // For now, return all recent trades (can't filter by market without joining)
  const tradesDb = await dbQuery<{
    id: number;
    token: string;
    price: number;
    contracts: number;
    create_time: number;
    risk_off_contracts: number;
    risk_off_price_diff: number;
  }>(
    db,
    `SELECT * FROM trades 
     ORDER BY create_time DESC
     LIMIT ?`,
    [limit]
  );

  // Convert to frontend Trade interface format
  const trades = tradesDb.map(t => ({
    id: t.id,
    token: t.token,
    price: t.price,
    contracts: t.contracts,
    create_time: t.create_time,
    risk_off_contracts: t.risk_off_contracts,
    risk_off_price_diff: t.risk_off_price_diff,
  }));

  return jsonResponse({ trades });
};
