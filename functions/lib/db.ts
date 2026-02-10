import type { D1Database, D1Result, D1PreparedStatement } from '@cloudflare/workers-types';

export type { D1Database, D1Result };

export interface Env {
  DB: D1Database;
  MAX_EXPOSURE_CENTS?: string;
  SESSION_SECRET?: string;
  SESSION_DURATION_DAYS?: string;
  /** Set to 'production' in production; dev bypass only when not production and request is local. */
  ENVIRONMENT?: string;
  /** Secret for cron-triggered refresh-volume; if request has X-Cron-Secret matching this, treat as authorized. */
  CRON_SECRET?: string;
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

/** Execute multiple statements atomically. On failure, entire batch is rolled back. */
export async function dbBatch(
  db: D1Database,
  statements: { sql: string; params: any[] }[]
): Promise<D1Result[]> {
  if (statements.length === 0) return [];
  try {
    const prepared: D1PreparedStatement[] = statements.map(({ sql, params }) =>
      db.prepare(sql).bind(...params)
    );
    return await db.batch(prepared);
  } catch (error) {
    console.error('Database batch error:', error);
    throw error;
  }
}
