const { BoundedBackpressureBuffer, TickDeduplicator, ExchangeTimeCandleEngine, SnapshotDeltaHub, UpdateThrottle } = require('./market-resilience');

const buffer = new BoundedBackpressureBuffer();
const dedupe = new TickDeduplicator();
const candles = new ExchangeTimeCandleEngine();
const hub = new SnapshotDeltaHub();
const throttle = new UpdateThrottle({ intervalMs: 250 });

function ingest(tick) {
  if (!tick || tick.verified !== true) return { accepted: false, reason: 'unverified' };
  if (!dedupe.accept(tick)) return { accepted: false, reason: 'duplicate' };
  if (!buffer.push(tick)) return { accepted: false, reason: 'backpressure' };
  return { accepted: true };
}

async function processBatch(batch) {
  for (const tick of batch) candles.ingest(tick);
}

setInterval(() => buffer.drain(processBatch).catch(() => {}), 10).unref();

function registerMarketResilienceRoutes(app) {
  app.get('/api/market-resilience/status', (req, res) => res.json({ success: true, buffer: buffer.stats(), candles: candles.completed(1).length, sessions: hub.sessions.size, throttleMs: throttle.intervalMs, policy: 'verified-data-only' }));
  app.post('/api/market-resilience/ingest', (req, res) => {
    const result = ingest(req.body?.tick || req.body);
    res.status(result.accepted ? 202 : 400).json({ success: result.accepted, ...result });
  });
  app.get('/api/market-resilience/snapshot', (req, res) => res.set('Cache-Control','no-store').json({ success: true, ...hub.snapshot() }));
  app.post('/api/market-resilience/session', (req, res) => {
    const id = String(req.body?.sessionId || '').trim().slice(0, 120);
    if (!id) return res.status(400).json({ success:false, error:'sessionId is required' });
    res.json({ success:true, snapshot:hub.connect(id, Array.isArray(req.body?.channels) ? req.body.channels.slice(0,100) : []) });
  });
  app.patch('/api/market-resilience/session/:id/channels', (req, res) => { hub.updateChannels(String(req.params.id).slice(0,120), Array.isArray(req.body?.channels) ? req.body.channels.slice(0,100) : []); res.json({ success:true }); });
  app.delete('/api/market-resilience/session/:id', (req, res) => { hub.disconnect(String(req.params.id).slice(0,120)); res.json({ success:true }); });
}

module.exports = { registerMarketResilienceRoutes, resilience: { buffer, dedupe, candles, hub, throttle } };
