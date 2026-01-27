-- Update all markets to match the new market structure
-- This migration removes old markets and creates the new ones with appropriate outcomes

-- Delete old markets and their outcomes
DELETE FROM outcomes;
DELETE FROM markets;

-- Market 1: One Eye Open Team Champion
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-team-champion', 'One Eye Open Team Champion', 'TEAM-CHAMP', 1, 1, unixepoch(), 'team_champion');

-- Outcomes for Team Champion (6 team combinations)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-team-champion-loop-boose', 'Loop & Boose', 'LOOP-BOOSE', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-krass-tk', 'Krass & TK', 'KRASS-TK', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-cth-avayou', 'CTH & Avayou', 'CTH-AVAYOU', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-alex-huffman', 'Alex & Huffman', 'ALEX-HUFF', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-jon-tim', 'Jon & Tim', 'JON-TIM', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-doc-will', 'Doc & Will', 'DOC-WILL', 'market-team-champion', '0', NULL, unixepoch());

-- Market 2: One Eye Open Individual Net Champion
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-individual-net-champion', 'One Eye Open Individual Net Champion', 'NET-CHAMP', 1, 1, unixepoch(), 'individual_champion');

-- Outcomes for Individual Net Champion (one per participant)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-net-champion-loop', 'Loop', 'LOOP', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-boose', 'Boose', 'BOOSE', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-krass', 'Krass', 'KRASS', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-tk', 'TK', 'TK', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-cth', 'CTH', 'CTH', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-avayou', 'Avayou', 'AVAYOU', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-alex', 'Alex', 'ALEX', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-huffman', 'Huffman', 'HUFFMAN', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-jon', 'Jon', 'JON', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-tim', 'Tim', 'TIM', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-doc', 'Doc', 'DOC', 'market-individual-net-champion', '0', NULL, unixepoch()),
  ('outcome-net-champion-will', 'Will', 'WILL', 'market-individual-net-champion', '0', NULL, unixepoch());

-- Market 3: One Eye Open Individual Gross Champion
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-individual-gross-champion', 'One Eye Open Individual Gross Champion', 'GROSS-CHAMP', 1, 1, unixepoch(), 'individual_champion');

-- Outcomes for Individual Gross Champion (one per participant)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-gross-champion-loop', 'Loop', 'LOOP', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-boose', 'Boose', 'BOOSE', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-krass', 'Krass', 'KRASS', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-tk', 'TK', 'TK', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-cth', 'CTH', 'CTH', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-avayou', 'Avayou', 'AVAYOU', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-alex', 'Alex', 'ALEX', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-huffman', 'Huffman', 'HUFFMAN', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-jon', 'Jon', 'JON', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-tim', 'Tim', 'TIM', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-doc', 'Doc', 'DOC', 'market-individual-gross-champion', '0', NULL, unixepoch()),
  ('outcome-gross-champion-will', 'Will', 'WILL', 'market-individual-gross-champion', '0', NULL, unixepoch());

-- Markets 4-8: Round 1-5 Over/Under
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-round-1-ou', 'Round 1 Over/Under', 'R1-OU', 1, 1, unixepoch(), 'round_ou'),
  ('market-round-2-ou', 'Round 2 Over/Under', 'R2-OU', 1, 1, unixepoch(), 'round_ou'),
  ('market-round-3-ou', 'Round 3 Over/Under', 'R3-OU', 1, 1, unixepoch(), 'round_ou'),
  ('market-round-4-ou', 'Round 4 Over/Under', 'R4-OU', 1, 1, unixepoch(), 'round_ou'),
  ('market-round-5-ou', 'Round 5 Over/Under', 'R5-OU', 1, 1, unixepoch(), 'round_ou');

-- Outcomes for Round 1-5 Over/Under (Over/Under for each round, strike: 80)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-round-1-ou-over', 'Over', 'OVER', 'market-round-1-ou', '80', NULL, unixepoch()),
  ('outcome-round-1-ou-under', 'Under', 'UNDER', 'market-round-1-ou', '80', NULL, unixepoch()),
  ('outcome-round-2-ou-over', 'Over', 'OVER', 'market-round-2-ou', '80', NULL, unixepoch()),
  ('outcome-round-2-ou-under', 'Under', 'UNDER', 'market-round-2-ou', '80', NULL, unixepoch()),
  ('outcome-round-3-ou-over', 'Over', 'OVER', 'market-round-3-ou', '80', NULL, unixepoch()),
  ('outcome-round-3-ou-under', 'Under', 'UNDER', 'market-round-3-ou', '80', NULL, unixepoch()),
  ('outcome-round-4-ou-over', 'Over', 'OVER', 'market-round-4-ou', '80', NULL, unixepoch()),
  ('outcome-round-4-ou-under', 'Under', 'UNDER', 'market-round-4-ou', '80', NULL, unixepoch()),
  ('outcome-round-5-ou-over', 'Over', 'OVER', 'market-round-5-ou', '80', NULL, unixepoch()),
  ('outcome-round-5-ou-under', 'Under', 'UNDER', 'market-round-5-ou', '80', NULL, unixepoch());

-- Market 9: Total Birdies
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-total-birdies', 'Total Birdies', 'BIRDIES', 1, 1, unixepoch(), 'total_birdies');

-- Outcomes for Total Birdies (Over/Under, strike: 3)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-total-birdies-over', 'Over', 'OVER', 'market-total-birdies', '3', NULL, unixepoch()),
  ('outcome-total-birdies-under', 'Under', 'UNDER', 'market-total-birdies', '3', NULL, unixepoch());

-- Market 10: H2H Matchups
-- Note: This market will be populated dynamically via the market suggestions page
-- For now, we create the market structure but outcomes will be added by users
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-h2h-matchups', 'H2H Matchups', 'H2H', 1, 1, unixepoch(), 'h2h_matchups');

-- Market 11: Hole in One
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-hole-in-one', 'Hole in One', 'HIO', 1, 1, unixepoch(), 'hole_in_one');

-- Outcomes for Hole in One (Yes/No)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-hole-in-one-yes', 'Yes', 'YES', 'market-hole-in-one', '0', NULL, unixepoch()),
  ('outcome-hole-in-one-no', 'No', 'NO', 'market-hole-in-one', '0', NULL, unixepoch());
