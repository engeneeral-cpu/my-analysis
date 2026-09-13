const assert = require('assert');
const { sanitizeSymbol } = require('../company-360-routes');

assert.strictEqual(sanitizeSymbol('RELIANCE'), 'RELIANCE');
assert.strictEqual(sanitizeSymbol('reliance'), 'RELIANCE');
assert.strictEqual(sanitizeSymbol('RELIANCE;DROP TABLE'), null);
assert.strictEqual(sanitizeSymbol('../secret'), null);
assert.strictEqual(sanitizeSymbol(''), null);
assert.strictEqual(sanitizeSymbol('A'.repeat(31)), null);

console.log('Company 360 contract checks passed.');
