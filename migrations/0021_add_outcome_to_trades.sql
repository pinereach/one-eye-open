-- Add outcome_id column to trades table to link trades with outcomes
ALTER TABLE trades ADD COLUMN outcome TEXT;

-- Create index for faster joins
CREATE INDEX IF NOT EXISTS idx_trades_outcome ON trades(outcome);
