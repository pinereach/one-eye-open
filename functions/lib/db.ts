import type { D1Database, D1Result } from '@cloudflare/workers-types';

export type { D1Database, D1Result };

export interface Env {
  DB: D1Database;
  MAX_EXPOSURE_CENTS?: string;
  SESSION_SECRET?: string;
  SESSION_DURATION_DAYS?: string;
  /** Optional secret for GET /api/debug/schema?key=... to dump production schema */
  DEBUG_SCHEMA_KEY?: string;
}

export function getDb(env: Env): D1Database {
  if (!env.DB) {
    throw new Error('Database binding "DB" is not configured. Please configure D1 database binding in Cloudflare Dashboard > Pages > Settings > Bindings.');
  }
  return env.DB;
}

export async function dbQuery<T = any>(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const result = await db.prepare(sql).bind(...params).all<T>();
    return result.results || [];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function dbFirst<T = any>(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<T | null> {
  try {
    const result = await db.prepare(sql).bind(...params).first<T>();
    return result || null;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function dbRun(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<D1Result> {
  try {
    return await db.prepare(sql).bind(...params).run();
  } catch (error) {
    console.error('Database run error:', error);
    throw error;
  }
}
