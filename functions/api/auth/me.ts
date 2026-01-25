import type { OnRequest } from '@cloudflare/pages';
import { type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  return jsonResponse({ user: authResult.user });
};
