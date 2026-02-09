import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbRun, type Env } from '../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../middleware';
import { updatePositionsForFill, updatePosition, addSystemClosedProfitOffset } from '../../lib/matching';

type TradeRow = {
  id: number;
  outcome: string;
  price: number;
  contracts: number;
  taker_user_id: number | null;
  maker_user_id: number | null;
  taker_side: number | null;
};

/**
 * POST /api/admin/replay-positions — admin only.
 * Resets net_position, price_basis, closed_profit for all positions then replays every trade
 * in order using the correct zero-sum logic (updatePositionsForFill or updatePosition +
 * addSystemClosedProfitOffset). Use this to fix positions after the manual/auction closed-profit bug.
 * Does not change settled_profit or is_settled.
 */
export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const outcomeRows = await dbQuery<{ outcome: string }>(
      db,
      `SELECT DISTINCT outcome FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND taker_user_id IS NOT NULL AND taker_side IS NOT NULL ORDER BY outcome`,
      []
    );
    const outcomes = outcomeRows.map((r) => r.outcome);

    let totalTradesReplayed = 0;

    for (const outcomeId of outcomes) {
      await dbRun(
        db,
        `UPDATE positions SET net_position = 0, price_basis = 0, closed_profit = 0 WHERE outcome = ?`,
        [outcomeId]
      );

      const trades = await dbQuery<TradeRow>(
        db,
        `SELECT id, outcome, price, contracts, taker_user_id, maker_user_id, taker_side
         FROM trades WHERE outcome = ? AND taker_user_id IS NOT NULL AND taker_side IS NOT NULL
         ORDER BY id ASC`,
        [outcomeId]
      );

      for (const t of trades) {
        const takerUserId = t.taker_user_id!;
        const makerUserId = t.maker_user_id ?? null;
        const takerSide = t.taker_side === 1 ? 'ask' : 'bid';
        const price = t.price;
        const contracts = t.contracts;

        const sameUser = makerUserId != null && makerUserId === takerUserId;

        if (makerUserId != null && !sameUser) {
          await updatePositionsForFill(db, outcomeId, takerUserId, makerUserId, takerSide, price, contracts);
        } else if (sameUser) {
          // Same user on both sides: apply both legs so net position change is correct (taker + maker = 0 for same user).
          await updatePosition(db, outcomeId, takerUserId, takerSide, price, contracts);
          const makerSide = takerSide === 'bid' ? 'ask' : 'bid';
          await updatePosition(db, outcomeId, takerUserId, makerSide, price, contracts);
        } else {
          const { closedProfitDelta } = await updatePosition(db, outcomeId, takerUserId, takerSide, price, contracts);
          const netPositionDelta = takerSide === 'bid' ? contracts : -contracts;
          await addSystemClosedProfitOffset(db, outcomeId, -closedProfitDelta, netPositionDelta, price);
        }
        totalTradesReplayed++;
      }
    }

    return jsonResponse({
      applied: true,
      message: `Replayed ${totalTradesReplayed} trades across ${outcomes.length} outcome(s). Positions (net_position, price_basis, closed_profit) have been recomputed with zero-sum logic.`,
      outcomes_processed: outcomes.length,
      trades_replayed: totalTradesReplayed,
    });
  } catch (err) {
    console.error('Admin replay-positions error:', err);
    return errorResponse('Failed to replay positions', 500);
  }
};
