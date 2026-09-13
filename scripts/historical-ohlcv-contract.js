const assert = require('assert');
const { normalizeCandle, uniqueOrdered, licenseGate, calendarFiltered } = require('../historical-ohlcv-routes');

const original = {
  MARKET_HISTORY_LICENSE_STATUS: process.env.MARKET_HISTORY_LICENSE_STATUS,
  MARKET_HISTORY_DISPLAY_PERMISSION: process.env.MARKET_HISTORY_DISPLAY_PERMISSION,
  MARKET_HISTORY_PROVIDER_NAME: process.env.MARKET_HISTORY_PROVIDER_NAME
};

const valid = normalizeCandle(['2026-09-10', 100, 110, 95, 105, 12345], '1d');
assert.deepStrictEqual(valid, { time: '2026-09-10', open: 100, high: 110, low: 95, close: 105, volume: 12345 });
assert(valid.high >= Math.max(valid.open, valid.close, valid.low));
assert(valid.low <= Math.min(valid.open, valid.close, valid.high));

const invalid = normalizeCandle(['2026-09-11', 100, 90, 95, 105, 1], '1d');
assert.strictEqual(invalid, null);

const negative = normalizeCandle(['2026-09-11', -1, 2, 0, 1, 1], '1d');
assert.strictEqual(negative, null);

const intraday = normalizeCandle(['2026-09-10T10:15:00+05:30', 100, 102, 99, 101, 50], '15m');
assert.strictEqual(intraday.time, '2026-09-10T04:45:00.000Z');

const ordered = uniqueOrdered([
  ['2026-09-03', 103, 104, 102, 103.5, 10],
  ['2026-09-01', 101, 102, 100, 101.5, 8],
  ['2026-09-02', 102, 103, 101, 102.5, 9],
  ['2026-09-02', 102, 103, 101, 102.5, 9]
], '1d');
assert.deepStrictEqual(ordered.map(x => x.time), ['2026-09-01', '2026-09-02', '2026-09-03']);
assert.strictEqual(ordered.length, 3);

process.env.MARKET_HISTORY_LICENSE_STATUS = 'not-configured';
process.env.MARKET_HISTORY_DISPLAY_PERMISSION = 'not-configured';
assert.strictEqual(licenseGate().allowed, false);
process.env.MARKET_HISTORY_LICENSE_STATUS = 'licensed';
process.env.MARKET_HISTORY_DISPLAY_PERMISSION = 'allowed';
assert.strictEqual(licenseGate().allowed, true);

const calendarResult = calendarFiltered([
  { time: '2026-01-26', open: 100, high: 101, low: 99, close: 100, volume: 1 },
  { time: '2026-01-27', open: 100, high: 101, low: 99, close: 100, volume: 1 }
], '1d');
assert.deepStrictEqual(calendarResult.candles.map(c => c.time), ['2026-01-27']);
assert.strictEqual(calendarResult.knownCalendarApplied, true);

if (original.MARKET_HISTORY_LICENSE_STATUS === undefined) delete process.env.MARKET_HISTORY_LICENSE_STATUS; else process.env.MARKET_HISTORY_LICENSE_STATUS = original.MARKET_HISTORY_LICENSE_STATUS;
if (original.MARKET_HISTORY_DISPLAY_PERMISSION === undefined) delete process.env.MARKET_HISTORY_DISPLAY_PERMISSION; else process.env.MARKET_HISTORY_DISPLAY_PERMISSION = original.MARKET_HISTORY_DISPLAY_PERMISSION;
if (original.MARKET_HISTORY_PROVIDER_NAME === undefined) delete process.env.MARKET_HISTORY_PROVIDER_NAME; else process.env.MARKET_HISTORY_PROVIDER_NAME = original.MARKET_HISTORY_PROVIDER_NAME;

console.log(JSON.stringify({ pass: true, checks: ['OHLC invariants', 'invalid candle rejection', 'negative price rejection', 'intraday timestamp preservation', 'ordered deduplication', 'license/display gate', 'official 2026 holiday filtering'] }, null, 2));
