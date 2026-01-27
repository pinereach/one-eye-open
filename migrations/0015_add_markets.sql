-- Add markets for the betting application

-- Market 1: One Eye Open Team Champion
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date) VALUES
  ('market-team-champion', 'One Eye Open Team Champion', 'TEAM-CHAMP', 1, 1, unixepoch());

-- Outcomes for Team Champion (Yes/No for each team or participant)
-- Note: You may want to add specific team outcomes based on your participants
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-team-champion-yes', 'Team Wins', 'YES', 'market-team-champion', '0', NULL, unixepoch()),
  ('outcome-team-champion-no', 'Team Does Not Win', 'NO', 'market-team-champion', '0', NULL, unixepoch());

-- Market 2: Round O/U's (Over/Under for round scores)
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date) VALUES
  ('market-round-ou', 'Round Over/Under', 'ROUND-OU', 1, 1, unixepoch());

-- Outcomes for Round O/U (you can customize the strike value)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-round-ou-over', 'Over', 'OVER', 'market-round-ou', '80', NULL, unixepoch()),
  ('outcome-round-ou-under', 'Under', 'UNDER', 'market-round-ou', '80', NULL, unixepoch());

-- Market 3: Birdies
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date) VALUES
  ('market-birdies', 'Birdies', 'BIRDIES', 1, 1, unixepoch());

-- Outcomes for Birdies (Over/Under)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-birdies-over', 'Over', 'OVER', 'market-birdies', '3', NULL, unixepoch()),
  ('outcome-birdies-under', 'Under', 'UNDER', 'market-birdies', '3', NULL, unixepoch());

-- Market 4: Hole In One
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date) VALUES
  ('market-hole-in-one', 'Hole In One', 'HIO', 1, 1, unixepoch());

-- Outcomes for Hole In One (Yes/No)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-hole-in-one-yes', 'Yes', 'YES', 'market-hole-in-one', '0', NULL, unixepoch()),
  ('outcome-hole-in-one-no', 'No', 'NO', 'market-hole-in-one', '0', NULL, unixepoch());
