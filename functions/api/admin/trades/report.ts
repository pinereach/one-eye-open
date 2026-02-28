import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    // Get all trades with user info, outcome info, market info, and settled price
    type TradeRow = {
      id: number;
      create_time: number;
      price: number;
      contracts: number;
      outcome: string | null;
      outcome_name: string | null;
      market_id: string | null;
      market_short_name: string | null;
      taker_side: number | null;
      taker_user_id: number | null;
      taker_username: string | null;
      maker_user_id: number | null;
      maker_username: string | null;
      settled_price: number | null;
    };

    const tradesRows = await dbQuery<TradeRow>(
      db,
      `SELECT 
        t.id,
        t.create_time,
        t.price,
        t.contracts,
        t.outcome,
        t.taker_side,
        t.taker_user_id,
        t.maker_user_id,
        o.name as outcome_name,
        o.market_id,
        o.settled_price,
        m.short_name as market_short_name,
        ut.username as taker_username,
        um.username as maker_username
      FROM trades t
      LEFT JOIN outcomes o ON t.outcome = o.outcome_id
      LEFT JOIN markets m ON (m.market_id = o.market_id OR (o.market_id = 'market_total_birdies' AND m.market_id = 'market-total-birdies'))
      LEFT JOIN users ut ON t.taker_user_id = ut.id
      LEFT JOIN users um ON t.maker_user_id = um.id
      ORDER BY t.create_time DESC`,
      []
    );

    // Transform into report format - one row per user per trade
    const reportRows: Array<{
      trade_id: number;
      time: number;
      user_id: number;
      username: string;
      side: 'Buy' | 'Sell';
      market: string;
      outcome: string;
      price: number;
      contracts: number;
      settled_price: number | null;
      settled_pnl: number | null;
    }> = [];

    for (const t of tradesRows) {
      const market = t.market_short_name || t.market_id || '—';
      const outcome = t.outcome_name || t.outcome || '—';
      const settledPrice = t.settled_price;

      // Calculate settled P&L for a position
      const calcSettledPnl = (side: 'Buy' | 'Sell', price: number, contracts: number, settledPrice: number | null): number | null => {
        if (settledPrice == null) return null;
        if (side === 'Buy') {
          // Long position: profit = (settledPrice - price) * contracts
          return (settledPrice - price) * contracts;
        } else {
          // Short position: profit = (price - settledPrice) * contracts
          return (price - settledPrice) * contracts;
        }
      };

      // Taker row
      if (t.taker_user_id != null) {
        const takerSide = t.taker_side === 0 ? 'Buy' : 'Sell';
        reportRows.push({
          trade_id: t.id,
          time: t.create_time,
          user_id: t.taker_user_id,
          username: t.taker_username || `User ${t.taker_user_id}`,
          side: takerSide,
          market,
          outcome,
          price: t.price,
          contracts: t.contracts,
          settled_price: settledPrice,
          settled_pnl: calcSettledPnl(takerSide, t.price, t.contracts, settledPrice),
        });
      }

      // Maker row (opposite side)
      if (t.maker_user_id != null) {
        const makerSide = t.taker_side === 0 ? 'Sell' : 'Buy';
        reportRows.push({
          trade_id: t.id,
          time: t.create_time,
          user_id: t.maker_user_id,
          username: t.maker_username || `User ${t.maker_user_id}`,
          side: makerSide,
          market,
          outcome,
          price: t.price,
          contracts: t.contracts,
          settled_price: settledPrice,
          settled_pnl: calcSettledPnl(makerSide, t.price, t.contracts, settledPrice),
        });
      }
    }

    return jsonResponse({ trades: reportRows });
  } catch (err) {
    console.error('Admin trades report error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to generate report', 500);
  }
};
