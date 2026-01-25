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
  outcome_id: z.string(),
  side: z.enum(['bid', 'ask']),
  price: z.number().int().min(0).max(10000),
  contract_size: z.number().int().positive(),
  tif: z.string().optional().default('GTC'), // Time in force, default to Good Till Cancel
  token: z.string().optional(),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const marketId = params.marketId as string;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id; // user.id is now a number
  const db = getDb(env);

  try {
    const body = await request.json();
    const validated = orderSchema.parse(body);

    // Verify market exists (markets no longer have status field)
    const market = await dbFirst(
      db,
      'SELECT * FROM markets WHERE market_id = ?',
      [marketId]
    );

    if (!market) {
      return errorResponse('Market not found', 404);
    }

    // Verify outcome exists and belongs to market
    // Note: outcomes no longer have status field, so we check market status instead
    const outcome = await dbFirst(
      db,
      'SELECT * FROM outcomes WHERE outcome_id = ? AND market_id = ?',
      [validated.outcome_id, marketId]
    );

    if (!outcome) {
      return errorResponse('Outcome not found', 404);
    }

    // Check exposure limit
    const maxExposureCents = parseInt(env.MAX_EXPOSURE_CENTS || '500000', 10);
    const exposure = await calculateExposure(db, userId, maxExposureCents);

    // Calculate potential new exposure
    const sideNum = validated.side === 'bid' ? 0 : 1;
    const potentialExposure =
      sideNum === 0 // bid
        ? validated.contract_size * validated.price
        : validated.contract_size * (10000 - validated.price);

    if (exposure.currentExposure + potentialExposure > maxExposureCents) {
      return errorResponse(
        `Exposure limit exceeded. Current: $${(exposure.currentExposure / 100).toFixed(2)}, Limit: $${(maxExposureCents / 100).toFixed(2)}`,
        400
      );
    }

    // Generate token if not provided
    const token = validated.token || crypto.randomUUID();

    // Create order
    const result = await dbRun(
      db,
      `INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Math.floor(Date.now() / 1000),
        userId, // user.id is now a number
        token,
        -1, // order_id default
        validated.outcome_id,
        validated.price,
        'open',
        validated.tif || 'GTC',
        sideNum,
        validated.contract_size,
      ]
    );

    // Get the inserted order ID
    const orderId = result.meta.last_row_id;
    if (!orderId) {
      return errorResponse('Failed to create order', 500);
    }

    // Get the created order
    const order = await dbFirst<Order>(
      db,
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (!order) {
      return errorResponse('Failed to retrieve created order', 500);
    }

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
