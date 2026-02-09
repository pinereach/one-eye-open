-- Add maker's realized P&L (cents) per trade so trade log and closed-profit-from-risk-off can show both sides.
-- risk_off_price_diff = taker's realized P&L; risk_off_price_diff_maker = maker's realized P&L.

ALTER TABLE trades ADD COLUMN risk_off_price_diff_maker INTEGER NOT NULL DEFAULT 0;
