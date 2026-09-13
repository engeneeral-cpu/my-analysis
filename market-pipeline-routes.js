const { MarketPipeline } = require('./market-pipeline');
const pipeline = new MarketPipeline();

function registerMarketPipelineRoutes(app) {
  app.get('/api/market-pipeline/status', (req, res) => {
    res.json({ success: true, ...pipeline.snapshot(), policy: 'verified-data-only; no synthetic ticks' });
  });

  app.post('/api/market-pipeline/subscribe', (req, res) => {
    const sessionId = String(req.body?.sessionId || '').trim().slice(0, 120);
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId is required' });
    const channels = Array.isArray(req.body?.channels) ? req.body.channels.slice(0, 100) : [];
    res.json({ success: true, subscription: pipeline.subscribe(sessionId, channels) });
  });

  app.delete('/api/market-pipeline/subscribe/:sessionId', (req, res) => {
    pipeline.unsubscribe(String(req.params.sessionId || '').slice(0, 120));
    res.json({ success: true });
  });

  app.get('/api/market-pipeline/candles/:key', (req, res) => {
    const key = String(req.params.key || '').replace(/[^A-Za-z0-9:_-]/g, '');
    const rows = [...pipeline.candles.values()].filter(c => c.key.startsWith(`${key}:1m:`)).slice(-500);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, dataStatus: rows.length ? 'provider-verified' : 'unavailable', candles: rows });
  });
}

setInterval(() => pipeline.cleanupSessions(), 60_000).unref();
module.exports = { registerMarketPipelineRoutes, pipeline };
