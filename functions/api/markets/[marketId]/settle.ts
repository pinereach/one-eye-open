import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';
import { settleMarket } from '../../../lib/settlement';

const settleSchema = z.object({
  settle_value: z.number().int().refine((v) => v === 0 || v === 10000, {
    message: 'Settle value must be 0 or 10000',
  }),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  // Require authentication (admin check removed since users no longer have roles)
  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  try {
    const body = await request.json();
    const validated = settleSchema.parse(body);

    // Verify market exists (markets no longer have status field)
    const market = await dbFirst(
      db,
      'SELECT * FROM markets WHERE market_id = ?',
      [marketId]
    );

    if (!market) {
      return errorResponse('Market not found', 404);
    }

    // Settle the market
    const pnlResults = await settleMarket(db, marketId, validated.settle_value);

    return jsonResponse({
      marketId,
      settleValue: validated.settle_value,
      pnlResults,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Settlement error:', error);
    return errorResponse('Settlement failed', 500);
  }
};
