const https = require('https');

const REQUEST_TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const SOURCES = new Set(['NSE_DISCLOSURES', 'BSE_DISCLOSURES', 'LICENSED_NEWS_PROVIDER']);
const CATEGORIES = new Set(['DISCLOSURE', 'RESULTS', 'CORPORATE_ACTION', 'REGULATORY', 'BUSINESS', 'GENERAL']);

function requestJson(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('News source URL is not configured'));
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; fn(value); };
    const req = https.get(url, { headers: { 'User-Agent': 'TaraAI/3.1 company-360-news', Accept: 'application/json' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return requestJson(response.headers.location).then(v => finish(resolve, v), e => finish(reject, e));
      }
      if (response.statusCode !== 200) { response.resume(); return finish(reject, new Error(`Source returned HTTP ${response.statusCode}`)); }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) return req.destroy(new Error('News response exceeded safety limit'));
        chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => {
        try { finish(resolve, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { finish(reject, new Error('Configured news source did not return valid JSON')); }
      });
      response.on('error', error => finish(reject, error));
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('News source request timed out')));
    req.on('error', error => finish(reject, error));
  });
}

function isDateTime(value) {
  if (typeof value !== 'string' || value.length > 80) return false;
  return !Number.isNaN(Date.parse(value));
}

function normalizeNewsItem(item) {
  if (!item || typeof item !== 'object') return null;
  if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 500) return null;
  if (!isDateTime(item.published_at)) return null;
  if (typeof item.url !== 'string' || !/^https:\/\//i.test(item.url) || item.url.length > 2000) return null;
  if (typeof item.source !== 'string' || !item.source.trim() || item.source.length > 200) return null;
  if (!CATEGORIES.has(item.category ?? 'GENERAL')) return null;
  if (item.verified !== true) return null;
  return {
    title: item.title.trim(),
    published_at: item.published_at,
    url: item.url,
    source: item.source.trim(),
    category: item.category ?? 'GENERAL',
    verified: true
  };
}

function normalizeNewsPayload(raw) {
  if (!raw || typeof raw !== 'object' || raw.verified !== true || !SOURCES.has(raw.source) || !isDateTime(raw.as_of_date)) return null;
  if (!Array.isArray(raw.items)) return null;
  const items = raw.items.map(normalizeNewsItem).filter(Boolean).slice(0, 100);
  return {
    verified: true,
    source: raw.source,
    as_of_date: raw.as_of_date,
    items
  };
}

async function loadCompany360News(symbol) {
  const template = String(process.env.COMPANY_360_NEWS_URL || '').trim();
  if (!template) return { verified: false, source: null, as_of_date: null, items: [] };
  const url = template.includes('{symbol}') ? template.replaceAll('{symbol}', encodeURIComponent(symbol)) : template;
  try {
    return normalizeNewsPayload(await requestJson(url)) || { verified: false, source: null, as_of_date: null, items: [] };
  } catch {
    return { verified: false, source: null, as_of_date: null, items: [] };
  }
}

module.exports = { normalizeNewsItem, normalizeNewsPayload, loadCompany360News };
