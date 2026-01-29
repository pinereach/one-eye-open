import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../middleware';

/** Reference data only: market + outcomes. No auth. Cache 12h to reduce D1 reads. */
const CACHE_MAX_AGE = 43200; // 12h

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { env, params } = context;
  const marketId = params.marketId as string;

  const db = getDb(env);

  const market = await dbFirst(db, 'SELECT * FROM markets WHERE market_id = ?', [marketId]);
  if (!market) {
    return errorResponse('Market not found', 404);
  }

  const outcomes = await dbQuery(
    db,
    'SELECT * FROM outcomes WHERE market_id = ? ORDER BY created_date ASC',
    [market.market_id]
  );

  const response = jsonResponse({ market, outcomes });
  response.headers.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);
  return response;
};
