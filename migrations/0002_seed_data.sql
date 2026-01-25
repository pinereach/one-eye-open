-- Seed 12 users (using new simplified schema)
-- Note: After running migration 0010, users table will have new schema
-- These seed users use: username, password (plain text - no security for unserious projects!)
-- All users have password: "password123"
INSERT INTO users (username, password) VALUES
  ('alice', 'password123'),
  ('bob', 'password123'),
  ('charlie', 'password123'),
  ('diana', 'password123'),
  ('edward', 'password123'),
  ('fiona', 'password123'),
  ('george', 'password123'),
  ('helen', 'password123'),
  ('ivan', 'password123'),
  ('jane', 'password123'),
  ('kevin', 'password123'),
  ('linda', 'password123');

-- Seed participants (the people playing)
INSERT INTO participants (id, name) VALUES
  ('participant-1', 'Loop'),
  ('participant-2', 'Boose'),
  ('participant-3', 'Krass'),
  ('participant-4', 'TK'),
  ('participant-5', 'CTH'),
  ('participant-6', 'Avayou'),
  ('participant-7', 'Alex'),
  ('participant-8', 'Huffman'),
  ('participant-9', 'Jon'),
  ('participant-10', 'Tim'),
  ('participant-11', 'Doc'),
  ('participant-12', 'Will');

-- Create sample markets (using new schema)
-- Note: After running migration 0009, markets table will have new schema
-- These seed markets use: market_id (text), short_name, symbol, max_winners, min_winners, created_date
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date) VALUES
  ('market-1', 'Will Team A Win?', 'TEAM-A', 1, 1, 1735603200),
  ('market-2', 'Player Score Over/Under 80', 'SCORE-80', 1, 1, 1735603200),
  ('market-3', 'Birdies Over/Under 3', 'BIRDIES-3', 1, 1, 1735603200),
  ('market-4', 'Hole in One', 'HIO', 1, 1, 1735603200),
  ('market-5', 'Player Score Over/Under 75', 'SCORE-75', 1, 1, 1735603200);

-- Create outcomes for each market (using new schema)
-- Note: After running migration 0008, outcomes table will have new schema
-- These seed outcomes use: outcome_id (text), name, ticker, market_id, strike, settled_price, created_date
-- Market 1: Binary outcome (Yes/No)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-1-yes', 'Yes', 'YES', 'market-1', '0', NULL, 1735603200),
  ('outcome-1-no', 'No', 'NO', 'market-1', '0', NULL, 1735603200);

-- Market 2: Over/Under
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-2-over', 'Over', 'OVER', 'market-2', '80', NULL, 1735603200),
  ('outcome-2-under', 'Under', 'UNDER', 'market-2', '80', NULL, 1735603200);

-- Market 3: Over/Under
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-3-over', 'Over', 'OVER', 'market-3', '3', NULL, 1735603200),
  ('outcome-3-under', 'Under', 'UNDER', 'market-3', '3', NULL, 1735603200);

-- Market 4: Binary outcome
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-4-yes', 'Yes', 'YES', 'market-4', '0', NULL, 1735603200),
  ('outcome-4-no', 'No', 'NO', 'market-4', '0', NULL, 1735603200);

-- Market 5: Over/Under
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-5-over', 'Over', 'OVER', 'market-5', '75', NULL, 1735603200),
  ('outcome-5-under', 'Under', 'UNDER', 'market-5', '75', NULL, 1735603200);

-- Create sample orders (using new schema)
-- Note: After running migrations 0005 and 0010, orders and users tables will have new schemas
-- user_id in orders is INTEGER, so we reference users by their auto-increment ID
-- For seed data, we'll leave user_id as NULL since actual user IDs are auto-increment integers
-- In practice, orders will be created through the API with actual user IDs
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (1735603800, NULL, 'token-1', -1, 'outcome-1-yes', 5500, 'partial', 'GTC', 0, 5),
  (1735603500, NULL, 'token-2', -1, 'outcome-1-yes', 6000, 'filled', 'GTC', 1, 0),
  (1735604000, NULL, 'token-3', -1, 'outcome-2-over', 4500, 'open', 'GTC', 0, 20),
  (1735604100, NULL, 'token-4', -1, 'outcome-2-over', 5000, 'partial', 'GTC', 1, 10),
  (1735604200, NULL, 'token-5', -1, 'outcome-3-over', 7000, 'open', 'GTC', 0, 8);

-- Create sample trades (using new schema)
-- Note: After running migration 0006, trades table will have new schema
-- These seed trades use the new format: token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff
INSERT INTO trades (token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff) VALUES
  ('token-1', 6000, 5, 1735603600, 0, 0),
  ('token-2', 4500, 5, 1735604200, 0, 0);

-- Create initial positions (using new schema)
-- Note: After running migrations 0007 and 0010, positions and users tables will have new schemas
-- user_id in positions is INTEGER, so we reference users by their auto-increment ID
-- For seed data, we'll leave user_id as NULL since actual user IDs are auto-increment integers
-- In practice, positions will be created through the API with actual user IDs
INSERT INTO positions (user_id, outcome, create_time, closed_profit, settled_profit, net_position, price_basis, is_settled) VALUES
  (NULL, 'outcome-1-yes', 1735603600, 0, 0, 5, 6000, 0),
  (NULL, 'outcome-1-yes', 1735603600, 0, 0, -5, 6000, 0),
  (NULL, 'outcome-2-over', 1735604200, 0, 0, 5, 4500, 0),
  (NULL, 'outcome-2-over', 1735604200, 0, 0, -5, 4500, 0);
