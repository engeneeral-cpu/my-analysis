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

const RANGE_DAYS = { '1d': 1, '1w': 7, '1m': 31, '3m': 93, '6m': 186, '1y': 366, '3y': 1096, '5y': 1827, '10y': 3653 };

function startDateFor(range) {
  const days = RANGE_DAYS[range];
  if (!days) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function registerMarketHistoryRoutes(app) {
  app.get('/api/market-history/:symbol', async (req, res) => {
    const symbol = String(req.params.symbol || '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
    const range = String(req.query.range || '1y').toLowerCase();
    if (!symbol) return res.status(400).json({ success: false, error: 'Invalid symbol' });
    if (!['1d', '1w', '1m', '3m', '6m', '1y', '3y', '5y', '10y', 'all'].includes(range)) {
      return res.status(400).json({ success: false, error: 'Unsupported history range' });
    }

    const baseUrl = process.env.MARKET_HISTORY_API_URL;
    const apiKey = process.env.MARKET_HISTORY_API_KEY;
    if (!baseUrl || !apiKey) {
      return res.status(503).json({
        success: false,
        historical: false,
        error: 'Historical market data is not configured for this deployment.',
        setup: 'Configure an authorized/licensed historical EOD provider in the server environment.',
        range,
        compliance: complianceMetadata()
      });
    }

    try {
      const url = new URL(baseUrl);
      const symbolParam = process.env.MARKET_HISTORY_SYMBOL_PARAM || 'symbol';
      const fromParam = process.env.MARKET_HISTORY_FROM_PARAM || 'from';
      const toParam = process.env.MARKET_HISTORY_TO_PARAM || 'to';
      const intervalParam = process.env.MARKET_HISTORY_INTERVAL_PARAM || 'interval';
      url.searchParams.set(symbolParam, symbol);
      if (range !== 'all') url.searchParams.set(fromParam, startDateFor(range));
      url.searchParams.set(toParam, new Date().toISOString().slice(0, 10));
      url.searchParams.set(intervalParam, '1d');

      const raw = await fetchJson(url.toString(), { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
      const sourceRows = Array.isArray(raw) ? raw : (raw?.data || raw?.results || raw?.candles || raw?.history || []);
      const rows = sourceRows.map(normalizeRow).filter(r => r.date && r.close !== null);
      if (!rows.length) throw new Error('Historical provider returned no usable OHLCV rows');

      rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const previous = rows.length > 1 ? rows[rows.length - 2] : null;
      const latest = rows[rows.length - 1];
      const base = previous?.close ?? latest.open ?? latest.close;
      const change = base !== null && latest.close !== null ? latest.close - base : null;
      const percentChange = base ? (change / base) * 100 : null;

      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json({ success: true, historical: true, symbol, range, rows, summary: { latest, previous, change, percentChange }, source: process.env.MARKET_HISTORY_PROVIDER_NAME || 'Configured historical provider', asOf: new Date().toISOString(), compliance: complianceMetadata() });
    } catch (error) {
      res.status(502).json({ success: false, historical: false, error: error.message, range, compliance: complianceMetadata() });
    }
  });
}

module.exports = { registerMarketHistoryRoutes };
