import type { OnRequest } from '@cloudflare/pages';
import { clearSessionCookie } from '../../lib/auth';
import { requireAuth, jsonResponse } from '../../middleware';

export const onRequestPost: OnRequest<any> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  // Stateless auth - just clear the cookie
  const response = jsonResponse({ message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', clearSessionCookie());

  return response;
};
