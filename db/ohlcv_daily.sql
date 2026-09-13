-- Market Analysis / Tara AI Historical OHLCV storage contract.
-- This schema stores exchange-sourced EOD data only. It does not itself authorize redistribution.
CREATE TABLE IF NOT EXISTS ohlcv_daily (
  exchange VARCHAR(5) NOT NULL,
  symbol VARCHAR(40) NOT NULL,
  isin VARCHAR(12),
  trade_date DATE NOT NULL,
  open NUMERIC(20,6) NOT NULL,
  high NUMERIC(20,6) NOT NULL,
  low NUMERIC(20,6) NOT NULL,
  close NUMERIC(20,6) NOT NULL,
  volume BIGINT,
  source VARCHAR(32) NOT NULL,
  source_url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exchange, symbol, trade_date),
  CONSTRAINT ohlcv_daily_ohlc_valid CHECK (
    high >= GREATEST(open, low, close)
    AND low <= LEAST(open, high, close)
    AND open >= 0 AND high >= 0 AND low >= 0 AND close >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_ohlcv_daily_symbol_date
  ON ohlcv_daily (exchange, symbol, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_ohlcv_daily_isin_date
  ON ohlcv_daily (isin, trade_date DESC)
  WHERE isin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ohlcv_daily_verified_date
  ON ohlcv_daily (verified, trade_date DESC);

-- TimescaleDB deployment only: run this after the extension is installed.
-- It converts the daily table into a time-partitioned hypertable without changing the API contract.
-- SELECT create_hypertable('ohlcv_daily', by_range('trade_date'), if_not_exists => TRUE);
