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
  price: z.number().int().min(100).max(9900), // 1-99 dollars in cents (whole numbers only)
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
    const exposure = await calculateExposure(db, userId, maxExposureCents); // userId is already a number

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
    // Note: orders table uses contract_size, but we need qty_remaining for matching
    // We'll use contract_size as the initial qty_remaining
    // IMPORTANT: original_contract_size is set here and should NEVER be updated after order creation
    // It preserves the original order size even when the order is filled (contract_size becomes 0)
    const result = await dbRun(
      db,
      `INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        validated.contract_size, // Store original size - this should NEVER change after order creation
      ]
    );

    // Get the inserted order ID
    const orderId = result.meta.last_row_id;
    if (!orderId) {
      return errorResponse('Failed to create order', 500);
    }

    // Get the created order with outcome info to get market_id
    const order = await dbFirst<{
      id: number;
      create_time: number;
      user_id: number;
      token: string;
      order_id: number;
      outcome: string;
      price: number;
      status: string;
      tif: string;
      side: number;
      contract_size: number;
      market_id?: string;
    }>(
      db,
      `SELECT o.*, oc.market_id 
       FROM orders o
       JOIN outcomes oc ON o.outcome = oc.outcome_id
       WHERE o.id = ?`,
      [orderId]
    );

    if (!order) {
      return errorResponse('Failed to retrieve created order', 500);
    }

    // Convert database order to matching engine format
    const matchingOrder: Order = {
      id: order.id.toString(),
      market_id: order.market_id || marketId,
      user_id: order.user_id.toString(),
      side: order.side === 0 ? 'bid' : 'ask',
      price_cents: order.price,
      qty_contracts: order.contract_size || 0,
      qty_remaining: order.contract_size || 0, // Use contract_size as initial qty_remaining
      status: order.status as 'open' | 'partial' | 'filled' | 'canceled',
      created_at: order.create_time,
    };

    // Execute matching - pass outcomeId for positions table
    const { fills, trades } = await executeMatching(db, matchingOrder, validated.outcome_id);

    // Get updated order with outcome info
    const updatedOrderDb = await dbFirst<{
      id: number;
      create_time: number;
      user_id: number | null;
      token: string;
      order_id: number;
      outcome: string;
      price: number;
      status: string;
      tif: string;
      side: number;
      contract_size: number | null;
      market_id?: string;
    }>(
      db,
      `SELECT o.*, oc.market_id 
       FROM orders o
       JOIN outcomes oc ON o.outcome = oc.outcome_id
       WHERE o.id = ?`,
      [orderId]
    );

    // Convert to Order interface format
    const updatedOrder: Order | null = updatedOrderDb ? {
      id: updatedOrderDb.id.toString(),
      market_id: updatedOrderDb.market_id || marketId,
      user_id: updatedOrderDb.user_id?.toString() || '',
      side: updatedOrderDb.side === 0 ? 'bid' : 'ask',
      price_cents: updatedOrderDb.price,
      qty_contracts: updatedOrderDb.contract_size || 0,
      qty_remaining: updatedOrderDb.contract_size || 0,
      status: updatedOrderDb.status as 'open' | 'partial' | 'filled' | 'canceled',
      created_at: updatedOrderDb.create_time,
    } : null;

    // Validation: If order is still open/partial and price equals best opposite price, it should have matched
    if (updatedOrder && (updatedOrder.status === 'open' || updatedOrder.status === 'partial')) {
      const orderPrice = updatedOrder.price_cents;
      const orderSide = updatedOrder.side;

      // Get best opposite price from orderbook
      if (orderSide === 'bid') {
        // For a bid, check if there's an ask at this price or lower
        const bestAsk = await dbFirst<{ price: number }>(
          db,
          `SELECT price FROM orders 
           WHERE outcome = ? AND side = 1 AND status IN ('open', 'partial')
           ORDER BY price ASC, create_time ASC
           LIMIT 1`,
          [validated.outcome_id]
        );
        
        if (bestAsk && bestAsk.price <= orderPrice) {
          // Cancel the order and return error
          await dbRun(
            db,
            'UPDATE orders SET status = ? WHERE id = ?',
            ['canceled', orderId]
          );
          return errorResponse(
            `Order price ($${Math.round(orderPrice / 100)}) equals or exceeds best ask price ($${Math.round(bestAsk.price / 100)}). Order must match immediately or be rejected.`,
            400
          );
        }
      } else {
        // For an ask, check if there's a bid at this price or higher
        const bestBid = await dbFirst<{ price: number }>(
          db,
          `SELECT price FROM orders 
           WHERE outcome = ? AND side = 0 AND status IN ('open', 'partial')
           ORDER BY price DESC, create_time ASC
           LIMIT 1`,
          [validated.outcome_id]
        );
        
        if (bestBid && bestBid.price >= orderPrice) {
          // Cancel the order and return error
          await dbRun(
            db,
            'UPDATE orders SET status = ? WHERE id = ?',
            ['canceled', orderId]
          );
          return errorResponse(
            `Order price ($${Math.round(orderPrice / 100)}) equals or is below best bid price ($${Math.round(bestBid.price / 100)}). Order must match immediately or be rejected.`,
            400
          );
        }
      }
    }

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
      // Provide clearer error message for price validation
      const priceError = error.errors.find(e => e.path.includes('price'));
      if (priceError) {
        return errorResponse('Price must be a whole number between $1 and $99 (100-9900 cents)', 400);
      }
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Order placement error:', error);
    return errorResponse('Failed to place order', 500);
  }
};
