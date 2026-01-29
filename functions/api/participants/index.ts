import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../lib/db';
import { jsonResponse, errorResponse } from '../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  try {
    const { env } = context;
    
    if (!env.DB) {
      return errorResponse('Database not configured. Please check D1 binding in Cloudflare Dashboard.', 500);
    }

    const db = getDb(env);

    const participants = await dbQuery(
      db,
      'SELECT * FROM participants ORDER BY name ASC'
    );

    const response = jsonResponse({ participants });
    response.headers.set('Cache-Control', 'public, max-age=43200'); // 12h reference data
    return response;
  } catch (error: any) {
    console.error('Participants endpoint error:', error);
    return errorResponse(
      `Database error: ${error?.message || 'Unknown error'}. Check Cloudflare Dashboard > Pages > Settings > Bindings for D1 configuration.`,
      500
    );
  }
};
