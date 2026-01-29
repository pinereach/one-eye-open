import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../middleware';
import { getCookieValue, getUserFromToken } from '../../../lib/auth';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const db = getDb(env);

  // Optional auth: for trades "side" and for positions
  let currentUserId: number | null = null;
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = getCookieValue(cookieHeader, 'session');
    if (token) {
      const user = await getUserFromToken(db, token, env);
      if (user?.id) currentUserId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
    }
  } catch {
    // Ignore auth errors
  }

  // Get market by market_id (text)
  const market = await dbFirst(db, 'SELECT * FROM markets WHERE market_id = ?', [marketId]);
  if (!market) {
    return errorResponse('Market not found', 404);
  }

  // Get outcomes for this market
  const outcomes = await dbQuery(
    db,
    'SELECT * FROM outcomes WHERE market_id = ? ORDER BY created_date ASC',
    [market.market_id]
  );

  // Get orderbook grouped by outcome: 2 queries for whole market (no N+1)
  const orderbookByOutcome: Record<string, { bids: any[]; asks: any[] }> = {};
  const outcomeIds = outcomes.map((o: { outcome_id: string }) => o.outcome_id);

  outcomes.forEach((o: { outcome_id: string }) => {
    orderbookByOutcome[o.outcome_id] = { bids: [], asks: [] };
  });

  if (outcomeIds.length > 0) {
    const placeholders = outcomeIds.map(() => '?').join(',');
    const orderRow = {
      id: 0,
      create_time: 0,
      user_id: null as number | null,
      token: '',
      order_id: 0,
      outcome: '',
      price: 0,
      status: '',
      tif: '',
      side: 0,
      contract_size: null as number | null,
    };
    const bidsDb = await dbQuery<typeof orderRow>(
      db,
      `SELECT * FROM orders 
       WHERE outcome IN (${placeholders}) AND side = 0 AND status IN ('open', 'partial')
       ORDER BY outcome, price DESC, create_time ASC`,
      outcomeIds
    );
    const asksDb = await dbQuery<typeof orderRow>(
      db,
      `SELECT * FROM orders 
       WHERE outcome IN (${placeholders}) AND side = 1 AND status IN ('open', 'partial')
       ORDER BY outcome, price ASC, create_time ASC`,
      outcomeIds
    );

    const mapOrder = (o: typeof orderRow) => ({
      id: o.id,
      create_time: o.create_time,
      user_id: o.user_id,
      token: o.token,
      order_id: o.order_id,
      outcome: o.outcome,
      price: o.price,
      status: o.status as 'open' | 'partial' | 'filled' | 'canceled',
      tif: o.tif,
      side: o.side,
      contract_size: o.contract_size,
    });

    bidsDb.forEach(o => {
      orderbookByOutcome[o.outcome].bids.push(mapOrder(o));
    });
    asksDb.forEach(o => {
      orderbookByOutcome[o.outcome].asks.push(mapOrder(o));
    });
  }

  // Market-scoped trades (same shape as GET /markets/[id]/trades)
  const tradesLimit = 20;
  let tradesDb: any[] = [];
  try {
    tradesDb = await dbQuery(
      db,
      `SELECT 
         trades.id, trades.token, trades.price, trades.contracts, trades.create_time,
         trades.risk_off_contracts, trades.risk_off_price_diff, trades.outcome,
         trades.taker_user_id, trades.maker_user_id, trades.taker_side,
         outcomes.name as outcome_name, outcomes.ticker as outcome_ticker
       FROM trades
       LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
       WHERE outcomes.market_id = ?
       ORDER BY trades.id DESC
       LIMIT ?`,
      [marketId, tradesLimit]
    );
  } catch (_err) {
    try {
      tradesDb = await dbQuery(
        db,
        `SELECT trades.id, trades.token, trades.price, trades.contracts, trades.create_time,
                trades.risk_off_contracts, trades.risk_off_price_diff, trades.outcome,
                outcomes.name as outcome_name, outcomes.ticker as outcome_ticker
         FROM trades LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
         WHERE outcomes.market_id = ? ORDER BY trades.id DESC LIMIT ?`,
        [marketId, tradesLimit]
      );
    } catch {
      tradesDb = [];
    }
  }
  // Only include trades where the current user is taker or maker (when not logged in or schema has no user columns, return none)
  const hasUserColumns = tradesDb.length > 0 && (tradesDb[0].taker_user_id !== undefined || tradesDb[0].maker_user_id !== undefined);
  const tradesFiltered =
    currentUserId == null
      ? []
      : hasUserColumns
        ? tradesDb.filter((t: any) => t.taker_user_id === currentUserId || t.maker_user_id === currentUserId)
        : [];

  const trades = tradesFiltered.map((t: any) => {
    const createTime = t.create_time != null ? t.create_time : (t.id ?? 0) * 1000;
    let side: number | null = null;
    if (currentUserId != null && t.taker_side != null) {
      if (t.taker_user_id === currentUserId) side = t.taker_side;
      else if (t.maker_user_id != null && t.maker_user_id === currentUserId) side = t.taker_side === 0 ? 1 : 0;
    }
    return {
      id: t.id,
      token: t.token,
      price: t.price,
      contracts: t.contracts,
      create_time: createTime,
      risk_off_contracts: t.risk_off_contracts ?? 0,
      risk_off_price_diff: t.risk_off_price_diff ?? 0,
      outcome_name: t.outcome_name,
      outcome_ticker: t.outcome_ticker,
      side,
      taker_side: t.taker_side ?? null,
    };
  });

  // Market-scoped positions (when authenticated), with batched best bid/ask for current_price
  let positions: any[] = [];
  if (currentUserId != null) {
    const positionsDb = await dbQuery(
      db,
      `SELECT p.*, o.name as outcome_name, o.ticker as outcome_ticker, m.short_name as market_name
       FROM positions p
       JOIN outcomes o ON p.outcome = o.outcome_id
       JOIN markets m ON o.market_id = m.market_id
       WHERE o.market_id = ? AND p.user_id = ?
       ORDER BY p.create_time DESC`,
      [marketId, currentUserId]
    );
    if (positionsDb.length > 0) {
      const posOutcomeIds = [...new Set(positionsDb.map((p: any) => p.outcome))];
      const ph = posOutcomeIds.map(() => '?').join(',');
      const bidsRows = await dbQuery<{ outcome: string; price: number }>(
        db,
        `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 0 AND status IN ('open','partial') ORDER BY outcome, price DESC, create_time ASC`,
        posOutcomeIds
      );
      const asksRows = await dbQuery<{ outcome: string; price: number }>(
        db,
        `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 1 AND status IN ('open','partial') ORDER BY outcome, price ASC, create_time ASC`,
        posOutcomeIds
      );
      const bestBidByOutcome: Record<string, number> = {};
      bidsRows.forEach((r: { outcome: string; price: number }) => { if (bestBidByOutcome[r.outcome] == null) bestBidByOutcome[r.outcome] = r.price; });
      const bestAskByOutcome: Record<string, number> = {};
      asksRows.forEach((r: { outcome: string; price: number }) => { if (bestAskByOutcome[r.outcome] == null) bestAskByOutcome[r.outcome] = r.price; });
      positions = positionsDb.map((p: any) => {
        const bidPrice = bestBidByOutcome[p.outcome] ?? null;
        const askPrice = bestAskByOutcome[p.outcome] ?? null;
        const current_price = (bidPrice != null && askPrice != null) ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
        const price_basis = p.net_position !== 0 && p.price_basis > 0
          ? Math.max(100, Math.min(9900, p.price_basis))
          : p.price_basis;
        return {
          id: p.id,
          user_id: p.user_id,
          outcome: p.outcome,
          create_time: p.create_time,
          closed_profit: p.closed_profit,
          settled_profit: p.settled_profit,
          net_position: p.net_position,
          price_basis,
          is_settled: p.is_settled,
          market_name: p.market_name,
          outcome_name: p.outcome_name,
          outcome_ticker: p.outcome_ticker,
          current_price,
        };
      });
    }
  }

  return jsonResponse({
    market,
    outcomes,
    orderbook: orderbookByOutcome,
    trades,
    positions,
  });
};
