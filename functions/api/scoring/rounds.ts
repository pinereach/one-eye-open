import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbFirst, dbRun, type Env } from '../lib/db';
import { requireAuth, jsonResponse, errorResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const tripId = url.searchParams.get('tripId');
  const roundId = url.searchParams.get('roundId');

  const db = getDb(env);

  if (roundId) {
    // Get specific round with scores
    const round = await dbFirst(db, 'SELECT * FROM rounds WHERE id = ?', [roundId]);
    if (!round) {
      return errorResponse('Round not found', 404);
    }

    const scores = await dbQuery(
      db,
      `SELECT rs.*, u.display_name, u.email
       FROM round_scores rs
       JOIN users u ON rs.user_id = u.id
       WHERE rs.round_id = ?
       ORDER BY rs.cross_score ASC, rs.net_score ASC`,
      [roundId]
    );

    return jsonResponse({ round, scores });
  }

  // List rounds
  let sql = 'SELECT * FROM rounds WHERE 1=1';
  const params: any[] = [];

  if (tripId) {
    sql += ' AND trip_id = ?';
    params.push(tripId);
  }

  sql += ' ORDER BY round_no ASC';

  const rounds = await dbQuery(db, sql, params);

  return jsonResponse({ rounds });
};

const scoreSchema = z.object({
  cross_score: z.number().int().positive().nullable(),
  net_score: z.number().int().positive().nullable(),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const roundId = url.searchParams.get('roundId');

  if (!roundId) {
    return errorResponse('roundId is required', 400);
  }

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  try {
    const body = await request.json();
    const validated = scoreSchema.parse(body);

    // Verify round exists
    const round = await dbFirst(db, 'SELECT * FROM rounds WHERE id = ?', [roundId]);
    if (!round) {
      return errorResponse('Round not found', 404);
    }

    // Verify user is a trip member
    const member = await dbFirst(
      db,
      'SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?',
      [round.trip_id, userId]
    );

    if (!member) {
      return errorResponse('Not a member of this trip', 403);
    }

    // Upsert score
    const scoreId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await dbRun(
      db,
      `INSERT INTO round_scores (id, round_id, user_id, cross_score, net_score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(round_id, user_id) DO UPDATE SET
         cross_score = excluded.cross_score,
         net_score = excluded.net_score,
         updated_at = excluded.updated_at`,
      [
        scoreId,
        roundId,
        userId,
        validated.cross_score,
        validated.net_score,
        now,
      ]
    );

    // Get updated score
    const score = await dbFirst(
      db,
      `SELECT rs.*, u.display_name, u.email
       FROM round_scores rs
       JOIN users u ON rs.user_id = u.id
       WHERE rs.round_id = ? AND rs.user_id = ?`,
      [roundId, userId]
    );

    return jsonResponse({ score }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Score update error:', error);
    return errorResponse('Failed to update score', 500);
  }
};
