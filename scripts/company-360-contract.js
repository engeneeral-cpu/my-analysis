const assert = require('assert');
const { sanitizeSymbol, buildFinancials, buildShareholding } = require('../company-360-routes');
const { normalizeProviderPayload, validateFinancialRows, validateShareholding } = require('../company-360-data-service');

assert.strictEqual(sanitizeSymbol('RELIANCE'), 'RELIANCE');
assert.strictEqual(sanitizeSymbol('reliance'), 'RELIANCE');
assert.strictEqual(sanitizeSymbol('RELIANCE;DROP TABLE'), null);
assert.strictEqual(sanitizeSymbol('../secret'), null);
assert.strictEqual(sanitizeSymbol(''), null);
assert.strictEqual(sanitizeSymbol('A'.repeat(31)), null);

const pending = normalizeProviderPayload(null);
assert.deepStrictEqual(pending.financials, []);
assert.strictEqual(pending.shareholding, null);
assert.strictEqual(buildFinancials(pending).notice, 'Awaiting quarterly filing ingestion');
assert.strictEqual(buildShareholding(pending).notice, 'Awaiting quarterly filing ingestion');

const valid = normalizeProviderPayload({
  verified: true,
  source: 'NSE_DISCLOSURES',
  as_of_date: '2026-06-30',
  financials: [{ quarter_ended: '2026-06-30', nature: 'Consolidated', revenue: 100, net_profit: 10, operating_profit_margin_pct: 15, eps: 2 }],
  shareholding: { promoter_holding_pct: 45, fii_holding_pct: 20, dii_holding_pct: 15, public_retail_pct: 20, pledged_shares_pct: 0 }
});
assert.strictEqual(valid.verified, true);
assert.strictEqual(valid.source, 'NSE_DISCLOSURES');
assert.strictEqual(valid.financials.length, 1);
assert.strictEqual(valid.shareholding.total_holding_pct, 100);
assert.strictEqual(validateFinancialRows([{ quarter_ended: 'bad', nature: 'Consolidated', revenue: 1, net_profit: 1, operating_profit_margin_pct: 1, eps: 1 }]).length, 0);
assert.strictEqual(validateShareholding({ promoter_holding_pct: 90, fii_holding_pct: 20, dii_holding_pct: 0, public_retail_pct: 0, pledged_shares_pct: 0 }), null);

console.log('Company 360 contract checks passed.');
