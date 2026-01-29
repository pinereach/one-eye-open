import { getDb, dbQuery, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';
import type { Order } from '../../lib/matching';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  // Get all orders for the user, joined with outcomes and markets
  const ordersDb = await dbQuery<{
    id: number;
    create_time: number;
    user_id: number | null;
    token: string;
    order_id: number;
    outcome: string;
    price: number;
    status: string;
    tif: string;
    side: number;
    contract_size: number | null;
    original_contract_size: number | null;
    outcome_name: string;
    market_id: string;
    market_name: string;
  }>(
    db,
    `SELECT 
      o.*,
      oc.name as outcome_name,
      oc.market_id,
      m.short_name as market_name
     FROM orders o
     JOIN outcomes oc ON o.outcome = oc.outcome_id
     JOIN markets m ON oc.market_id = m.market_id
     WHERE o.user_id = ?
     ORDER BY o.create_time DESC
     LIMIT ?`,
    [userId, limit]
  );

  // Orders that need trade fallback (filled/partial with missing original_contract_size)
  const needsTradeFallback = ordersDb.filter(
    (o) =>
      (o.status === 'filled' || o.status === 'partial') &&
      (o.original_contract_size == null || o.original_contract_size === 0)
  );
  const uniquePairs = Array.from(
    new Set(needsTradeFallback.map((o) => `${o.outcome}\0${o.price}`))
  ).map((key) => {
    const [outcome, price] = key.split('\0');
    return { outcome, price: parseInt(price, 10) };
  });

  // One batched query for trades: get all trades for (outcome, price) pairs
  type TradeRow = { outcome: string; price: number; contracts: number; id: number };
  let tradeRows: TradeRow[] = [];
  if (uniquePairs.length > 0) {
    const conditions = uniquePairs.map(() => '(outcome = ? AND price = ?)').join(' OR ');
    const params = uniquePairs.flatMap((p) => [p.outcome, p.price]);
    tradeRows = await dbQuery<TradeRow>(
      db,
      `SELECT outcome, price, contracts, id FROM trades WHERE ${conditions} ORDER BY id DESC LIMIT 1000`,
      params
    );
  }
  // Group by (outcome, price): latest contracts (for filled), sum contracts (for partial)
  const key = (outcome: string, price: number) => `${outcome}\0${price}`;
  const byPair: Record<string, { latestContracts: number; sumContracts: number }> = {};
  uniquePairs.forEach((p) => {
    byPair[key(p.outcome, p.price)] = { latestContracts: 0, sumContracts: 0 };
  });
  tradeRows.forEach((r) => {
    const k = key(r.outcome, r.price);
    if (byPair[k]) {
      if (byPair[k].latestContracts === 0) byPair[k].latestContracts = r.contracts;
      byPair[k].sumContracts += r.contracts;
    }
  });

  const orders = ordersDb.map((o) => {
    let displaySize = o.contract_size || 0;
    if (o.status === 'filled') {
      if (o.original_contract_size != null && o.original_contract_size > 0) {
        displaySize = o.original_contract_size;
      } else {
        const fallback = byPair[key(o.outcome, o.price)];
        displaySize = fallback?.latestContracts ?? 0;
      }
    } else if (o.status === 'partial') {
      if (o.original_contract_size != null && o.original_contract_size > 0) {
        displaySize = o.original_contract_size - (o.contract_size || 0);
      } else {
        const fallback = byPair[key(o.outcome, o.price)];
        displaySize = fallback?.sumContracts ?? 0;
      }
    }

    let originalSize = o.original_contract_size;
    if (originalSize == null || originalSize === 0) {
      if (o.status === 'open' || o.status === 'canceled') {
        originalSize = o.contract_size || 0;
      } else if (o.status === 'filled') {
        const fallback = byPair[key(o.outcome, o.price)];
        originalSize = fallback?.latestContracts ?? 0;
      } else if (o.status === 'partial') {
        const remaining = o.contract_size || 0;
        const fallback = byPair[key(o.outcome, o.price)];
        originalSize = fallback?.sumContracts != null ? remaining + fallback.sumContracts : o.contract_size || 0;
      } else {
        originalSize = o.contract_size || 0;
      }
    }

    const remainingSize = o.contract_size || 0;
    return {
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
      contract_size: displaySize,
      original_size: originalSize,
      remaining_size: remainingSize,
      outcome_name: o.outcome_name,
      market_name: o.market_name,
    };
  });

  return jsonResponse({ orders });
};
