#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const root = path.resolve(__dirname, '..');
const baseUrl = String(process.env.TARA_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4000}`).replace(/\/$/, '');
const strictExternal = String(process.env.TARA_STRICT_EXTERNAL || 'false').toLowerCase() === 'true';

const requiredFiles = [
  'server.js', 'package.json', 'render.yaml', 'company-routes.js',
  'company-intelligence-routes.js', 'company-360-routes.js',
  'live-market-routes.js', 'market-history-routes.js',
  'exchange-calendar.js', 'tara-intelligence-engine.js'
];

const requiredEnvKeys = [
  'MARKET_DATA_API_URL', 'MARKET_DATA_API_KEY', 'MARKET_DATA_PROVIDER_NAME',
  'MARKET_DATA_LICENSE_STATUS', 'MARKET_DATA_DISPLAY_PERMISSION',
  'MARKET_HISTORY_API_URL', 'MARKET_HISTORY_API_KEY', 'MARKET_HISTORY_PROVIDER_NAME',
  'MARKET_HISTORY_LICENSE_STATUS', 'FINANCIAL_DATA_PROVIDER_NAME',
  'NEWS_PROVIDER_NAME', 'BSE_SECURITY_MASTER_URL', 'BSE_SECURITY_MASTER_LICENSE_STATUS'
];

const checks = [];
function check(name, pass, detail, blocking = true) {
  checks.push({ name, pass: !!pass, blocking: !!blocking, detail: String(detail || '') });
}

function request(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.get(target, { headers: { 'User-Agent': 'TaraAI-ProductionReadiness/1.0' } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function jsonBody(body) {
  try { return JSON.parse(body); } catch { return null; }
}

async function main() {
  for (const file of requiredFiles) check(`file:${file}`, fs.existsSync(path.join(root, file)), 'required production file');

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  check('npm:start-script', pkg.scripts && pkg.scripts.start === 'node server.js', 'start script must run server.js');
  check('npm:production-test-script', pkg.scripts && pkg.scripts['test:production'] === 'node scripts/production-readiness.js', 'production test command is registered');

  const serverText = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  check('security:helmet', /helmet\(/.test(serverText), 'Helmet middleware present');
  check('security:rate-limit', /rateLimit\(/.test(serverText), 'API rate limiting present');
  check('security:body-limits', /express\.json\(\{limit:/.test(serverText), 'JSON body limit present');
  check('security:no-powered-by', /disable\(['"]x-powered-by['"]\)/.test(serverText), 'X-Powered-By disabled');
  check('security:health', /\/api\/health/.test(serverText), 'health endpoint present');
  check('security:security-status', /\/api\/security-status/.test(serverText), 'security status endpoint present');
  check('truth:verified-data-policy', /verified-data-only/.test(serverText) || /verified/.test(fs.readFileSync(path.join(root, 'tara-intelligence-engine.js'), 'utf8')), 'verified-data policy present');

  const renderText = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  check('render:health-check', /healthCheckPath:\s*\/api\/health/.test(renderText), 'Render health check configured');
  check('render:license-gates', /MARKET_DATA_LICENSE_STATUS/.test(renderText) && /MARKET_DATA_DISPLAY_PERMISSION/.test(renderText), 'market-data license gates configured');
  check('render:bse-license-gate', /BSE_SECURITY_MASTER_LICENSE_STATUS/.test(renderText), 'BSE license gate configured');

  for (const key of requiredEnvKeys) {
    const inRender = new RegExp(`key:\\s*${key}\\b`).test(renderText);
    check(`config:${key}`, inRender, 'provider/license configuration declared');
  }

  try {
    const health = await request(`${baseUrl}/api/health`);
    const body = jsonBody(health.body);
    check('runtime:health', health.status === 200 && body?.success === true && body?.status === 'ok', `HTTP ${health.status}`);
    check('runtime:release', typeof body?.release === 'string' && body.release.length > 0, 'release identifier exposed');
  } catch (err) {
    check('runtime:health', false, `server unreachable: ${err.message}`);
  }

  const endpointChecks = [
    ['/api/security-status', 200],
    ['/api/tara-intelligence/status', 200],
    ['/api/exchange-calendar/status', 200],
    ['/api/live-market/status', 200],
    ['/api/companies/status', 200]
  ];
  for (const [endpoint, expected] of endpointChecks) {
    try {
      const result = await request(`${baseUrl}${endpoint}`);
      const body = jsonBody(result.body);
      check(`runtime:${endpoint}`, result.status === expected && body?.success === true, `HTTP ${result.status}`);
    } catch (err) {
      check(`runtime:${endpoint}`, false, err.message);
    }
  }

  const gatedChecks = [
    ['MARKET_DATA_LICENSE_STATUS', 'licensed|authorized|active'],
    ['MARKET_DATA_DISPLAY_PERMISSION', 'allowed|yes|true|licensed|authorized'],
    ['BSE_SECURITY_MASTER_LICENSE_STATUS', 'licensed|authorized|active']
  ];
  for (const [key, allowed] of gatedChecks) {
    const value = String(process.env[key] || '').trim().toLowerCase();
    const configured = new RegExp(`^(?:${allowed})$`).test(value);
    const blocking = strictExternal;
    check(`license:${key}`, configured || !strictExternal, configured ? `configured: ${value}` : 'pending: official/licensed data access is not connected yet', blocking);
  }

  if (strictExternal) {
    for (const key of ['MARKET_DATA_API_URL', 'MARKET_HISTORY_API_URL', 'NEWS_PROVIDER_API_URL']) {
      check(`provider:${key}`, !!process.env[key], process.env[key] ? 'configured' : 'required in strict external mode');
    }
  }

  const blockingFailures = checks.filter(c => c.blocking && !c.pass);
  const passed = checks.filter(c => c.pass).length;
  const failed = checks.filter(c => !c.pass).length;
  const readiness = blockingFailures.length === 0 && !strictExternal && checks.some(c => c.name.startsWith('license:') && !c.pass)
    ? 'READY_WITH_LICENSE_PENDING'
    : blockingFailures.length === 0 ? 'READY' : 'NOT_READY';

  const report = {
    product: 'Tara AI',
    suite: 'Full Production Test & Readiness',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    baseUrl,
    readiness,
    strictExternal,
    totals: { checks: checks.length, passed, failed, blockingFailures: blockingFailures.length },
    checks
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = blockingFailures.length ? 1 : 0;
}

main().catch(err => {
  console.error('[Tara Production Readiness] Fatal:', err.message);
  process.exitCode = 1;
});
