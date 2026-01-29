import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    const db = getDb(env);
    const markets = await dbQuery(db, 'SELECT * FROM markets ORDER BY created_date DESC', []);

    // Single query for all outcomes (no N+1)
    const marketIds = markets.map((m: { market_id: string }) => m.market_id);
    let allOutcomes: any[] = [];
    if (marketIds.length > 0) {
      const placeholders = marketIds.map(() => '?').join(',');
      allOutcomes = await dbQuery(
        db,
        `SELECT * FROM outcomes WHERE market_id IN (${placeholders}) ORDER BY market_id, created_date ASC`,
        marketIds
      );
    }
    const outcomesByMarket: Record<string, any[]> = {};
    marketIds.forEach((id: string) => { outcomesByMarket[id] = []; });
    allOutcomes.forEach((o: { market_id: string }) => {
      if (outcomesByMarket[o.market_id]) outcomesByMarket[o.market_id].push(o);
    });

    // Volume is not included on the list; individual market pages compute volume from trades.
    const marketsWithOutcomes = markets.map((market: any) => ({
      ...market,
      outcomes: outcomesByMarket[market.market_id] || [],
    }));

    const response = jsonResponse({ markets: marketsWithOutcomes });
    // Markets + outcomes are reference data. Cache 12h to cut D1 reads.
    response.headers.set('Cache-Control', 'public, max-age=43200'); // 12h
    return response;
  } catch (error: any) {
    console.error('Error in /api/markets:', error);
    return errorResponse(error.message || 'Failed to fetch markets', 500);
  }
};
