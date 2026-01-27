import { getDb, dbQuery, type Env } from '../../lib/db';
import { requireAuth, jsonResponse, errorResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const roundId = url.searchParams.get('roundId');

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  try {
    // For now, return empty array since we don't have rounds/round_scores tables
    // This can be extended when scoring functionality is fully implemented
    const rounds = await dbQuery(
      db,
      `SELECT * FROM rounds ORDER BY date DESC LIMIT 10`,
      []
    ).catch(() => []);

    const roundScores = roundId
      ? await dbQuery(
          db,
          `SELECT * FROM round_scores WHERE round_id = ?`,
          [roundId]
        ).catch(() => [])
      : [];

    return jsonResponse({ rounds, roundScores });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch scoring data', 500);
  }
};

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const roundId = url.searchParams.get('roundId');

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  if (!roundId) {
    return errorResponse('roundId is required', 400);
  }

  const body = await request.json();
  const { cross_score, net_score } = body;

  const db = getDb(env);
  const userId = authResult.user.id;

  try {
    // Insert or update score
    await db.prepare(
      `INSERT INTO round_scores (id, round_id, user_id, cross_score, net_score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(round_id, user_id) DO UPDATE SET
         cross_score = excluded.cross_score,
         net_score = excluded.net_score,
         updated_at = excluded.updated_at`
    )
      .bind(
        `${roundId}-${userId}`,
        roundId,
        userId,
        cross_score || null,
        net_score || null,
        Date.now()
      )
      .run();

    return jsonResponse({ success: true });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update score', 500);
  }
};
