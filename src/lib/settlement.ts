import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbRun } from './db';
import type { Position } from './matching';

export interface PnLResult {
  userId: string;
  marketId: string;
  pnlCents: number;
}

export interface TripBalance {
  userId: string;
  balanceCents: number;
}

export interface LedgerEntry {
  id: string;
  trip_id: string;
  user_id: string;
  counterparty_user_id: string;
  amount_cents: number;
  reason: string;
}

const CONTRACT_SIZE_CENTS = 10000;

export async function calculateMarketPnL(
  db: D1Database,
  marketId: string,
  settleValue: number
): Promise<PnLResult[]> {
  const positions = await dbQuery<Position>(
    db,
    'SELECT * FROM positions WHERE market_id = ?',
    [marketId]
  );

  const pnlResults: PnLResult[] = [];

  for (const position of positions) {
    let pnlCents = 0;

    // Long positions: profit if settleValue > avg_price_long_cents
    if (position.qty_long > 0 && position.avg_price_long_cents !== null) {
      const profitPerContract = settleValue - position.avg_price_long_cents;
      pnlCents += position.qty_long * profitPerContract;
    }

    // Short positions: profit if settleValue < avg_price_short_cents
    if (position.qty_short > 0 && position.avg_price_short_cents !== null) {
      const profitPerContract = position.avg_price_short_cents - settleValue;
      pnlCents += position.qty_short * profitPerContract;
    }

    pnlResults.push({
      userId: position.user_id,
      marketId: position.market_id,
      pnlCents,
    });
  }

  return pnlResults;
}

export async function aggregateTripBalances(
  db: D1Database,
  tripId: string
): Promise<Map<string, number>> {
  // Get all settled markets for this trip
  const markets = await dbQuery<{ id: string; settle_value: number }>(
    db,
    "SELECT id, settle_value FROM markets WHERE trip_id = ? AND status = 'settled' AND settle_value IS NOT NULL",
    [tripId]
  );

  const balances = new Map<string, number>();

  for (const market of markets) {
    const pnlResults = await calculateMarketPnL(db, market.id, market.settle_value);

    for (const pnl of pnlResults) {
      const currentBalance = balances.get(pnl.userId) || 0;
      balances.set(pnl.userId, currentBalance + pnl.pnlCents);
    }
  }

  return balances;
}

export function generateLedger(
  tripId: string,
  balances: Map<string, number>
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const balanceArray = Array.from(balances.entries())
    .map(([userId, balance]) => ({ userId, balance }))
    .filter((b) => b.balance !== 0)
    .sort((a, b) => b.balance - a.balance);

  // Greedy netting algorithm to minimize transfers
  const creditors = balanceArray.filter((b) => b.balance > 0);
  const debtors = balanceArray.filter((b) => b.balance < 0).map((b) => ({
    ...b,
    balance: Math.abs(b.balance),
  }));

  let creditorIdx = 0;
  let debtorIdx = 0;

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx];
    const debtor = debtors[debtorIdx];

    const transferAmount = Math.min(creditor.balance, debtor.balance);

    if (transferAmount > 0) {
      entries.push({
        id: crypto.randomUUID(),
        trip_id: tripId,
        user_id: debtor.userId,
        counterparty_user_id: creditor.userId,
        amount_cents: transferAmount,
        reason: 'Settlement netting',
      });
    }

    creditor.balance -= transferAmount;
    debtor.balance -= transferAmount;

    if (creditor.balance === 0) {
      creditorIdx++;
    }
    if (debtor.balance === 0) {
      debtorIdx++;
    }
  }

  return entries;
}

export async function settleMarket(
  db: D1Database,
  marketId: string,
  settleValue: number
): Promise<PnLResult[]> {
  // Validate settleValue
  if (settleValue !== 0 && settleValue !== CONTRACT_SIZE_CENTS) {
    throw new Error(`Settle value must be 0 or ${CONTRACT_SIZE_CENTS}`);
  }

  // Calculate PnL for all positions
  const pnlResults = await calculateMarketPnL(db, marketId, settleValue);

  // Update market status
  await dbRun(
    db,
    "UPDATE markets SET status = 'settled', settle_value = ? WHERE id = ?",
    [settleValue, marketId]
  );

  return pnlResults;
}

export async function createLedgerEntries(
  db: D1Database,
  entries: LedgerEntry[]
): Promise<void> {
  for (const entry of entries) {
    await dbRun(
      db,
      `INSERT INTO ledger_entries (id, trip_id, user_id, counterparty_user_id, amount_cents, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.trip_id,
        entry.user_id,
        entry.counterparty_user_id,
        entry.amount_cents,
        entry.reason,
      ]
    );
  }
}
