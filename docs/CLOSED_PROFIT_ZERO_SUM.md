# Why Closed Profit Should Sum to Zero and Where It Breaks

## Invariant

In a zero-sum, no-fee market, **sum(closed_profit) across all positions (including system/user_id NULL) should equal 0**. Every dollar of realized P&L for one user is matched by the opposite for another (or the system).

## How It’s Done in Normal Matching

When an order matches via the book, **executeMatching** in `shared/lib/matching.ts`:

- If both taker and maker have a `user_id`: it calls **updatePositionsForFill** once for the fill. That function updates both positions in a **coordinated** way and enforces zero-sum:
  - `makerClosed = makerCur.closed - takerClosedDelta`
  - So taker delta + maker delta = 0 by construction (no rounding leak).

- If maker has no `user_id`: it calls **updatePosition** for the taker only, then **addSystemClosedProfitOffset(db, outcomeId, -closedProfitDelta)** so the system position (user_id NULL) absorbs the opposite of the taker’s delta. Total closed profit still sums to zero.

So all **order-book** trades keep the invariant.

## Where the Imbalance Comes From

### 1. Manual trades (`functions/api/admin/trades/manual.ts`)

- It updates positions with **two separate** calls:
  - `updatePosition(db, outcomeId, takerUserId, side, price, contractSize)`
  - `updatePosition(db, outcomeId, makerUserId, makerSide, price, contractSize)` when maker is set

- Each call computes closed profit from that user’s position only. The two deltas are **not** forced to sum to zero, so:
  - Rounding of `price_basis` (e.g. weighted average, clamp to $1–$99) can make taker_delta + maker_delta ≠ 0.
  - So every manual trade with a maker can add a small (or occasionally larger) error to the global sum.

- When **maker is null**, only the taker position is updated. There is **no** call to **addSystemClosedProfitOffset**. So the entire taker closed-profit delta is added to the system total with no offset → a direct source of imbalance.

### 2. Round O/U auction (`functions/api/admin/auction/round-ou.ts`)

- It also uses two separate **updatePosition** calls (one for taker, one for maker) per trade. Same as manual: the two deltas are not tied together, so rounding (and any formula mismatch) can make the sum non-zero. Every auction trade can contribute to the imbalance.

### 3. Historical behavior

- Any older code that:
  - Did not use **updatePositionsForFill** for two-sided updates, or
  - Did not use **addSystemClosedProfitOffset** when maker had no user  
  will have left existing positions with a non-zero total closed profit.

## Fixing It Going Forward (No New Imbalance)

1. **Manual trade**
   - When **maker is set**: use **updatePositionsForFill(db, outcomeId, takerUserId, makerUserId, takerSide, priceCents, contractSize)** instead of two **updatePosition** calls.
   - When **maker is null**: keep a single **updatePosition** for the taker, then call **addSystemClosedProfitOffset(db, outcomeId, -closedProfitDelta)** so the system absorbs the taker’s closed profit (same as executeMatching).

2. **Auction (round-ou)**
   - For each auction trade that has both taker and maker, use **updatePositionsForFill** once instead of two **updatePosition** calls.

After these changes, **new** manual and auction trades will preserve the zero-sum invariant the same way order-book trades do.

## Fixing Existing Imbalance (DB State)

- **Option A – One-time rebalance (“Rebalance closed profit” button)**  
  Adjust the system position (user_id NULL, outcome `__closed_profit_offset`) so that sum(closed_profit) = 0. Fast and correct for display; it does not change how individual user positions were calculated.

- **Option B – Replay positions (recommended for correcting data)**  
  **POST /api/admin/replay-positions** (admin only). For each outcome that has trades:
  1. Reset `net_position`, `price_basis`, and `closed_profit` to 0 for all positions on that outcome (leaves `settled_profit` and `is_settled` unchanged).
  2. Replay every trade in chronological order (ORDER BY id) using the correct logic: **updatePositionsForFill** when both taker and maker are set and different, otherwise **updatePosition** for the taker plus **addSystemClosedProfitOffset** when maker is null.
  Result: every position’s open P&amp;L and closed profit are recomputed from trade history with zero-sum guarantees. After running once, closed profit should sum to 0 and individual positions match the correct economics. There is an admin UI button “Replay positions” that calls this endpoint.

- **Option C – Hybrid**  
  Fix the code paths above so no **new** imbalance is added, then either run **Replay positions** once (Option B) for a full correction, or run **Rebalance closed profit** once (Option A) to only fix the total. Going forward, closed profit will stay zero-sum without further action.

Recommendation: run **Replay positions** once after deploying the manual/auction fix so all positions and closed profit are correct. If you prefer not to replay, use **Rebalance closed profit** once to fix the total only.
