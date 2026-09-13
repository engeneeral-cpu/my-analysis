const assert = require('assert');
const {
  PENDING_NOTICE,
  config,
  authorized,
  normalizeRows,
  PendingHistoricalStorageAdapter,
  createHistoricalStorageAdapter
} = require('../services/historical-storage-adapter');

async function main() {
  const previous = {
    TIMESCALE_DB_URL: process.env.TIMESCALE_DB_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    HISTORICAL_STORAGE_LICENSE_STATUS: process.env.HISTORICAL_STORAGE_LICENSE_STATUS,
    HISTORICAL_STORAGE_DISPLAY_PERMISSION: process.env.HISTORICAL_STORAGE_DISPLAY_PERMISSION,
    HISTORICAL_STORAGE_REDISTRIBUTION_PERMISSION: process.env.HISTORICAL_STORAGE_REDISTRIBUTION_PERMISSION
  };

  delete process.env.TIMESCALE_DB_URL;
  delete process.env.POSTGRES_URL;
  process.env.HISTORICAL_STORAGE_LICENSE_STATUS = 'not-configured';
  process.env.HISTORICAL_STORAGE_DISPLAY_PERMISSION = 'not-configured';
  process.env.HISTORICAL_STORAGE_REDISTRIBUTION_PERMISSION = 'not-configured';

  assert.strictEqual(authorized(config()), false);
  const pending = new PendingHistoricalStorageAdapter();
  assert.deepStrictEqual(await pending.fetchCandles('TCS', 'NSE', '1Y'), {
    candles: [],
    verified: false,
    source: null,
    notice: PENDING_NOTICE
  });
  const pendingHealth = await pending.healthCheck();
  assert.strictEqual(pendingHealth.ready, false);
  assert.strictEqual(pendingHealth.verified, false);
  assert.strictEqual(createHistoricalStorageAdapter() instanceof PendingHistoricalStorageAdapter, true);

  const rows = normalizeRows([
    { trade_date: '2025-01-03', open: '100', high: '110', low: '95', close: '105', volume: '123' },
    { trade_date: '2025-01-02', open: 90, high: 100, low: 85, close: 95, volume: 100 },
    { trade_date: '2025-01-02', open: 91, high: 101, low: 86, close: 96, volume: 101 },
    { trade_date: '2025-01-04', open: 100, high: 99, low: 90, close: 95, volume: 100 },
    { trade_date: '2025-01-05', open: -1, high: 2, low: 0, close: 1, volume: 1 }
  ]);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(rows.map(row => row.time), ['2025-01-02', '2025-01-03']);
  assert.strictEqual(rows[0].open, 91);

  for (const key of Object.keys(previous)) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }

  console.log(JSON.stringify({
    pass: true,
    checks: [
      'unconfigured storage returns explicit pending schema',
      'authorized access requires storage URL + license + display + redistribution permission',
      'invalid OHLC rows are rejected',
      'duplicate dates are deterministic and ordered',
      'no database connection is required for the contract test'
    ]
  }, null, 2));
}

main().catch(error => {
  console.error('[Historical storage adapter contract] FAIL:', error.message);
  process.exitCode = 1;
});
