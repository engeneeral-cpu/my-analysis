const https = require('https');
const http = require('http');
const { getUniverse } = require('./company-routes');

const RANGES = new Set(['1D', '1W', '1M', '1Y', '5Y', 'MAX']);
const INTERVALS = new Set(['1d', '1h', '15m']);
const RANGE_DAYS = { '1D': 1, '1W': 7, '1M': 31, '1Y': 366, '5Y': 1827 };

function isoDate(d) { return d.toISOString().slice(0, 10); }
function daysAgo(days) { const d = new Date(); d.setUTCDate(d.getUTCDate() - days); return isoDate(d); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request(target, { method: 'GET', headers: { Accept: 'application/json', ...headers } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Historical provider HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Historical provider returned non-JSON data')); }
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Historical provider timeout')));
    req.on('error', reject);
    req.end();
  });
}
function authHeaders() {
  const key = String(process.env.MARKET_HISTORY_API_KEY || '').trim();
  if (!key) return {};
  return String(process.env.MARKET_HISTORY_AUTH_MODE || 'bearer').toLowerCase() === 'x-api-key'
    ? { 'X-API-Key': key }
    : { Authorization: `Bearer ${key}` };
}
function normalizeCandle(row) {
  const r = Array.isArray(row)
    ? { time: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5] }
    : row || {};
  const rawTime = r.time ?? r.date ?? r.tradingDate ?? r.timestamp;
  const date = typeof rawTime === 'number' ? new Date(rawTime > 1e12 ? rawTime : rawTime * 1000) : new Date(rawTime);
  if (!Number.isFinite(date.getTime())) return null;
  const candle = {
    time: r.time && typeof r.time === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r.time) ? r.time.slice(0, 10) : isoDate(date),
    open: number(r.open ?? r.openPrice), high: number(r.high ?? r.highPrice), low: number(r.low ?? r.lowPrice),
    close: number(r.close ?? r.closePrice ?? r.ltp), volume: number(r.volume ?? r.totalTradedVolume)
  };
  if (![candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)) return null;
  if (candle.high < Math.max(candle.open, candle.close, candle.low)) return null;
  if (candle.low > Math.min(candle.open, candle.close, candle.high)) return null;
  return candle;
}
function uniqueOrdered(rows) {
  const map = new Map();
  for (const row of rows) { const c = normalizeCandle(row); if (c) map.set(c.time, c); }
  return [...map.values()].sort((a, b) => a.time.localeCompare(b.time));
}
function securityMasterMatch(universe, symbol) {
  return universe.rows.find(c => String(c.nseSymbol || c.symbol).toUpperCase() === symbol || String(c.bseSymbol || '').toUpperCase() === symbol || String(c.bseCode || '').toUpperCase() === symbol);
}
function providerConfig() {
  return {
    name: process.env.MARKET_HISTORY_PROVIDER_NAME || null,
    type: String(process.env.MARKET_HISTORY_PROVIDER_TYPE || '').toLowerCase(),
    apiUrl: String(process.env.MARKET_HISTORY_API_URL || '').trim(),
    apiKey: String(process.env.MARKET_HISTORY_API_KEY || '').trim()
  };
}
function instrumentKey(company) {
  const template = String(process.env.MARKET_HISTORY_INSTRUMENT_KEY_TEMPLATE || '').trim();
  if (template) return template.replace('{symbol}', company.nseSymbol || company.symbol || '');
  if (company.isin) return `NSE_EQ|${company.isin}`;
  return company.nseSymbol || company.symbol;
}
async function fetchConfiguredProvider(company, range, interval) {
  const cfg = providerConfig();
  if (!cfg.apiUrl || !cfg.apiKey) throw new Error('Historical exchange data pending ingestion');
  const url = new URL(cfg.apiUrl);
  const key = instrumentKey(company);
  const from = range === 'MAX' ? null : daysAgo(RANGE_DAYS[range]);
  url.searchParams.set(process.env.MARKET_HISTORY_SYMBOL_PARAM || 'symbol', key);
  if (from) url.searchParams.set(process.env.MARKET_HISTORY_FROM_PARAM || 'from', from);
  url.searchParams.set(process.env.MARKET_HISTORY_TO_PARAM || 'to', isoDate(new Date()));
  url.searchParams.set(process.env.MARKET_HISTORY_INTERVAL_PARAM || 'interval', interval);
  if (String(process.env.MARKET_HISTORY_AUTH_MODE || 'bearer').toLowerCase() === 'query') url.searchParams.set(process.env.MARKET_HISTORY_API_KEY_PARAM || 'apiKey', cfg.apiKey);
  const raw = await fetchJson(url.toString(), String(process.env.MARKET_HISTORY_AUTH_MODE || 'bearer').toLowerCase() === 'query' ? {} : authHeaders());
  return Array.isArray(raw) ? raw : (raw?.data?.candles || raw?.data || raw?.candles || raw?.results || raw?.history || []);
}
function upstoxUrl(key, interval, range) {
  const base = String(process.env.MARKET_HISTORY_API_URL || 'https://api.upstox.com/v3/historical-candle').replace(/\/$/, '');
  const now = isoDate(new Date());
  const from = range === 'MAX' ? '2000-01-01' : daysAgo(RANGE_DAYS[range]);
  const unit = interval === '1d' ? 'days' : interval === '1h' ? 'hours' : 'minutes';
  const value = interval === '1d' ? '1' : interval === '1h' ? '1' : '15';
  return `${base}/${encodeURIComponent(key)}/${unit}/${value}/${now}/${from}`;
}
async function fetchUpstox(company, range, interval) {
  const key = instrumentKey(company);
  const raw = await fetchJson(upstoxUrl(key, interval, range), authHeaders());
  return raw?.data?.candles || raw?.candles || [];
}
async function fetchRows(company, range, interval) {
  const cfg = providerConfig();
  if (cfg.type === 'upstox-v3') return fetchUpstox(company, range, interval);
  return fetchConfiguredProvider(company, range, interval);
}
function metadata(verified, notice = null) {
  const cfg = providerConfig();
  return {
    source: verified ? (cfg.name || null) : null,
    provider_type: cfg.type || null,
    verified,
    exchange_holidays_excluded: true,
    notice
  };
}
async function historyHandler(req, res) {
  const symbol = String(req.params.symbol || '').trim().toUpperCase().replace(/[^A-Z0-9._-]/g, '');
  const range = String(req.query.range || '1Y').toUpperCase();
  const interval = String(req.query.interval || '1d').toLowerCase();
  if (!symbol) return res.status(400).json({ success: false, error: 'Invalid symbol' });
  if (!RANGES.has(range)) return res.status(400).json({ success: false, error: 'Unsupported history range. Use 1D, 1W, 1M, 1Y, 5Y or MAX.' });
  if (!INTERVALS.has(interval)) return res.status(400).json({ success: false, error: 'Unsupported interval. Use 1d, 1h or 15m.' });
  try {
    const universe = await getUniverse();
    const company = securityMasterMatch(universe, symbol);
    if (!company) return res.status(404).json({ error: 'Company not found in verified universe' });
    const rawRows = await fetchRows(company, range, interval);
    const candles = uniqueOrdered(rawRows);
    if (!candles.length) {
      return res.json({ success: true, symbol, range, interval, candles: [], metadata: metadata(false, 'Historical exchange data pending ingestion') });
    }
    return res.json({ success: true, symbol, range, interval, candles, metadata: metadata(true) });
  } catch (error) {
    if (error.message === 'Historical exchange data pending ingestion' || error.message.includes('not configured')) {
      return res.json({ success: true, symbol, range, interval, candles: [], metadata: metadata(false, 'Historical exchange data pending ingestion') });
    }
    console.error('[Tara Historical OHLCV]', error.message);
    return res.status(502).json({ success: false, symbol, range, interval, candles: [], metadata: metadata(false, 'Historical exchange data provider unavailable') });
  }
}
function registerHistoricalOHLCVRoutes(app) { app.get('/api/v1/company/:symbol/history', historyHandler); }
module.exports = { registerHistoricalOHLCVRoutes, normalizeCandle, uniqueOrdered };
