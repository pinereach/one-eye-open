import { getDb, dbQuery, type Env } from '../../lib/db';
import { requireAuth, jsonResponse } from '../../middleware';
import type { Order } from '../../lib/matching';

export const onRequestGet: OnRequest<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = authResult.user.id;
  const db = getDb(env);

  // Get all orders for the user, joined with outcomes and markets
  const ordersDb = await dbQuery<{
    id: number;
    create_time: number;
    user_id: number | null;
    token: string;
    order_id: number;
    outcome: string;
    price: number;
    status: string;
    tif: string;
    side: number;
    contract_size: number | null;
    original_contract_size: number | null;
    outcome_name: string;
    market_id: string;
    market_name: string;
  }>(
    db,
    `SELECT 
      o.*,
      oc.name as outcome_name,
      oc.market_id,
      m.short_name as market_name
     FROM orders o
     JOIN outcomes oc ON o.outcome = oc.outcome_id
     JOIN markets m ON oc.market_id = m.market_id
     WHERE o.user_id = ?
     ORDER BY o.create_time DESC
     LIMIT ?`,
    [userId, limit]
  );

  // Convert to frontend Order interface format
  // For filled/partial orders, show the filled quantity
  // For open orders, show contract_size (which is the original size)
  const orders = await Promise.all(
    ordersDb.map(async (o) => {
      let displaySize = o.contract_size || 0;
      
      if (o.status === 'filled') {
        // For filled orders, show the original size (what was filled)
        if (o.original_contract_size !== null && o.original_contract_size !== undefined && o.original_contract_size > 0) {
          displaySize = o.original_contract_size;
        } else {
          // Fallback: try to calculate from trades for old orders
          // For a filled order, look for the most recent trade that matches
          // Since we don't have a direct link, match by outcome, price, and approximate time
          try {
            // Get the most recent trade for this outcome/price combination
            // This should be the trade that filled this order
            const trade = await dbQuery<{ contracts: number }>(
              db,
              `SELECT contracts
               FROM trades
               WHERE outcome = ? 
                 AND price = ?
               ORDER BY id DESC
               LIMIT 1`,
              [o.outcome, o.price]
            );
            
            if (trade && trade[0] && trade[0].contracts > 0) {
              displaySize = trade[0].contracts;
            } else {
              // If no trade found, the order might have been filled before trades were tracked properly
              console.warn(`No matching trade found for filled order ${o.id} (outcome: ${o.outcome}, price: ${o.price})`);
              displaySize = 0;
            }
          } catch (error: any) {
            // If query fails (e.g., trades table missing outcome column), show 0
            console.warn(`Error calculating filled size from trades for order ${o.id}:`, error.message);
            displaySize = 0;
          }
        }
      } else if (o.status === 'partial') {
        // For partial orders, show the filled quantity (original - remaining)
        if (o.original_contract_size !== null && o.original_contract_size !== undefined && o.original_contract_size > 0) {
          const remaining = o.contract_size || 0;
          displaySize = o.original_contract_size - remaining;
        } else {
          // Fallback: try to calculate filled from trades
          try {
            const tradesSum = await dbQuery<{ total_contracts: number }>(
              db,
              `SELECT COALESCE(SUM(contracts), 0) as total_contracts
               FROM trades
               WHERE outcome = ? 
                 AND price = ?`,
              [o.outcome, o.price]
            );
            const filled = tradesSum[0]?.total_contracts || 0;
            const remaining = o.contract_size || 0;
            // For partial, filled = total from trades, but we need to be careful
            // If we have trades, use that; otherwise estimate
            displaySize = filled > 0 ? filled : Math.max(0, remaining); // This is approximate
          } catch {
            // If we can't calculate, show remaining as fallback (not ideal)
            displaySize = o.contract_size || 0;
          }
        }
      }
      // Calculate original size (what was ordered)
      // This should NEVER change after order creation - it's the immutable original order size
      let originalSize = o.original_contract_size;
      
      if (originalSize === null || originalSize === undefined || originalSize === 0) {
        // original_contract_size is missing or 0 - need to calculate or backfill
        if (o.status === 'open' || o.status === 'canceled') {
          // For open/canceled orders, contract_size IS the original size (nothing filled yet)
          originalSize = o.contract_size || 0;
        } else if (o.status === 'filled') {
          // For filled orders, try to calculate from trades
          // This is a fallback for orders created before original_contract_size was added
          try {
            const trade = await dbQuery<{ contracts: number }>(
              db,
              `SELECT contracts
               FROM trades
               WHERE outcome = ? 
                 AND price = ?
               ORDER BY id DESC
               LIMIT 1`,
              [o.outcome, o.price]
            );
            if (trade && trade[0] && trade[0].contracts > 0) {
              originalSize = trade[0].contracts;
            } else {
              // Can't determine - this is a data integrity issue
              console.warn(`Cannot determine original size for filled order ${o.id}, using 0`);
              originalSize = 0;
            }
          } catch (error: any) {
            console.warn(`Error calculating original size from trades for order ${o.id}:`, error.message);
            originalSize = 0;
          }
        } else if (o.status === 'partial') {
          // For partial orders, original = remaining + filled
          // We can estimate: remaining is contract_size, filled we can try to get from trades
          const remaining = o.contract_size || 0;
          try {
            const tradesSum = await dbQuery<{ total_contracts: number }>(
              db,
              `SELECT COALESCE(SUM(contracts), 0) as total_contracts
               FROM trades
               WHERE outcome = ? 
                 AND price = ?`,
              [o.outcome, o.price]
            );
            const filled = tradesSum[0]?.total_contracts || 0;
            originalSize = remaining + filled;
          } catch {
            // Fallback: can't determine, use remaining as estimate (not ideal)
            originalSize = o.contract_size || 0;
          }
        } else {
          // Unknown status, use contract_size as fallback
          originalSize = o.contract_size || 0;
        }
      }
      
      // Remaining size is always contract_size (what's left to fill)
      const remainingSize = o.contract_size || 0;
      
      return {
        id: o.id,
        create_time: o.create_time,
        user_id: o.user_id,
        token: o.token,
        order_id: o.order_id,
        outcome: o.outcome,
        price: o.price, // Price in cents, as expected by frontend
        status: o.status as 'open' | 'partial' | 'filled' | 'canceled',
        tif: o.tif,
        side: o.side, // 0 = bid, 1 = ask
        contract_size: displaySize, // Show filled/original size for display compatibility
        original_size: originalSize, // Original order size
        remaining_size: remainingSize, // Remaining quantity to fill
        // Additional fields for display
        outcome_name: o.outcome_name,
        market_name: o.market_name,
      };
    })
  );

  return jsonResponse({ orders });
};
