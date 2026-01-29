import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbRun, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }
  const userId = typeof authResult.user.id === 'number' ? authResult.user.id : parseInt(String(authResult.user.id), 10);
  const db = getDb(env);

  // Get all recent trades with outcome and market information
  // First, try to backfill missing outcomes for trades that don't have them
  // by matching with orders created around the same time
  await dbRun(
    db,
    `UPDATE trades 
     SET outcome = (
       SELECT o.outcome 
       FROM orders o 
       WHERE ABS(o.create_time - trades.create_time) <= 2 
         AND ABS(o.price - trades.price) <= 50
       LIMIT 1
     )
     WHERE outcome IS NULL 
       AND EXISTS (
         SELECT 1 FROM orders o 
         WHERE ABS(o.create_time - trades.create_time) <= 2 
           AND ABS(o.price - trades.price) <= 50
       )`
  );

  // Now get trades with outcome and market information (only trades where user is taker or maker)
  const tradesRows = await dbQuery<{
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
    taker_side: number | null;
    taker_user_id: number | null;
    maker_user_id: number | null;
  }>(
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
     WHERE t.taker_user_id = ? OR t.maker_user_id = ?
     ORDER BY t.create_time DESC
     LIMIT ?`,
    [userId, userId, limit]
  );

  const trades = tradesRows.map((t) => {
    // "My side": when user is taker use taker_side; when user is maker use opposite
    const mySide =
      t.taker_side != null
        ? t.taker_user_id === userId
          ? t.taker_side
          : t.taker_side === 0
            ? 1
            : 0
        : null;
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
      side: mySide,
      taker_side: t.taker_side ?? null,
    };
  });

  return jsonResponse({ trades });
};
