const assert = require('assert');
const { buildManagement, emptyManagement } = require('../company-360-routes');
const { normalizeManagement, normalizeDirector, normalizeKeyExecutive } = require('../company-360-data-service');

const pending = normalizeManagement(null);
assert.strictEqual(pending, null);
assert.deepStrictEqual(emptyManagement().data, { board_of_directors: [], key_executives: [] });
assert.strictEqual(emptyManagement().metadata.verified, false);
assert.strictEqual(emptyManagement().notice, 'Awaiting official management disclosure from exchange');

const valid = normalizeManagement({
  verified: true,
  source: 'NSE_DISCLOSURES',
  as_of_date: '2026-06-30',
  circular_ref: 'NSE/CORP/2026/001',
  management: {
    board_of_directors: [{
      name: 'Director One',
      din: '12345678',
      din_status: 'ACTIVE',
      disqualification_flag: false,
      designation: 'Independent Director',
      category: 'INDEPENDENT',
      appointment_date: '2024-07-01',
      cessation_date: null,
      term_start_date: '2024-07-01',
      term_end_date: '2029-06-30',
      term_duration_years: 5,
      is_active: true
    }],
    key_executives: [
      { name: 'Executive One', designation: 'CEO', appointment_date: '2025-01-01' },
      { name: 'Executive Two', designation: 'CFO', appointment_date: null }
    ]
  }
});
assert.ok(valid);
assert.strictEqual(valid.board_of_directors.length, 1);
assert.strictEqual(valid.board_of_directors[0].din, '12345678');
assert.strictEqual(valid.board_of_directors[0].din_status, 'ACTIVE');
assert.strictEqual(valid.board_of_directors[0].disqualification_flag, false);
assert.strictEqual(valid.board_of_directors[0].term_end_date, '2029-06-30');
assert.strictEqual(valid.board_of_directors[0].term_duration_years, 5);
assert.strictEqual(valid.key_executives.length, 2);

const built = buildManagement({
  management: valid,
  management_source: 'NSE_DISCLOSURES',
  management_as_of_date: '2026-06-30',
  management_circular_ref: 'NSE/CORP/2026/001'
});
assert.strictEqual(built.metadata.verified, true);
assert.strictEqual(built.metadata.source, 'NSE_DISCLOSURES');
assert.strictEqual(built.data.board_of_directors.length, 1);

assert.strictEqual(normalizeManagement({
  verified: false,
  source: 'NSE_DISCLOSURES',
  as_of_date: '2026-06-30',
  management: { board_of_directors: [], key_executives: [] }
}), null);

assert.strictEqual(normalizeManagement({
  verified: true,
  source: 'NSE_DISCLOSURES',
  as_of_date: 'bad-date',
  management: { board_of_directors: [], key_executives: [] }
}), null);

assert.strictEqual(normalizeManagement({
  verified: true,
  source: 'NSE_DISCLOSURES',
  as_of_date: '2026-06-30',
  management: { board_of_directors: [], key_executives: 'corrupt' }
}), null);

assert.strictEqual(normalizeDirector({
  name: 'Director Two',
  din: '123',
  din_status: 'ACTIVE',
  designation: 'Director',
  category: 'INDEPENDENT',
  appointment_date: null,
  cessation_date: null,
  term_start_date: null,
  term_end_date: null,
  term_duration_years: null,
  is_active: true
}), null);

assert.strictEqual(normalizeDirector({
  name: 'Director Three',
  din: '12345678',
  din_status: 'DISQUALIFIED',
  disqualification_flag: true,
  designation: 'Director',
  category: 'INDEPENDENT',
  appointment_date: null,
  cessation_date: null,
  term_start_date: null,
  term_end_date: null,
  term_duration_years: null,
  is_active: true
}).disqualification_flag, true);

assert.strictEqual(normalizeDirector({
  name: 'Director Four',
  din: null,
  din_status: 'UNKNOWN',
  designation: 'Director',
  category: 'NON_EXECUTIVE',
  appointment_date: null,
  cessation_date: null,
  term_start_date: null,
  term_end_date: null,
  term_duration_years: null,
  is_active: true
}).din, null);

assert.strictEqual(normalizeKeyExecutive({ name: 'Executive Three', designation: 'CEO', appointment_date: 'bad-date' }), null);

console.log('Management module contract checks passed.');
