import type { D1Database } from '@cloudflare/workers-types';
import { dbQuery, dbRun, dbBatch } from './db';

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
  // Local DB uses outcome, not market_id. Join with outcomes to find positions for this market
  const positionsDb = await dbQuery<{
    id: number;
    user_id: number | null;
    outcome: string;
    net_position: number;
    price_basis: number;
    closed_profit: number;
    settled_profit: number;
    is_settled: number;
  }>(
    db,
    `SELECT p.* 
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     WHERE o.market_id = ?`,
    [marketId]
  );

  const pnlResults: PnLResult[] = [];

  for (const position of positionsDb) {
    let pnlCents = 0;

    // Long positions: net_position > 0, profit if settleValue > price_basis
    if (position.net_position > 0 && position.price_basis > 0) {
      const profitPerContract = settleValue - position.price_basis;
      pnlCents += position.net_position * profitPerContract;
    }

    // Short positions: net_position < 0, profit if settleValue < price_basis
    if (position.net_position < 0 && position.price_basis > 0) {
      const profitPerContract = position.price_basis - settleValue;
      pnlCents += Math.abs(position.net_position) * profitPerContract;
    }

    pnlResults.push({
      userId: position.user_id?.toString() || '',
      marketId: marketId,
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

  const positionsDb = await dbQuery<{
    id: number;
    user_id: number | null;
    outcome: string;
    net_position: number;
    price_basis: number;
  }>(
    db,
    `SELECT p.id, p.user_id, p.outcome, p.net_position, p.price_basis
     FROM positions p
     JOIN outcomes o ON p.outcome = o.outcome_id
     WHERE o.market_id = ?`,
    [marketId]
  );

  const pnlResults: PnLResult[] = [];
  const statements: { sql: string; params: any[] }[] = [];

  for (const position of positionsDb) {
    let settledProfit = 0;
    if (position.net_position > 0 && position.price_basis > 0) {
      settledProfit = position.net_position * (settleValue - position.price_basis);
    }
    if (position.net_position < 0 && position.price_basis > 0) {
      settledProfit = Math.abs(position.net_position) * (position.price_basis - settleValue);
    }
    pnlResults.push({
      userId: position.user_id?.toString() || '',
      marketId: marketId,
      pnlCents: settledProfit,
    });
    statements.push({
      sql: 'UPDATE positions SET settled_profit = ?, is_settled = 1 WHERE id = ?',
      params: [settledProfit, position.id],
    });
  }

  statements.push({
    sql: 'UPDATE outcomes SET settled_price = ? WHERE market_id = ?',
    params: [settleValue, marketId],
  });

  await dbBatch(db, statements);
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
