const EventEmitter = require('events');

class BoundedBackpressureBuffer extends EventEmitter {
  constructor({ maxSize = 100000, batchSize = 500 } = {}) {
    super();
    this.maxSize = maxSize;
    this.batchSize = batchSize;
    this.queue = [];
    this.dropped = 0;
    this.consuming = false;
  }
  push(item) {
    if (this.queue.length >= this.maxSize) {
      this.dropped += 1;
      this.emit('overflow', { dropped: this.dropped });
      return false;
    }
    this.queue.push(item);
    this.emit('available');
    return true;
  }
  async drain(consumer) {
    if (this.consuming) return;
    this.consuming = true;
    try {
      while (this.queue.length) {
        const batch = this.queue.splice(0, this.batchSize);
        await consumer(batch);
        await new Promise(resolve => setImmediate(resolve));
      }
    } finally { this.consuming = false; }
  }
  stats() { return { queued: this.queue.length, dropped: this.dropped, maxSize: this.maxSize, consuming: this.consuming }; }
}

class TickDeduplicator {
  constructor(maxKeys = 200000) { this.seen = new Map(); this.maxKeys = maxKeys; }
  accept(tick) {
    const key = tick.sequenceNumber == null ? null : `${tick.exchange || ''}:${tick.instrumentToken || tick.isin || tick.symbol}:${tick.sequenceNumber}`;
    if (!key) return true;
    if (this.seen.has(key)) return false;
    this.seen.set(key, Date.now());
    if (this.seen.size > this.maxKeys) this.seen.delete(this.seen.keys().next().value);
    return true;
  }
}

class ExchangeTimeCandleEngine {
  constructor({ graceMs = 3000 } = {}) { this.graceMs = graceMs; this.candles = new Map(); this.maxExchangeTime = new Map(); }
  ingest(tick) {
    const ts = Date.parse(tick.exchangeTimestamp || tick.timestamp || tick.retrievedAt);
    if (!Number.isFinite(ts) || !Number.isFinite(Number(tick.ltp))) return null;
    const instrument = tick.instrumentToken || tick.isin || tick.symbol;
    const minute = Math.floor(ts / 60000) * 60000;
    const key = `${tick.exchange || 'NSE'}:${instrument}:${minute}`;
    const p = Number(tick.ltp);
    let c = this.candles.get(key);
    if (!c) c = { key, exchange: tick.exchange || null, instrument, interval: '1m', timestamp: new Date(minute).toISOString(), open: p, high: p, low: p, close: p, volume: 0, verified: true };
    c.high = Math.max(c.high, p); c.low = Math.min(c.low, p); c.close = p; c.volume += Number(tick.tradeVolume || tick.volume || 0);
    c.lastExchangeTimestamp = new Date(ts).toISOString();
    c.final = Date.now() >= minute + 60000 + this.graceMs;
    this.candles.set(key, c);
    this.maxExchangeTime.set(instrument, Math.max(this.maxExchangeTime.get(instrument) || 0, ts));
    return c;
  }
  completed(limit = 500) { return [...this.candles.values()].filter(c => c.final).slice(-limit); }
}

class SnapshotDeltaHub extends EventEmitter {
  constructor() { super(); this.sessions = new Map(); }
  snapshot() { return { quotes: [], candles: [], generatedAt: new Date().toISOString(), dataStatus: 'provider-verified-or-unavailable' }; }
  connect(sessionId, channels = []) { this.sessions.set(sessionId, new Set(channels)); return this.snapshot(); }
  updateChannels(sessionId, channels = []) { if (this.sessions.has(sessionId)) this.sessions.set(sessionId, new Set(channels)); }
  disconnect(sessionId) { this.sessions.delete(sessionId); }
}

class UpdateThrottle {
  constructor({ intervalMs = 250 } = {}) { this.intervalMs = intervalMs; this.pending = new Map(); this.timers = new Map(); }
  push(channel, payload, emit) {
    this.pending.set(channel, payload);
    if (this.timers.has(channel)) return;
    this.timers.set(channel, setTimeout(() => { const p = this.pending.get(channel); this.pending.delete(channel); this.timers.delete(channel); emit(channel, p); }, this.intervalMs));
  }
}

module.exports = { BoundedBackpressureBuffer, TickDeduplicator, ExchangeTimeCandleEngine, SnapshotDeltaHub, UpdateThrottle };
