import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbQuery, type Env } from '../../../../lib/db';
import { jsonResponse, errorResponse } from '../../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { env, params } = context;
  const tripId = params.tripId as string;

  const db = getDb(env);

  const trip = await dbFirst(db, 'SELECT * FROM trips WHERE id = ?', [tripId]);
  if (!trip) {
    return errorResponse('Trip not found', 404);
  }

  const members = await dbQuery(
    db,
    `SELECT u.id, u.email, u.display_name, u.role, tm.role as trip_role
     FROM trip_members tm
     JOIN users u ON tm.user_id = u.id
     WHERE tm.trip_id = ?`,
    [tripId]
  );

  const rounds = await dbQuery(
    db,
    'SELECT * FROM rounds WHERE trip_id = ? ORDER BY round_no ASC',
    [tripId]
  );

  const markets = await dbQuery(
    db,
    'SELECT * FROM markets WHERE trip_id = ? ORDER BY created_at DESC',
    [tripId]
  );

  return jsonResponse({
    trip,
    members,
    rounds,
    markets,
  });
};
