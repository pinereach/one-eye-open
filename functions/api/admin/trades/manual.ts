import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';
import { createTrade, updatePosition } from '../../../lib/matching';

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const body = await request.json().catch(() => ({}));
    const userId = body?.user_id != null ? Number(body.user_id) : undefined;
    const marketId = body?.market_id;
    const outcomeId = body?.outcome_id;
    const side = body?.side;
    const price = body?.price != null ? Number(body.price) : undefined;
    const contractSize = body?.contract_size != null ? Number(body.contract_size) : undefined;

    if (userId == null || !Number.isInteger(userId) || userId < 1) {
      return errorResponse('Invalid or missing user_id', 400);
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
      return errorResponse('side must be "bid" or "ask"', 400);
    }
    if (price == null || !Number.isInteger(price) || price < 100 || price > 9900) {
      return errorResponse('price must be an integer between 100 and 9900 (cents)', 400);
    }
    if (contractSize == null || !Number.isInteger(contractSize) || contractSize < 1) {
      return errorResponse('contract_size must be a positive integer', 400);
    }

    const user = await dbFirst<{ id: number }>(db, 'SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return errorResponse('User not found', 404);
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
      userId,
      null,
      takerSide
    );

    await updatePosition(db, outcomeIdSanitized, userId, side, price, contractSize);

    return jsonResponse(
      {
        trade: {
          id: tradeId,
          market_id: marketIdSanitized,
          outcome_id: outcomeIdSanitized,
          side,
          price,
          contracts: contractSize,
        },
      },
      201
    );
  } catch (err) {
    console.error('Admin manual trade error:', err);
    return errorResponse('Failed to create manual trade', 500);
  }
};
