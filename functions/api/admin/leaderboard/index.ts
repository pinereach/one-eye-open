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

export type StatsByMarketType = {
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
 * Also returns stats_by_market_type: per-user, per-market-type same stats for dropdown breakdown.
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

    // outcome_id -> market_type for grouping by market type (handle market_total_birdies / market-total-birdies)
    const outcomeMarketTypeRows = await dbQuery<{ outcome_id: string; market_type: string | null }>(
      db,
      `SELECT o.outcome_id, m.market_type FROM outcomes o
       LEFT JOIN markets m ON (o.market_id = m.market_id OR (o.market_id = 'market_total_birdies' AND m.market_id = 'market-total-birdies'))`,
      []
    );
    const outcomeToMarketType: Record<string, string> = {};
    outcomeMarketTypeRows.forEach((r) => {
      outcomeToMarketType[r.outcome_id] = r.market_type ?? 'other';
    });

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

    // Per-user, per-market_type stats (same metrics as leaderboard row)
    const statsByUserMarketType = new Map<number, Map<string, StatsByMarketType>>();
    function getOrCreate(userId: number, marketType: string): StatsByMarketType {
      let byType = statsByUserMarketType.get(userId);
      if (!byType) {
        byType = new Map<string, StatsByMarketType>();
        statsByUserMarketType.set(userId, byType);
      }
      let s = byType.get(marketType);
      if (!s) {
        s = { trade_count: 0, open_orders_count: 0, shares_traded: 0, portfolio_value_cents: 0, closed_profit_cents: 0, settled_profit_cents: 0 };
        byType.set(marketType, s);
      }
      return s;
    }

    // Trades by outcome for market-type breakdown
    const tradesWithOutcome = await dbQuery<{ outcome: string; taker_user_id: number | null; maker_user_id: number | null; contracts: number }>(
      db,
      `SELECT outcome, taker_user_id, maker_user_id, contracts FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND (taker_user_id IS NOT NULL OR maker_user_id IS NOT NULL)`,
      []
    );
    for (const t of tradesWithOutcome) {
      const mt = outcomeToMarketType[t.outcome] ?? 'other';
      if (t.taker_user_id != null) {
        const s = getOrCreate(t.taker_user_id, mt);
        s.trade_count += 1;
        s.shares_traded += Number(t.contracts) || 0;
      }
      if (t.maker_user_id != null && t.maker_user_id !== t.taker_user_id) {
        const s = getOrCreate(t.maker_user_id, mt);
        s.trade_count += 1;
        s.shares_traded += Number(t.contracts) || 0;
      }
    }

    // Open orders by outcome for market-type breakdown
    const ordersWithOutcome = await dbQuery<{ user_id: number; outcome: string }>(
      db,
      `SELECT user_id, outcome FROM orders WHERE status IN ('open','partial') AND user_id IS NOT NULL`,
      []
    );
    for (const o of ordersWithOutcome) {
      const mt = outcomeToMarketType[o.outcome] ?? 'other';
      const s = getOrCreate(o.user_id, mt);
      s.open_orders_count += 1;
    }

    // Portfolio value = unrealized P&L only (mark-to-market vs cost basis). Closed and settled profit are separate.
    // Include ALL positions so we can compute unattributed P&L (user_id = 0/system or user not in users table). We sum raw P&L then round
    // once per aggregate (system total, per-user, unattributed) to avoid rounding error from (bid+ask)/2.
    const positionsRows = await dbQuery<{ user_id: number | null; outcome: string; net_position: number; price_basis: number; closed_profit: number; settled_profit: number; outcome_settled_price: number | null }>(
      db,
      `SELECT p.user_id, p.outcome, p.net_position, COALESCE(NULLIF(p.price_basis, 0), 0) AS price_basis, COALESCE(p.closed_profit, 0) AS closed_profit, COALESCE(p.settled_profit, 0) AS settled_profit, o.settled_price AS outcome_settled_price
       FROM positions p
       JOIN outcomes o ON p.outcome = o.outcome_id`,
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
    // Use integer cents for current price so unrealized P&L is integer. Settled outcomes (outcome_settled_price != null) are excluded from unrealized.
    const settledOutcomeIds = new Set(positionsRows.filter((p) => p.outcome_settled_price != null).map((p) => p.outcome));
    const currentPriceByOutcome: Record<string, number> = {};
    outcomeIds.forEach((outcome) => {
      if (settledOutcomeIds.has(outcome)) return;
      const bid = bestBidByOutcome[outcome] ?? null;
      const ask = bestAskByOutcome[outcome] ?? null;
      const mid = (bid != null && ask != null) ? (bid + ask) / 2 : (bid ?? ask ?? null);
      if (mid != null) currentPriceByOutcome[outcome] = Math.round(mid);
    });
    // Unrealized P&L only (no closed/settled). Used for portfolio_value_cents so closed profit stays a separate column.
    function unrealizedPnlRaw(p: { net_position: number; price_basis: number }, currentPrice: number | null): number {
      if (p.net_position === 0 || currentPrice == null) return 0;
      const costCents = p.net_position * p.price_basis;
      if (p.net_position < 0) {
        return (p.price_basis - currentPrice) * Math.abs(p.net_position);
      }
      return p.net_position * currentPrice - costCents;
    }

    const userIds = new Set(users.map((u) => u.id));
    const portfolioByUser = new Map<number, number>();
    const closedProfitByUser = new Map<number, number>();
    const settledProfitByUser = new Map<number, number>();
    const pnlByOutcome: Record<string, number> = {};
    const closedProfitByOutcome: Record<string, number> = {};
    const settledProfitByOutcome: Record<string, number> = {};
    const positionContributions: Array<{ outcome: string; user_id: number | null; contribution_cents: number }> = [];
    const closedProfitContributions: Array<{ outcome: string; user_id: number | null; closed_profit_cents: number }> = [];
    const settledProfitContributions: Array<{ outcome: string; user_id: number | null; settled_profit_cents: number }> = [];
    let unattributedCentsRaw = 0;
    let unattributedClosedProfitCents = 0;
    let unattributedSettledProfitCents = 0;
    let systemTotalCentsRaw = 0;
    let systemTotalClosedProfitCents = 0;
    let systemTotalSettledProfitCents = 0;
    for (const p of positionsRows) {
      const isSettled = p.outcome_settled_price != null;
      const currentPrice = isSettled ? null : (currentPriceByOutcome[p.outcome] ?? null);
      const unrealizedRaw = isSettled ? 0 : unrealizedPnlRaw(p, currentPrice);
      const unrealizedRounded = Math.round(unrealizedRaw);
      systemTotalCentsRaw += unrealizedRaw;
      systemTotalClosedProfitCents += p.closed_profit;
      systemTotalSettledProfitCents += p.settled_profit;
      pnlByOutcome[p.outcome] = (pnlByOutcome[p.outcome] ?? 0) + unrealizedRaw;
      closedProfitByOutcome[p.outcome] = (closedProfitByOutcome[p.outcome] ?? 0) + p.closed_profit;
      settledProfitByOutcome[p.outcome] = (settledProfitByOutcome[p.outcome] ?? 0) + p.settled_profit;
      if (unrealizedRounded !== 0) {
        positionContributions.push({ outcome: p.outcome, user_id: p.user_id, contribution_cents: unrealizedRounded });
      }
      if (p.closed_profit !== 0) {
        closedProfitContributions.push({ outcome: p.outcome, user_id: p.user_id, closed_profit_cents: p.closed_profit });
      }
      if (p.settled_profit !== 0) {
        settledProfitContributions.push({ outcome: p.outcome, user_id: p.user_id, settled_profit_cents: p.settled_profit });
      }
      // Unattributed: no user_id, or user_id not in current users table (e.g. deleted user)
      if (p.user_id == null || !userIds.has(p.user_id)) {
        unattributedCentsRaw += unrealizedRaw;
        unattributedClosedProfitCents += p.closed_profit;
        unattributedSettledProfitCents += p.settled_profit;
      } else {
        portfolioByUser.set(p.user_id, (portfolioByUser.get(p.user_id) ?? 0) + unrealizedRaw);
        closedProfitByUser.set(p.user_id, (closedProfitByUser.get(p.user_id) ?? 0) + p.closed_profit);
        settledProfitByUser.set(p.user_id, (settledProfitByUser.get(p.user_id) ?? 0) + p.settled_profit);
        const mt = outcomeToMarketType[p.outcome] ?? 'other';
        const s = getOrCreate(p.user_id, mt);
        s.portfolio_value_cents += unrealizedRaw;
        s.closed_profit_cents += p.closed_profit;
        s.settled_profit_cents += p.settled_profit;
      }
    }
    // Round portfolio_value_cents per (user, market_type) after accumulation
    statsByUserMarketType.forEach((byType) => {
      byType.forEach((s) => {
        s.portfolio_value_cents = Math.round(s.portfolio_value_cents);
      });
    });
    // Sort by contribution descending so largest imbalances show first
    positionContributions.sort((a, b) => Math.abs(b.contribution_cents) - Math.abs(a.contribution_cents));
    closedProfitContributions.sort((a, b) => Math.abs(b.closed_profit_cents) - Math.abs(a.closed_profit_cents));
    settledProfitContributions.sort((a, b) => Math.abs(b.settled_profit_cents) - Math.abs(a.settled_profit_cents));

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

    const statsByMarketTypePayload: Record<string, Record<string, StatsByMarketType>> = {};
    statsByUserMarketType.forEach((byType, userId) => {
      const obj: Record<string, StatsByMarketType> = {};
      byType.forEach((s, marketType) => { obj[marketType] = { ...s }; });
      statsByMarketTypePayload[String(userId)] = obj;
    });

    return jsonResponse({
      leaderboard,
      stats_by_market_type: statsByMarketTypePayload,
      unattributed_portfolio_value_cents: Math.round(unattributedCentsRaw),
      unattributed_closed_profit_cents: unattributedClosedProfitCents,
      unattributed_settled_profit_cents: unattributedSettledProfitCents,
      system_total_portfolio_value_cents: systemTotalReported,
      // Debug: P&L / portfolio
      pnl_by_outcome: pnlByOutcome,
      position_contributions: positionContributions.slice(0, 50),
      // Debug: closed and settled profit (should each sum to 0 system-wide and per outcome in zero-sum)
      system_total_closed_profit_cents: systemTotalClosedProfitCents,
      system_total_settled_profit_cents: systemTotalSettledProfitCents,
      closed_profit_by_outcome: closedProfitByOutcome,
      settled_profit_by_outcome: settledProfitByOutcome,
      closed_profit_contributions: closedProfitContributions.slice(0, 30),
      settled_profit_contributions: settledProfitContributions.slice(0, 30),
    });
  } catch (err) {
    console.error('Admin leaderboard error:', err);
    return jsonResponse({ error: 'Failed to load leaderboard' }, 500);
  }
};
