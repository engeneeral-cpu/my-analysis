#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const baseUrl = String(process.env.TARA_BASE_URL || 'https://my-analysis-1.onrender.com').replace(/\/$/, '');
const failures = [];
const results = [];

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'TaraAI-ProductionSmoke/1.0' } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', x => body += x);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function check(path, predicate) {
  try {
    const response = await get(path);
    let json = null;
    try { json = JSON.parse(response.body); } catch {}
    const pass = predicate(response, json);
    results.push({ path, status: response.status, pass });
    if (!pass) failures.push({ path, status: response.status });
  } catch (e) {
    results.push({ path, pass: false, error: e.message });
    failures.push({ path, error: e.message });
  }
}

(async () => {
  await check('/api/health', (r, j) => r.status === 200 && j?.success === true && j?.status === 'ok');
  await check('/api/security-status', (r, j) => r.status === 200 && j?.success === true);
  await check('/api/tara-intelligence/status', (r, j) => r.status === 200 && j?.success === true);
  await check('/api/exchange-calendar/status', (r, j) => r.status === 200 && j?.success === true);
  await check('/api/companies/status', (r, j) => r.status === 200 && j?.success === true);
  await check('/api/live-market/status', (r, j) => r.status === 200 && j?.success === true);
  await check('/api/companies?limit=1', (r, j) => r.status === 200 && j?.success === true);
  await check('/api/market-history/INVALID_TARA_SYMBOL?range=1m', (r, j) => [400,404].includes(r.status) && j?.success === false);
  await check('/api/live-market/quote/INVALID_TARA_SYMBOL', (r, j) => [400,404,409,503].includes(r.status) && j?.success === false);

  const report = { product: 'Tara AI', suite: 'Production Smoke', timestamp: new Date().toISOString(), baseUrl, pass: failures.length === 0, results, failures };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = failures.length ? 1 : 0;
})();
