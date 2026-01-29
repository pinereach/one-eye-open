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

    // Volume from cache table (refreshed every 4h via POST /api/admin/refresh-volume). Fallback to 0 if table missing.
    let volumeByMarket: Record<string, number> = {};
    try {
      const volumeRows = await dbQuery<{ market_id: string; volume_contracts: number }>(
        db,
        'SELECT market_id, volume_contracts FROM market_volume',
        []
      );
      volumeRows.forEach((r: { market_id: string; volume_contracts: number }) => {
        volumeByMarket[r.market_id] = r.volume_contracts;
      });
    } catch {
      // market_volume table may not exist yet; leave volume 0
    }

    const marketsWithOutcomes = markets.map((market: any) => {
      const volume_contracts = volumeByMarket[market.market_id] ?? 0;
      return {
        ...market,
        outcomes: outcomesByMarket[market.market_id] || [],
        volume_contracts,
      };
    });

    const response = jsonResponse({ markets: marketsWithOutcomes });
    // Markets + outcomes are reference data; volume is 30-day aggregate. Cache 12h to cut D1 reads.
    response.headers.set('Cache-Control', 'public, max-age=43200'); // 12h
    return response;
  } catch (error: any) {
    console.error('Error in /api/markets:', error);
    return errorResponse(error.message || 'Failed to fetch markets', 500);
  }
};
