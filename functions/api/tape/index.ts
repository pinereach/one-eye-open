import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';

const TAPE_DEFAULT_LIMIT = 20;
const TAPE_MAX_LIMIT = 20;

/**
 * GET /api/tape — global trade tape: last N taker trades (default 20, max 20).
 * Requires auth. Uses idx_trades_create_time; single query with LIMIT for efficiency.
 */
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(
    parseInt(limitParam || String(TAPE_DEFAULT_LIMIT), 10) || TAPE_DEFAULT_LIMIT,
    TAPE_MAX_LIMIT
  );

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }
  const db = getDb(env);

  // All recent trades (no user filter) with outcome, market, and buyer/seller usernames
  type TradeRow = {
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
    taker_side?: number | null;
    taker_user_id?: number | null;
    maker_user_id?: number | null;
    taker_username?: string | null;
    maker_username?: string | null;
  };
  let tradesRows: TradeRow[] = [];
  try {
    tradesRows = await dbQuery<TradeRow>(
      db,
      `SELECT 
         t.id,
         t.token,
         t.price,
         t.contracts,
         t.create_time,
         t.risk_off_contracts,
         t.risk_off_price_diff,
         t.outcome,
         t.taker_side,
         t.taker_user_id,
         t.maker_user_id,
         o.name as outcome_name,
         o.ticker as outcome_ticker,
         o.market_id,
         m.short_name as market_short_name,
         u_taker.username as taker_username,
         u_maker.username as maker_username
       FROM trades t
       LEFT JOIN outcomes o ON t.outcome = o.outcome_id
       LEFT JOIN markets m ON o.market_id = m.market_id
       LEFT JOIN users u_taker ON t.taker_user_id = u_taker.id
       LEFT JOIN users u_maker ON t.maker_user_id = u_maker.id
       ORDER BY t.create_time DESC
       LIMIT ?`,
      [limit]
    );
  } catch {
    try {
      tradesRows = await dbQuery<TradeRow>(
        db,
        `SELECT 
           t.id,
           t.token,
           t.price,
           t.contracts,
           t.create_time,
           t.risk_off_contracts,
           t.risk_off_price_diff,
           t.outcome,
           t.taker_side,
           t.taker_user_id,
           t.maker_user_id,
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
    } catch {
      try {
        tradesRows = await dbQuery<TradeRow>(
          db,
          `SELECT 
             t.id,
             t.token,
             t.price,
             t.contracts,
             t.create_time,
             t.risk_off_contracts,
             t.risk_off_price_diff,
             t.outcome,
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
      } catch {
        tradesRows = [];
      }
    }
  }

  const trades = tradesRows.map((t) => {
    const ts = t.taker_side ?? null;
    const takerUser = t.taker_username ?? null;
    const makerUser = t.maker_username ?? null;
    const buyer_username = ts === 0 ? takerUser : ts === 1 ? makerUser : null;
    const seller_username = ts === 0 ? makerUser : ts === 1 ? takerUser : null;
    return {
      id: t.id,
      token: t.token,
      price: t.price,
      contracts: t.contracts,
      create_time: t.create_time,
      risk_off_contracts: t.risk_off_contracts ?? 0,
      risk_off_price_diff: t.risk_off_price_diff ?? 0,
      outcome: t.outcome,
      outcome_name: t.outcome_name,
      outcome_ticker: t.outcome_ticker,
      market_id: t.market_id,
      market_short_name: t.market_short_name,
      side: t.taker_side ?? null,
      taker_side: t.taker_side ?? null,
      buyer_username,
      seller_username,
    };
  });

  const response = jsonResponse({ trades });
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=15');
  return response;
};
