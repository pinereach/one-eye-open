import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);
  let result: Awaited<ReturnType<typeof dbRun>>;

  try {
    const body = await request.json().catch(() => ({}));
    const userId = body?.user_id != null ? Number(body.user_id) : undefined;

    if (userId != null && (typeof userId !== 'number' || !Number.isInteger(userId))) {
      return errorResponse('Invalid user_id', 400);
    }

    if (userId == null) {
      result = await dbRun(
        db,
        "UPDATE orders SET status = 'canceled' WHERE status IN ('open', 'partial')"
      );
    } else {
      result = await dbRun(
        db,
        "UPDATE orders SET status = 'canceled' WHERE status IN ('open', 'partial') AND user_id = ?",
        [userId]
      );
    }

    const canceled = result.meta?.changes ?? 0;
    return jsonResponse({ canceled });
  } catch (err) {
    console.error('Admin cancel-all error:', err);
    return errorResponse('Failed to cancel orders', 500);
  }
};
