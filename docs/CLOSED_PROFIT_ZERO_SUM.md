# Closed Profit: No Zero-Sum Requirement

## Current design

**Closed profit is per-user realized P&L** from fills that reduce position size (e.g. buy to close a short, sell to close a long). We **do not** require sum(closed_profit) across all positions to equal zero.

Example: User 1 sells 2 @ $40 to User 2; User 2 sells 2 @ $42 to User 3. User 2’s closed profit = $4; User 1 and User 3 = $0. Total closed profit = $4, which is correct.

## What is zero-sum

- **Portfolio value (unrealized P&L)** — sum across all positions (including system, user_id NULL) should be $0. The matching layer keeps this by putting rounding residuals and the opposite side’s position on the system row when needed.
- **Settled profit** — typically zero-sum (every dollar paid on settlement is received by someone).

## How matching behaves

- **updatePositionsForFill** (order-book, two users): Updates taker and maker positions with each side’s actual closed profit. Only applies the **cost-basis rounding** residual to the system row via `addSystemClosedProfitOffset(db, outcomeId, -makerClosedAdjust)`. It does **not** apply the closed-profit imbalance to the system, so sum(closed_profit) is no longer forced to zero.
- **executeMatching when maker has no user**: Calls `addSystemClosedProfitOffset(db, outcomeId, 0, netPositionDelta, fillPriceCents)` so the system gets the opposite **net position** (and unrealized P&L stays zero-sum) but does **not** get an offset to closed profit. Taker’s closed profit stands as-is.
- **closed-profit-from-risk-off** (admin): Recomputes each user’s closed_profit from trade risk_off_price_diff_taker/maker, then sets system row closed_profit = 0 per outcome (does not set it to -userTotal).

## Rebalance and replay

- **Rebalance closed profit** (one-time): Historically used to force sum(closed_profit) = 0. With the new design it is optional/legacy; the product no longer requires that invariant.
- **Replay positions**: Still correct for recomputing positions and closed profit from trade history; after replay, closed profit total may be non-zero.

## Leaderboard / debug UI

The admin leaderboard shows “System total closed” and “Closed profit total” without treating non-zero as an error. Portfolio value (system total) is still expected to be $0.
