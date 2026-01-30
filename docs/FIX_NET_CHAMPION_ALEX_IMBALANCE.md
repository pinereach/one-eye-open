# Fix outcome-net-champion-alex +$10 imbalance

## What the debug shows

- **System total:** +$10.00 (should be $0).
- **P&L by outcome:** Only `outcome-net-champion-alex` is non-zero: **+$10.00**.
- **Position contributions on that outcome:**
  - user 1 · outcome-net-champion-alex: **+$5.00**
  - user 2 · outcome-net-champion-alex: **+$5.00**

So two users each have +$5 P&L on that outcome, and **no position has the offsetting -$10**. In a zero-sum game, the counterparty to those trades should have -$10 total on that outcome. That means either:

1. The counterparty’s position was never created/updated when the trade(s) happened, or  
2. Their position exists but P&L is wrong (e.g. 0 instead of -$10).

## Find positions on that outcome

Run this against your D1 database (local or remote) to see every position on `outcome-net-champion-alex`:

```sql
SELECT p.id, p.user_id, p.outcome, p.net_position, p.price_basis, p.closed_profit, p.settled_profit
FROM positions p
WHERE p.outcome = 'outcome-net-champion-alex'
ORDER BY p.user_id;
```

Check:

- Do you see exactly two rows (user 1 and user 2) or more?
- If only two rows, the **counterparty** (who lost $10) has no row — so the trade(s) that gave user 1 and user 2 their +$5 each never updated the other side. You’d need to either:
  - **Backfill the missing position:** insert a row for the correct `user_id` with `net_position`, `price_basis`, and/or `closed_profit` set so that P&L for that outcome sums to $0 (e.g. one position with -$10 closed_profit or the right net_position/price_basis to yield -$10 unrealized), or  
  - Track down which trade(s) created this (e.g. trades where outcome = 'outcome-net-champion-alex' and taker_user_id/maker_user_id are 1 and 2) and fix the missing `updatePosition` or data.

## Find trades on that outcome

To see which trades touched this outcome:

```sql
SELECT t.id, t.create_time, t.price, t.contracts, t.taker_user_id, t.maker_user_id, t.taker_side
FROM trades t
WHERE t.outcome = 'outcome-net-champion-alex'
ORDER BY t.create_time DESC;
```

From that you can see who was taker vs maker and infer who should have the -$10 (the side that “lost” on those trades). That user should have a position on `outcome-net-champion-alex` with total P&L = -$10; if they don’t, that’s the bug (missing or wrong position update).

## After fixing

Re-run the leaderboard debug. **System total** and **P&L by outcome** for `outcome-net-champion-alex` should be $0.00.
