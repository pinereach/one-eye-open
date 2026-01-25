import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const db = getDb(env);
  const sql = 'SELECT * FROM markets ORDER BY created_date DESC';

  const markets = await dbQuery(db, sql, []);

  // Get outcomes for each market
  const marketsWithOutcomes = await Promise.all(
    markets.map(async (market: any) => {
      const outcomes = await dbQuery(
        db,
        'SELECT * FROM outcomes WHERE market_id = ? ORDER BY created_date ASC',
        [market.market_id]
      );
      return { ...market, outcomes };
    })
  );

  return jsonResponse({ markets: marketsWithOutcomes });
};
