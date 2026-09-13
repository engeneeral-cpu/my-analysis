const assert = require('assert');
const { sanitizeSymbol, buildFinancials, buildShareholding, buildCorporateActions } = require('../company-360-routes');
const {
  normalizeProviderPayload,
  validateFinancialRows,
  validateShareholding,
  normalizeCorporateAction,
  validateCorporateActions
} = require('../company-360-data-service');

assert.strictEqual(sanitizeSymbol('RELIANCE'), 'RELIANCE');
assert.strictEqual(sanitizeSymbol('reliance'), 'RELIANCE');
assert.strictEqual(sanitizeSymbol('RELIANCE;DROP TABLE'), null);
assert.strictEqual(sanitizeSymbol('../secret'), null);
assert.strictEqual(sanitizeSymbol(''), null);
assert.strictEqual(sanitizeSymbol('A'.repeat(31)), null);

const pending = normalizeProviderPayload(null);
assert.deepStrictEqual(pending.financials, []);
assert.strictEqual(pending.shareholding, null);
assert.deepStrictEqual(pending.corporate_actions, []);
assert.strictEqual(buildFinancials(pending).notice, 'Awaiting quarterly filing ingestion');
assert.strictEqual(buildShareholding(pending).notice, 'Awaiting quarterly filing ingestion');
assert.strictEqual(buildCorporateActions(pending).notice, 'No active or historical corporate actions reported to exchange');

const valid = normalizeProviderPayload({
  verified: true,
  source: 'NSE_DISCLOSURES',
  as_of_date: '2026-06-30',
  financials: [{ quarter_ended: '2026-06-30', nature: 'Consolidated', revenue: 100, net_profit: 10, operating_profit_margin_pct: 15, eps: 2 }],
  shareholding: { promoter_holding_pct: 45, fii_holding_pct: 20, dii_holding_pct: 15, public_retail_pct: 20, pledged_shares_pct: 0 },
  corporate_actions: [
    {
      action_type: 'DIVIDEND',
      purpose: 'Interim Dividend - Rs 10 Per Share',
      ex_date: '2026-08-10',
      record_date: '2026-08-11',
      bc_start_date: '2026-08-08',
      bc_end_date: '2026-08-11',
      status: 'UPCOMING',
      source_filing: { verified: true, exchange: 'NSE', circular_ref: 'NSE/CORP/2026/001' }
    },
    {
      action_type: 'RIGHTS',
      purpose: 'Rights Issue - 1 Equity Share for every 4 held',
      ex_date: null,
      record_date: null,
      bc_start_date: null,
      bc_end_date: null,
      status: 'ANNOUNCED',
      source_filing: { verified: true, exchange: 'BSE', circular_ref: null }
    },
    {
      action_type: 'BUYBACK',
      purpose: 'Buyback of Equity Shares',
      ex_date: null,
      record_date: '2026-09-01',
      bc_start_date: null,
      bc_end_date: null,
      status: 'EXECUTED',
      source_filing: { verified: true, exchange: 'NSE', circular_ref: 'NSE/CORP/2026/002' }
    }
  ]
});
assert.strictEqual(valid.verified, true);
assert.strictEqual(valid.source, 'NSE_DISCLOSURES');
assert.strictEqual(valid.financials.length, 1);
assert.strictEqual(valid.shareholding.total_holding_pct, 100);
assert.strictEqual(valid.corporate_actions.length, 3);
assert.strictEqual(valid.corporate_actions[0].action_type, 'DIVIDEND');
assert.strictEqual(valid.corporate_actions[0].bc_start_date, '2026-08-08');
assert.strictEqual(valid.corporate_actions[1].status, 'ANNOUNCED');
assert.strictEqual(valid.corporate_actions[2].source_filing.exchange, 'NSE');
assert.strictEqual(buildCorporateActions(valid).status.verified, true);
assert.strictEqual(buildCorporateActions(valid).data.length, 3);

assert.strictEqual(validateFinancialRows([{ quarter_ended: 'bad', nature: 'Consolidated', revenue: 1, net_profit: 1, operating_profit_margin_pct: 1, eps: 1 }]).length, 0);
assert.strictEqual(validateShareholding({ promoter_holding_pct: 90, fii_holding_pct: 20, dii_holding_pct: 0, public_retail_pct: 0, pledged_shares_pct: 0 }), null);

assert.strictEqual(normalizeCorporateAction({
  action_type: 'DIVIDEND',
  purpose: 'Interim Dividend',
  ex_date: 'bad-date',
  record_date: null,
  bc_start_date: null,
  bc_end_date: null,
  status: 'UPCOMING',
  source_filing: { verified: true, exchange: 'NSE', circular_ref: null }
}), null);

assert.strictEqual(normalizeCorporateAction({
  action_type: 'DIVIDEND',
  purpose: 'Unverified dividend',
  ex_date: null,
  record_date: null,
  bc_start_date: null,
  bc_end_date: null,
  status: 'UPCOMING',
  source_filing: { verified: false, exchange: 'NSE', circular_ref: null }
}), null);

assert.strictEqual(normalizeCorporateAction({
  action_type: 'MERGER',
  purpose: 'Invalid action type',
  ex_date: null,
  record_date: null,
  bc_start_date: null,
  bc_end_date: null,
  status: 'UPCOMING',
  source_filing: { verified: true, exchange: 'NSE', circular_ref: null }
}), null);

assert.strictEqual(validateCorporateActions('not-an-array').length, 0);

console.log('Company 360 contract checks passed.');
