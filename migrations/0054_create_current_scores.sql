-- Current scores per participant: score to par (gross/net) and birdie count
-- One row per participant; updated as play progresses

CREATE TABLE IF NOT EXISTS current_scores (
  participant_id TEXT NOT NULL PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  score_gross INTEGER,
  score_net INTEGER,
  number_birdies INTEGER
);

CREATE INDEX IF NOT EXISTS idx_current_scores_participant ON current_scores(participant_id);
