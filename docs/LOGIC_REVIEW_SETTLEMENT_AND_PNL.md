# Logic review: settlement, settled price, and unrealized PnL

Review date: 2026-01. Focus: consistency of settled vs unsettled logic and any missed call sites.

## 1. Definition of “settled”

- **Backend:** An outcome is settled when `outcomes.settled_price` is not null (set by settlement flow in `functions/lib/settlement.ts`).
- **Frontend (markets list):** A market is hidden from the list when any of its outcomes has `settled_price != null` (`MarketList.tsx`).
- **Position cards:** When `position.settled_price != null` (or outcome is settled), we use settlement price for value/diff and show “Settled @ $X” instead of Bid/Ask.

## 2. Where “settled” is used (and must be consistent)

| Location | Behavior | Status |
|----------|----------|--------|
| **GET /positions** | Joins `outcomes`, uses `o.settled_price`; when settled, `current_price = outcome_settled_price`, `best_bid`/`best_ask` null, returns `settled_price`. | ✅ |
| **GET /markets/:id** (positions in payload) | Same: outcome `settled_price`, use for `current_price` when settled, null bid/ask, return `settled_price`. | ✅ |
| **GET /markets/:id/positions** | Market-scoped positions. Was still using only bid/ask. | ✅ **Fixed:** now uses `o.settled_price`, same semantics as above. |
| **Admin leaderboard** | Positions joined with outcomes; when `outcome_settled_price != null`, unrealized = 0; closed/settled profit still summed. | ✅ |
| **PositionsPage** | Unrealized total excludes positions with `settled_price != null` or `is_settled`; card footer shows “Settled @ $X” when `settled_price != null`. | ✅ |
| **MarketDetail** | Positions from getMarket; card value/diff use `current_price` (already set to settled price when settled); footer shows “Settled @ $X” when `settled_price != null`. | ✅ |

## 3. Settled profit formula

- **Stored and used:** `settled_profit = position * (settlement_price - price_basis) + closed_profit`
- **Where:** `functions/lib/settlement.ts` in `updatePositionsWithSettledProfit` and `calculateMarketPnL`. No other code path writes or recomputes `settled_profit` for this formula.

## 4. Unrealized PnL (portfolio value)

- **Definition:** Mark-to-market PnL using current price (bid/ask mid) vs cost basis. Excludes closed and settled profit.
- **Settled positions:** Must not contribute to unrealized.
  - **GET /positions** and **GET /markets/:id**: Backend sends `current_price = settled_price` when settled; frontend does not use that for “unrealized” total.
  - **PositionsPage:** `totalPositionValueCents` skips positions where `settled_price != null` or `is_settled`.
  - **Leaderboard API:** For positions with `outcome_settled_price != null`, `unrealizedRaw = 0`; closed/settled profit still aggregated.

## 5. Fix applied in this review

- **GET /markets/:marketId/positions** (`functions/api/markets/[marketId]/positions.ts`): Previously did not join `outcomes.settled_price` and always used bid/ask for `current_price`. It now:
  - Selects `o.settled_price AS outcome_settled_price`
  - Uses `current_price = outcome_settled_price` when outcome is settled, else bid/ask mid
  - Returns `settled_price`, and when settled sets `best_bid`/`best_ask` to null

So any consumer of this endpoint (e.g. future use of `api.getPositions(marketId)`) gets the same semantics as the main market payload and GET /positions.

## 6. Minor consistency

- **positions API** (`functions/api/positions/index.ts`): Return uses `settled_price: outcome_settled_price ?? null` in both code paths so the field is always `number | null`.

## 7. Optional UX improvement (not a logic hole)

- **Risk / To Profit on cards:** For settled positions we still show “Risk” and “To Profit” (based on price_basis and 0/100). Once the outcome is settled, those are no longer meaningful. Consider hiding that line or replacing with “Settled” when `position.settled_price != null`.

## 8. Summary

- One real hole was found and fixed: **GET /markets/:id/positions** now aligns with GET /positions and GET /markets/:id for settled outcomes (use settlement price for value, exclude from unrealized, show “Settled” instead of bid/ask).
- All other checked call sites (positions list, market detail, leaderboard, settlement formula) are consistent.
