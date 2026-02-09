-- Dedupe positions: keep one row per (user_id, outcome) (keep row with min id), then enforce uniqueness.
-- Prevents replay or API from creating multiple rows that could be shown as separate cards or wrong totals.

DELETE FROM positions
WHERE id IN (
  SELECT p1.id FROM positions p1
  WHERE EXISTS (
    SELECT 1 FROM positions p2
    WHERE (p2.user_id = p1.user_id OR (p2.user_id IS NULL AND p1.user_id IS NULL))
      AND p2.outcome = p1.outcome
      AND p2.id < p1.id
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_user_outcome_unique ON positions(user_id, outcome);
