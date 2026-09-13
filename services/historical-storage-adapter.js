const RANGE_DAYS = Object.freeze({
  '1D': 1,
  '1W': 7,
  '1M': 31,
  '1Y': 366,
  '5Y': 1827
});

const PENDING_NOTICE = 'Awaiting authorized historical storage connection';
const LICENSED = new Set(['licensed', 'authorized', 'active']);
const DISPLAY_ALLOWED = new Set(['allowed', 'yes', 'true', 'licensed', 'authorized']);
const REDISTRIBUTION_ALLOWED = new Set(['allowed', 'yes', 'true', 'licensed', 'authorized']);

function clean(value) {
  return String(value || '').trim();
}

function config() {
  return {
    url: clean(process.env.TIMESCALE_DB_URL || process.env.POSTGRES_URL),
    ssl: clean(process.env.TIMESCALE_DB_SSL || process.env.POSTGRES_SSL).toLowerCase() === 'true',
    licenseStatus: clean(process.env.HISTORICAL_STORAGE_LICENSE_STATUS || process.env.MARKET_HISTORY_LICENSE_STATUS || 'not-configured').toLowerCase(),
    displayPermission: clean(process.env.HISTORICAL_STORAGE_DISPLAY_PERMISSION || process.env.MARKET_HISTORY_DISPLAY_PERMISSION || 'not-configured').toLowerCase(),
    redistributionPermission: clean(process.env.HISTORICAL_STORAGE_REDISTRIBUTION_PERMISSION || process.env.MARKET_HISTORY_REDISTRIBUTION_PERMISSION || 'not-configured').toLowerCase(),
    source: clean(process.env.HISTORICAL_STORAGE_SOURCE || process.env.MARKET_HISTORY_PROVIDER_NAME || 'NSE_BHAVCOPY') || null,
    exchange: clean(process.env.HISTORICAL_STORAGE_EXCHANGE || 'NSE').toUpperCase(),
    table: clean(process.env.HISTORICAL_STORAGE_TABLE || 'ohlcv_daily') || 'ohlcv_daily'
  };
}

function authorized(c = config()) {
  return Boolean(c.url)
    && LICENSED.has(c.licenseStatus)
    && DISPLAY_ALLOWED.has(c.displayPermission)
    && REDISTRIBUTION_ALLOWED.has(c.redistributionPermission);
}

function pendingResult() {
  return { candles: [], verified: false, source: null, notice: PENDING_NOTICE };
}

function validateRange(range) {
  const value = clean(range).toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(RANGE_DAYS, value) && value !== 'MAX') throw new Error('Unsupported historical storage range');
  return value;
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error('Invalid historical storage table identifier');
  return `"${value}"`;
}

function normalizeRows(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const time = row.trade_date instanceof Date ? row.trade_date.toISOString().slice(0, 10) : String(row.trade_date || '').slice(0, 10);
    const open = Number(row.open);
    const high = Number(row.high);
    const low = Number(row.low);
    const close = Number(row.close);
    const volume = row.volume == null ? null : Number(row.volume);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(time)) continue;
    if (![open, high, low, close].every(Number.isFinite)) continue;
    if (![open, high, low, close].every(v => v >= 0)) continue;
    if (high < Math.max(open, close, low) || low > Math.min(open, close, high)) continue;
    if (volume != null && (!Number.isFinite(volume) || volume < 0)) continue;
    map.set(time, { time, open, high, low, close, volume });
  }
  return [...map.values()].sort((a, b) => a.time.localeCompare(b.time));
}

function resolveStartDate(range) {
  if (range === 'MAX') return null;
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (RANGE_DAYS[range] - 1));
  return d.toISOString().slice(0, 10);
}

class PendingHistoricalStorageAdapter {
  async fetchCandles() { return pendingResult(); }
  async healthCheck() { return { configured: false, ready: false, verified: false, notice: PENDING_NOTICE }; }
}

class PostgresHistoricalStorageAdapter {
  constructor(options = {}) {
    this.options = options;
    this.pool = null;
  }

  async getPool() {
    if (this.pool) return this.pool;
    let pg;
    try {
      pg = require('pg');
    } catch (error) {
      throw new Error('PostgreSQL driver is not installed; authorized historical storage is not available');
    }
    const c = config();
    this.pool = new pg.Pool({
      connectionString: c.url,
      ssl: c.ssl ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.HISTORICAL_STORAGE_POOL_MAX || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    return this.pool;
  }

  async fetchCandles(symbol, exchange = config().exchange, range = '1Y') {
    const c = config();
    const normalizedRange = validateRange(range);
    if (!authorized(c)) return pendingResult();
    const table = quoteIdentifier(c.table);
    const params = [clean(exchange).toUpperCase(), clean(symbol).toUpperCase()];
    let dateClause = '';
    const start = resolveStartDate(normalizedRange);
    if (start) {
      params.push(start);
      dateClause = ` AND trade_date >= $3::date`;
    }
    const query = `SELECT trade_date, open, high, low, close, volume FROM ${table} WHERE exchange = $1 AND symbol = $2${dateClause} AND verified = TRUE ORDER BY trade_date ASC`;
    const result = await (await this.getPool()).query(query, params);
    const candles = normalizeRows(result.rows);
    return {
      candles,
      verified: true,
      source: c.source,
      notice: candles.length ? null : 'No verified historical records available for the requested range'
    };
  }

  async healthCheck() {
    const c = config();
    if (!authorized(c)) return { configured: Boolean(c.url), ready: false, verified: false, notice: PENDING_NOTICE };
    try {
      await (await this.getPool()).query('SELECT 1');
      return { configured: true, ready: true, verified: true, source: c.source };
    } catch (error) {
      return { configured: true, ready: false, verified: false, notice: 'Authorized historical storage is configured but unavailable' };
    }
  }
}

function createHistoricalStorageAdapter() {
  const c = config();
  return c.url ? new PostgresHistoricalStorageAdapter() : new PendingHistoricalStorageAdapter();
}

module.exports = {
  RANGE_DAYS,
  PENDING_NOTICE,
  config,
  authorized,
  normalizeRows,
  PendingHistoricalStorageAdapter,
  PostgresHistoricalStorageAdapter,
  createHistoricalStorageAdapter
};
