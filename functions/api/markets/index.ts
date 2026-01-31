import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    const db = getDb(env);
    const markets = await dbQuery(db, 'SELECT * FROM markets ORDER BY created_date DESC', []);

    // Single query for all outcomes (no N+1). Include outcomes for market_total_birdies under market-total-birdies.
    const marketIds = markets.map((m: { market_id: string }) => m.market_id);
    const outcomeQueryIds = marketIds.includes('market-total-birdies') && !marketIds.includes('market_total_birdies')
      ? [...marketIds, 'market_total_birdies']
      : marketIds;
    let allOutcomes: any[] = [];
    if (outcomeQueryIds.length > 0) {
      const placeholders = outcomeQueryIds.map(() => '?').join(',');
      allOutcomes = await dbQuery(
        db,
        `SELECT * FROM outcomes WHERE market_id IN (${placeholders}) ORDER BY market_id, created_date ASC`,
        outcomeQueryIds
      );
    }
    const outcomesByMarket: Record<string, any[]> = {};
    marketIds.forEach((id: string) => { outcomesByMarket[id] = []; });
    allOutcomes.forEach((o: { market_id: string }) => {
      const targetMarketId = o.market_id === 'market_total_birdies' ? 'market-total-birdies' : o.market_id;
      if (outcomesByMarket[targetMarketId]) outcomesByMarket[targetMarketId].push(o);
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
