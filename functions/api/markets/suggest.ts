import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbRun, dbFirst, type Env } from '../../lib/db';
import { requireAuth, jsonResponse, errorResponse } from '../../middleware';

const outcomeSchema = z.object({
  name: z.string().min(1, 'Outcome name is required'),
  ticker: z.string().min(1, 'Ticker is required'),
  strike: z.string().optional().default(''),
  outcome_id: z.string().min(1).optional(), // Optional deterministic id (e.g. h2h: outcome-h2h-ALEX-AVAYOU) to avoid duplicates
});

const marketSuggestionSchema = z.object({
  short_name: z.string().min(1, 'Market name is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  max_winners: z.number().int().min(1).max(12).default(1),
  min_winners: z.number().int().min(1).max(12).default(1),
  outcomes: z.array(outcomeSchema).min(1, 'At least one outcome is required').max(12, 'Maximum 12 outcomes allowed'),
  round_number: z.number().optional(), // Optional round number for Round O/U markets
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult.error;
  }
  if (!authResult.user.view_market_creation) {
    return errorResponse('Forbidden: market creation access not allowed', 403);
  }

  const db = getDb(env);

  try {
    const body = await request.json();
    const validated = marketSuggestionSchema.parse(body);

    // Determine market_type from short_name / outcomes
    const isRoundOU = validated.short_name.includes('Round') && validated.short_name.includes('Over/Under');
    const isTotalBirdies = validated.short_name.includes('Total Birdies');
    const isH2H = validated.outcomes.some((o: { outcome_id?: string }) => o.outcome_id?.startsWith('outcome-h2h-'));
    const marketType = isRoundOU ? 'round_ou' : isTotalBirdies ? 'total_birdies' : isH2H ? 'h2h_matchups' : null;

    let marketId: string;

    // For Total Birdies (round-agnostic, one shared market), find or create market-total-birdies
    if (isTotalBirdies) {
      const existingMarket = await dbFirst<{ market_id: string }>(
        db,
        `SELECT market_id FROM markets WHERE market_id = 'market-total-birdies'`
      );
      if (existingMarket) {
        marketId = existingMarket.market_id;
      } else {
        marketId = 'market-total-birdies';
        await dbRun(
          db,
          `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            marketId,
            'Total Birdies',
            'BIRDIES',
            validated.max_winners,
            validated.min_winners,
            Math.floor(Date.now() / 1000),
            'total_birdies',
          ]
        );
      }
    }
    // For Round O/U markets, find or create the market for that round
    else if (isRoundOU && validated.round_number) {
      // Extract round number from short_name or use provided round_number
      const roundMatch = validated.short_name.match(/Round (\d+)/);
      const roundNum = validated.round_number || (roundMatch ? parseInt(roundMatch[1], 10) : null);
      
      if (roundNum) {
        // Look for existing market for this round
        const existingMarket = await dbFirst<{ market_id: string }>(
          db,
          `SELECT market_id FROM markets 
           WHERE market_type = 'round_ou' 
           AND short_name LIKE ?`,
          [`Round ${roundNum} Over/Under%`]
        );

        if (existingMarket) {
          // Use existing market
          marketId = existingMarket.market_id;
        } else {
          // Create new market for this round
          marketId = `market-round-${roundNum}-ou`;
          await dbRun(
            db,
            `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              marketId,
              `Round ${roundNum} Over/Under`,
              `R${roundNum}OU`,
              validated.max_winners,
              validated.min_winners,
              Math.floor(Date.now() / 1000),
              marketType,
            ]
          );
        }
      } else {
        // Fallback: create new market if we can't determine round
        marketId = `market-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await dbRun(
          db,
          `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            marketId,
            validated.short_name,
            validated.symbol,
            validated.max_winners,
            validated.min_winners,
            Math.floor(Date.now() / 1000),
            marketType,
          ]
        );
      }
    }
    // For Head-to-Head, use single shared market market-h2h-matchups (find or create)
    else if (isH2H) {
      const existingMarket = await dbFirst<{ market_id: string }>(
        db,
        `SELECT market_id FROM markets WHERE market_id = 'market-h2h-matchups'`
      );
      if (existingMarket) {
        marketId = existingMarket.market_id;
      } else {
        marketId = 'market-h2h-matchups';
        await dbRun(
          db,
          `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            marketId,
            'Head-to-Head Matchups',
            'H2H',
            validated.max_winners,
            validated.min_winners,
            Math.floor(Date.now() / 1000),
            'h2h_matchups',
          ]
        );
      }
    } else {
      // For other one-off markets, create a new market
      marketId = `market-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await dbRun(
        db,
        `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          marketId,
          validated.short_name,
          validated.symbol,
          validated.max_winners,
          validated.min_winners,
          Math.floor(Date.now() / 1000),
          marketType ?? null,
        ]
      );
    }

    // Insert outcomes
    const outcomeIds: string[] = [];
    for (const outcome of validated.outcomes) {
      const outcomeId = outcome.outcome_id || `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
