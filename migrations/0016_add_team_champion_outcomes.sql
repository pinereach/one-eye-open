-- Add 6 team combinations as outcomes for One Eye Open Team Champion market
-- First, remove the old Yes/No outcomes
DELETE FROM outcomes WHERE market_id = 'market-team-champion';

-- Add 6 team combinations (pairs of participants)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-team-champion-loop-boose', 'Loop & Boose', 'LOOP-BOOSE', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-krass-tk', 'Krass & TK', 'KRASS-TK', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-cth-avayou', 'CTH & Avayou', 'CTH-AVAYOU', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-alex-huffman', 'Alex & Huffman', 'ALEX-HUFF', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-jon-tim', 'Jon & Tim', 'JON-TIM', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-doc-will', 'Doc & Will', 'DOC-WILL', 'market-team-champion', '0', NULL, unixepoch());
