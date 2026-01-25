import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db.ts';
import { jsonResponse } from '../../middleware.ts';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const tripId = url.searchParams.get('tripId');
  const status = url.searchParams.get('status');

  const db = getDb(env);
  let sql = 'SELECT * FROM markets WHERE 1=1';
  const params: any[] = [];

  if (tripId) {
    sql += ' AND trip_id = ?';
    params.push(tripId);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const markets = await dbQuery(db, sql, params);

  return jsonResponse({ markets });
};
