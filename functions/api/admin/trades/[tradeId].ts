import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';
import {
  updatePositionsForFill,
  updatePosition,
  addSystemClosedProfitOffset,
} from '../../../lib/matching';

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
 * DELETE /api/admin/trades/:tradeId — back out a trade (admin only).
 * Reverses both positions, reinstates the maker order when present, then deletes the trade.
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

  const trade = await dbFirst<{
    id: number;
    outcome: string | null;
    price: number;
    contracts: number;
    taker_user_id: number | null;
    maker_user_id: number | null;
    taker_side: number | null;
    maker_order_id: number | null;
  }>(
    db,
    'SELECT id, outcome, price, contracts, taker_user_id, maker_user_id, taker_side, maker_order_id FROM trades WHERE id = ?',
    [tradeId]
  );

  if (!trade) {
    return errorResponse('Trade not found', 404);
  }

  const outcomeId = trade.outcome ?? '';
  const contracts = trade.contracts ?? 0;
  const priceCents = trade.price ?? 0;
  const takerUserId = trade.taker_user_id;
  const makerUserId = trade.maker_user_id;
  const takerSide = trade.taker_side;
  const makerOrderId = trade.maker_order_id;

  if (!outcomeId || contracts < 1 || priceCents < 0) {
    return errorResponse('Trade cannot be backed out: missing outcome, invalid contracts, or invalid price', 400);
  }
  if (takerUserId == null || takerSide == null || (takerSide !== 0 && takerSide !== 1)) {
    return errorResponse('Trade cannot be backed out: missing taker user or taker side', 400);
  }

  const reverseSide = takerSide === 0 ? 'ask' : 'bid';
  const reverseMakerSide = takerSide === 0 ? 'bid' : 'ask';

  try {
    // 1) Reverse positions
    if (makerUserId != null && makerUserId !== takerUserId) {
      await updatePositionsForFill(db, outcomeId, takerUserId, makerUserId, reverseSide, priceCents, contracts);
    } else if (makerUserId != null && makerUserId === takerUserId) {
      await updatePosition(db, outcomeId, takerUserId, reverseSide, priceCents, contracts);
      await updatePosition(db, outcomeId, takerUserId, reverseMakerSide, priceCents, contracts);
    } else {
      await updatePosition(db, outcomeId, takerUserId, reverseSide, priceCents, contracts);
      const netPositionDelta = takerSide === 0 ? contracts : -contracts;
      await addSystemClosedProfitOffset(db, outcomeId, 0, -netPositionDelta, priceCents);
    }

    // 2) Reinstate maker order when present
    let makerOrderReinstated = false;
    if (makerOrderId != null && makerOrderId > 0) {
      const orderRow = await dbFirst<{
        id: number;
        contract_size: number | null;
        original_contract_size: number | null;
        status: string | null;
      }>(db, 'SELECT id, contract_size, original_contract_size, status FROM orders WHERE id = ?', [makerOrderId]);
      if (orderRow) {
        const currentSize = orderRow.contract_size ?? 0;
        const originalSize = orderRow.original_contract_size ?? currentSize + contracts;
        const newContractSize = Math.min((currentSize + contracts) | 0, originalSize);
        const newStatus =
          newContractSize >= originalSize ? 'open' : 'partial';
        await dbRun(db, 'UPDATE orders SET contract_size = ?, status = ? WHERE id = ?', [
          newContractSize,
          newStatus,
          makerOrderId,
        ]);
        makerOrderReinstated = true;
      }
    }

    // 3) Delete the trade
    await dbRun(db, 'DELETE FROM trades WHERE id = ?', [tradeId]);

    return jsonResponse({
      deleted: true,
      id: tradeId,
      positions_reversed: true,
      maker_order_reinstated: makerOrderReinstated,
    });
  } catch (err) {
    console.error('Backout trade failed:', err);
    return errorResponse('Failed to back out trade', 500);
  }
};
