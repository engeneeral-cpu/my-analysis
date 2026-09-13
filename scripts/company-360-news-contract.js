const assert = require('assert');
const { normalizeNewsItem, normalizeNewsPayload } = require('../company-360-news-service');
const { buildDisclosuresNews, emptyDisclosuresNews } = require('../company-360-routes');

assert.deepStrictEqual(emptyDisclosuresNews().data, []);
assert.strictEqual(emptyDisclosuresNews().status.verified, false);

const validItem = normalizeNewsItem({
  title: 'Quarterly results filed with the exchange',
  published_at: '2026-09-13T09:15:00Z',
  url: 'https://example.com/disclosure/1',
  source: 'NSE',
  category: 'RESULTS',
  verified: true
});
assert.strictEqual(validItem.verified, true);
assert.strictEqual(validItem.category, 'RESULTS');

assert.strictEqual(normalizeNewsItem({
  title: 'Unverified item',
  published_at: '2026-09-13T09:15:00Z',
  url: 'https://example.com/news',
  source: 'Unknown',
  category: 'GENERAL',
  verified: false
}), null);

assert.strictEqual(normalizeNewsItem({
  title: 'Invalid URL',
  published_at: '2026-09-13T09:15:00Z',
  url: 'http://example.com/news',
  source: 'NSE',
  category: 'GENERAL',
  verified: true
}), null);

const valid = normalizeNewsPayload({
  verified: true,
  source: 'NSE_DISCLOSURES',
  as_of_date: '2026-09-13T10:00:00Z',
  items: [validItem]
});
assert.strictEqual(valid.verified, true);
assert.strictEqual(valid.source, 'NSE_DISCLOSURES');
assert.strictEqual(valid.items.length, 1);
assert.strictEqual(buildDisclosuresNews(valid).status.verified, true);
assert.strictEqual(buildDisclosuresNews(valid).data.length, 1);

assert.strictEqual(normalizeNewsPayload({ verified: true, source: 'UNKNOWN', as_of_date: '2026-09-13T10:00:00Z', items: [validItem] }), null);
assert.strictEqual(normalizeNewsPayload({ verified: true, source: 'NSE_DISCLOSURES', as_of_date: 'bad', items: [validItem] }), null);
assert.strictEqual(normalizeNewsPayload({ verified: true, source: 'NSE_DISCLOSURES', as_of_date: '2026-09-13T10:00:00Z', items: [{ ...validItem, category: 'RUMOR' }] }), null);

console.log('Company 360 news contract checks passed.');
