import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse } from '../../../middleware';
import { getCookieValue, getUserFromToken } from '../../../lib/auth';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const db = getDb(env);

  // Optional auth: get current user so we can return "your" side (buy/sell) per trade
  let currentUserId: number | null = null;
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = getCookieValue(cookieHeader, 'session');
    if (token) {
      const user = await getUserFromToken(db, token, env);
      if (user?.id) currentUserId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
    }
  } catch {
    // Ignore auth errors; we just won't have my_side
  }

  // Try extended query first (needs migration 0033: taker_user_id, maker_user_id, taker_side) so we can show Buy/Sell.
  // If schema is older, fall back to minimal query; data still returns but side will be null.
  let tradesDb: any[] = [];
  try {
    tradesDb = await dbQuery<{
      id: number;
      token: string;
      price: number;
      contracts: number;
      create_time?: number;
      risk_off_contracts: number;
      risk_off_price_diff: number;
      outcome: string | null;
      outcome_name: string | null;
      outcome_ticker: string | null;
      taker_user_id?: number | null;
      maker_user_id?: number | null;
      taker_side?: number | null;
    }>(
      db,
      `SELECT 
         trades.id,
         trades.token,
         trades.price,
         trades.contracts,
         trades.create_time,
         trades.risk_off_contracts_taker,
         trades.risk_off_contracts_maker,
         trades.risk_off_price_diff_taker,
         trades.risk_off_price_diff_maker,
         trades.outcome,
         trades.taker_user_id,
         trades.maker_user_id,
         trades.taker_side,
         outcomes.name as outcome_name,
         outcomes.ticker as outcome_ticker
       FROM trades
       LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
       WHERE outcomes.market_id = ?
       ORDER BY trades.id DESC
       LIMIT ?`,
      [marketId, limit]
    );
  } catch (_err) {
    try {
      tradesDb = await dbQuery<{
        id: number;
        token: string;
        price: number;
        contracts: number;
        create_time?: number;
        risk_off_contracts_taker?: number;
        risk_off_contracts_maker?: number;
        risk_off_price_diff_taker?: number;
        risk_off_price_diff_maker?: number;
        risk_off_contracts?: number;
        risk_off_price_diff?: number;
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
           trades.create_time,
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
    } catch (e2: unknown) {
      console.warn('Could not query trades, returning empty list:', (e2 as Error).message);
      tradesDb = [];
    }
  }

  // Only include trades where the current user is taker or maker
  const tradesFiltered =
    currentUserId != null
      ? tradesDb.filter((t: any) => t.taker_user_id === currentUserId || t.maker_user_id === currentUserId)
      : [];

  // Build response: create_time (real or id proxy), side = "my side" when authenticated (taker_side present; maker_user_id can be null)
  const trades = tradesFiltered.map((t: any) => {
    const createTime = t.create_time != null ? t.create_time : (t.id ?? 0) * 1000;
    let side: number | null = null;
    if (currentUserId != null && t.taker_side != null) {
      if (t.taker_user_id === currentUserId) side = t.taker_side;
      else if (t.maker_user_id != null && t.maker_user_id === currentUserId) side = t.taker_side === 0 ? 1 : 0; // maker has opposite side
    }
    return {
      id: t.id,
      token: t.token,
      price: t.price,
      contracts: t.contracts,
      create_time: createTime,
      risk_off_contracts_taker: t.risk_off_contracts_taker ?? 0,
      risk_off_contracts_maker: t.risk_off_contracts_maker ?? 0,
      risk_off_price_diff_taker: t.risk_off_price_diff_taker ?? t.risk_off_price_diff ?? 0,
      risk_off_price_diff_maker: t.risk_off_price_diff_maker ?? 0,
      outcome_name: t.outcome_name,
      outcome_ticker: t.outcome_ticker,
      side, // 0 = buy/bid, 1 = sell/ask (current user's side when authenticated)
      taker_side: t.taker_side ?? null, // taker's side for every trade (0 = buy, 1 = sell)
    };
  });

  return jsonResponse({ trades });
};
