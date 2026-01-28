-- Remove Over/Under outcomes from round over/under and total birdies markets so they are blank.
-- These markets keep their market rows but have no outcomes until added via suggestions.

DELETE FROM outcomes
WHERE market_id IN (
  SELECT market_id FROM markets WHERE market_type IN ('round_ou', 'total_birdies')
);
