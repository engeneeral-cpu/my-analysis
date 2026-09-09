const https = require('https');
const http = require('http');

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request(target, { method: options.method || 'GET', headers: options.headers || {} }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Historical provider HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Historical provider returned non-JSON data')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Historical provider timeout')));
    req.end();
  });
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRow(row) {
  const r = Array.isArray(row)
    ? { date: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5], tradedValue: row[6] }
    : row || {};
  return {
    date: r.date || r.tradingDate || r.timestamp || r.time || null,
    open: num(r.open ?? r.openPrice),
    high: num(r.high ?? r.highPrice),
    low: num(r.low ?? r.lowPrice),
    close: num(r.close ?? r.closePrice ?? r.ltp),
    volume: num(r.volume ?? r.totalTradedVolume),
    tradedValue: num(r.tradedValue ?? r.turnover ?? r.totalTradedValue)
  };
}

function complianceMetadata() {
  return {
    provider: process.env.MARKET_HISTORY_PROVIDER_NAME || null,
    providerType: process.env.MARKET_HISTORY_PROVIDER_TYPE || 'licensed-or-authorized-provider',
    licenseStatus: process.env.MARKET_HISTORY_LICENSE_STATUS || 'not-configured',
    displayPermission: process.env.MARKET_HISTORY_DISPLAY_PERMISSION || 'not-configured',
    redistributionPermission: process.env.MARKET_HISTORY_REDISTRIBUTION_PERMISSION || 'not-configured',
    attributionRequired: process.env.MARKET_HISTORY_ATTRIBUTION_REQUIRED === 'true'
  };
}

const RANGE_DAYS = { '1w': 7, '1m': 31, '3m': 93, '6m': 186, '1y': 366, '3y': 1096, '5y': 1827, '10y': 3653 };
const SUPPORTED = ['1d', '1w', '1m', '3m', '6m', '1y', '3y', '5y', '10y', 'all'];

function isoDate(d) { return d.toISOString().slice(0, 10); }
function indiaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function daysAgo(days) { const d = new Date(); d.setUTCDate(d.getUTCDate() - days); return isoDate(d); }
function startDateFor(range) {
  if (range === '1d') return daysAgo(14);
  const days = RANGE_DAYS[range];
  return days ? daysAgo(days) : null;
}

function configuredHeaders(apiKey) {
  const headers = { Accept: 'application/json' };
  const authMode = String(process.env.MARKET_HISTORY_AUTH_MODE || 'bearer').toLowerCase();
  if (apiKey) {
    if (authMode === 'x-api-key') headers['X-API-Key'] = apiKey;
    else if (authMode !== 'query') headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function upstoxUrl(instrumentKey, unit, interval, toDate, fromDate) {
  const base = process.env.MARKET_HISTORY_API_URL || 'https://api.upstox.com/v3/historical-candle';
  return new URL(base.replace(/\/$/, '') + `/${encodeURIComponent(instrumentKey)}/${unit}/${interval}/${toDate}` + (fromDate ? `/${fromDate}` : ''));
}

async function fetchUpstox(instrumentKey, fromDate, toDate, unit = 'days', interval = '1') {
  const raw = await fetchJson(upstoxUrl(instrumentKey, unit, interval, toDate, fromDate).toString(), {
    headers: configuredHeaders(process.env.MARKET_HISTORY_API_KEY)
  });
  return raw?.data?.candles || raw?.candles || [];
}

async function resolveInstrumentKey(symbol) {
  if (process.env.MARKET_HISTORY_INSTRUMENT_KEY_TEMPLATE) {
    return process.env.MARKET_HISTORY_INSTRUMENT_KEY_TEMPLATE.replace('{symbol}', symbol);
  }
  const universeUrl = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
  const csv = await new Promise((resolve, reject) => {
    const req = https.get(universeUrl, { headers: { 'User-Agent': 'TaraAI/1.0', Accept: 'text/csv,*/*' } }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', c => body += c); res.on('end', () => res.statusCode === 200 ? resolve(body) : reject(new Error(`NSE security master HTTP ${res.statusCode}`)));
    });
    req.setTimeout(15000, () => req.destroy(new Error('NSE security master timeout'))); req.on('error', reject);
  });
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map(x => x.replace(/"/g, '').trim().toUpperCase());
  const si = header.findIndex(x => x === 'SYMBOL');
  const ii = header.findIndex(x => x.includes('ISIN NUMBER'));
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map(x => x.replace(/^"|"$/g, '').trim());
    if (si >= 0 && cells[si] === symbol && ii >= 0 && cells[ii]) return `NSE_EQ|${cells[ii]}`;
  }
  throw new Error(`No NSE ISIN/instrument key found for ${symbol}`);
}

async function fetchProviderRows(symbol, fromDate, toDate) {
  const type = String(process.env.MARKET_HISTORY_PROVIDER_TYPE || '').toLowerCase();
  if (type === 'upstox-v3') {
    const instrumentKey = await resolveInstrumentKey(symbol);
    const rows = [];
    let cursor = new Date(toDate);
    const floor = fromDate ? new Date(fromDate) : new Date('2000-01-01T00:00:00Z');
    while (cursor >= floor) {
      const chunkStart = new Date(cursor);
      chunkStart.setUTCFullYear(chunkStart.getUTCFullYear() - 9);
      const start = chunkStart < floor ? floor : chunkStart;
      rows.push(...await fetchUpstox(instrumentKey, isoDate(start), isoDate(cursor), 'days', '1'));
      cursor = new Date(start);
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return rows;
  }

  const baseUrl = process.env.MARKET_HISTORY_API_URL;
  const apiKey = process.env.MARKET_HISTORY_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Historical market data is not configured for this deployment.');
  const url = new URL(baseUrl);
  const symbolParam = process.env.MARKET_HISTORY_SYMBOL_PARAM || 'symbol';
  const fromParam = process.env.MARKET_HISTORY_FROM_PARAM || 'from';
  const toParam = process.env.MARKET_HISTORY_TO_PARAM || 'to';
  const intervalParam = process.env.MARKET_HISTORY_INTERVAL_PARAM || 'interval';
  url.searchParams.set(symbolParam, symbol);
  if (fromDate) url.searchParams.set(fromParam, fromDate);
  url.searchParams.set(toParam, toDate);
  url.searchParams.set(intervalParam, '1d');
  if (String(process.env.MARKET_HISTORY_AUTH_MODE || 'bearer').toLowerCase() === 'query') url.searchParams.set(process.env.MARKET_HISTORY_API_KEY_PARAM || 'apiKey', apiKey);
  const raw = await fetchJson(url.toString(), { headers: configuredHeaders(apiKey) });
  return Array.isArray(raw) ? raw : (raw?.data || raw?.results || raw?.candles || raw?.history || []);
}

function uniqueRows(rows) {
  const map = new Map();
  rows.map(normalizeRow).filter(r => r.date && r.close !== null).forEach(r => map.set(String(r.date).slice(0, 10), r));
  return [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function registerMarketHistoryRoutes(app) {
  app.get('/api/market-history/:symbol/previous', async (req, res) => historyHandler(req, res, true));
  app.get('/api/market-history/:symbol', historyHandler);
}

async function historyHandler(req, res, previousOnly = false) {
  const symbol = String(req.params.symbol || '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
  const range = String(req.query.range || '1y').toLowerCase();
  if (!symbol) return res.status(400).json({ success: false, error: 'Invalid symbol' });
  if (!SUPPORTED.includes(range)) return res.status(400).json({ success: false, error: 'Unsupported history range' });

  try {
    const fromDate = range === 'all' ? null : startDateFor(range);
    const toDate = isoDate(new Date());
    const rows = uniqueRows(await fetchProviderRows(symbol, fromDate, toDate));
    // Historical/EOD views must contain completed sessions only. Live/intraday data belongs to the live endpoint.
    const completedRows = rows.filter(r => String(r.date).slice(0, 10) < indiaToday());
    if (!completedRows.length) throw new Error('Historical provider returned no completed trading-session rows');

    const selected = previousOnly ? completedRows.slice(-1) : completedRows;
    const latest = completedRows[completedRows.length - 1];
    const previous = completedRows.length > 1 ? completedRows[completedRows.length - 2] : null;
    const base = previous?.close ?? latest.open ?? latest.close;
    const change = base !== null && latest.close !== null ? latest.close - base : null;
    const percentChange = base ? (change / base) * 100 : null;

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
    return res.json({ success: true, historical: true, symbol, range, previousTradingDay: previousOnly, rows: selected, summary: { latest, previous, change, percentChange }, source: process.env.MARKET_HISTORY_PROVIDER_NAME || 'Configured historical provider', asOf: new Date().toISOString(), compliance: complianceMetadata() });
  } catch (error) {
    const status = error.message.includes('not configured') ? 503 : 502;
    return res.status(status).json({ success: false, historical: false, error: error.message, range, compliance: complianceMetadata() });
  }
}

module.exports = { registerMarketHistoryRoutes };
