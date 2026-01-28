import type { OnRequest } from '@cloudflare/pages';
import { requireAuth, jsonResponse, errorResponse } from '../../middleware';
import type { Env } from '../../lib/db';

/**
 * Stub: rounds/round_scores tables were removed in migration 0012.
 * Frontend uses /scoring/scores for historical scoring. This endpoint
 * returns empty data so existing routes do not 404.
 */
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }
  return jsonResponse({ rounds: [], roundScores: [] });
};

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }
  return errorResponse('rounds API is deprecated; use /scoring/scores for scoring', 410);
};
