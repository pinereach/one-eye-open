import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db.ts';
import { requireAuth, jsonResponse } from '../../middleware.ts';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const tripId = url.searchParams.get('tripId');

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);
  let sql = `
    SELECT le.*, 
           u1.display_name as user_name,
           u2.display_name as counterparty_name
    FROM ledger_entries le
    JOIN users u1 ON le.user_id = u1.id
    JOIN users u2 ON le.counterparty_user_id = u2.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (tripId) {
    sql += ' AND le.trip_id = ?';
    params.push(tripId);
  }

  sql += ' ORDER BY le.id DESC';

  const entries = await dbQuery(db, sql, params);

  return jsonResponse({ entries });
};
