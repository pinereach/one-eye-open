-- Delete incorrectly created Round 1 Over/Under markets
-- These were created as separate markets but should have been outcomes under a single market

-- Delete outcomes for these markets first (due to foreign key constraints)
DELETE FROM outcomes 
WHERE market_id IN (
  SELECT market_id FROM markets 
  WHERE short_name IN ('Round 1 Over/Under - Alex', 'Round 1 Over/Under - Avayou')
);

-- Delete the markets
DELETE FROM markets 
WHERE short_name IN ('Round 1 Over/Under - Alex', 'Round 1 Over/Under - Avayou');
