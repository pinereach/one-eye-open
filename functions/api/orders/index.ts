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

  // Convert to frontend Order interface format
  const orders = ordersDb.map(o => ({
    id: o.id,
    create_time: o.create_time,
    user_id: o.user_id,
    token: o.token,
    order_id: o.order_id,
    outcome: o.outcome,
    price: o.price, // Price in cents, as expected by frontend
    status: o.status as 'open' | 'partial' | 'filled' | 'canceled',
    tif: o.tif,
    side: o.side, // 0 = bid, 1 = ask
    contract_size: o.contract_size,
    // Additional fields for display
    outcome_name: o.outcome_name,
    market_name: o.market_name,
  }));

  return jsonResponse({ orders });
};
