const https = require('https');
const http = require('http');
const { MarketDataFoundation } = require('./market-data-foundation');

const marketData = new MarketDataFoundation();
let pollTimer = null;

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url); const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request(target, { method: options.method || 'GET', headers: options.headers || {} }, res => {
      let body = ''; res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => { if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Market provider HTTP ${res.statusCode}`)); try { resolve(JSON.parse(body)); } catch { reject(new Error('Market provider returned non-JSON data')); } });
    });
    req.on('error', reject); req.setTimeout(10000, () => req.destroy(new Error('Market provider timeout'))); req.end(options.body || undefined);
  });
}
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function providerHeaders(apiKey) {
  const headers = { Accept: 'application/json' }, mode = String(process.env.MARKET_DATA_AUTH_MODE || 'bearer').toLowerCase();
  if (!apiKey) return headers;
  if (mode === 'x-api-key' || mode === 'header') headers[process.env.MARKET_DATA_API_KEY_HEADER || 'X-API-Key'] = apiKey;
  else if (mode !== 'query') headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}
function complianceMetadata() {
  return { provider: process.env.MARKET_DATA_PROVIDER_NAME || null, providerType: process.env.MARKET_DATA_PROVIDER_TYPE || 'licensed-or-authorized-provider', licenseStatus: process.env.MARKET_DATA_LICENSE_STATUS || 'not-configured', displayPermission: process.env.MARKET_DATA_DISPLAY_PERMISSION || 'not-configured', redistributionPermission: process.env.MARKET_DATA_REDISTRIBUTION_PERMISSION || 'not-configured', attributionRequired: process.env.MARKET_DATA_ATTRIBUTION_REQUIRED === 'true', environment: process.env.NODE_ENV || 'development' };
}
function licenseGate() {
  const c = complianceMetadata();
  const allowed = ['licensed', 'authorized', 'active'].includes(String(c.licenseStatus).toLowerCase()) && ['allowed', 'yes', 'true', 'licensed', 'authorized'].includes(String(c.displayPermission).toLowerCase());
  return { allowed, compliance: c };
}
function normalizeQuote(raw, symbol) {
  const q = raw?.quote || raw?.data || raw;
  const ltp = num(q?.ltp ?? q?.lastPrice ?? q?.price ?? q?.regularMarketPrice), previousClose = num(q?.previousClose ?? q?.prevClose ?? q?.regularMarketPreviousClose);
  const open = num(q?.open ?? q?.openPrice ?? q?.regularMarketOpen), high = num(q?.high ?? q?.dayHigh ?? q?.regularMarketDayHigh), low = num(q?.low ?? q?.dayLow ?? q?.regularMarketDayLow);
  const volume = num(q?.volume ?? q?.totalTradedVolume ?? q?.regularMarketVolume), change = ltp !== null && previousClose !== null ? ltp - previousClose : num(q?.change);
  const percentChange = change !== null && previousClose ? (change / previousClose) * 100 : num(q?.percentChange ?? q?.changePercent);
  const asOf = q?.asOf || q?.timestamp || new Date().toISOString();
  return { symbol, ltp, previousClose, open, high, low, volume, change, percentChange, asOf, source: q?.source || process.env.MARKET_DATA_PROVIDER_NAME || 'Configured market-data provider', dataStatus: q?.dataStatus || 'provider-confirmed' };
}
async function fetchProviderQuote(symbol) {
  const gate = licenseGate(); if (!gate.allowed) throw new Error('Live market display is blocked until an authorized/licensed provider and display permission are configured.');
  const baseUrl = process.env.MARKET_DATA_API_URL, apiKey = process.env.MARKET_DATA_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Live market feed is not configured for this deployment.');
  const url = new URL(baseUrl); url.searchParams.set(process.env.MARKET_DATA_SYMBOL_PARAM || 'symbol', symbol);
  const mode = String(process.env.MARKET_DATA_AUTH_MODE || 'bearer').toLowerCase(); if (mode === 'query') url.searchParams.set(process.env.MARKET_DATA_API_KEY_PARAM || 'apiKey', apiKey);
  const quote = normalizeQuote(await fetchJson(url.toString(), { headers: providerHeaders(apiKey) }), symbol);
  if (quote.ltp === null || quote.previousClose === null) throw new Error('Provider response lacks verified LTP or previous close.');
  if (quote.ltp <= 0 || quote.previousClose <= 0) throw new Error('Provider returned an invalid price.');
  const retrievedAt = new Date(quote.asOf); if (Number.isNaN(retrievedAt.getTime())) throw new Error('Provider timestamp is invalid.');
  const maxAgeMs = Math.max(1000, Number(process.env.MARKET_DATA_MAX_AGE_MS || 30000)); if (Date.now() - retrievedAt.getTime() > maxAgeMs) throw new Error('Provider quote is stale.');
  const accepted = marketData.ingestQuote({ ...quote, verified: true, source: quote.source, retrievedAt: retrievedAt.toISOString() });
  if (!accepted.accepted) throw new Error(accepted.reason); return quote;
}
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  const symbols = String(process.env.MARKET_DATA_POLL_SYMBOLS || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 100);
  const interval = Math.max(2000, Number(process.env.MARKET_DATA_POLL_INTERVAL_MS || 5000)); const gate = licenseGate();
  if (!gate.allowed || !symbols.length || !process.env.MARKET_DATA_API_URL || !process.env.MARKET_DATA_API_KEY) return;
  const run = () => Promise.allSettled(symbols.map(fetchProviderQuote)); run(); pollTimer = setInterval(run, interval); pollTimer.unref?.();
}
function registerLiveMarketRoutes(app) {
  app.get('/api/live-market/quote/:symbol', async (req, res) => {
    const symbol = String(req.params.symbol || '').toUpperCase().replace(/[^A-Z0-9._-]/g, ''); if (!symbol) return res.status(400).json({ success: false, error: 'Invalid symbol' });
    try { const quote = await fetchProviderQuote(symbol); res.set('Cache-Control', 'no-store'); res.json({ success: true, live: true, verified: true, quote, compliance: complianceMetadata() }); }
    catch (error) { const status = error.message.includes('not configured') || error.message.includes('blocked') ? 503 : 502; res.status(status).json({ success: false, live: false, verified: false, error: error.message, setup: 'Configure an authorized market-data provider and its permitted-use settings in the server environment.', compliance: complianceMetadata() }); }
  });
  app.get('/api/live-market/status', (req, res) => { const snapshot = marketData.snapshot(); const gate = licenseGate(); res.json({ success: true, ...snapshot, displayAllowed: gate.allowed, compliance: gate.compliance, serverTime: new Date().toISOString() }); });
  app.get('/api/live-market/stream', (req, res) => { res.status(200); res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }); res.flushHeaders?.(); const gate = licenseGate(); res.write(`event: status\ndata: ${JSON.stringify({ live: marketData.isProviderReady(), displayAllowed: gate.allowed, provider: gate.compliance })}\n\n`); const onQuote = data => res.write(`event: quote\ndata: ${JSON.stringify(data)}\n\n`); const onIndex = data => res.write(`event: index\ndata: ${JSON.stringify(data)}\n\n`); const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000); marketData.on('quote', onQuote); marketData.on('index', onIndex); req.on('close', () => { clearInterval(heartbeat); marketData.off('quote', onQuote); marketData.off('index', onIndex); }); });
  app.get('/api/live-market/health', (req, res) => { const gate = licenseGate(); res.json({ live: marketData.isProviderReady(), displayAllowed: gate.allowed, provider: marketData.provider, compliance: gate.compliance, polling: { enabled: !!pollTimer, intervalMs: Number(process.env.MARKET_DATA_POLL_INTERVAL_MS || 5000), symbols: String(process.env.MARKET_DATA_POLL_SYMBOLS || '').split(',').filter(Boolean).length }, serverTime: new Date().toISOString() }); });
  startPolling();
}
module.exports = { registerLiveMarketRoutes, marketData };
