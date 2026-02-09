import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

/**
 * PATCH /api/admin/trades/:tradeId — update risk_off_contracts and risk_off_price_diff (admin only).
 * Body: { risk_off_contracts?: number, risk_off_price_diff?: number }. Omitted fields are left unchanged.
 */
export const onRequestPatch: OnRequest<Env> = async (context) => {
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

  const body = await request.json().catch(() => ({}));
  const riskOffContracts = body?.risk_off_contracts;
  const riskOffPriceDiff = body?.risk_off_price_diff;

  if (riskOffContracts !== undefined) {
    if (!Number.isInteger(riskOffContracts) || riskOffContracts < 0) {
      return errorResponse('risk_off_contracts must be a non-negative integer', 400);
    }
  }
  if (riskOffPriceDiff !== undefined) {
    if (!Number.isInteger(riskOffPriceDiff)) {
      return errorResponse('risk_off_price_diff must be an integer (cents)', 400);
    }
  }

  if (riskOffContracts === undefined && riskOffPriceDiff === undefined) {
    return errorResponse('Body must include at least one of risk_off_contracts, risk_off_price_diff', 400);
  }

  if (riskOffContracts !== undefined && riskOffPriceDiff !== undefined) {
    await dbRun(
      db,
      'UPDATE trades SET risk_off_contracts = ?, risk_off_price_diff = ? WHERE id = ?',
      [riskOffContracts, riskOffPriceDiff, tradeId]
    );
  } else if (riskOffContracts !== undefined) {
    await dbRun(db, 'UPDATE trades SET risk_off_contracts = ? WHERE id = ?', [riskOffContracts, tradeId]);
  } else {
    await dbRun(db, 'UPDATE trades SET risk_off_price_diff = ? WHERE id = ?', [riskOffPriceDiff, tradeId]);
  }

  const updated = await dbFirst(
    db,
    'SELECT id, outcome, risk_off_contracts, risk_off_price_diff, taker_user_id, maker_user_id FROM trades WHERE id = ?',
    [tradeId]
  );
  return jsonResponse({ trade: updated, success: true });
};

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
