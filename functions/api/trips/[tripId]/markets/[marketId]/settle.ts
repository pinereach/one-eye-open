import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, type Env } from '../../../../../src/lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../../middleware';
import {
  settleMarket,
  aggregateTripBalances,
  generateLedger,
  createLedgerEntries,
} from '../../../../../src/lib/settlement';

const settleSchema = z.object({
  settle_value: z.number().int().refine((v) => v === 0 || v === 10000, {
    message: 'Settle value must be 0 or 10000',
  }),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env, params } = context;
  const tripId = params.tripId as string;
  const marketId = params.marketId as string;

  const authResult = await requireAdmin(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  try {
    const body = await request.json();
    const validated = settleSchema.parse(body);

    // Verify market exists and belongs to trip
    const market = await dbFirst(
      db,
      'SELECT * FROM markets WHERE id = ? AND trip_id = ? AND status IN (?, ?)',
      [marketId, tripId, 'open', 'closed']
    );

    if (!market) {
      return errorResponse('Market not found or already settled', 404);
    }

    // Settle the market
    const pnlResults = await settleMarket(db, marketId, validated.settle_value);

    // Aggregate trip balances
    const balances = await aggregateTripBalances(db, tripId);

    // Generate ledger entries
    const ledgerEntries = generateLedger(tripId, balances);

    // Create ledger entries
    await createLedgerEntries(db, ledgerEntries);

    return jsonResponse({
      marketId,
      settleValue: validated.settle_value,
      pnlResults,
      balances: Object.fromEntries(balances),
      ledgerEntries,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Settlement error:', error);
    return errorResponse('Settlement failed', 500);
  }
};
