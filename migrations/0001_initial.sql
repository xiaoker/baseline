CREATE TABLE IF NOT EXISTS market_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  close REAL,
  change_pct REAL,
  turnover REAL,
  volume REAL,
  source TEXT NOT NULL,
  raw_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date, symbol, market)
);

CREATE TABLE IF NOT EXISTS market_breadth (
  trade_date TEXT PRIMARY KEY,
  advancers INTEGER NOT NULL DEFAULT 0,
  decliners INTEGER NOT NULL DEFAULT 0,
  limit_up INTEGER NOT NULL DEFAULT 0,
  limit_down INTEGER NOT NULL DEFAULT 0,
  turnover_cny_bn REAL NOT NULL DEFAULT 0,
  volatility_score REAL NOT NULL DEFAULT 50,
  dispersion_score REAL NOT NULL DEFAULT 50,
  sentiment_score REAL NOT NULL DEFAULT 50,
  premium_discount_score REAL NOT NULL DEFAULT 50,
  heat_score REAL NOT NULL DEFAULT 50,
  raw_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS macro_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  indicator TEXT NOT NULL,
  value REAL,
  unit TEXT,
  direction TEXT NOT NULL DEFAULT 'neutral',
  source TEXT NOT NULL,
  evidence TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date, indicator)
);

CREATE TABLE IF NOT EXISTS anchor_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  anchor_type TEXT NOT NULL,
  close REAL,
  change_pct REAL,
  trend_score REAL NOT NULL DEFAULT 50,
  evidence TEXT,
  source TEXT NOT NULL,
  raw_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date, symbol)
);

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  medium_baseline_role TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS theme_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (theme_id, symbol)
);

CREATE TABLE IF NOT EXISTS narrative_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  impact_score REAL NOT NULL DEFAULT 50,
  evidence TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factor_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  factor_id TEXT NOT NULL,
  score REAL NOT NULL,
  direction TEXT NOT NULL,
  outlook TEXT NOT NULL DEFAULT 'neutral',
  outlook_summary TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date, factor_id)
);

CREATE TABLE IF NOT EXISTS baseline_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  horizon TEXT NOT NULL,
  narrative TEXT NOT NULL,
  direction TEXT NOT NULL,
  stance TEXT NOT NULL,
  confidence REAL NOT NULL,
  anchor_assets_json TEXT NOT NULL,
  core_sectors_json TEXT NOT NULL,
  invalidation_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  connection_score REAL,
  emotion_temperature REAL,
  volatility_mode TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date, horizon)
);

CREATE TABLE IF NOT EXISTS interval_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  interval_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  confidence REAL NOT NULL,
  premium_discount_score REAL NOT NULL,
  entropy_score REAL NOT NULL,
  sentiment_score REAL NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date)
);

CREATE TABLE IF NOT EXISTS quadrant_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  theme TEXT NOT NULL,
  institution_consensus REAL NOT NULL DEFAULT 50,
  fundamental_evidence REAL NOT NULL DEFAULT 50,
  hot_money REAL NOT NULL DEFAULT 50,
  narrative_strength REAL NOT NULL DEFAULT 50,
  trend_score REAL NOT NULL DEFAULT 50,
  entropy_score REAL NOT NULL DEFAULT 50,
  liquidity_score REAL NOT NULL DEFAULT 50,
  evidence_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date, symbol)
);

CREATE TABLE IF NOT EXISTS portfolio_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  risk_light TEXT NOT NULL,
  posture TEXT NOT NULL,
  core_book_json TEXT NOT NULL,
  trading_book_json TEXT NOT NULL,
  watch_list_json TEXT NOT NULL,
  reduce_list_json TEXT NOT NULL,
  action_notes_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trade_date)
);

CREATE TABLE IF NOT EXISTS decision_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  summary TEXT,
  factor_review TEXT,
  baseline_review TEXT,
  interval_review TEXT,
  quadrant_review TEXT,
  pnl_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manual_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  kind TEXT NOT NULL,
  category TEXT NOT NULL,
  purpose TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  schedule TEXT NOT NULL,
  target_tables_json TEXT NOT NULL,
  freshness_hours INTEGER NOT NULL DEFAULT 24,
  config_json TEXT NOT NULL,
  owner TEXT NOT NULL,
  notes TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_collection_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  rows_written INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  log_url TEXT,
  raw_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices (trade_date);
CREATE INDEX IF NOT EXISTS idx_anchor_assets_date ON anchor_assets (trade_date);
CREATE INDEX IF NOT EXISTS idx_quadrant_items_date ON quadrant_items (trade_date);
CREATE INDEX IF NOT EXISTS idx_narrative_events_date ON narrative_events (trade_date);
CREATE INDEX IF NOT EXISTS idx_collection_runs_source ON data_collection_runs (source_id, started_at);
