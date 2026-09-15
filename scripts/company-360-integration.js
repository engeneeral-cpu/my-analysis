#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');
const assert = require('assert');

const baseUrl = String(process.env.TARA_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const requestedSymbol = String(process.env.TARA_TEST_SYMBOL || '').trim().toUpperCase();
const INVALID_SYMBOL = '__TARA_COMPANY_360_INVALID__';

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'TaraAI-Company360-Integration/1.1', Accept: 'application/json' }
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, json, body });
      });
    });
    req.setTimeout(20000, () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
  });
}

function discoverValidSymbol(companiesResponse) {
  const companies = companiesResponse?.json?.companies || companiesResponse?.json?.results || [];
  const company = companies.find(item => typeof item?.nseSymbol === 'string' && item.nseSymbol.trim())
    || companies.find(item => typeof item?.bseSymbol === 'string' && item.bseSymbol.trim())
    || companies.find(item => typeof item?.bseCode === 'string' && item.bseCode.trim());
  return company?.nseSymbol || company?.bseSymbol || company?.bseCode || null;
}

function assertSectionEnvelope(section, name, dataType) {
  assert.ok(section && typeof section === 'object', `${name} section missing`);
  assert.ok(Object.prototype.hasOwnProperty.call(section, 'data'), `${name}.data missing`);
  assert.ok(section.status && typeof section.status === 'object', `${name}.status missing`);
  assert.strictEqual(typeof section.status.verified, 'boolean', `${name}.status.verified must be boolean`);
  assert.ok(Object.prototype.hasOwnProperty.call(section.status, 'as_of_date'), `${name}.status.as_of_date missing`);
  assert.ok(Object.prototype.hasOwnProperty.call(section.status, 'source'), `${name}.status.source missing`);
  if (dataType === 'array') assert.ok(Array.isArray(section.data), `${name}.data must be an array`);
}

function assertCompany360(payload, symbol) {
  assert.strictEqual(payload?.success, true, 'Company 360 success must be true');
  assert.strictEqual(payload?.symbol, symbol, 'Company 360 symbol mismatch');
  assert.strictEqual(payload?.data_policy, 'strict-zero-fake-data', 'Strict zero-fake policy missing');
  assert.ok(/^1\.\d+\.0$/.test(String(payload?.schemaVersion || '')), 'Company 360 schemaVersion missing/invalid');

  assert.ok(payload.profile && typeof payload.profile === 'object', 'profile section missing');
  for (const field of ['symbol', 'company_name', 'isin', 'exchange', 'data_status']) {
    assert.ok(Object.prototype.hasOwnProperty.call(payload.profile, field), `profile.${field} missing`);
  }
  assert.strictEqual(typeof payload.profile.company_name, 'string', 'profile.company_name must be verified text');
  assert.ok(payload.profile.company_name.trim(), 'profile.company_name must not be empty');
  if (payload.profile.isin !== null) assert.ok(/^IN[A-Z0-9]{10}$/.test(payload.profile.isin), 'profile.isin must be a valid ISIN when present');
  assert.strictEqual(typeof payload.profile.exchange, 'string', 'profile.exchange must be present for a verified company');
  assert.ok(payload.profile.exchange.trim(), 'profile.exchange must not be empty');
  assert.strictEqual(payload.profile.data_status.verified, true, 'profile identity must be verified');
  assert.strictEqual(typeof payload.profile.data_status.isin_live, 'boolean', 'profile.data_status.isin_live must be boolean');
  if (payload.profile.isin === null) assert.ok(typeof payload.profile.data_status.isin_notice === 'string' && payload.profile.data_status.isin_notice.trim(), 'missing ISIN requires explicit notice');

  assert.ok(payload.trading_overview && typeof payload.trading_overview === 'object', 'trading_overview section missing');

  assertSectionEnvelope(payload.financials, 'financials', 'array');
  assertSectionEnvelope(payload.shareholding, 'shareholding');
  assertSectionEnvelope(payload.corporate_actions, 'corporate_actions', 'array');
  assert.ok(payload.management && typeof payload.management === 'object', 'management section missing');
  assert.ok(payload.management.data && typeof payload.management.data === 'object', 'management.data missing');
  assert.ok(Array.isArray(payload.management.data.board_of_directors), 'management.board_of_directors must be an array');
  assert.ok(Array.isArray(payload.management.data.key_executives), 'management.key_executives must be an array');
  assert.ok(payload.management.metadata && typeof payload.management.metadata === 'object', 'management.metadata missing');
  assert.strictEqual(typeof payload.management.metadata.verified, 'boolean', 'management.metadata.verified must be boolean');
  assert.ok(Object.prototype.hasOwnProperty.call(payload.management.metadata, 'source'), 'management.metadata.source missing');
  assert.ok(Object.prototype.hasOwnProperty.call(payload.management.metadata, 'as_of_date'), 'management.metadata.as_of_date missing');

  assertSectionEnvelope(payload.disclosures_news, 'disclosures_news', 'array');

  for (const [name, section] of Object.entries({
    financials: payload.financials,
    shareholding: payload.shareholding,
    corporate_actions: payload.corporate_actions,
    disclosures_news: payload.disclosures_news
  })) {
    if (section.status.verified === false) {
      assert.ok(typeof section.notice === 'string' && section.notice.trim(), `${name} empty state requires a notice`);
    } else {
      assert.ok(Array.isArray(section.data) ? section.data.every(Boolean) : section.data && typeof section.data === 'object', `${name} verified data must be structured`);
      assert.ok(typeof section.status.source === 'string' && section.status.source.trim(), `${name} verified state requires source`);
      assert.ok(typeof section.status.as_of_date === 'string' && section.status.as_of_date.trim(), `${name} verified state requires as_of_date`);
    }
  }

  if (payload.management.metadata.verified === false) {
    assert.ok(typeof payload.management.notice === 'string' && payload.management.notice.trim(), 'management empty state requires a notice');
  } else {
    assert.ok(['NSE_DISCLOSURES', 'BSE_DISCLOSURES'].includes(payload.management.metadata.source), 'management source must be an official exchange disclosure source');
    assert.ok(typeof payload.management.metadata.as_of_date === 'string' && payload.management.metadata.as_of_date.trim(), 'management verified state requires as_of_date');
  }

  for (const item of payload.disclosures_news.data) {
    assert.strictEqual(item.verified, true, 'disclosures_news contains an unverified item');
  }
  for (const director of payload.management.data.board_of_directors) {
    assert.strictEqual(typeof director.name, 'string', 'director.name must be text');
    assert.strictEqual(typeof director.designation, 'string', 'director.designation must be text');
    assert.strictEqual(typeof director.is_active, 'boolean', 'director.is_active must be boolean');
    if (director.din !== null) assert.ok(/^\d{8}$/.test(director.din), 'director DIN must be 8 digits');
  }
}

(async () => {
  const discovery = requestedSymbol
    ? { status: 200, json: { companies: [{ nseSymbol: requestedSymbol }] } }
    : await get('/api/companies?limit=1');

  if (!requestedSymbol) {
    assert.strictEqual(discovery.status, 200, `Company universe discovery failed with HTTP ${discovery.status}`);
    assert.strictEqual(discovery.json?.success, true, 'Company universe discovery must succeed');
  }

  const symbol = requestedSymbol || discoverValidSymbol(discovery);
  assert.ok(symbol, 'No valid verified-universe symbol was discovered');

  const valid = await get(`/api/v1/company/${encodeURIComponent(symbol)}/360`);
  assert.strictEqual(valid.status, 200, `Valid Company 360 request returned HTTP ${valid.status}`);
  assertCompany360(valid.json, String(symbol).toUpperCase());

  const invalid = await get(`/api/v1/company/${encodeURIComponent(INVALID_SYMBOL)}/360`);
  assert.strictEqual(invalid.status, 404, `Invalid Company 360 request returned HTTP ${invalid.status}`);
  assert.deepStrictEqual(invalid.json, { error: 'Company not found in verified universe' });

  console.log(JSON.stringify({
    product: 'Tara AI',
    suite: 'Company 360 Integration Verification',
    baseUrl,
    validSymbol: String(symbol).toUpperCase(),
    isin: valid.json.profile.isin,
    isinLive: valid.json.profile.data_status.isin_live,
    validEndpoint: { status: valid.status, schemaVersion: valid.json.schemaVersion, pass: true },
    invalidEndpoint: { status: invalid.status, error: invalid.json.error, pass: true },
    sections: ['profile', 'financials', 'shareholding', 'corporate_actions', 'management', 'disclosures_news'],
    policy: valid.json.data_policy,
    pass: true
  }, null, 2));
})().catch(error => {
  console.error(JSON.stringify({
    product: 'Tara AI',
    suite: 'Company 360 Integration Verification',
    baseUrl,
    pass: false,
    error: error.message
  }, null, 2));
  process.exitCode = 1;
});
