import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbRun, dbQuery, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);
  let result: Awaited<ReturnType<typeof dbRun>>;

  try {
    const body = await request.json().catch(() => ({}));
    const userId = body?.user_id != null ? Number(body.user_id) : undefined;
    const marketId = typeof body?.market_id === 'string' ? body.market_id.trim() : undefined;

    if (userId != null && (typeof userId !== 'number' || !Number.isInteger(userId))) {
      return errorResponse('Invalid user_id', 400);
    }

    // If market_id is provided, get all outcome_ids for that market
    let outcomeIds: string[] = [];
    if (marketId) {
      const outcomes = await dbQuery<{ outcome_id: string }>(
        db,
        'SELECT outcome_id FROM outcomes WHERE market_id = ?',
        [marketId]
      );
      outcomeIds = outcomes.map((o) => o.outcome_id);
      if (outcomeIds.length === 0) {
        return jsonResponse({ canceled: 0 });
      }
    }

    // Build query based on filters
    if (marketId && userId != null) {
      const placeholders = outcomeIds.map(() => '?').join(',');
      result = await dbRun(
        db,
        `UPDATE orders SET status = 'canceled' WHERE status IN ('open', 'partial') AND user_id = ? AND outcome IN (${placeholders})`,
        [userId, ...outcomeIds]
      );
    } else if (marketId) {
      const placeholders = outcomeIds.map(() => '?').join(',');
      result = await dbRun(
        db,
        `UPDATE orders SET status = 'canceled' WHERE status IN ('open', 'partial') AND outcome IN (${placeholders})`,
        outcomeIds
      );
    } else if (userId != null) {
      result = await dbRun(
        db,
        "UPDATE orders SET status = 'canceled' WHERE status IN ('open', 'partial') AND user_id = ?",
        [userId]
      );
    } else {
      result = await dbRun(
        db,
        "UPDATE orders SET status = 'canceled' WHERE status IN ('open', 'partial')"
      );
    }

    const canceled = result.meta?.changes ?? 0;
    return jsonResponse({ canceled });
  } catch (err) {
    console.error('Admin cancel-all error:', err);
    return errorResponse('Failed to cancel orders', 500);
  }
};
