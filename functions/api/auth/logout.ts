import type { OnRequest } from '@cloudflare/pages';
import { getDb, type Env } from '../../lib/db.ts';
import { getCookieValue, deleteSession, clearSessionCookie } from '../../lib/auth.ts';
import { requireAuth, jsonResponse } from '../../middleware.ts';

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);
  const cookieHeader = request.headers.get('Cookie');
  const token = getCookieValue(cookieHeader, 'session');

  if (token) {
    await deleteSession(db, token);
  }

  const response = jsonResponse({ message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', clearSessionCookie());

  return response;
};
