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
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Market provider HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Market provider returned non-JSON data')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('Market provider timeout')));
    req.end(options.body || undefined);
  });
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeQuote(raw, symbol) {
  const q = raw?.quote || raw?.data || raw;
  const ltp = num(q?.ltp ?? q?.lastPrice ?? q?.price ?? q?.regularMarketPrice);
  const previousClose = num(q?.previousClose ?? q?.prevClose ?? q?.regularMarketPreviousClose);
  const open = num(q?.open ?? q?.openPrice ?? q?.regularMarketOpen);
  const high = num(q?.high ?? q?.dayHigh ?? q?.regularMarketDayHigh);
  const low = num(q?.low ?? q?.dayLow ?? q?.regularMarketDayLow);
  const volume = num(q?.volume ?? q?.totalTradedVolume ?? q?.regularMarketVolume);
  const change = ltp !== null && previousClose !== null ? ltp - previousClose : num(q?.change);
  const percentChange = change !== null && previousClose ? (change / previousClose) * 100 : num(q?.percentChange ?? q?.changePercent);
  return {
    symbol,
    ltp,
    previousClose,
    open,
    high,
    low,
    volume,
    change,
    percentChange,
    asOf: q?.asOf || q?.timestamp || new Date().toISOString(),
    source: q?.source || process.env.MARKET_DATA_PROVIDER_NAME || 'Configured market-data provider',
    dataStatus: q?.dataStatus || 'provider-confirmed'
  };
}

function complianceMetadata() {
  return {
    provider: process.env.MARKET_DATA_PROVIDER_NAME || null,
    providerType: process.env.MARKET_DATA_PROVIDER_TYPE || 'licensed-or-authorized-provider',
    licenseStatus: process.env.MARKET_DATA_LICENSE_STATUS || 'not-configured',
    displayPermission: process.env.MARKET_DATA_DISPLAY_PERMISSION || 'not-configured',
    redistributionPermission: process.env.MARKET_DATA_REDISTRIBUTION_PERMISSION || 'not-configured',
    attributionRequired: process.env.MARKET_DATA_ATTRIBUTION_REQUIRED === 'true',
    environment: process.env.NODE_ENV || 'development'
  };
}

function registerLiveMarketRoutes(app) {
  app.get('/api/live-market/quote/:symbol', async (req, res) => {
    const symbol = String(req.params.symbol || '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
    if (!symbol) return res.status(400).json({ success: false, error: 'Invalid symbol' });

    const baseUrl = process.env.MARKET_DATA_API_URL;
    const apiKey = process.env.MARKET_DATA_API_KEY;
    if (!baseUrl || !apiKey) {
      return res.status(503).json({
        success: false,
        live: false,
        error: 'Live market feed is not configured for this deployment.',
        setup: 'Configure an authorized market-data provider and its permitted-use settings in the server environment.',
        compliance: complianceMetadata()
      });
    }

    try {
      const url = new URL(baseUrl);
      const symbolParam = process.env.MARKET_DATA_SYMBOL_PARAM || 'symbol';
      url.searchParams.set(symbolParam, symbol);
      const raw = await fetchJson(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
      });
      const quote = normalizeQuote(raw, symbol);
      if (quote.ltp === null) throw new Error('Provider response has no last traded price');
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, live: true, quote, compliance: complianceMetadata() });
    } catch (error) {
      res.status(502).json({ success: false, live: false, error: error.message, compliance: complianceMetadata() });
    }
  });

  app.get('/api/live-market/health', (req, res) => {
    res.json({
      live: Boolean(process.env.MARKET_DATA_API_URL && process.env.MARKET_DATA_API_KEY),
      provider: process.env.MARKET_DATA_PROVIDER_NAME || null,
      compliance: complianceMetadata(),
      serverTime: new Date().toISOString()
    });
  });
}

module.exports = { registerLiveMarketRoutes };
