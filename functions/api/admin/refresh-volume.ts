import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbRun, type Env } from '../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../middleware';

/** Recompute 30-day volume per market and upsert into market_volume. Run via cron every 4h. */
const VOLUME_DAYS = 30;

export const onRequestPost: OnRequest<Env> = async (context) => {
  const adminResult = await requireAdmin(context.request, context.env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(context.env);
  const volumeSince = Math.floor(Date.now() / 1000) - VOLUME_DAYS * 24 * 60 * 60;

  try {
    const volumeRows = await dbQuery<{ market_id: string; volume_contracts: number }>(
      db,
      `SELECT o.market_id, COALESCE(SUM(t.contracts), 0) AS volume_contracts
       FROM trades t
       JOIN outcomes o ON t.outcome = o.outcome_id
       WHERE t.create_time >= ?
       GROUP BY o.market_id`,
      [volumeSince]
    );

    const markets = await dbQuery<{ market_id: string }>(db, 'SELECT market_id FROM markets', []);
    const now = Math.floor(Date.now() / 1000);
    const volumeByMarket = new Map(volumeRows.map((r) => [r.market_id, r.volume_contracts]));

    for (const m of markets) {
      const vol = volumeByMarket.get(m.market_id) ?? 0;
      await dbRun(
        db,
        `INSERT INTO market_volume (market_id, volume_contracts, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(market_id) DO UPDATE SET volume_contracts = excluded.volume_contracts, updated_at = excluded.updated_at`,
        [m.market_id, vol, now]
      );
    }

    return jsonResponse({
      updated: markets.length,
    });
  } catch (err: any) {
    console.error('Admin refresh-volume error:', err);
    return errorResponse(err?.message ?? 'Failed to refresh volume', 500);
  }
};
