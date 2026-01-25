-- Seed 12 users
-- Note: These users have placeholder password hashes. In production, users should register with real passwords.
-- For demo purposes, you can register new users through the UI.
-- Password hash for "password123" (bcrypt, 10 rounds): $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT INTO users (id, email, password_hash, display_name, role) VALUES
  ('user-1', 'alice@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Alice Johnson', 'user'),
  ('user-2', 'bob@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Bob Smith', 'user'),
  ('user-3', 'charlie@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Charlie Brown', 'user'),
  ('user-4', 'diana@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Diana Prince', 'user'),
  ('user-5', 'edward@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Edward Norton', 'user'),
  ('user-6', 'fiona@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Fiona Apple', 'user'),
  ('user-7', 'george@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'George Washington', 'user'),
  ('user-8', 'helen@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Helen Keller', 'user'),
  ('user-9', 'ivan@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ivan Petrov', 'user'),
  ('user-10', 'jane@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Jane Doe', 'user'),
  ('user-11', 'kevin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Kevin Hart', 'observer'),
  ('user-12', 'linda@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Linda Hamilton', 'admin');

-- Create demo trip
INSERT INTO trips (id, name, start_date, created_at) VALUES
  ('trip-1', 'Spring Golf Championship 2025', 1735689600, 1735603200);

-- Add all users as trip members (mix of players, observers, and admin)
INSERT INTO trip_members (id, trip_id, user_id, role) VALUES
  ('tm-1', 'trip-1', 'user-1', 'player'),
  ('tm-2', 'trip-1', 'user-2', 'player'),
  ('tm-3', 'trip-1', 'user-3', 'player'),
  ('tm-4', 'trip-1', 'user-4', 'player'),
  ('tm-5', 'trip-1', 'user-5', 'player'),
  ('tm-6', 'trip-1', 'user-6', 'player'),
  ('tm-7', 'trip-1', 'user-7', 'player'),
  ('tm-8', 'trip-1', 'user-8', 'player'),
  ('tm-9', 'trip-1', 'user-9', 'player'),
  ('tm-10', 'trip-1', 'user-10', 'player'),
  ('tm-11', 'trip-1', 'user-11', 'observer'),
  ('tm-12', 'trip-1', 'user-12', 'admin');

-- Create 5 rounds (round 1 is active)
INSERT INTO rounds (id, trip_id, round_no, name, date, is_active) VALUES
  ('round-1', 'trip-1', 1, 'Opening Round', 1735689600, 1),
  ('round-2', 'trip-1', 2, 'Championship Round', 1735776000, 0),
  ('round-3', 'trip-1', 3, 'Final Round', 1735862400, 0),
  ('round-4', 'trip-1', 4, 'Playoff Round', 1735948800, 0),
  ('round-5', 'trip-1', 5, 'Tiebreaker Round', 1736035200, 0);

-- Add some initial scores for round 1
INSERT INTO round_scores (id, round_id, user_id, cross_score, net_score, updated_at) VALUES
  ('score-1', 'round-1', 'user-1', 85, 78, 1735693200),
  ('score-2', 'round-1', 'user-2', 92, 85, 1735693200),
  ('score-3', 'round-1', 'user-3', 88, 81, 1735693200),
  ('score-4', 'round-1', 'user-4', 79, 72, 1735693200),
  ('score-5', 'round-1', 'user-5', 95, 88, 1735693200);

-- Create sample markets (all types)
INSERT INTO markets (id, trip_id, type, round_id, subject_user_id, title, description, status, created_at) VALUES
  ('market-1', 'trip-1', 'TEAM_OVERALL_WINNER', NULL, NULL, 'Overall Tournament Winner', 'Who will win the entire tournament?', 'open', 1735603200),
  ('market-2', 'trip-1', 'ROUND_OU_PERSON', 'round-1', 'user-1', 'Alice Round 1 Over/Under 80', 'Will Alice score over or under 80 in round 1?', 'open', 1735603200),
  ('market-3', 'trip-1', 'BIRDIES_OU_PLAYER_ROUND', 'round-1', 'user-2', 'Bob Birdies Round 1 Over/Under 3', 'Will Bob make over or under 3 birdies in round 1?', 'open', 1735603200),
  ('market-4', 'trip-1', 'HOLE_IN_ONE_TRIP', NULL, 'user-3', 'Charlie Hole in One', 'Will Charlie get a hole in one during the trip?', 'open', 1735603200),
  ('market-5', 'trip-1', 'ROUND_OU_PERSON', 'round-1', 'user-4', 'Diana Round 1 Over/Under 75', 'Will Diana score over or under 75 in round 1?', 'open', 1735603200);

-- Create sample orders
INSERT INTO orders (id, market_id, user_id, side, price_cents, qty_contracts, qty_remaining, status, created_at) VALUES
  ('order-1', 'market-1', 'user-1', 'bid', 5500, 10, 5, 'partial', 1735603800),
  ('order-2', 'market-1', 'user-2', 'ask', 6000, 5, 0, 'filled', 1735603500),
  ('order-3', 'market-2', 'user-3', 'bid', 4500, 20, 20, 'open', 1735604000),
  ('order-4', 'market-2', 'user-4', 'ask', 5000, 15, 10, 'partial', 1735604100),
  ('order-5', 'market-3', 'user-5', 'bid', 7000, 8, 8, 'open', 1735604200);

-- Create sample trades
INSERT INTO trades (id, market_id, taker_order_id, maker_order_id, price_cents, qty_contracts, created_at) VALUES
  ('trade-1', 'market-1', 'order-1', 'order-2', 6000, 5, 1735603600),
  ('trade-2', 'market-2', 'order-4', 'order-3', 4500, 5, 1735604200);

-- Create initial positions
INSERT INTO positions (id, market_id, user_id, qty_long, qty_short, avg_price_long_cents, avg_price_short_cents, updated_at) VALUES
  ('pos-1', 'market-1', 'user-1', 5, 0, 6000, NULL, 1735603600),
  ('pos-2', 'market-1', 'user-2', 0, 5, NULL, 6000, 1735603600),
  ('pos-3', 'market-2', 'user-3', 5, 0, 4500, NULL, 1735604200),
  ('pos-4', 'market-2', 'user-4', 0, 5, NULL, 4500, 1735604200);
