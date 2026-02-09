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

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  if (type === 'trades') {
    // Export trades with basic information
    // Note: Since trades no longer have direct order/market references,
    // we can only export the trade data itself
    const sql = `
      SELECT 
        t.id,
        t.token,
        t.price,
        t.contracts,
        t.create_time,
        t.risk_off_contracts,
        t.risk_off_price_diff,
        t.outcome,
        t.taker_user_id,
        t.maker_user_id,
        t.taker_side
      FROM trades t
      ORDER BY t.create_time DESC
    `;

    const trades = await dbQuery(db, sql, []);
    const csv = arrayToCSV(trades);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="trades.csv"',
      },
    });
  }

  return errorResponse('Invalid export type. Use: trades', 400);
};
