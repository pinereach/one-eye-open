import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../lib/db';
import { requireAuth, jsonResponse, errorResponse } from '../../middleware';

export const onRequestDelete: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const orderId = params.orderId as string;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  // Verify the order exists and belongs to the user
  const order = await dbFirst<{
    id: number;
    user_id: number | null;
    status: string;
  }>(
    db,
    'SELECT id, user_id, status FROM orders WHERE id = ?',
    [parseInt(orderId, 10)]
  );

  if (!order) {
    return errorResponse('Order not found', 404);
  }

  if (order.user_id !== userId) {
    return errorResponse('Unauthorized', 403);
  }

  // Only allow canceling open or partial orders
  if (order.status !== 'open' && order.status !== 'partial') {
    return errorResponse('Cannot cancel order with status: ' + order.status, 400);
  }

  // Update order status to canceled
  await dbRun(
    db,
    'UPDATE orders SET status = ? WHERE id = ?',
    ['canceled', parseInt(orderId, 10)]
  );

  return jsonResponse({ success: true });
};
