const assert = require('assert');
const { normalizeCandle, uniqueOrdered } = require('../historical-ohlcv-routes');

const valid = normalizeCandle(['2026-09-10', 100, 110, 95, 105, 12345], '1d');
assert.deepStrictEqual(valid, { time: '2026-09-10', open: 100, high: 110, low: 95, close: 105, volume: 12345 });
assert(valid.high >= Math.max(valid.open, valid.close, valid.low));
assert(valid.low <= Math.min(valid.open, valid.close, valid.high));

const invalid = normalizeCandle(['2026-09-11', 100, 90, 95, 105, 1], '1d');
assert.strictEqual(invalid, null);

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

console.log(JSON.stringify({ pass: true, checks: ['OHLC invariants', 'invalid candle rejection', 'intraday timestamp preservation', 'ordered deduplication'] }, null, 2));
