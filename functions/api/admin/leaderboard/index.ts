import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse } from '../../../middleware';

type LeaderboardRow = {
  user_id: number;
  username: string;
  trade_count: number;
  open_orders_count: number;
  shares_traded: number;
  portfolio_value_cents: number;
};

/**
 * GET /api/admin/leaderboard — admin only. Returns per-user stats:
 * trade_count, open_orders_count, shares_traded, portfolio_value_cents.
 */
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const users = await dbQuery<{ id: number; username: string }>(
      db,
      'SELECT id, username FROM users ORDER BY username ASC',
      []
    );

    // Trade count per user (count each trade for both taker and maker)
    const tradeCountRows = await dbQuery<{ user_id: number; cnt: number }>(
      db,
      `SELECT user_id, COUNT(*) AS cnt FROM (
        SELECT taker_user_id AS user_id FROM trades WHERE taker_user_id IS NOT NULL
        UNION ALL
        SELECT maker_user_id AS user_id FROM trades WHERE maker_user_id IS NOT NULL
      ) GROUP BY user_id`,
      []
    );
    const tradeCountByUser = new Map<number, number>();
    tradeCountRows.forEach((r) => tradeCountByUser.set(r.user_id, r.cnt));

    // Open orders count per user
    const openOrdersRows = await dbQuery<{ user_id: number; cnt: number }>(
      db,
      `SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status IN ('open','partial') AND user_id IS NOT NULL GROUP BY user_id`,
      []
    );
    const openOrdersByUser = new Map<number, number>();
    openOrdersRows.forEach((r) => openOrdersByUser.set(r.user_id, r.cnt));

    // Shares traded per user (contracts summed for both taker and maker)
    const sharesRows = await dbQuery<{ user_id: number; total: number }>(
      db,
      `SELECT user_id, SUM(contracts) AS total FROM (
        SELECT taker_user_id AS user_id, contracts FROM trades WHERE taker_user_id IS NOT NULL
        UNION ALL
        SELECT maker_user_id AS user_id, contracts FROM trades WHERE maker_user_id IS NOT NULL
      ) GROUP BY user_id`,
      []
    );
    const sharesByUser = new Map<number, number>();
    sharesRows.forEach((r) => sharesByUser.set(r.user_id, r.total ?? 0));

    // Portfolio value (cost basis): sum of net_position * price_basis per user
    const portfolioRows = await dbQuery<{ user_id: number; value_cents: number }>(
      db,
      `SELECT user_id, SUM(net_position * COALESCE(NULLIF(price_basis, 0), 0)) AS value_cents FROM positions WHERE user_id IS NOT NULL GROUP BY user_id`,
      []
    );
    const portfolioByUser = new Map<number, number>();
    portfolioRows.forEach((r) => portfolioByUser.set(r.user_id, r.value_cents ?? 0));

    const leaderboard: LeaderboardRow[] = users.map((u) => ({
      user_id: u.id,
      username: u.username,
      trade_count: tradeCountByUser.get(u.id) ?? 0,
      open_orders_count: openOrdersByUser.get(u.id) ?? 0,
      shares_traded: sharesByUser.get(u.id) ?? 0,
      portfolio_value_cents: portfolioByUser.get(u.id) ?? 0,
    }));

    return jsonResponse({ leaderboard });
  } catch (err) {
    console.error('Admin leaderboard error:', err);
    return jsonResponse({ error: 'Failed to load leaderboard' }, 500);
  }
};
