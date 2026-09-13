const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Production-oriented Step 2B primitives.
 * No synthetic ticks. Every accepted tick must be verified and source-backed.
 */
class MarketPipeline extends EventEmitter {
  constructor() {
    super();
    this.activeProvider = null;
    this.providers = new Map();
    this.quotes = new Map();
    this.movers = new Map();
    this.candles = new Map();
    this.instrumentByIsin = new Map();
    this.subscribers = new Map();
    this.health = { lastTickAt: null, state: 'DISCONNECTED', consecutiveErrors: 0 };
  }

  registerProvider(name, adapter, priority = 100) {
    if (!name || !adapter || typeof adapter.connect !== 'function') throw new Error('Invalid provider adapter');
    this.providers.set(name, { name, adapter, priority });
    this.selectProvider();
  }

  selectProvider() {
    const ready = [...this.providers.values()].filter(p => p.adapter.isAvailable !== false).sort((a, b) => a.priority - b.priority);
    this.activeProvider = ready[0] || null;
    this.health.state = this.activeProvider ? 'READY' : 'DISCONNECTED';
    return this.activeProvider?.name || null;
  }

  ingestTick(tick) {
    if (!this.validateTick(tick)) return { accepted: false, reason: 'Rejected: unverified or invalid tick' };
    const key = `${tick.exchange || 'NSE'}:${tick.isin || tick.symbol}`;
    const normalized = { ...tick, key, receivedAt: new Date().toISOString(), verified: true };
    this.quotes.set(key, normalized);
    this.health.lastTickAt = normalized.receivedAt;
    this.health.state = 'LIVE';
    this.health.consecutiveErrors = 0;
    this.updateCandle(normalized);
    this.updateMover(normalized);
    this.emit('tick', normalized);
    return { accepted: true };
  }

  validateTick(tick) {
    if (!tick || tick.verified !== true || !tick.source || !tick.retrievedAt) return false;
    const price = Number(tick.ltp);
    const volume = Number(tick.volume ?? 0);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(volume) || volume < 0) return false;
    return Boolean(tick.symbol || tick.isin);
  }

  updateCandle(tick) {
    const timestamp = new Date(tick.retrievedAt).getTime();
    if (!Number.isFinite(timestamp)) return;
    const minute = Math.floor(timestamp / 60000) * 60000;
    const key = `${tick.key}:1m:${minute}`;
    let candle = this.candles.get(key);
    if (!candle) {
      candle = { key, exchange: tick.exchange || null, symbol: tick.symbol || null, isin: tick.isin || null, interval: '1m', timestamp: new Date(minute).toISOString(), open: Number(tick.ltp), high: Number(tick.ltp), low: Number(tick.ltp), close: Number(tick.ltp), volume: 0, source: tick.source, verified: true };
      this.candles.set(key, candle);
    }
    candle.high = Math.max(candle.high, Number(tick.ltp));
    candle.low = Math.min(candle.low, Number(tick.ltp));
    candle.close = Number(tick.ltp);
    candle.volume += Number(tick.volume || 0);
  }

  updateMover(tick) {
    if (!Number.isFinite(Number(tick.percentChange))) return;
    const key = tick.exchange || 'NSE';
    if (!this.movers.has(key)) this.movers.set(key, new Map());
    this.movers.get(key).set(tick.symbol || tick.isin, Number(tick.percentChange));
  }

  setInstrument(instrument) {
    if (!instrument?.isin) return false;
    this.instrumentByIsin.set(String(instrument.isin).toUpperCase(), { ...instrument, updatedAt: new Date().toISOString() });
    return true;
  }

  subscribe(sessionId, channels = []) {
    const clean = [...new Set(channels.map(String).filter(Boolean))];
    this.subscribers.set(sessionId, { channels: clean, expiresAt: Date.now() + 30 * 60 * 1000 });
    return this.subscribers.get(sessionId);
  }

  unsubscribe(sessionId) { this.subscribers.delete(sessionId); }

  cleanupSessions() {
    const now = Date.now();
    for (const [id, session] of this.subscribers) if (session.expiresAt <= now) this.subscribers.delete(id);
  }

  staleState(maxAgeMs = 5000) {
    if (!this.health.lastTickAt) return 'DISCONNECTED';
    const age = Date.now() - Date.parse(this.health.lastTickAt);
    return age > maxAgeMs ? 'STALE' : 'LIVE';
  }

  snapshot() {
    return {
      health: { ...this.health, state: this.staleState() },
      provider: this.activeProvider?.name || null,
      instruments: this.instrumentByIsin.size,
      quotes: this.quotes.size,
      candles: this.candles.size,
      subscriptions: this.subscribers.size
    };
  }

  packetChecksum(packet) {
    return crypto.createHash('sha256').update(JSON.stringify(packet)).digest('hex');
  }
}

module.exports = { MarketPipeline };
