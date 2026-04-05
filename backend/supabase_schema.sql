-- AutoUI Optimizer — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  url         TEXT,
  score       INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics
CREATE TABLE IF NOT EXISTS metrics (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id      TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  lcp             FLOAT,
  cls             FLOAT,
  inp             INTEGER,
  ttfb            FLOAT,
  load_time       FLOAT,
  dom_interactive FLOAT
);

-- Components
CREATE TABLE IF NOT EXISTS components (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id  TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  name        TEXT,
  render_time FLOAT,
  re_renders  INTEGER
);

-- Suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id   TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  issue        TEXT,
  fix          TEXT,
  category     TEXT,
  impact_score FLOAT,
  code_snippet TEXT
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_metrics_session    ON metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_components_session ON components(session_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_session ON suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created   ON sessions(created_at DESC);

-- Row Level Security (optional — enable if you add auth later)
-- ALTER TABLE sessions   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE metrics    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE components ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
