import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbRun, type Env } from '../../lib/db';
import { requireAuth, jsonResponse, errorResponse } from '../../middleware';

const outcomeSchema = z.object({
  name: z.string().min(1, 'Outcome name is required'),
  ticker: z.string().min(1, 'Ticker is required'),
  strike: z.string().optional().default(''),
});

const marketSuggestionSchema = z.object({
  short_name: z.string().min(1, 'Market name is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  max_winners: z.number().int().min(1).max(12).default(1),
  min_winners: z.number().int().min(1).max(12).default(1),
  outcomes: z.array(outcomeSchema).min(1, 'At least one outcome is required').max(12, 'Maximum 12 outcomes allowed'),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }

  const db = getDb(env);

  try {
    const body = await request.json();
    const validated = marketSuggestionSchema.parse(body);

    // Generate unique market_id
    const marketId = `market-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert market
    await dbRun(
      db,
      `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        marketId,
        validated.short_name,
        validated.symbol,
        validated.max_winners,
        validated.min_winners,
        Math.floor(Date.now() / 1000),
      ]
    );

    // Insert outcomes
    const outcomeIds: string[] = [];
    for (const outcome of validated.outcomes) {
      const outcomeId = `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await dbRun(
        db,
        `INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, created_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          outcomeId,
          outcome.name,
          outcome.ticker,
          marketId,
          outcome.strike || '',
          Math.floor(Date.now() / 1000),
        ]
      );
      outcomeIds.push(outcomeId);
    }

    return jsonResponse({
      success: true,
      market_id: marketId,
      outcome_ids: outcomeIds,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Market suggestion error:', error);
    return errorResponse('Failed to create market suggestion', 500);
  }
};
