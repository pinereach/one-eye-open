import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

/**
 * DELETE /api/admin/trades/:tradeId — delete a trade by id (admin only).
 * Used from the tape to remove erroneous trades.
 */
export const onRequestDelete: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const tradeIdParam = params?.tradeId as string | undefined;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const tradeId = tradeIdParam ? parseInt(tradeIdParam, 10) : NaN;
  if (!Number.isInteger(tradeId) || tradeId < 1) {
    return errorResponse('Invalid trade id', 400);
  }

  const db = getDb(env);

  const existing = await dbFirst<{ id: number }>(db, 'SELECT id FROM trades WHERE id = ?', [tradeId]);
  if (!existing) {
    return errorResponse('Trade not found', 404);
  }

  await dbRun(db, 'DELETE FROM trades WHERE id = ?', [tradeId]);

  return jsonResponse({ deleted: true, id: tradeId });
};
