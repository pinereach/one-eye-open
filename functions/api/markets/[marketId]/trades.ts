import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse } from '../../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const db = getDb(env);

  // Get trades for this specific market by joining with outcomes
  // Try to determine buy/sell by matching with orders
  // Handle case where trades table might have different schema (missing create_time column)
  let tradesDb: any[] = [];
  
  try {
    // Query basic columns that should exist, order by id (most recent first)
    // Use id as proxy for time ordering since create_time column may not exist
    tradesDb = await dbQuery<{
      id: number;
      token: string;
      price: number;
      contracts: number;
      risk_off_contracts: number;
      risk_off_price_diff: number;
      outcome: string | null;
      outcome_name: string | null;
      outcome_ticker: string | null;
    }>(
      db,
      `SELECT 
         trades.id,
         trades.token,
         trades.price,
         trades.contracts,
         trades.risk_off_contracts,
         trades.risk_off_price_diff,
         trades.outcome,
         outcomes.name as outcome_name,
         outcomes.ticker as outcome_ticker
       FROM trades
       LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
       WHERE outcomes.market_id = ?
       ORDER BY trades.id DESC
       LIMIT ?`,
      [marketId, limit]
    );
    
    // Add create_time (use id as proxy) and try side detection
    for (const trade of tradesDb) {
      // Use id as a proxy for create_time (higher id = more recent)
      // This is approximate but works if create_time column doesn't exist
      trade.create_time = trade.id * 1000; // Rough approximation
      trade.side = null;
      
      // Try to detect side by matching with orders (simplified - match by price and contracts)
      if (trade.outcome) {
        try {
          const sideResult = await dbQuery<{ side: number }>(
            db,
            `SELECT side 
             FROM orders 
             WHERE outcome = ? 
               AND price = ?
               AND contract_size = ?
               AND status IN ('open', 'partial', 'filled')
             ORDER BY create_time DESC
             LIMIT 1`,
            [trade.outcome, trade.price, trade.contracts]
          );
          trade.side = sideResult[0]?.side ?? null;
        } catch {
          // Side detection failed, leave as null
        }
      }
    }
  } catch (error: any) {
    console.warn('Could not query trades, returning empty list:', error.message);
    tradesDb = [];
  }

  // Convert to frontend Trade interface format
  const trades = tradesDb.map(t => ({
    id: t.id,
    token: t.token,
    price: t.price,
    contracts: t.contracts,
    create_time: t.create_time,
    risk_off_contracts: t.risk_off_contracts,
    risk_off_price_diff: t.risk_off_price_diff,
    outcome_name: t.outcome_name,
    outcome_ticker: t.outcome_ticker,
    side: t.side, // 0 = buy/bid, 1 = sell/ask
  }));

  return jsonResponse({ trades });
};
