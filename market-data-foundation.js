const EventEmitter = require('events');

/**
 * Tara AI Market Data Foundation
 *
 * Provider-agnostic, verified-data-only market stream state.
 * No simulated ticks, fallback prices, or hard-coded market values are allowed.
 * A licensed/authorized provider adapter can call ingestQuote()/ingestIndex().
 */
class MarketDataFoundation extends EventEmitter {
  constructor() {
    super();
    this.startedAt = new Date().toISOString();
    this.quotes = new Map();
    this.indices = new Map();
    this.provider = {
      name: process.env.MARKET_DATA_STREAM_PROVIDER_NAME || null,
      type: process.env.MARKET_DATA_PROVIDER_TYPE || 'licensed-or-authorized-provider',
      licenseStatus: process.env.MARKET_DATA_LICENSE_STATUS || 'not-configured',
      displayPermission: process.env.MARKET_DATA_DISPLAY_PERMISSION || 'not-configured',
      redistributionPermission: process.env.MARKET_DATA_REDISTRIBUTION_PERMISSION || 'not-configured'
    };
  }

  isProviderReady() {
    return Boolean(
      this.provider.name &&
      ['licensed', 'authorized', 'active'].includes(String(this.provider.licenseStatus).toLowerCase()) &&
      ['allowed', 'licensed', 'authorized', 'active'].includes(String(this.provider.displayPermission).toLowerCase())
    );
  }

  ingestQuote(quote) {
    const normalized = this.normalize(quote, 'quote');
    if (!normalized) return { accepted: false, reason: 'Invalid verified quote payload' };
    this.quotes.set(normalized.key, normalized);
    this.emit('quote', normalized);
    return { accepted: true, data: normalized };
  }

  ingestIndex(index) {
    const normalized = this.normalize(index, 'index');
    if (!normalized) return { accepted: false, reason: 'Invalid verified index payload' };
    this.indices.set(normalized.key, normalized);
    this.emit('index', normalized);
    return { accepted: true, data: normalized };
  }

  normalize(value, kind) {
    if (!value || value.verified !== true || !value.source || !value.retrievedAt) return null;
    const key = String(value.symbol || value.name || '').trim().toUpperCase();
    if (!key) return null;
    const ltp = Number(value.ltp);
    const previousClose = Number(value.previousClose);
    if (!Number.isFinite(ltp) || !Number.isFinite(previousClose)) return null;
    const change = ltp - previousClose;
    return {
      kind,
      key,
      symbol: value.symbol || null,
      name: value.name || null,
      exchange: value.exchange || null,
      ltp,
      previousClose,
      change,
      percentChange: previousClose ? (change / previousClose) * 100 : null,
      open: Number.isFinite(Number(value.open)) ? Number(value.open) : null,
      high: Number.isFinite(Number(value.high)) ? Number(value.high) : null,
      low: Number.isFinite(Number(value.low)) ? Number(value.low) : null,
      volume: Number.isFinite(Number(value.volume)) ? Number(value.volume) : null,
      source: String(value.source),
      retrievedAt: String(value.retrievedAt),
      verified: true
    };
  }

  snapshot() {
    return {
      provider: this.provider,
      providerReady: this.isProviderReady(),
      indices: [...this.indices.values()],
      quotes: [...this.quotes.values()],
      startedAt: this.startedAt
    };
  }
}

module.exports = { MarketDataFoundation };
