import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';
import { createTrade, updatePosition, updatePositionsForFill, addSystemClosedProfitOffset } from '../../../lib/matching';

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const body = await request.json().catch(() => ({}));
    // Support taker_user_id + maker_user_id; fallback to user_id as taker for backward compat
    const takerUserId = body?.taker_user_id != null ? Number(body.taker_user_id) : (body?.user_id != null ? Number(body.user_id) : undefined);
    const makerUserId = body?.maker_user_id != null ? Number(body.maker_user_id) : null;
    const marketId = body?.market_id;
    const outcomeId = body?.outcome_id;
    const side = body?.side;
    const price = body?.price != null ? Number(body.price) : undefined;
    const contractSize = body?.contract_size != null ? Number(body.contract_size) : undefined;

    if (takerUserId == null || !Number.isInteger(takerUserId) || takerUserId < 1) {
      return errorResponse('Invalid or missing taker_user_id', 400);
    }
    if (makerUserId != null && (!Number.isInteger(makerUserId) || makerUserId < 1)) {
      return errorResponse('maker_user_id must be a positive integer or omitted', 400);
    }
    const marketIdSanitized = typeof marketId === 'string' ? marketId.trim() : '';
    const outcomeIdSanitized = typeof outcomeId === 'string' ? outcomeId.trim() : '';
    if (!marketIdSanitized) {
      return errorResponse('Invalid or missing market_id', 400);
    }
    if (!outcomeIdSanitized) {
      return errorResponse('Invalid or missing outcome_id', 400);
    }
    if (side !== 'bid' && side !== 'ask') {
      return errorResponse('side must be "bid" or "ask" (taker\'s side)', 400);
    }
    if (price == null || !Number.isInteger(price) || price < 100 || price > 9900) {
      return errorResponse('price must be an integer between 100 and 9900 (cents)', 400);
    }
    if (contractSize == null || !Number.isInteger(contractSize) || contractSize < 1) {
      return errorResponse('contract_size must be a positive integer', 400);
    }

    const takerUser = await dbFirst<{ id: number }>(db, 'SELECT id FROM users WHERE id = ?', [takerUserId]);
    if (!takerUser) {
      return errorResponse('Taker user not found', 404);
    }
    if (makerUserId != null) {
      const makerUser = await dbFirst<{ id: number }>(db, 'SELECT id FROM users WHERE id = ?', [makerUserId]);
      if (!makerUser) {
        return errorResponse('Maker user not found', 404);
      }
      if (takerUserId === makerUserId) {
        return errorResponse('Taker and maker cannot be the same user', 400);
      }
    }

    const market = await dbFirst(db, 'SELECT market_id FROM markets WHERE market_id = ?', [marketIdSanitized]);
    if (!market) {
      return errorResponse('Market not found', 404);
    }

    const outcome = await dbFirst(
      db,
      'SELECT outcome_id FROM outcomes WHERE outcome_id = ? AND market_id = ?',
      [outcomeIdSanitized, marketIdSanitized]
    );
    if (!outcome) {
      return errorResponse('Outcome not found or does not belong to market', 404);
    }

    const takerSide = side === 'bid' ? 0 : 1;
    const tradeId = await createTrade(
      db,
      marketIdSanitized,
      'manual',
      0,
      price,
      contractSize,
      outcomeIdSanitized,
      takerUserId,
      makerUserId,
      takerSide
    );

    // Update positions with zero-sum closed profit (same invariant as order-book matching)
    if (makerUserId != null) {
      await updatePositionsForFill(db, outcomeIdSanitized, takerUserId, makerUserId, side, price, contractSize);
    } else {
      const { closedProfitDelta } = await updatePosition(db, outcomeIdSanitized, takerUserId, side, price, contractSize);
      if (closedProfitDelta !== 0) {
        await addSystemClosedProfitOffset(db, outcomeIdSanitized, -closedProfitDelta);
      }
    }

    // Insert synthetic "filled" orders for logging/audit so order history shows this trade (manual trades don't hit the book)
    const createTime = Math.floor(Date.now() / 1000);
    const manualToken = `manual-${tradeId}`;
    const takerSideNum = takerSide;
    const makerSideNum = 1 - takerSide;
    await dbRun(
      db,
      `INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
       VALUES (?, ?, ?, ?, ?, ?, 'filled', 'GTC', ?, 0, ?)`,
      [createTime, takerUserId, `${manualToken}-t`, -tradeId, outcomeIdSanitized, price, takerSideNum, contractSize]
    );
    if (makerUserId != null) {
      await dbRun(
        db,
        `INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
         VALUES (?, ?, ?, ?, ?, ?, 'filled', 'GTC', ?, 0, ?)`,
        [createTime, makerUserId, `${manualToken}-m`, -tradeId, outcomeIdSanitized, price, makerSideNum, contractSize]
      );
    }

    return jsonResponse(
      {
        trade: {
          id: tradeId,
          market_id: marketIdSanitized,
          outcome_id: outcomeIdSanitized,
          side,
          price,
          contracts: contractSize,
          taker_user_id: takerUserId,
          maker_user_id: makerUserId,
        },
      },
      201
    );
  } catch (err) {
    console.error('Admin manual trade error:', err);
    return errorResponse('Failed to create manual trade', 500);
  }
};
