import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

/**
 * PATCH /api/admin/trades/:tradeId — update risk_off fields (admin only).
 * Body: { risk_off_contracts_taker?, risk_off_contracts_maker?, risk_off_price_diff_taker?, risk_off_price_diff_maker? }. Omitted fields left unchanged.
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
  const riskOffContractsTaker = body?.risk_off_contracts_taker;
  const riskOffContractsMaker = body?.risk_off_contracts_maker;
  const riskOffPriceDiffTaker = body?.risk_off_price_diff_taker;
  const riskOffPriceDiffMaker = body?.risk_off_price_diff_maker;

  if (riskOffContractsTaker !== undefined) {
    if (!Number.isInteger(riskOffContractsTaker) || riskOffContractsTaker < 0) {
      return errorResponse('risk_off_contracts_taker must be a non-negative integer', 400);
    }
  }
  if (riskOffContractsMaker !== undefined) {
    if (!Number.isInteger(riskOffContractsMaker) || riskOffContractsMaker < 0) {
      return errorResponse('risk_off_contracts_maker must be a non-negative integer', 400);
    }
  }
  if (riskOffPriceDiffTaker !== undefined) {
    if (!Number.isInteger(riskOffPriceDiffTaker)) {
      return errorResponse('risk_off_price_diff_taker must be an integer (cents)', 400);
    }
  }
  if (riskOffPriceDiffMaker !== undefined) {
    if (!Number.isInteger(riskOffPriceDiffMaker)) {
      return errorResponse('risk_off_price_diff_maker must be an integer (cents)', 400);
    }
  }

  const hasAny =
    riskOffContractsTaker !== undefined ||
    riskOffContractsMaker !== undefined ||
    riskOffPriceDiffTaker !== undefined ||
    riskOffPriceDiffMaker !== undefined;
  if (!hasAny) {
    return errorResponse(
      'Body must include at least one of risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff_taker, risk_off_price_diff_maker',
      400
    );
  }

  const updates: string[] = [];
  const updateParams: number[] = [];
  if (riskOffContractsTaker !== undefined) {
    updates.push('risk_off_contracts_taker = ?');
    updateParams.push(riskOffContractsTaker);
  }
  if (riskOffContractsMaker !== undefined) {
    updates.push('risk_off_contracts_maker = ?');
    updateParams.push(riskOffContractsMaker);
  }
  if (riskOffPriceDiffTaker !== undefined) {
    updates.push('risk_off_price_diff_taker = ?');
    updateParams.push(riskOffPriceDiffTaker);
  }
  if (riskOffPriceDiffMaker !== undefined) {
    updates.push('risk_off_price_diff_maker = ?');
    updateParams.push(riskOffPriceDiffMaker);
  }
  updateParams.push(tradeId);
  await dbRun(db, `UPDATE trades SET ${updates.join(', ')} WHERE id = ?`, updateParams);

  let updated: Record<string, unknown> | null = null;
  try {
    updated = await dbFirst(
      db,
      'SELECT id, outcome, risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff_taker, risk_off_price_diff_maker, taker_user_id, maker_user_id FROM trades WHERE id = ?',
      [tradeId]
    ) as Record<string, unknown> | null;
  } catch {
    updated = await dbFirst(
      db,
      'SELECT id, outcome, risk_off_contracts_taker, risk_off_contracts_maker, risk_off_price_diff, risk_off_price_diff_maker, taker_user_id, maker_user_id FROM trades WHERE id = ?',
      [tradeId]
    ) as Record<string, unknown> | null;
  }
  return jsonResponse({ trade: updated ?? {}, success: true });
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
