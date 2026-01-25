import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAuth, jsonResponse, errorResponse } from '../../../middleware';
import {
  executeMatching,
  calculateExposure,
  type Order,
} from '../../../lib/matching';

const orderSchema = z.object({
  side: z.enum(['bid', 'ask']),
  price_cents: z.number().int().min(0).max(10000),
  qty_contracts: z.number().int().positive(),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  try {
    const body = await request.json();
    const validated = orderSchema.parse(body);

    // Verify market exists and is open
    const market = await dbFirst(
      db,
      'SELECT * FROM markets WHERE id = ? AND status = ?',
      [marketId, 'open']
    );

    if (!market) {
      return errorResponse('Market not found or not open', 404);
    }

    // Check exposure limit
    const maxExposureCents = parseInt(env.MAX_EXPOSURE_CENTS || '500000', 10);
    const exposure = await calculateExposure(db, userId, maxExposureCents);

    // Calculate potential new exposure
    const potentialExposure =
      validated.side === 'bid'
        ? validated.qty_contracts * validated.price_cents
        : validated.qty_contracts * (10000 - validated.price_cents);

    if (exposure.currentExposure + potentialExposure > maxExposureCents) {
      return errorResponse(
        `Exposure limit exceeded. Current: $${(exposure.currentExposure / 100).toFixed(2)}, Limit: $${(maxExposureCents / 100).toFixed(2)}`,
        400
      );
    }

    // Create order
    const orderId = crypto.randomUUID();
    const order: Order = {
      id: orderId,
      market_id: marketId,
      user_id: userId,
      side: validated.side,
      price_cents: validated.price_cents,
      qty_contracts: validated.qty_contracts,
      qty_remaining: validated.qty_contracts,
      status: 'open',
      created_at: Math.floor(Date.now() / 1000),
    };

    await dbRun(
      db,
      `INSERT INTO orders (id, market_id, user_id, side, price_cents, qty_contracts, qty_remaining, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.market_id,
        order.user_id,
        order.side,
        order.price_cents,
        order.qty_contracts,
        order.qty_remaining,
        order.status,
        order.created_at,
      ]
    );

    // Execute matching
    const { fills, trades } = await executeMatching(db, order);

    // Get updated order
    const updatedOrder = await dbFirst<Order>(
      db,
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    return jsonResponse(
      {
        order: updatedOrder,
        fills,
        trades,
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Order placement error:', error);
    return errorResponse('Failed to place order', 500);
  }
};
