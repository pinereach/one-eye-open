# Closed Profit vs Risk-Off

## Two concepts

1. **Position `closed_profit`** (in `positions` table)  
   Updated by matching logic whenever a fill **reduces** the size of a position (e.g. buy to close a short, or sell to close a long). It is each user’s **realized P&L** from that reduction. Sum(closed_profit) across users does **not** have to equal zero (see `CLOSED_PROFIT_ZERO_SUM.md`). So **any** fill that closes part of a position adds to that user’s `closed_profit`; it does not depend on whether the trade was “risk off” or not.

2. **Trade risk-off columns** (in `trades` table)  
   Record of **how much of this specific trade was “risk off”** (i.e. closed an existing position):
   - `risk_off_contracts_taker` / `risk_off_contracts_maker`: number of contracts in this fill that closed (reduced) the taker’s or maker’s position.
   - `risk_off_price_diff_taker` / `risk_off_price_diff_maker`: each side’s realized P&L in cents from those closing contracts.

   These four columns are set on **order-book** fills in `executeMatching`: we read current positions before the fill, compute closing contracts and P&L per side via `computeRiskOffForFill`, and pass the four values into `createTrade`. **Manual** and **auction** trades call `createTrade` with defaults and get `0, 0, 0, 0` for the risk-off fields unless we add the same logic there. **Replay** can backfill the four risk-off columns on existing trades when run after the schema has the new columns.

## Why you can see non-zero closed profit with “no risk off” trades

If you only ever **opened** a short (e.g. 5 sells for 11 contracts short) and never intentionally “closed”:

- You’d expect **$0 closed profit** and **$0 risk_off** on those trades.
- The position logic still computes **closed profit** whenever a fill **reduces** position size. So:
  - If replay (or live) applies fills in an order where at some point you were long and then a sell reduced that long, that fill is treated as a “close” and adds to `closed_profit` (e.g. -$1.27).
  - That can happen if **trade order** or **taker_side / taker_user_id / maker_user_id** don’t match the true sequence of your activity (e.g. one trade recorded as “you bought” when you thought of it as “you sold”), or if rounding/position logic produces a small close in an edge case.

So:

- **Position `closed_profit`** = realized P&L from any fill that reduced the position (mechanical).
- **Trade `risk_off_*`** = “of this trade, how much was closing?” (for reporting / UI).  
  If `risk_off_contracts_taker`/`_maker` and `risk_off_price_diff_taker`/`_maker` are 0 on all your trades for that outcome but position `closed_profit` is non-zero, the non-zero closed profit is coming from the position math (a fill was applied as a close). Checking the exact trade list and order for that outcome (and who is taker/maker and taker_side) will show which fill was interpreted as a close.

## Risk-off fields on trades

- **Order-book fills:** The four columns `risk_off_contracts_taker`, `risk_off_contracts_maker`, `risk_off_price_diff_taker`, `risk_off_price_diff_maker` are set in `createTrade` from current positions and fill size (see `computeRiskOffForFill` in `shared/lib/matching.ts`). New order-book trades will have these populated when the fill closes part of a position.
- **Manual / auction:** Call `createTrade` with default risk-off args, so all four values are 0. To have risk-off there too, we’d need to query current positions before creating the trade and pass the same kind of values into `createTrade`.
- **Replay:** Replay can backfill the four `risk_off_*` columns on existing trades when run after the schema has the new columns. Otherwise it recomputes positions from existing trades.

## If you want $0 closed profit when you “never risked off”

That would require a product rule like: “only add to position `closed_profit` when this trade is marked risk-off (e.g. `risk_off_contracts_taker + risk_off_contracts_maker > 0`).” Right now we don’t do that: we add to `closed_profit` whenever the position math says we closed size. So the -$1.27 is consistent with the current rule; to get $0 you’d either need to correct the trade/order data so no fill is applied as a close, or change the rule so closed profit only updates when we explicitly mark the trade as risk-off.
