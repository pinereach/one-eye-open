-- Add columns to trades so we can show "you bought" / "you sold" for the current user
-- taker_side: 0 = buy (bid), 1 = sell (ask) from the taker's perspective
-- When viewing: if current_user_id = taker_user_id then my_side = taker_side; if current_user_id = maker_user_id then my_side = 1 - taker_side

ALTER TABLE trades ADD COLUMN taker_user_id INTEGER;
ALTER TABLE trades ADD COLUMN maker_user_id INTEGER;
ALTER TABLE trades ADD COLUMN taker_side INTEGER;

CREATE INDEX IF NOT EXISTS idx_trades_taker_user ON trades(taker_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_maker_user ON trades(maker_user_id);
