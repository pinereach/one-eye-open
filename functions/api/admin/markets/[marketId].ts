import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

export const onRequestPatch: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const body = await request.json().catch(() => ({}));
    const tradingPaused = body?.trading_paused;

    if (typeof tradingPaused !== 'boolean') {
      return errorResponse('Body must include trading_paused (boolean)', 400);
    }

    const market = await dbFirst(
      db,
      'SELECT market_id, trading_paused FROM markets WHERE market_id = ?',
      [marketId]
    );

    if (!market) {
      return errorResponse('Market not found', 404);
    }

    await dbRun(
      db,
      'UPDATE markets SET trading_paused = ? WHERE market_id = ?',
      [tradingPaused ? 1 : 0, marketId]
    );

    const updated = await dbFirst(
      db,
      'SELECT * FROM markets WHERE market_id = ?',
      [marketId]
    );

    return jsonResponse({ market: updated, success: true });
  } catch (err) {
    console.error('Admin market pause error:', err);
    return errorResponse('Failed to update market', 500);
  }
};
