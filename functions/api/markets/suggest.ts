import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbRun, dbFirst, type Env } from '../../lib/db';
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
  round_number: z.number().optional(), // Optional round number for Round O/U markets
});

/** Slug for outcome_id: lowercase, spaces and dots to hyphen, strip non-alphanumeric/hyphen */
function slugForOutcomeId(s: string): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\./g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^\-|\-$/g, '') || 'x';
}

/** Extract participant from Total Birdies outcome name, e.g. "Alex Over 6 - Total Birdies" -> "Alex" */
function participantFromTotalBirdiesName(name: string): string {
  const overIdx = (name || '').indexOf(' Over ');
  if (overIdx === -1) return (name || '').trim();
  return (name || '').slice(0, overIdx).trim();
}

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

    // Determine market_type from short_name
    const isRoundOU = validated.short_name.includes('Round') && validated.short_name.includes('Over/Under');
    const isTotalBirdies = validated.short_name === 'Total Birdies' || (validated.symbol === 'BIRDIES' && validated.short_name.toLowerCase().includes('birdies'));
    const marketType = isRoundOU ? 'round_ou' : isTotalBirdies ? 'total_birdies' : null;

    let marketId: string;

    // For Total Birdies, use the existing market (market-total-birdies) — do not create a new market
    if (isTotalBirdies) {
      const existingMarket = await dbFirst<{ market_id: string }>(
        db,
        `SELECT market_id FROM markets WHERE market_id = 'market-total-birdies' OR market_type = 'total_birdies' LIMIT 1`
      );
      if (existingMarket) {
        marketId = existingMarket.market_id;
      } else {
        return errorResponse('Total Birdies market not found. Ensure market-total-birdies exists in the database.', 400);
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
    } else {
      // For non-Round O/U markets, create a new market
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

    // Insert outcomes
    const outcomeIds: string[] = [];
    const createdDate = Math.floor(Date.now() / 1000);
    for (const outcome of validated.outcomes) {
      let outcomeId: string;
      if (isTotalBirdies) {
        const participant = participantFromTotalBirdiesName(outcome.name);
        const participantSlug = slugForOutcomeId(participant);
        const strikeSlug = outcome.strike ? slugForOutcomeId(outcome.strike) : '';
        outcomeId = strikeSlug
          ? `outcome-market-total-birdies-${participantSlug}-${strikeSlug}`
          : `outcome-market-total-birdies-${participantSlug}`;
      } else {
        outcomeId = `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
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
          createdDate,
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
