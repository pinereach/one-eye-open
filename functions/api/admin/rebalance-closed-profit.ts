import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, dbQuery, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

const OFFSET_OUTCOME = '__closed_profit_offset';

/**
 * POST /api/admin/rebalance-closed-profit — admin only.
 * One-time fix: ensures sum(closed_profit) across all positions = 0 by inserting or
 * updating a system row (user_id NULL, outcome __closed_profit_offset). Call once to
 * fix historical imbalance; new fills are already zero-sum from matching logic.
 */
export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const rows = await dbQuery<{ sum: number }>(
      db,
      'SELECT COALESCE(SUM(closed_profit), 0) AS sum FROM positions',
      []
    );
    const totalCents = rows[0]?.sum ?? 0;

    if (totalCents === 0) {
      return jsonResponse({
        applied: false,
        message: 'Closed profit already sums to 0',
        sum_cents: 0,
      });
    }

    const existing = await dbFirst<{ id: number; closed_profit: number }>(
      db,
      'SELECT id, closed_profit FROM positions WHERE outcome = ? AND user_id IS NULL',
      [OFFSET_OUTCOME]
    );

    const now = Math.floor(Date.now() / 1000);

    if (existing) {
      const newOffsetCents = existing.closed_profit - totalCents;
      await dbRun(
        db,
        'UPDATE positions SET closed_profit = ? WHERE outcome = ? AND user_id IS NULL',
        [newOffsetCents, OFFSET_OUTCOME]
      );
      return jsonResponse({
        applied: true,
        message: 'Updated system offset so closed profit sums to 0',
        previous_sum_cents: totalCents,
        offset_row_previous_cents: existing.closed_profit,
        offset_row_new_cents: newOffsetCents,
      });
    }

    await dbRun(
      db,
      `INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
       VALUES (NULL, ?, 0, 0, ?, 0, 0, ?)`,
      [OFFSET_OUTCOME, -totalCents, now]
    );
    return jsonResponse({
      applied: true,
      message: 'Inserted system offset so closed profit sums to 0',
      previous_sum_cents: totalCents,
      offset_row_new_cents: -totalCents,
    });
  } catch (err) {
    console.error('Admin rebalance-closed-profit error:', err);
    return errorResponse('Failed to rebalance closed profit', 500);
  }
};
