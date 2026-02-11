import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbRun, dbFirst, type Env } from '../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../middleware';
import { SYSTEM_USER_ID } from '../../lib/matching';

/**
 * POST /api/admin/closed-profit-from-risk-off — admin only.
 * Recomputes position closed_profit from trade risk-off columns:
 *   closed_profit(user, outcome) = sum(risk_off_price_diff_taker) where taker_user_id=user + sum(risk_off_price_diff_maker) where maker_user_id=user.
 * Sets system (user_id = SYSTEM_USER_ID) per outcome to closed_profit = 0 (closed profit is per-user realized P&L; total need not sum to zero).
 * Use after backfilling risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff_taker, risk_off_price_diff_maker on trades (e.g. via replay).
 */
export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const positions = await dbQuery<{ user_id: number | null; outcome: string }>(
      db,
      'SELECT DISTINCT user_id, outcome FROM positions',
      []
    );

    let tradesByTaker: { outcome: string; user_id: number; sum_cents: number }[];
    try {
      tradesByTaker = await dbQuery<{ outcome: string; user_id: number; sum_cents: number }>(
        db,
        `SELECT outcome, taker_user_id AS user_id, COALESCE(SUM(risk_off_price_diff_taker), 0) AS sum_cents
         FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND taker_user_id IS NOT NULL
         GROUP BY outcome, taker_user_id`,
        []
      );
    } catch {
      tradesByTaker = await dbQuery<{ outcome: string; user_id: number; sum_cents: number }>(
        db,
        `SELECT outcome, taker_user_id AS user_id, COALESCE(SUM(risk_off_price_diff), 0) AS sum_cents
         FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND taker_user_id IS NOT NULL
         GROUP BY outcome, taker_user_id`,
        []
      );
    }
    let tradesByMaker: { outcome: string; user_id: number; sum_cents: number }[];
    let useMakerColumn = true;
    try {
      tradesByMaker = await dbQuery<{ outcome: string; user_id: number; sum_cents: number }>(
        db,
        `SELECT outcome, maker_user_id AS user_id, COALESCE(SUM(risk_off_price_diff_maker), 0) AS sum_cents
         FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND maker_user_id IS NOT NULL
         GROUP BY outcome, maker_user_id`,
        []
      );
    } catch {
      useMakerColumn = false;
      tradesByMaker = await dbQuery<{ outcome: string; user_id: number; sum_cents: number }>(
        db,
        `SELECT outcome, maker_user_id AS user_id, COALESCE(SUM(risk_off_price_diff), 0) AS sum_cents
         FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND maker_user_id IS NOT NULL
         GROUP BY outcome, maker_user_id`,
        []
      );
    }

    const takerSumByKey = new Map<string, number>();
    tradesByTaker.forEach((r) => takerSumByKey.set(`${r.outcome}:${r.user_id}`, r.sum_cents));
    const makerSumByKey = new Map<string, number>();
    tradesByMaker.forEach((r) => makerSumByKey.set(`${r.outcome}:${r.user_id}`, r.sum_cents));

    let updated = 0;
    const outcomeUserTotalCents = new Map<string, number>();

    for (const p of positions) {
      if (p.user_id == null) continue;
      const key = `${p.outcome}:${p.user_id}`;
      const takerSum = takerSumByKey.get(key) ?? 0;
      const makerSum = makerSumByKey.get(key) ?? 0;
      const closedProfit = useMakerColumn ? takerSum + makerSum : takerSum - makerSum;
      outcomeUserTotalCents.set(p.outcome, (outcomeUserTotalCents.get(p.outcome) ?? 0) + closedProfit);
      await dbRun(
        db,
        'UPDATE positions SET closed_profit = ? WHERE outcome = ? AND user_id = ?',
        [closedProfit, p.outcome, p.user_id]
      );
      updated++;
    }

    for (const [outcome] of outcomeUserTotalCents) {
      const existing = await dbFirst<{ id: number }>(
        db,
        'SELECT id FROM positions WHERE outcome = ? AND user_id = ?',
        [outcome, SYSTEM_USER_ID]
      );
      const now = Math.floor(Date.now() / 1000);
      if (existing) {
        await dbRun(
          db,
          'UPDATE positions SET closed_profit = 0 WHERE outcome = ? AND user_id = ?',
          [outcome, SYSTEM_USER_ID]
        );
      } else {
        await dbRun(
          db,
          `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
           VALUES (?, ?, 0, 0, 0, 0, 0, ?)`,
          [SYSTEM_USER_ID, outcome, now]
        );
      }
    }

    return jsonResponse({
      applied: true,
      message: `Set closed_profit from trade risk_off_price_diff_taker/maker for ${updated} user positions; system rows set to closed_profit=0 for ${outcomeUserTotalCents.size} outcome(s).`,
      positions_updated: updated,
      outcomes_system_updated: outcomeUserTotalCents.size,
    });
  } catch (err) {
    console.error('Admin closed-profit-from-risk-off error:', err);
    return errorResponse('Failed to recompute closed profit from risk-off', 500);
  }
};
