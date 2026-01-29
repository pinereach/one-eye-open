import type { OnRequest } from '@cloudflare/pages';
import { type Env } from '../../lib/db';
import { getUserFromToken, getCookieValue } from '../../lib/auth';
import { getDb } from '../../lib/db';
import { jsonResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  // Try to get user, but don't require authentication
  // This endpoint is public and returns null if not authenticated
  const cookieHeader = request.headers.get('Cookie');
  const token = getCookieValue(cookieHeader, 'session');

  if (!token) {
    const response = jsonResponse({ user: null });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  }

  const db = getDb(env);
  const user = await getUserFromToken(db, token, env);

  const response = jsonResponse({ user });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
};
