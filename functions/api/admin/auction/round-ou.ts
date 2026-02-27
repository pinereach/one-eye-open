import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../../lib/db';
import { requireAdmin, jsonResponse, errorResponse } from '../../../middleware';
import { createTrade, updatePositionsForFill } from '../../../lib/matching';

/** Slug for outcome_id: lowercase, spaces and dots to hyphen/underscore, strip non-alphanumeric */
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

/** Initials from participant name, e.g. "Alex Smith" -> "AS" */
function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 3);
  return (name || 'X').slice(0, 2).toUpperCase();
}

const AUCTION_PRICE_CENTS = 5000;
const CONTRACTS_PER_TRADE = 1;

/** Treat as Pars market if market_type is pars/market_total_pars or short_name contains "Pars". */
function isParsMarket(market: { market_type: string | null; short_name?: string | null }): boolean {
  const type = (market.market_type || '').toLowerCase();
  if (type === 'pars' || type === 'market_total_pars') return true;
  const name = (market.short_name || '').toLowerCase();
  return name.includes('pars');
}

/** Treat as Birdies market if market_type is market_total_birdies or market_id/short_name contains "birdies". */
function isBirdiesMarket(market: { market_id: string; market_type: string | null; short_name?: string | null }): boolean {
  const type = (market.market_type || '').toLowerCase();
  if (type === 'market_total_birdies') return true;
  const id = (market.market_id || '').toLowerCase();
  if (id.includes('birdies') || id.includes('total-birdies') || id.includes('total_birdies')) return true;
  const name = (market.short_name || '').toLowerCase();
  return name.includes('birdies');
}

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  const adminResult = await requireAdmin(request, env);
  if ('error' in adminResult) {
    return adminResult.error;
  }

  const db = getDb(env);

  try {
    const body = await request.json().catch(() => ({}));
    const auctionType = (typeof body?.auction_type === 'string' ? body.auction_type.trim().toLowerCase() : '') || 'round_ou';
    const round = body?.round != null ? Number(body.round) : undefined;
    const participantId = typeof body?.participant_id === 'string' ? body.participant_id.trim() : '';
    const existingOutcomeId = typeof body?.outcome_id === 'string' ? body.outcome_id.trim() : '';
    const existingMarketId = typeof body?.market_id === 'string' ? body.market_id.trim() : '';
    const bids = Array.isArray(body?.bids) ? body.bids : [];

    const isRoundOu = auctionType === 'round_ou';
    const isPars = auctionType === 'pars';
    const isBirdies = auctionType === 'birdies';
    const isOutcome = auctionType === 'outcome';
    if (!isRoundOu && !isPars && !isBirdies && !isOutcome) {
      return errorResponse('auction_type must be "round_ou", "pars", "birdies", or "outcome"', 400);
    }
    if (isOutcome && !existingOutcomeId) {
      return errorResponse('For outcome auction, outcome_id is required', 400);
    }
    if (isRoundOu && (round == null || !Number.isInteger(round) || round < 1 || round > 6)) {
      return errorResponse('round must be an integer between 1 and 6 for Round O/U', 400);
    }
    if (isPars && !existingOutcomeId && !participantId && !existingMarketId) {
      return errorResponse('For Pars, provide outcome_id (existing outcome), market_id (new line in existing market), or participant_id (new market)', 400);
    }
    if (isBirdies && !existingMarketId) {
      return errorResponse('For Birdies, market_id is required', 400);
    }
    if (!isPars && !isBirdies && !isOutcome && !participantId) {
      return errorResponse('participant_id is required', 400);
    }
    if (bids.length < 2) {
      return errorResponse('At least 2 bids are required', 400);
    }

    for (let i = 0; i < bids.length; i++) {
      const b = bids[i];
      const uid = b?.user_id != null ? Number(b.user_id) : undefined;
      const guess = b?.guess != null ? Number(b.guess) : undefined;
      if (uid == null || !Number.isInteger(uid) || uid < 1) {
        return errorResponse(`bids[${i}]: user_id must be a positive integer`, 400);
      }
      if (guess == null || typeof guess !== 'number' || Number.isNaN(guess)) {
        return errorResponse(`bids[${i}]: guess must be a number`, 400);
      }
    }

    const userIds = new Set(bids.map((b: any) => Number(b.user_id)));
    for (const uid of userIds) {
      const user = await dbFirst<{ id: number }>(db, 'SELECT id FROM users WHERE id = ?', [uid]);
      if (!user) {
        return errorResponse(`User id ${uid} not found`, 404);
      }
    }

    const N = bids.length;
    let outcomeId: string;
    let resolvedMarketId: string;
    let strikeStr: string;
    let participantName = '';

    // Any outcome: use provided outcome_id and its market
    if (isOutcome) {
      const outcomeRow = await dbFirst<{ outcome_id: string; market_id: string; strike: string | null }>(
        db,
        'SELECT outcome_id, market_id, strike FROM outcomes WHERE outcome_id = ?',
        [existingOutcomeId]
      );
      if (!outcomeRow) {
        return errorResponse('Outcome not found', 404);
      }
      outcomeId = outcomeRow.outcome_id;
      resolvedMarketId = outcomeRow.market_id;
      strikeStr = outcomeRow.strike != null && outcomeRow.strike !== '' ? String(outcomeRow.strike) : '—';
    } else if (isPars && existingOutcomeId) {
    // Pars with existing outcome: use that outcome and market; no participant or creation
      const outcomeRow = await dbFirst<{ outcome_id: string; market_id: string; strike: string | null }>(
        db,
        'SELECT outcome_id, market_id, strike FROM outcomes WHERE outcome_id = ?',
        [existingOutcomeId]
      );
      if (!outcomeRow) {
        return errorResponse('Outcome not found', 404);
      }
      const marketRow = await dbFirst<{ market_id: string; market_type: string | null; short_name: string | null }>(
        db,
        'SELECT market_id, market_type, short_name FROM markets WHERE market_id = ?',
        [outcomeRow.market_id]
      );
      if (!marketRow || !isParsMarket(marketRow)) {
        return errorResponse('Outcome must belong to a Pars market', 400);
      }
      outcomeId = outcomeRow.outcome_id;
      resolvedMarketId = outcomeRow.market_id;
      strikeStr = outcomeRow.strike != null && outcomeRow.strike !== '' ? String(outcomeRow.strike) : '0';
    } else if (isPars && existingMarketId) {
      // Pars with existing market (new line): create outcome under that market; strike from bids
      const marketRow = await dbFirst<{ market_id: string; short_name: string; market_type: string | null }>(
        db,
        'SELECT market_id, short_name, market_type FROM markets WHERE market_id = ?',
        [existingMarketId]
      );
      if (!marketRow || !isParsMarket(marketRow)) {
        return errorResponse('Market not found or not a Pars market', 400);
      }
      resolvedMarketId = marketRow.market_id;
      const strikeNum = bids.reduce((s: number, b: any) => s + Number(b.guess), 0) / N;
      strikeStr = strikeNum % 1 === 0 ? String(strikeNum) : strikeNum.toFixed(1);
      const strikeSlug = slugForOutcomeId(strikeStr.replace('.', '_'));
      const participantFromMarket = (marketRow.short_name || '').replace(/\s+Pars$/i, '').trim() || 'X';
      participantName = participantFromMarket;
      const participantSlug = slugForOutcomeId(participantFromMarket);
      outcomeId = `outcome-pars-${participantSlug}-${strikeSlug}`;
    } else if (isBirdies && existingMarketId) {
      // Birdies with existing market: create outcome under that market; strike from bids average
      const marketRow = await dbFirst<{ market_id: string; short_name: string; market_type: string | null }>(
        db,
        'SELECT market_id, short_name, market_type FROM markets WHERE market_id = ?',
        [existingMarketId]
      );
      if (!marketRow || !isBirdiesMarket(marketRow)) {
        return errorResponse('Market not found or not a Birdies market', 400);
      }
      resolvedMarketId = marketRow.market_id;
      const strikeNum = bids.reduce((s: number, b: any) => s + Number(b.guess), 0) / N;
      strikeStr = strikeNum % 1 === 0 ? String(strikeNum) : strikeNum.toFixed(1);
      const strikeSlug = slugForOutcomeId(strikeStr.replace('.', '_'));
      // Extract market name for outcome naming (e.g. "Total Birdies Thursday (R2-R3)" -> "Thursday R2-R3")
      const marketLabel = (marketRow.short_name || marketRow.market_id)
        .replace(/^Total\s+Birdies\s*/i, '')
        .replace(/[()]/g, '')
        .trim() || 'Birdies';
      participantName = marketLabel;
      outcomeId = `outcome-birdies-${slugForOutcomeId(marketLabel)}-${strikeSlug}`;
    } else {
      // Round O/U or Pars with participant_id (create/find market and outcome)
      const participant = await dbFirst<{ id: string; name: string }>(
        db,
        'SELECT id, name FROM participants WHERE id = ?',
        [participantId]
      );
      if (!participant) {
        return errorResponse('Participant not found', 404);
      }
      participantName = participant.name;

      const strikeNum = bids.reduce((s: number, b: any) => s + Number(b.guess), 0) / N;
      strikeStr = strikeNum % 1 === 0 ? String(strikeNum) : strikeNum.toFixed(1);
      const strikeSlug = slugForOutcomeId(strikeStr.replace('.', '_'));
      const participantSlug = slugForOutcomeId(participantName);

      let marketShortName: string;
      let marketSymbol: string;

    if (isPars) {
      marketShortName = `${participantName} Pars`;
      marketSymbol = `${participantSlug.replace(/-/g, '').toUpperCase().slice(0, 8)}PARS`;
      const newMarketId = `market-pars-${participantSlug}`;
      let market = await dbFirst<{ market_id: string }>(
        db,
        `SELECT market_id FROM markets WHERE market_type = 'pars' AND (market_id = ? OR short_name = ?)`,
        [newMarketId, marketShortName]
      );
      if (!market) {
        await dbRun(
          db,
          `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newMarketId, marketShortName, marketSymbol, 12, 1, Math.floor(Date.now() / 1000), 'pars']
        );
        market = { market_id: newMarketId };
      }
      resolvedMarketId = market.market_id;
      outcomeId = `outcome-pars-${participantSlug}-${strikeSlug}`;
    } else {
      outcomeId = `outcome-round-${round}-ou-${participantSlug}-${strikeSlug}`;
      const newMarketId = `market-round-${round}-ou`;
      marketShortName = `Round ${round} Over/Under`;
      marketSymbol = `R${round}OU`;
      let market = await dbFirst<{ market_id: string }>(db, 'SELECT market_id FROM markets WHERE market_id = ?', [newMarketId]);
      if (!market) {
        market = await dbFirst<{ market_id: string }>(
          db,
          `SELECT market_id FROM markets WHERE market_type = 'round_ou' AND short_name LIKE ?`,
          [`Round ${round} Over/Under%`]
        );
      }
      if (!market) {
        await dbRun(
          db,
          `INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newMarketId, marketShortName, marketSymbol, 12, 1, Math.floor(Date.now() / 1000), 'round_ou']
        );
        market = { market_id: newMarketId };
      }
      resolvedMarketId = market.market_id;
    }
    }

    let outcome = await dbFirst<{ outcome_id: string }>(
      db,
      'SELECT outcome_id FROM outcomes WHERE outcome_id = ? AND market_id = ?',
      [outcomeId, resolvedMarketId]
    );
    if (!outcome) {
      let outcomeName: string;
      let ticker: string;
      if (isBirdies) {
        outcomeName = `Over ${strikeStr} - ${participantName}`;
        ticker = `OV-${strikeStr.replace('.', '_')}-${initials(participantName)}`;
      } else if (isPars) {
        outcomeName = `${participantName} Over ${strikeStr}`;
        ticker = `${initials(participantName)}-OV-${strikeStr.replace('.', '_')}`;
      } else {
        outcomeName = `${participantName} Over ${strikeStr} - Round ${round}`;
        ticker = `${initials(participantName)}-OV-R${round}-${strikeStr.replace('.', '_')}`;
      }
      await dbRun(
        db,
        `INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, created_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [outcomeId, outcomeName, ticker, resolvedMarketId, strikeStr, Math.floor(Date.now() / 1000)]
      );
    }

    const sortedBids = [...bids].sort((a, b) => {
      const ga = Number(a.guess);
      const gb = Number(b.guess);
      if (ga !== gb) return ga - gb;
      return Number(a.user_id) - Number(b.user_id);
    });
    const half = Math.floor(N / 2);
    const shortUserIds = sortedBids.slice(0, half).map((b: any) => Number(b.user_id));
    const longUserIds = sortedBids.slice(half).map((b: any) => Number(b.user_id));

    // Round O/U and Birdies: 50¢. Pars and any outcome (e.g. matchups): trade price = average of bids (%).
    const avgBid = bids.reduce((s: number, b: any) => s + Number(b.guess), 0) / N;
    const auctionPriceCents = (isRoundOu || isBirdies)
      ? AUCTION_PRICE_CENTS
      : Math.max(100, Math.min(9900, Math.round(avgBid * 100)));

    const createTime = Math.floor(Date.now() / 1000);
    let tradesCreated = 0;

    for (let i = 0; i < longUserIds.length; i++) {
      const takerUserId = longUserIds[i];
      const makerUserId = shortUserIds[i % shortUserIds.length];

      const tradeId = await createTrade(
        db,
        resolvedMarketId,
        'auction',
        0,
        auctionPriceCents,
        CONTRACTS_PER_TRADE,
        outcomeId,
        takerUserId,
        makerUserId,
        0
      );

      await updatePositionsForFill(db, outcomeId, takerUserId, makerUserId, 'bid', auctionPriceCents, CONTRACTS_PER_TRADE);

      const manualToken = `auction-${tradeId}`;
      await dbRun(
        db,
        `INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
         VALUES (?, ?, ?, ?, ?, ?, 'filled', 'GTC', 0, 0, ?)`,
        [createTime, takerUserId, `${manualToken}-t`, -tradeId, outcomeId, auctionPriceCents, CONTRACTS_PER_TRADE]
      );
      await dbRun(
        db,
        `INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
         VALUES (?, ?, ?, ?, ?, ?, 'filled', 'GTC', 1, 0, ?)`,
        [createTime, makerUserId, `${manualToken}-m`, -tradeId, outcomeId, auctionPriceCents, CONTRACTS_PER_TRADE]
      );
      tradesCreated++;
    }

    return jsonResponse({
      market_id: resolvedMarketId,
      outcome_id: outcomeId,
      strike: strikeStr,
      short_user_ids: shortUserIds,
      long_user_ids: longUserIds,
      trades_created: tradesCreated,
    }, 201);
  } catch (err) {
    console.error('Admin round-ou auction error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to run auction', 500);
  }
};
