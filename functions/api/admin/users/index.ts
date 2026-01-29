import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const users = await dbQuery<{ id: number; username: string }>(
      db,
      'SELECT id, username FROM users ORDER BY username ASC',
      []
    );
    return jsonResponse({ users });
  } catch (err) {
    console.error('Admin users list error:', err);
    return errorResponse('Failed to list users', 500);
  }
};
