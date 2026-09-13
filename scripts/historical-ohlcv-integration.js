const assert = require('assert');

const baseUrl = String(process.env.TARA_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const explicitSymbol = String(process.env.TARA_TEST_SYMBOL || '').trim().toUpperCase();
const invalidSymbol = '__TARA_HISTORY_INVALID__';

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } });
  const body = await response.json();
  return { response, body };
}

function assertCandle(candle) {
  assert(candle && typeof candle === 'object');
  assert(typeof candle.time === 'string' && candle.time.length > 0);
  for (const field of ['open', 'high', 'low', 'close']) assert(Number.isFinite(Number(candle[field])));
  assert(candle.volume == null || Number.isFinite(Number(candle.volume)));
  assert(Number(candle.high) >= Math.max(Number(candle.open), Number(candle.close), Number(candle.low)));
  assert(Number(candle.low) <= Math.min(Number(candle.open), Number(candle.close), Number(candle.high)));
}

function assertOrdered(candles) {
  for (let i = 1; i < candles.length; i += 1) assert(candles[i - 1].time < candles[i].time);
}

async function discoverSymbol() {
  if (explicitSymbol) return explicitSymbol;
  const { response, body } = await getJson('/api/companies?limit=1');
  assert(response.ok, `Company universe discovery failed with HTTP ${response.status}`);
  const symbol = body?.results?.[0]?.symbol;
  assert(typeof symbol === 'string' && symbol.length > 0, 'No verified company symbol available for integration test');
  return symbol.toUpperCase();
}

async function main() {
  const symbol = await discoverSymbol();
  const { response, body } = await getJson(`/api/v1/company/${encodeURIComponent(symbol)}/history?range=1Y&interval=1d`);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.symbol, symbol);
  assert.strictEqual(body.range, '1Y');
  assert.strictEqual(body.interval, '1d');
  assert(Array.isArray(body.candles));
  assert(body.metadata && typeof body.metadata === 'object');
  assert(typeof body.metadata.verified === 'boolean');
  assert.strictEqual(body.metadata.exchange_holidays_excluded, body.metadata.verified ? body.metadata.exchange_holidays_excluded : false);
  if (body.metadata.verified) {
    assert(body.candles.length > 0, 'Verified historical response must contain candles');
    body.candles.forEach(assertCandle);
    assertOrdered(body.candles);
    assert(body.metadata.source, 'Verified historical response must identify its provider');
  } else {
    assert.strictEqual(body.candles.length, 0);
    assert.strictEqual(body.metadata.notice, 'Historical exchange data pending ingestion');
  }

  const invalid = await getJson(`/api/v1/company/${invalidSymbol}/history?range=1Y&interval=1d`);
  assert.strictEqual(invalid.response.status, 404);
  assert.deepStrictEqual(invalid.body, { error: 'Company not found in verified universe' });

  console.log(JSON.stringify({
    pass: true,
    symbol,
    validStatus: response.status,
    candleCount: body.candles.length,
    verified: body.metadata.verified,
    invalidStatus: invalid.response.status,
    checks: ['valid symbol schema', 'clean pending or verified state', 'OHLC invariants', 'strict ordering', 'unknown symbol 404']
  }, null, 2));
}

main().catch(error => {
  console.error('[Historical OHLCV integration] FAIL:', error.message);
  process.exitCode = 1;
});
