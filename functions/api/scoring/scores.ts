import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbRun, type Env } from '../../lib/db';
import { requireAuth, jsonResponse, errorResponse } from '../../middleware';

// GET /api/scoring/scores - Get all scores, optionally filtered by course and year
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const course = url.searchParams.get('course');
  const year = url.searchParams.get('year');

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  try {
    let query = 'SELECT * FROM scores WHERE 1=1';
    const params: any[] = [];

    if (course && course !== 'all') {
      query += ' AND course = ?';
      params.push(course);
    }

    if (year && year !== 'all') {
      query += ' AND year = ?';
      params.push(parseInt(year, 10));
    }

    query += ' ORDER BY course, year, player';

    const scores = await dbQuery<{
      id: number;
      course: string;
      year: number;
      player: string;
      score: number | null;
      index_number: number | null;
      created_at: number;
      updated_at: number;
    }>(db, query, params);

    const response = jsonResponse({ scores });
    // Cache historical scoring (not this year) for 1 week — it doesn't change
    const currentYear = new Date().getFullYear();
    const requestedYear = year && year !== 'all' ? parseInt(year, 10) : null;
    if (requestedYear != null && !Number.isNaN(requestedYear) && requestedYear < currentYear) {
      response.headers.set('Cache-Control', 'public, max-age=604800'); // 1 week
    }
    return response;
  } catch (err: any) {
    console.error('[scores GET] Error:', err);
    return errorResponse(err.message || 'Failed to fetch scores', 500);
  }
};

// POST /api/scoring/scores - Create or update a score
export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const body = await request.json();
  const { course, year, player, score, index_number } = body;

  if (!course || !year || !player) {
    return errorResponse('course, year, and player are required', 400);
  }

  const db = getDb(env);

  try {
    // Insert or update score
    await dbRun(
      db,
      `INSERT INTO scores (course, year, player, score, index_number, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(course, year, player) DO UPDATE SET
         score = excluded.score,
         index_number = excluded.index_number,
         updated_at = excluded.updated_at`,
      [
        course,
        parseInt(year, 10),
        player,
        score === null || score === '' ? null : parseInt(score, 10),
        index_number || null,
        Math.floor(Date.now() / 1000),
      ]
    );

    return jsonResponse({ success: true });
  } catch (err: any) {
    console.error('[scores POST] Error:', err);
    return errorResponse(err.message || 'Failed to update score', 500);
  }
};
