import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbRun, dbFirst, type Env } from '../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../middleware';
import { updatePositionsForFill, updatePosition, addSystemClosedProfitOffset, computeRiskOffForFill } from '../../lib/matching';

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
    let body: Record<string, unknown> = {};
    const contentLength = request.headers.get('content-length');
    if (contentLength && contentLength !== '0') {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        // invalid or empty JSON body
      }
    }
    const fullReset = body?.full_reset === true;

    const outcomeRows = await dbQuery<{ outcome: string }>(
      db,
      `SELECT DISTINCT outcome FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND taker_user_id IS NOT NULL AND taker_side IS NOT NULL ORDER BY outcome`,
      []
    );
    const outcomes = outcomeRows.map((r) => r.outcome);

    if (fullReset && outcomes.length > 0) {
      const allOutcomes = await dbQuery<{ outcome: string }>(db, 'SELECT DISTINCT outcome FROM positions', []);
      for (const row of allOutcomes) {
        await dbRun(
          db,
          `UPDATE positions SET net_position = 0, price_basis = 0, closed_profit = 0 WHERE outcome = ?`,
          [row.outcome]
        );
      }
    }

    const skippedRows =
      outcomes.length > 0
        ? await dbQuery<{ outcome: string; cnt: number }>(
            db,
            `SELECT outcome, COUNT(*) AS cnt FROM trades WHERE outcome IN (${outcomes.map(() => '?').join(',')}) AND (taker_user_id IS NULL OR taker_side IS NULL) GROUP BY outcome`,
            outcomes
          )
        : [];
    const tradesSkipped = skippedRows.reduce((sum, r) => sum + (r.cnt ?? 0), 0);
    const outcomesWithSkipped = skippedRows.filter((r) => (r.cnt ?? 0) > 0).map((r) => r.outcome);

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
        const price = Number(t.price) || 0;
        const contracts = Number(t.contracts) || 0;

        // Position state before this fill (for risk_off backfill)
        const takerPos = await dbFirst<{ net_position: number; price_basis: number }>(
          db,
          'SELECT net_position, price_basis FROM positions WHERE outcome = ? AND user_id = ?',
          [outcomeId, takerUserId]
        );
        const takerNet = takerPos?.net_position ?? 0;
        const takerBasis = takerPos?.price_basis ?? 0;
        let makerNet = 0;
        let makerBasis = 0;
        if (makerUserId != null) {
          const makerPos = await dbFirst<{ net_position: number; price_basis: number }>(
            db,
            'SELECT net_position, price_basis FROM positions WHERE outcome = ? AND user_id = ?',
            [outcomeId, makerUserId]
          );
          makerNet = makerPos?.net_position ?? 0;
          makerBasis = makerPos?.price_basis ?? 0;
        }
        const { riskOffContracts, riskOffPriceDiffCents } = computeRiskOffForFill(
          takerNet,
          takerBasis,
          makerNet,
          makerBasis,
          takerSide,
          price,
          contracts
        );

        const sameUser = makerUserId != null && makerUserId === takerUserId;

        if (makerUserId != null && !sameUser) {
          await updatePositionsForFill(db, outcomeId, takerUserId, makerUserId, takerSide, price, contracts);
        } else if (sameUser) {
          await updatePosition(db, outcomeId, takerUserId, takerSide, price, contracts);
          const makerSide = takerSide === 'bid' ? 'ask' : 'bid';
          await updatePosition(db, outcomeId, takerUserId, makerSide, price, contracts);
        } else {
          const { closedProfitDelta } = await updatePosition(db, outcomeId, takerUserId, takerSide, price, contracts);
          const netPositionDelta = takerSide === 'bid' ? contracts : -contracts;
          await addSystemClosedProfitOffset(db, outcomeId, -closedProfitDelta, netPositionDelta, price);
        }

        await dbRun(
          db,
          'UPDATE trades SET risk_off_contracts = ?, risk_off_price_diff = ? WHERE id = ?',
          [riskOffContracts, riskOffPriceDiffCents, t.id]
        );
        totalTradesReplayed++;
      }
    }

    return jsonResponse({
      applied: true,
      message: `Replayed ${totalTradesReplayed} trades across ${outcomes.length} outcome(s). Positions (net_position, price_basis, closed_profit) recomputed; risk_off backfilled on trades.${tradesSkipped > 0 ? ` ${tradesSkipped} trade(s) skipped (missing taker_user_id or taker_side).` : ''}`,
      outcomes_processed: outcomes.length,
      trades_replayed: totalTradesReplayed,
      trades_skipped: tradesSkipped,
      outcomes_with_skipped: outcomesWithSkipped.length > 0 ? outcomesWithSkipped : undefined,
      full_reset_applied: fullReset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Admin replay-positions error:', message, err);
    return errorResponse(`Failed to replay positions: ${message}`, 500);
  }
};
