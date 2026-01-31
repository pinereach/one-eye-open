import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

const CACHE_MAX_AGE = 604800; // 7 days — historical data, does not change

/** GET /api/scoring/volatility — Per-player year of highest score volatility (MAX-MIN per year), for Player Score Volatility market. Public, cached 7 days. */
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { env } = context;
  const db = getDb(env);

  try {
    // Per (year, player): volatility = MAX(score) - MIN(score) across courses. Then per player, take the year with highest volatility.
    const rows = await dbQuery<{ year: number; player: string; volatility: number }>(
      db,
      `SELECT year, player, volatility
       FROM (
         SELECT
           year,
           player,
           MAX(score) - MIN(score) AS volatility,
           ROW_NUMBER() OVER (
             PARTITION BY player
             ORDER BY MAX(score) - MIN(score) DESC
           ) AS rnk
         FROM scores
         WHERE score IS NOT NULL
         GROUP BY year, player
       ) t
       WHERE rnk = 1
       ORDER BY player ASC`
    );

    const volatilityByPlayer: Record<string, { year: number; volatility: number }> = {};
    for (const r of rows) {
      volatilityByPlayer[r.player] = { year: r.year, volatility: r.volatility };
    }

    const response = jsonResponse({ volatilityByPlayer });
    response.headers.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=86400`);
    return response;
  } catch (err: any) {
    console.error('[volatility GET] Error:', err);
    return errorResponse(err?.message || 'Failed to fetch volatility', 500);
  }
};
