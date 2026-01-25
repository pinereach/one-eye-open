import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../lib/db';
import { requireAuth, errorResponse } from '../middleware';

function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
  );

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const tripId = url.searchParams.get('tripId');

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  if (type === 'scores') {
    let sql = `
      SELECT 
        t.name as trip_name,
        r.round_no,
        r.name as round_name,
        u.display_name,
        u.email,
        rs.cross_score,
        rs.net_score,
        rs.updated_at
      FROM round_scores rs
      JOIN rounds r ON rs.round_id = r.id
      JOIN trips t ON r.trip_id = t.id
      JOIN users u ON rs.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tripId) {
      sql += ' AND t.id = ?';
      params.push(tripId);
    }

    sql += ' ORDER BY t.name, r.round_no, rs.cross_score';

    const scores = await dbQuery(db, sql, params);
    const csv = arrayToCSV(scores);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="scores.csv"',
      },
    });
  }

  if (type === 'trades') {
    let sql = `
      SELECT 
        m.title as market_title,
        m.type as market_type,
        u1.display_name as taker_name,
        u2.display_name as maker_name,
        t.price_cents,
        t.qty_contracts,
        t.created_at
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      JOIN orders o1 ON t.taker_order_id = o1.id
      JOIN orders o2 ON t.maker_order_id = o2.id
      JOIN users u1 ON o1.user_id = u1.id
      JOIN users u2 ON o2.user_id = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tripId) {
      sql += ' AND m.trip_id = ?';
      params.push(tripId);
    }

    sql += ' ORDER BY t.created_at DESC';

    const trades = await dbQuery(db, sql, params);
    const csv = arrayToCSV(trades);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="trades.csv"',
      },
    });
  }

  if (type === 'ledger') {
    let sql = `
      SELECT 
        t.name as trip_name,
        u1.display_name as user_name,
        u2.display_name as counterparty_name,
        le.amount_cents,
        le.reason
      FROM ledger_entries le
      JOIN trips t ON le.trip_id = t.id
      JOIN users u1 ON le.user_id = u1.id
      JOIN users u2 ON le.counterparty_user_id = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tripId) {
      sql += ' AND t.id = ?';
      params.push(tripId);
    }

    sql += ' ORDER BY t.name, le.id DESC';

    const entries = await dbQuery(db, sql, params);
    const csv = arrayToCSV(entries);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="ledger.csv"',
      },
    });
  }

  return errorResponse('Invalid export type. Use: scores, trades, or ledger', 400);
};
