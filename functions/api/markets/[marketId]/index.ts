import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbQuery, type Env } from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../middleware';
import { getCookieValue, getUserFromToken } from '../../../lib/auth';

/** When outcome has settled_price, compute settled_profit from position (matches settlement.ts). */
function computedSettledProfitCents(netPosition: number, priceBasis: number, settledPrice: number): number {
  if (netPosition > 0 && priceBasis > 0) {
    return netPosition * (settledPrice - priceBasis);
  }
  if (netPosition < 0 && priceBasis > 0) {
    return Math.abs(netPosition) * (priceBasis - settledPrice);
  }
  return 0;
}

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

  // Single query: market row + outcomes (reduces D1 reads)
  const marketRow = await dbFirst(db, 'SELECT * FROM markets WHERE market_id = ?', [marketId]);
  if (!marketRow) {
    return errorResponse('Market not found', 404);
  }
  const market = marketRow as Record<string, unknown>;
  // Total market volume (cached in market_volume, same as list). Used for volume chip on detail page.
  let volume_contracts = 0;
  try {
    const volRow = await dbFirst<{ volume_contracts: number }>(db, 'SELECT volume_contracts FROM market_volume WHERE market_id = ?', [marketId]);
    if (volRow?.volume_contracts != null) volume_contracts = volRow.volume_contracts;
  } catch {
    // table may not exist yet
  }
  (market as Record<string, unknown>).volume_contracts = volume_contracts;

  // Total Birdies: outcomes may be stored with market_id 'market-total-birdies' or 'market_total_birdies'; include both so all show on the page
  const outcomeMarketIds = marketId === 'market-total-birdies'
    ? ['market-total-birdies', 'market_total_birdies']
    : [marketId];
  const outcomePlaceholders = outcomeMarketIds.map(() => '?').join(',');
  const outcomesRows = await dbQuery(
    db,
    `SELECT * FROM outcomes WHERE market_id IN (${outcomePlaceholders}) ORDER BY created_date ASC`,
    outcomeMarketIds
  );
  const outcomes = outcomesRows as { outcome_id: string; [k: string]: unknown }[];

  // Get orderbook grouped by outcome: 2 queries for whole market (no N+1)
  const orderbookByOutcome: Record<string, { bids: any[]; asks: any[] }> = {};
  const outcomeIds = outcomes.map((o: { outcome_id: string }) => o.outcome_id);

  outcomes.forEach((o: { outcome_id: string }) => {
    orderbookByOutcome[o.outcome_id] = { bids: [], asks: [] };
  });

  const ORDERBOOK_DEPTH = 3; // Best 3 bids/asks per outcome to reduce D1 reads
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
    const bidsDb = await dbQuery<typeof orderRow & { rn?: number }>(
      db,
      `SELECT id, create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size FROM (
       SELECT *, ROW_NUMBER() OVER (PARTITION BY outcome ORDER BY price DESC, create_time ASC) AS rn
       FROM orders
       WHERE outcome IN (${placeholders}) AND side = 0 AND status IN ('open', 'partial')
       ) WHERE rn <= ?`,
      [...outcomeIds, ORDERBOOK_DEPTH]
    );
    const asksDb = await dbQuery<typeof orderRow & { rn?: number }>(
      db,
      `SELECT id, create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size FROM (
       SELECT *, ROW_NUMBER() OVER (PARTITION BY outcome ORDER BY price ASC, create_time ASC) AS rn
       FROM orders
       WHERE outcome IN (${placeholders}) AND side = 1 AND status IN ('open', 'partial')
       ) WHERE rn <= ?`,
      [...outcomeIds, ORDERBOOK_DEPTH]
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
  const tradesMarketPh = outcomeMarketIds.map(() => '?').join(',');
  let tradesDb: any[] = [];
  try {
    tradesDb = await dbQuery(
      db,
      `SELECT 
         trades.id, trades.token, trades.price, trades.contracts, trades.create_time,
         trades.risk_off_contracts_taker, trades.risk_off_contracts_maker, trades.risk_off_price_diff_taker, trades.risk_off_price_diff_maker, trades.outcome,
         trades.taker_user_id, trades.maker_user_id, trades.taker_side,
         outcomes.name as outcome_name, outcomes.ticker as outcome_ticker
       FROM trades
       LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
       WHERE outcomes.market_id IN (${tradesMarketPh})
       ORDER BY trades.id DESC
       LIMIT ?`,
      [...outcomeMarketIds, tradesLimit]
    );
  } catch (_err) {
    try {
      tradesDb = await dbQuery(
        db,
        `SELECT trades.id, trades.token, trades.price, trades.contracts, trades.create_time,
                trades.risk_off_contracts_taker, trades.risk_off_contracts_maker, trades.risk_off_price_diff_taker, trades.risk_off_price_diff_maker, trades.outcome,
                outcomes.name as outcome_name, outcomes.ticker as outcome_ticker
         FROM trades LEFT JOIN outcomes ON trades.outcome = outcomes.outcome_id
         WHERE outcomes.market_id IN (${tradesMarketPh}) ORDER BY trades.id DESC LIMIT ?`,
        [...outcomeMarketIds, tradesLimit]
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
      risk_off_contracts_taker: t.risk_off_contracts_taker ?? 0,
      risk_off_contracts_maker: t.risk_off_contracts_maker ?? 0,
      risk_off_price_diff_taker: t.risk_off_price_diff_taker ?? t.risk_off_price_diff ?? 0,
      risk_off_price_diff_maker: t.risk_off_price_diff_maker ?? 0,
      outcome: t.outcome ?? null,
      outcome_name: t.outcome_name,
      outcome_ticker: t.outcome_ticker,
      side,
      taker_side: t.taker_side ?? null,
    };
  });

  // Last traded price per outcome (from all market trades, so it shows even when current user hasn't traded)
  const lastTradePriceByOutcome: Record<string, number> = {};
  const tradesByOutcomeDesc = [...tradesDb].sort((a: any, b: any) => (b.create_time ?? 0) - (a.create_time ?? 0));
  for (const t of tradesByOutcomeDesc) {
    const oid = t.outcome ?? '';
    if (oid && lastTradePriceByOutcome[oid] === undefined) lastTradePriceByOutcome[oid] = t.price;
  }

  // Market-scoped positions (when authenticated), with batched best bid/ask for current_price
  let positions: any[] = [];
  if (currentUserId != null) {
    const posMarketPh = outcomeMarketIds.map(() => '?').join(',');
    // For Total Birdies, outcomes may have market_id = market_total_birdies; join to canonical market for market_name
    const positionsDb = await dbQuery(
      db,
      `SELECT p.*, o.name as outcome_name, o.ticker as outcome_ticker, o.settled_price as outcome_settled_price, m.short_name as market_name
       FROM positions p
       JOIN outcomes o ON p.outcome = o.outcome_id
       LEFT JOIN markets m ON (m.market_id = o.market_id OR (o.market_id = 'market_total_birdies' AND m.market_id = 'market-total-birdies'))
       WHERE o.market_id IN (${posMarketPh}) AND p.user_id = ?
       ORDER BY p.create_time DESC`,
      [...outcomeMarketIds, currentUserId]
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
        const outcomeSettled = p.outcome_settled_price != null;
        const price_basis = p.net_position !== 0 && p.price_basis > 0
          ? Math.max(100, Math.min(9900, p.price_basis))
          : p.price_basis;
        // For settled outcomes, include closed_profit in settled_profit (closed_profit from partial exits before settlement)
        const positionSettledProfit = outcomeSettled && p.outcome_settled_price != null
          ? computedSettledProfitCents(p.net_position, price_basis, p.outcome_settled_price)
          : p.settled_profit;
        const settledProfit = outcomeSettled ? positionSettledProfit + (p.closed_profit ?? 0) : p.settled_profit;
        const closedProfit = outcomeSettled ? 0 : (p.closed_profit ?? 0);
        const bidPrice = bestBidByOutcome[p.outcome] ?? null;
        const askPrice = bestAskByOutcome[p.outcome] ?? null;
        const midPrice = (bidPrice != null && askPrice != null) ? (bidPrice + askPrice) / 2 : bidPrice ?? askPrice ?? null;
        const current_price = outcomeSettled ? p.outcome_settled_price : midPrice;
        return {
          id: p.id,
          user_id: p.user_id,
          outcome: p.outcome,
          create_time: p.create_time,
          closed_profit: closedProfit,
          settled_profit: settledProfit,
          net_position: p.net_position,
          price_basis,
          is_settled: p.is_settled,
          market_name: p.market_name,
          outcome_name: p.outcome_name,
          outcome_ticker: p.outcome_ticker,
          current_price,
          settled_price: p.outcome_settled_price ?? null,
          best_bid: outcomeSettled ? null : bidPrice,
          best_ask: outcomeSettled ? null : askPrice,
        };
      });
    }
  }

  const response = jsonResponse({
    market,
    outcomes,
    orderbook: orderbookByOutcome,
    trades,
    positions,
    lastTradePriceByOutcome,
  });
  // Short cache + stale-while-revalidate to cut repeat reads
  response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
  return response;
};
