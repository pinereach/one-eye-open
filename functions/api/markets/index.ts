import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    const db = getDb(env);
    const sql = 'SELECT * FROM markets ORDER BY created_date DESC';

    const markets = await dbQuery(db, sql, []);

    // Get outcomes for each market
    const marketsWithOutcomes = await Promise.all(
      markets.map(async (market: any) => {
        try {
          const outcomes = await dbQuery(
            db,
            'SELECT * FROM outcomes WHERE market_id = ? ORDER BY created_date ASC',
            [market.market_id]
          );
          return { ...market, outcomes };
        } catch (err: any) {
          console.error(`Error fetching outcomes for market ${market.market_id}:`, err);
          // Return market without outcomes if query fails
          return { ...market, outcomes: [] };
        }
      })
    );

    return jsonResponse({ markets: marketsWithOutcomes });
  } catch (error: any) {
    console.error('Error in /api/markets:', error);
    return errorResponse(error.message || 'Failed to fetch markets', 500);
  }
};
