import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbRun } from './db';
import type { Position } from './matching';

export interface PnLResult {
  userId: number;
  outcome: string;
  pnlCents: number;
}

export interface TripBalance {
  userId: number;
  balanceCents: number;
}

// LedgerEntry interface removed - ledger functionality removed

const CONTRACT_SIZE_CENTS = 10000;

export async function calculateOutcomePnL(
  db: D1Database,
  outcomeId: string,
  settleValue: number
): Promise<PnLResult[]> {
  // Calculate PnL for all positions for this outcome
  const positions = await dbQuery<Position>(
    db,
    'SELECT * FROM positions WHERE outcome = ? AND is_settled = 0',
    [outcomeId]
  );

  const pnlResults: PnLResult[] = [];

  for (const position of positions) {
    if (!position.user_id) continue;

    let pnlCents = 0;

    if (position.net_position > 0) {
      // Long position: profit if settleValue > price_basis
      const profitPerContract = settleValue - position.price_basis;
      pnlCents = position.net_position * profitPerContract;
    } else if (position.net_position < 0) {
      // Short position: profit if settleValue < price_basis
      const profitPerContract = position.price_basis - settleValue;
      pnlCents = Math.abs(position.net_position) * profitPerContract;
    }

    pnlResults.push({
      userId: position.user_id,
      outcome: position.outcome,
      pnlCents,
    });
  }

  return pnlResults;
}

// aggregateTripBalances and generateLedger removed - trip/ledger functionality removed

export async function settleOutcome(
  db: D1Database,
  outcomeId: string,
  settleValue: number
): Promise<PnLResult[]> {
  // Validate settleValue
  if (settleValue !== 0 && settleValue !== CONTRACT_SIZE_CENTS) {
    throw new Error(`Settle value must be 0 or ${CONTRACT_SIZE_CENTS}`);
  }

  // Calculate PnL for all positions
  const pnlResults = await calculateOutcomePnL(db, outcomeId, settleValue);

  // Update positions with settled profit and mark as settled
  for (const pnl of pnlResults) {
    await dbRun(
      db,
      `UPDATE positions 
       SET settled_profit = ?, is_settled = 1 
       WHERE outcome = ? AND user_id = ?`,
      [pnl.pnlCents, outcomeId, pnl.userId]
    );
  }

  // Update outcome settled_price
  await dbRun(
    db,
    "UPDATE outcomes SET settled_price = ? WHERE outcome_id = ?",
    [settleValue, outcomeId]
  );

  return pnlResults;
}

export async function settleMarket(
  db: D1Database,
  marketId: string, // This is market_id (text), not the auto-increment id
  settleValue: number
): Promise<PnLResult[]> {
  // Get all outcomes for this market
  const outcomes = await dbQuery<{ outcome_id: string }>(
    db,
    'SELECT outcome_id FROM outcomes WHERE market_id = ?',
    [marketId]
  );

  const allPnLResults: PnLResult[] = [];

  // Settle each outcome
  for (const outcome of outcomes) {
    const pnlResults = await settleOutcome(db, outcome.outcome_id, settleValue);
    allPnLResults.push(...pnLResults);
  }

  // Markets no longer have status/settle_value fields
  // Settlement is tracked at the outcome level via settled_price

  return allPnLResults;
}

// createLedgerEntries removed - ledger functionality removed
