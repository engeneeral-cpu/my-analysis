const assert = require('assert');
const {
  PENDING_NOTICE,
  config,
  authorized,
  normalizeRows,
  PendingHistoricalStorageAdapter,
  createHistoricalStorageAdapter
} = require('../services/historical-storage-adapter');

const { calendarFiltered } = require('../historical-ohlcv-routes');

async function main() {
  const previous = {
    TIMESCALE_DB_URL: process.env.TIMESCALE_DB_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    HISTORICAL_STORAGE_LICENSE_STATUS: process.env.HISTORICAL_STORAGE_LICENSE_STATUS,
    HISTORICAL_STORAGE_DISPLAY_PERMISSION: process.env.HISTORICAL_STORAGE_DISPLAY_PERMISSION,
    HISTORICAL_STORAGE_REDISTRIBUTION_PERMISSION: process.env.HISTORICAL_STORAGE_REDISTRIBUTION_PERMISSION
  };

  try {
    delete process.env.TIMESCALE_DB_URL;
    delete process.env.POSTGRES_URL;
    process.env.HISTORICAL_STORAGE_LICENSE_STATUS = 'not-configured';
    process.env.HISTORICAL_STORAGE_DISPLAY_PERMISSION = 'not-configured';
    process.env.HISTORICAL_STORAGE_REDISTRIBUTION_PERMISSION = 'not-configured';

    // The historical OHLCV contract must use the functions actually exported by
    // the storage adapter. normalizeCandle was a stale API and is intentionally
    // replaced by normalizeRows.
    assert.strictEqual(authorized(config()), false);

    const pending = new PendingHistoricalStorageAdapter();
    assert.deepStrictEqual(
      await pending.fetchCandles('TCS', 'NSE', '1Y'),
      {
        candles: [],
        verified: false,
        source: null,
        notice: PENDING_NOTICE
      }
    );

    const pendingHealth = await pending.healthCheck();
    assert.strictEqual(pendingHealth.ready, false);
    assert.strictEqual(pendingHealth.verified, false);
    assert.strictEqual(
      createHistoricalStorageAdapter() instanceof PendingHistoricalStorageAdapter,
      true
    );

    const rows = normalizeRows([
      {
        trade_date: '2025-01-03',
        open: '100',
        high: '110',
        low: '95',
        close: '105',
        volume: '123'
      },
      {
        trade_date: '2025-01-02',
        open: 90,
        high: 100,
        low: 85,
        close: 95,
        volume: 100
      },
      {
        trade_date: '2025-01-02',
        open: 91,
        high: 101,
        low: 86,
        close: 96,
        volume: 101
      },
      {
        trade_date: '2025-01-04',
        open: 100,
        high: 99,
        low: 90,
        close: 95,
        volume: 100
      },
      {
        trade_date: '2025-01-05',
        open: -1,
        high: 2,
        low: 0,
        close: 1,
        volume: 1
      }
    ]);

    assert.strictEqual(rows.length, 2);
    assert.deepStrictEqual(
      rows.map(row => row.time),
      ['2025-01-02', '2025-01-03']
    );
    assert.strictEqual(rows[0].open, 91);
    assert.strictEqual(rows[0].high, 101);
    assert.strictEqual(rows[0].low, 86);
    assert.strictEqual(rows[0].close, 96);
    assert.strictEqual(rows[0].volume, 101);

    const calendarResult = calendarFiltered([
      {
        time: '2026-01-26',
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1
      },
      {
        time: '2026-01-27',
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1
      }
    ]);

    assert.deepStrictEqual(
      calendarResult.candles.map(candle => candle.time),
      ['2026-01-27']
    );
    assert.strictEqual(calendarResult.calendarApplied, true);

    console.log(JSON.stringify({
      pass: true,
      checks: [
        'historical storage adapter exports',
        'unconfigured storage pending schema',
        'invalid OHLC rejection',
        'duplicate-date normalization',
        'ordered daily candles',
        'official holiday filtering'
      ]
    }, null, 2));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

main().catch(error => {
  console.error('[Historical OHLCV contract] FAIL:', error.message);
  process.exitCode = 1;
});
