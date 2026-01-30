import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

const CACHE_MAX_AGE = 120; // 2 min - current scores may update during play

/** GET /api/scoring/current-scores - Current score to par (gross/net) and birdies per participant. Public, short cache. */
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { env } = context;
  const db = getDb(env);

  try {
    const rows = await dbQuery<{
      participant_id: string;
      name: string;
      score_gross: number | null;
      score_net: number | null;
      number_birdies: number | null;
    }>(
      db,
      `SELECT cs.participant_id, p.name, cs.score_gross, cs.score_net, cs.number_birdies
       FROM current_scores cs
       JOIN participants p ON p.id = cs.participant_id
       ORDER BY p.name ASC`
    );

    const scores = rows.map((r) => ({
      participant_id: r.participant_id,
      name: r.name,
      score_gross: r.score_gross,
      score_net: r.score_net,
      number_birdies: r.number_birdies,
    }));

    const response = jsonResponse({ scores });
    response.headers.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=60`);
    return response;
  } catch (err: any) {
    console.error('[current-scores GET] Error:', err);
    return errorResponse(err.message || 'Failed to fetch current scores', 500);
  }
};
