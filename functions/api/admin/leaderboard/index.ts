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
  closed_profit_cents: number;
  settled_profit_cents: number;
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

    // Portfolio value = total P&L (unrealized + closed + settled), matching Positions page.
    // Include ALL positions so we can compute unattributed P&L (user_id IS NULL). We sum raw P&L then round
    // once per aggregate (system total, per-user, unattributed) to avoid rounding error from (bid+ask)/2.
    const positionsRows = await dbQuery<{ user_id: number | null; outcome: string; net_position: number; price_basis: number; closed_profit: number; settled_profit: number }>(
      db,
      `SELECT user_id, outcome, net_position, COALESCE(NULLIF(price_basis, 0), 0) AS price_basis, COALESCE(closed_profit, 0) AS closed_profit, COALESCE(settled_profit, 0) AS settled_profit FROM positions`,
      []
    );
    const outcomeIds = [...new Set(positionsRows.map((p) => p.outcome))];
    const bestBidByOutcome: Record<string, number> = {};
    const bestAskByOutcome: Record<string, number> = {};
    if (outcomeIds.length > 0) {
      const ph = outcomeIds.map(() => '?').join(',');
      const bidsRows = await dbQuery<{ outcome: string; price: number }>(
        db,
        `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 0 AND status IN ('open','partial') ORDER BY outcome, price DESC, create_time ASC`,
        outcomeIds
      );
      const asksRows = await dbQuery<{ outcome: string; price: number }>(
        db,
        `SELECT outcome, price FROM orders WHERE outcome IN (${ph}) AND side = 1 AND status IN ('open','partial') ORDER BY outcome, price ASC, create_time ASC`,
        outcomeIds
      );
      bidsRows.forEach((r) => { if (bestBidByOutcome[r.outcome] == null) bestBidByOutcome[r.outcome] = r.price; });
      asksRows.forEach((r) => { if (bestAskByOutcome[r.outcome] == null) bestAskByOutcome[r.outcome] = r.price; });
    }
    // Use integer cents for current price so unrealized P&L is integer; sum of position P&L then nets to 0 exactly in zero-sum.
    const currentPriceByOutcome: Record<string, number> = {};
    outcomeIds.forEach((outcome) => {
      const bid = bestBidByOutcome[outcome] ?? null;
      const ask = bestAskByOutcome[outcome] ?? null;
      const mid = (bid != null && ask != null) ? (bid + ask) / 2 : (bid ?? ask ?? null);
      if (mid != null) currentPriceByOutcome[outcome] = Math.round(mid);
    });
    // Raw P&L (no rounding) so we can sum then round once — avoids rounding error on system total.
    function pnlRaw(p: { net_position: number; price_basis: number; closed_profit: number; settled_profit: number }, currentPrice: number | null): number {
      let contribution = p.closed_profit + p.settled_profit;
      if (p.net_position !== 0 && currentPrice != null) {
        const costCents = p.net_position * p.price_basis;
        if (p.net_position < 0) {
          contribution += (p.price_basis - currentPrice) * Math.abs(p.net_position);
        } else {
          contribution += p.net_position * currentPrice - costCents;
        }
      }
      return contribution;
    }

    const userIds = new Set(users.map((u) => u.id));
    const portfolioByUser = new Map<number, number>();
    const closedProfitByUser = new Map<number, number>();
    const settledProfitByUser = new Map<number, number>();
    const pnlByOutcome: Record<string, number> = {};
    const positionContributions: Array<{ outcome: string; user_id: number | null; contribution_cents: number }> = [];
    let unattributedCentsRaw = 0;
    let unattributedClosedProfitCents = 0;
    let unattributedSettledProfitCents = 0;
    let systemTotalCentsRaw = 0;
    for (const p of positionsRows) {
      const currentPrice = currentPriceByOutcome[p.outcome] ?? null;
      const contributionRaw = pnlRaw(p, currentPrice);
      const contributionRounded = Math.round(contributionRaw);
      systemTotalCentsRaw += contributionRaw;
      pnlByOutcome[p.outcome] = (pnlByOutcome[p.outcome] ?? 0) + contributionRaw;
      if (contributionRounded !== 0) {
        positionContributions.push({ outcome: p.outcome, user_id: p.user_id, contribution_cents: contributionRounded });
      }
      // Unattributed: no user_id, or user_id not in current users table (e.g. deleted user)
      if (p.user_id == null || !userIds.has(p.user_id)) {
        unattributedCentsRaw += contributionRaw;
        unattributedClosedProfitCents += p.closed_profit;
        unattributedSettledProfitCents += p.settled_profit;
      } else {
        portfolioByUser.set(p.user_id, (portfolioByUser.get(p.user_id) ?? 0) + contributionRaw);
        closedProfitByUser.set(p.user_id, (closedProfitByUser.get(p.user_id) ?? 0) + p.closed_profit);
        settledProfitByUser.set(p.user_id, (settledProfitByUser.get(p.user_id) ?? 0) + p.settled_profit);
      }
    }
    // Sort by contribution descending so largest imbalances show first
    positionContributions.sort((a, b) => Math.abs(b.contribution_cents) - Math.abs(a.contribution_cents));

    const leaderboard: LeaderboardRow[] = users.map((u) => ({
      user_id: u.id,
      username: u.username,
      trade_count: tradeCountByUser.get(u.id) ?? 0,
      open_orders_count: openOrdersByUser.get(u.id) ?? 0,
      shares_traded: sharesByUser.get(u.id) ?? 0,
      portfolio_value_cents: Math.round(portfolioByUser.get(u.id) ?? 0),
      closed_profit_cents: closedProfitByUser.get(u.id) ?? 0,
      settled_profit_cents: settledProfitByUser.get(u.id) ?? 0,
    }));

    // Report system total as $0 when within ±10¢ (rounding drift from legacy position updates)
    const SYSTEM_TOTAL_TOLERANCE_CENTS = 10;
    const systemTotalReported =
      Math.abs(systemTotalCentsRaw) <= SYSTEM_TOTAL_TOLERANCE_CENTS ? 0 : Math.round(systemTotalCentsRaw);

    return jsonResponse({
      leaderboard,
      unattributed_portfolio_value_cents: Math.round(unattributedCentsRaw),
      unattributed_closed_profit_cents: unattributedClosedProfitCents,
      unattributed_settled_profit_cents: unattributedSettledProfitCents,
      system_total_portfolio_value_cents: systemTotalReported,
      // Debug: where the imbalance comes from (should net to 0 per outcome in a zero-sum game)
      pnl_by_outcome: pnlByOutcome,
      position_contributions: positionContributions.slice(0, 50),
    });
  } catch (err) {
    console.error('Admin leaderboard error:', err);
    return jsonResponse({ error: 'Failed to load leaderboard' }, 500);
  }
};
