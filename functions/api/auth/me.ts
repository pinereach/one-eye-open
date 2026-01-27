import type { OnRequest } from '@cloudflare/pages';
import { type Env } from '../../lib/db';
import { getUserFromToken, getCookieValue } from '../../lib/auth';
import { getDb } from '../../lib/db';
import { jsonResponse, isAuthRequired } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  // Return mock user in development
  if (!isAuthRequired(env, request)) {
    return jsonResponse({ 
      user: {
        id: 1,
        username: 'dev-user',
      }
    });
  }

  // Try to get user, but don't require authentication
  // This endpoint is public and returns null if not authenticated
  const cookieHeader = request.headers.get('Cookie');
  const token = getCookieValue(cookieHeader, 'session');

  if (!token) {
    return jsonResponse({ user: null });
  }

  const db = getDb(env);
  const user = await getUserFromToken(db, token, env);

  return jsonResponse({ user });
};
