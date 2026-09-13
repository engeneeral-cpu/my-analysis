const rateLimit = require('express-rate-limit');
const { getUniverse } = require('./company-routes');
const { sessionFor } = require('./exchange-calendar');
const { createHistoricalStorageAdapter, PENDING_NOTICE } = require('./services/historical-storage-adapter');

const RANGES = new Set(['1D', '1W', '1M', '1Y', '5Y', 'MAX']);
const INTERVALS = new Set(['1d', '1h', '15m']);
const CALENDAR_LAST_DATE = '2026-12-31';
const HISTORY_NOTICE = 'Official exchange historical records pending connection';
const storageAdapter = createHistoricalStorageAdapter();
const responseCache = new Map();

const historyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: 'Too many historical-data requests. Please try again later.' }
});

function securityMasterMatch(universe, symbol) {
  return universe.rows.find(company => {
    const values = [company.nseSymbol || company.symbol, company.bseSymbol, company.bseCode]
      .filter(Boolean)
      .map(value => String(value).toUpperCase());
    return values.includes(symbol);
  });
}

function cacheKey(symbol, range, interval) {
  return `${symbol}:${range}:${interval}`;
}

function calendarFiltered(candles) {
  const filtered = [];
  let calendarApplied = false;
  for (const candle of candles) {
    try {
      const session = sessionFor(candle.time, 'NSE');
      if (session.status === 'closed') {
        calendarApplied = true;
        continue;
      }
      if (candle.time <= CALENDAR_LAST_DATE) calendarApplied = true;
    } catch {
      // Keep source records when the local calendar has no coverage for that date.
    }
    filtered.push(candle);
  }
  return { candles: filtered, calendarApplied };
}

function pendingResponse(symbol, range, interval, notice = PENDING_NOTICE) {
  return {
    success: true,
    symbol,
    range,
    interval,
    candles: [],
    status: {
      verified: false,
      source: null,
      notice
    },
    metadata: {
      source: null,
      provider_type: 'historical-storage-adapter',
      verified: false,
      exchange: 'NSE',
      exchange_holidays_excluded: false,
      calendar_coverage: CALENDAR_LAST_DATE,
      notice
    }
  };
}

function verifiedResponse(symbol, range, interval, result, calendarApplied) {
  const status = {
    verified: true,
    source: result.source,
    notice: result.candles.length ? null : (result.notice || HISTORY_NOTICE)
  };
  return {
    success: true,
    symbol,
    range,
    interval,
    candles: result.candles,
    status,
    metadata: {
      source: result.source,
      provider_type: 'historical-storage-adapter',
      verified: true,
      exchange: 'NSE',
      exchange_holidays_excluded: calendarApplied,
      calendar_coverage: CALENDAR_LAST_DATE,
      notice: status.notice
    }
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

    // The storage contract currently covers daily OHLCV. Intraday intervals remain explicitly pending.
    if (interval !== '1d') return res.json(pendingResponse(symbol, range, interval, 'Authorized intraday historical storage connection pending'));

    const key = cacheKey(symbol, range, interval);
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return res.json(cached.body);
    if (cached) responseCache.delete(key);

    const result = await storageAdapter.fetchCandles(company.nseSymbol || company.symbol || symbol, 'NSE', range);
    if (!result.verified) {
      const body = pendingResponse(symbol, range, interval, result.notice || PENDING_NOTICE);
      responseCache.set(key, { body, expiresAt: Date.now() + 30 * 1000 });
      return res.json(body);
    }

    const { candles, calendarApplied } = calendarFiltered(result.candles);
    const body = verifiedResponse(symbol, range, interval, { ...result, candles }, calendarApplied);
    responseCache.set(key, { body, expiresAt: Date.now() + 60 * 1000 });
    return res.json(body);
  } catch (error) {
    console.error('[Market Analysis Historical OHLCV]', error.message);
    return res.status(503).json({
      success: false,
      symbol,
      range,
      interval,
      candles: [],
      status: { verified: false, source: null, notice: 'Authorized historical storage unavailable' },
      metadata: { source: null, provider_type: 'historical-storage-adapter', verified: false, exchange: 'NSE', exchange_holidays_excluded: false, calendar_coverage: CALENDAR_LAST_DATE, notice: 'Authorized historical storage unavailable' }
    });
  }
}

function registerHistoricalOHLCVRoutes(app) {
  app.get('/api/v1/company/:symbol/history', historyLimiter, historyHandler);
}

module.exports = {
  registerHistoricalOHLCVRoutes,
  calendarFiltered,
  pendingResponse,
  verifiedResponse,
  cacheKey,
  RANGES,
  INTERVALS,
  storageAdapter
};
