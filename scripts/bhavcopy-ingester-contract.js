'use strict';
const assert = require('assert');
const { parseCsv, normalizeNew, normalizeOld } = require('./bhavcopy-ingester');

const csv = 'TckrSymb,SctySrs,TradDt,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol\nTCS,EQ,2026-08-20,4000,4100,3950,4050,123456\nTEST,XX,2026-08-20,1,2,1,2,10\n';
const rows = parseCsv(csv);
assert.strictEqual(rows.length, 2);
const candle = normalizeNew(rows[0], 'https://nsearchives.nseindia.com/content/cm/example.zip');
assert.ok(candle);
assert.strictEqual(candle.symbol, 'TCS');
assert.strictEqual(candle.trade_date, '2026-08-20');
assert.strictEqual(candle.exchange, 'NSE');
assert.strictEqual(candle.verified, true);
assert.strictEqual(candle.volume, 123456);
assert.strictEqual(normalizeNew(rows[1], 'source'), null);

const old = normalizeOld({SYMBOL:'RELIANCE',SERIES:'EQ',TIMESTAMP:'20-AUG-2026',OPEN:'3000',HIGH:'3050',LOW:'2980',CLOSE:'3030',TOTTRDQTY:'999'}, 'legacy');
assert.ok(old);
assert.strictEqual(old.trade_date, '2026-08-20');
assert.strictEqual(old.symbol, 'RELIANCE');
assert.strictEqual(old.volume, 999);

assert.strictEqual(normalizeNew({TckrSymb:'TCS',SctySrs:'EQ',TradDt:'2026-08-20',OpnPric:'10',HghPric:'9',LwPric:'8',ClsPric:'10'}, 'x'), null);
assert.strictEqual(normalizeNew({TckrSymb:'TCS',SctySrs:'EQ',TradDt:'2026-08-20',OpnPric:'10',HghPric:'12',LwPric:'11',ClsPric:'10'}, 'x'), null);

console.log('Bhavcopy ingester contract: PASS');
