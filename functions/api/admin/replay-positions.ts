import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbQuery, dbRun, dbFirst, dbBatch, type Env } from '../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../middleware';
import { updatePositionsForFill, updatePosition, addSystemClosedProfitOffset, computeRiskOffForFill } from '../../lib/matching';

/** Max trades to replay per request to stay under D1 per-invocation query limit (e.g. 50 free / 1000 paid). */
const MAX_TRADES_PER_REQUEST = 40;

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
    const afterTradeId = typeof body?.after_trade_id === 'number' ? body.after_trade_id : null;
    const maxTrades = typeof body?.max_trades === 'number' && body.max_trades > 0 ? Math.min(body.max_trades, 200) : MAX_TRADES_PER_REQUEST;

    // Process trades in global id order so chunked continuation never skips or double-applies a trade.
    const outcomeRows = await dbQuery<{ outcome: string }>(
      db,
      `SELECT DISTINCT outcome FROM trades WHERE outcome IS NOT NULL AND outcome != '' AND taker_user_id IS NOT NULL AND taker_side IS NOT NULL ORDER BY outcome`,
      []
    );
    const outcomes = outcomeRows.map((r) => r.outcome);

    if (fullReset && outcomes.length > 0 && afterTradeId == null) {
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

    const trades =
      afterTradeId != null
        ? await dbQuery<TradeRow>(
            db,
            `SELECT id, outcome, price, contracts, taker_user_id, maker_user_id, taker_side
             FROM trades WHERE taker_user_id IS NOT NULL AND taker_side IS NOT NULL AND id > ?
             ORDER BY id ASC LIMIT ?`,
            [afterTradeId, maxTrades + 1]
          )
        : await dbQuery<TradeRow>(
            db,
            `SELECT id, outcome, price, contracts, taker_user_id, maker_user_id, taker_side
             FROM trades WHERE taker_user_id IS NOT NULL AND taker_side IS NOT NULL
             ORDER BY id ASC LIMIT ?`,
            [maxTrades + 1]
          );

    const tradesToProcess = trades.slice(0, maxTrades);
    const hasMore = trades.length > maxTrades;

    let totalTradesReplayed = 0;
    let lastTradeIdProcessed: number | null = null;
    const tradeUpdates: { id: number; riskOffContracts: number; riskOffPriceDiffCents: number; riskOffPriceDiffMakerCents: number }[] = [];

    for (const t of tradesToProcess) {
      const outcomeId = t.outcome;
      const takerUserId = t.taker_user_id!;
      const makerUserId = t.maker_user_id ?? null;
      const takerSide = t.taker_side === 1 ? 'ask' : 'bid';
      const price = Number(t.price) || 0;
      const contracts = Number(t.contracts) || 0;

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
      const { riskOffContracts, riskOffPriceDiffCents, riskOffPriceDiffMakerCents } = computeRiskOffForFill(
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

      tradeUpdates.push({ id: t.id, riskOffContracts, riskOffPriceDiffCents, riskOffPriceDiffMakerCents });
      lastTradeIdProcessed = t.id;
      totalTradesReplayed++;
    }

    if (tradeUpdates.length > 0) {
      try {
        await dbBatch(
          db,
          tradeUpdates.map((u) => ({
            sql: 'UPDATE trades SET risk_off_contracts = ?, risk_off_price_diff = ?, risk_off_price_diff_maker = ? WHERE id = ?',
            params: [u.riskOffContracts, u.riskOffPriceDiffCents, u.riskOffPriceDiffMakerCents, u.id],
          }))
        );
      } catch {
        await dbBatch(
          db,
          tradeUpdates.map((u) => ({
            sql: 'UPDATE trades SET risk_off_contracts = ?, risk_off_price_diff = ? WHERE id = ?',
            params: [u.riskOffContracts, u.riskOffPriceDiffCents, u.id],
          }))
        );
      }
    }

    const message =
      hasMore
        ? `Replayed ${totalTradesReplayed} trades (chunk). Call again with after_trade_id: ${lastTradeIdProcessed} to continue.`
        : `Replayed ${totalTradesReplayed} trades. Positions recomputed; risk_off backfilled.${tradesSkipped > 0 ? ` ${tradesSkipped} trade(s) skipped (missing taker_user_id or taker_side).` : ''}`;

    return jsonResponse({
      applied: true,
      message,
      outcomes_processed: outcomes.length,
      trades_replayed: totalTradesReplayed,
      trades_skipped: tradesSkipped,
      outcomes_with_skipped: outcomesWithSkipped.length > 0 ? outcomesWithSkipped : undefined,
      full_reset_applied: fullReset,
      has_more: hasMore,
      after_trade_id: lastTradeIdProcessed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Admin replay-positions error:', message, err);
    return errorResponse(`Failed to replay positions: ${message}`, 500);
  }
};
