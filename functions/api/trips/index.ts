import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../src/lib/db';
import { jsonResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { env } = context;
  const db = getDb(env);

  const trips = await dbQuery(
    db,
    'SELECT * FROM trips ORDER BY start_date DESC'
  );

  return jsonResponse({ trips });
};
