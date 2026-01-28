import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

/** Row returned by PRAGMA table_info in SQLite */
interface PragmaTableInfoRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/**
 * GET /api/debug/schema?key=YOUR_SECRET
 *
 * Returns the database schema for key tables so you can paste it for verification.
 * Set DEBUG_SCHEMA_KEY in Cloudflare Pages env vars (production) and call with ?key=that_value.
 * If DEBUG_SCHEMA_KEY is not set, endpoint returns 404 (disabled).
 */
export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  const expectedKey = env.DEBUG_SCHEMA_KEY;
  if (!expectedKey || key !== expectedKey) {
    return errorResponse('Not found', 404);
  }

  const db = getDb(env);
  const tables = ['orders', 'trades', 'positions', 'outcomes', 'markets', 'users'] as const;
  const schema: Record<string, PragmaTableInfoRow[]> = {};

  for (const table of tables) {
    try {
      const rows = await dbQuery<PragmaTableInfoRow>(
        db,
        `PRAGMA table_info(${JSON.stringify(table)})`
      );
      schema[table] = rows;
    } catch (err) {
      schema[table] = [];
    }
  }

  return jsonResponse({
    schema,
    _hint: 'Paste this JSON when asked for production schema. key tables: orders, trades, positions.',
  });
};
