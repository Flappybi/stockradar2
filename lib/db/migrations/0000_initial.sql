CREATE TABLE IF NOT EXISTS companies (ticker text PRIMARY KEY, name text NOT NULL, sector text, updated_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS fundamental_snapshots (id text PRIMARY KEY, ticker text NOT NULL REFERENCES companies(ticker), fetched_at timestamptz NOT NULL, source text NOT NULL, canonical jsonb NOT NULL, raw_report jsonb NOT NULL, raw_daily jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS market_history (ticker text NOT NULL REFERENCES companies(ticker), date date NOT NULL, close double precision NOT NULL CHECK (close > 0), volume double precision CHECK (volume >= 0), fetched_at timestamptz NOT NULL, PRIMARY KEY(ticker, date));
CREATE TABLE IF NOT EXISTS signal_scores (id text PRIMARY KEY, ticker text NOT NULL REFERENCES companies(ticker), calculated_at timestamptz NOT NULL, version text NOT NULL, result jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS anomaly_scores (id text PRIMARY KEY, ticker text NOT NULL REFERENCES companies(ticker), calculated_at timestamptz NOT NULL, version text NOT NULL, result jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS dataset_snapshots (key text PRIMARY KEY, fetched_at timestamptz NOT NULL, dataset jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS response_cache (key text PRIMARY KEY, value jsonb NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS fundamental_snapshots_ticker_fetched ON fundamental_snapshots(ticker, fetched_at DESC);
CREATE INDEX IF NOT EXISTS signal_scores_ticker_calculated ON signal_scores(ticker, calculated_at DESC);
CREATE INDEX IF NOT EXISTS anomaly_scores_ticker_calculated ON anomaly_scores(ticker, calculated_at DESC);
CREATE INDEX IF NOT EXISTS response_cache_expiry ON response_cache(expires_at);
-- Server-only tables: no anonymous Supabase access. Direct server role owns access.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamental_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;
