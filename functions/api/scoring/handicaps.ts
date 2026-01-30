import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

const CACHE_MAX_AGE = 172800; // 48 hours
const DEFAULT_YEAR = 2026;

/** GET /api/scoring/handicaps - Handicap index per player. ?year=2026 (default) or ?year=all. Public, cached 48h. */
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const yearParam = url.searchParams.get('year');

  const db = getDb(env);

  try {
    if (yearParam === 'all') {
      const rows = await dbQuery<{ player: string; year: number; handicap_index: number | null }>(
        db,
        'SELECT player, year, handicap_index FROM handicaps WHERE year BETWEEN 2022 AND 2026 AND handicap_index IS NOT NULL'
      );
      const handicapsByYear: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        const y = String(r.year);
        if (!handicapsByYear[y]) handicapsByYear[y] = {};
        handicapsByYear[y][r.player] = r.handicap_index!;
      }
      const response = jsonResponse({ handicapsByYear });
      response.headers.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=86400`);
      return response;
    }

    const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR;
    const effectiveYear = Number.isNaN(year) ? DEFAULT_YEAR : year;

    const rows = await dbQuery<{ player: string; handicap_index: number }>(
      db,
      'SELECT player, handicap_index FROM handicaps WHERE year = ? AND handicap_index IS NOT NULL',
      [effectiveYear]
    );

    const handicaps: Record<string, number> = {};
    for (const r of rows) {
      handicaps[r.player] = r.handicap_index;
    }

    const response = jsonResponse({ handicaps });
    response.headers.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=86400`);
    return response;
  } catch (err: any) {
    console.error('[handicaps GET] Error:', err);
    return errorResponse(err.message || 'Failed to fetch handicaps', 500);
  }
};
