const https = require('https');

const REQUEST_TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('Source URL is not configured'));
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; fn(value); };
    const req = https.get(url, { headers: { 'User-Agent': 'TaraAI/3.1 company-360', Accept: 'application/json' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return requestJson(response.headers.location).then(v => finish(resolve, v), e => finish(reject, e));
      }
      if (response.statusCode !== 200) { response.resume(); return finish(reject, new Error(`Source returned HTTP ${response.statusCode}`)); }
      let size = 0; const chunks = [];
      response.on('data', chunk => { size += chunk.length; if (size > MAX_RESPONSE_BYTES) return req.destroy(new Error('Source response exceeded safety limit')); chunks.push(Buffer.from(chunk)); });
      response.on('end', () => { try { finish(resolve, JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { finish(reject, new Error('Configured source did not return valid JSON')); } });
      response.on('error', error => finish(reject, error));
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('Source request timed out')));
    req.on('error', error => finish(reject, error));
  });
}

function isDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
function numberOrNull(value) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }

function validateFinancialRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 8).filter(row => row && isDate(row.quarter_ended) && ['Standalone', 'Consolidated'].includes(row.nature) && ['revenue', 'net_profit', 'operating_profit_margin_pct', 'eps'].every(k => row[k] === null || numberOrNull(row[k]) !== null)).map(row => ({
    quarter_ended: row.quarter_ended,
    nature: row.nature,
    revenue: numberOrNull(row.revenue),
    net_profit: numberOrNull(row.net_profit),
    operating_profit_margin_pct: numberOrNull(row.operating_profit_margin_pct),
    eps: numberOrNull(row.eps)
  }));
}

function validateShareholding(value) {
  if (!value || typeof value !== 'object') return null;
  const keys = ['promoter_holding_pct', 'fii_holding_pct', 'dii_holding_pct', 'public_retail_pct', 'pledged_shares_pct'];
  const result = {};
  for (const key of keys) {
    const n = numberOrNull(value[key]);
    if (n === null || n < 0 || n > 100) return null;
    result[key] = n;
  }
  const total = result.promoter_holding_pct + result.fii_holding_pct + result.dii_holding_pct + result.public_retail_pct;
  if (total > 100.0001) return null;
  result.total_holding_pct = Number(total.toFixed(4));
  return result;
}

function normalizeProviderPayload(raw) {
  if (!raw || raw.verified !== true || raw.source !== 'NSE_DISCLOSURES' || !isDate(raw.as_of_date)) return { verified: false, source: null, as_of_date: null, financials: [], shareholding: null };
  return { verified: true, source: 'NSE_DISCLOSURES', as_of_date: raw.as_of_date, financials: validateFinancialRows(raw.financials), shareholding: validateShareholding(raw.shareholding) };
}

async function loadCompany360Data() {
  const url = String(process.env.COMPANY_360_FINANCIALS_URL || '').trim();
  if (!url) return { verified: false, source: null, as_of_date: null, financials: [], shareholding: null };
  try { return normalizeProviderPayload(await requestJson(url)); }
  catch (error) { return { verified: false, source: null, as_of_date: null, financials: [], shareholding: null, error: error.message }; }
}

module.exports = { loadCompany360Data, normalizeProviderPayload, validateFinancialRows, validateShareholding };
