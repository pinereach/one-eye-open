import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  try {
    const { env } = context;
    
    // Check if database is available
    if (!env.DB) {
      return errorResponse('Database not configured. Please check D1 binding in Cloudflare Dashboard.', 500);
    }

    const db = getDb(env);

    const trips = await dbQuery(
      db,
      'SELECT * FROM trips ORDER BY start_date DESC'
    );

    return jsonResponse({ trips });
  } catch (error: any) {
    console.error('Trips endpoint error:', error);
    return errorResponse(
      `Database error: ${error?.message || 'Unknown error'}. Check Cloudflare Dashboard > Pages > Settings > Bindings for D1 configuration.`,
      500
    );
  }
};
