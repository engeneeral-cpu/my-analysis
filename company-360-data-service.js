const https = require('https');

const REQUEST_TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const ACTION_TYPES = new Set(['DIVIDEND', 'BONUS', 'SPLIT', 'RIGHTS', 'BUYBACK']);
const ACTION_STATUSES = new Set(['ANNOUNCED', 'UPCOMING', 'EXECUTED']);
const EXCHANGES = new Set(['NSE', 'BSE']);
const MANAGEMENT_CATEGORIES = new Set(['EXECUTIVE', 'NON_EXECUTIVE', 'INDEPENDENT', 'NOMINEE']);
const MANAGEMENT_DIN_STATUSES = new Set(['ACTIVE', 'DISQUALIFIED', 'UNKNOWN']);

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
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) return req.destroy(new Error('Source response exceeded safety limit'));
        chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => {
        try { finish(resolve, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { finish(reject, new Error('Configured source did not return valid JSON')); }
      });
      response.on('error', error => finish(reject, error));
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('Source request timed out')));
    req.on('error', error => finish(reject, error));
  });
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function validateFinancialRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 8)
    .filter(row => row && isDate(row.quarter_ended) && ['Standalone', 'Consolidated'].includes(row.nature) && ['revenue', 'net_profit', 'operating_profit_margin_pct', 'eps'].every(k => row[k] === null || numberOrNull(row[k]) !== null))
    .map(row => ({
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

function normalizeCorporateAction(row) {
  if (!row || typeof row !== 'object') return null;
  if (!ACTION_TYPES.has(row.action_type) || !ACTION_STATUSES.has(row.status)) return null;
  if (row.ex_date !== null && row.ex_date !== undefined && !isDate(row.ex_date)) return null;
  if (row.record_date !== null && row.record_date !== undefined && !isDate(row.record_date)) return null;
  if (row.bc_start_date !== null && row.bc_start_date !== undefined && !isDate(row.bc_start_date)) return null;
  if (row.bc_end_date !== null && row.bc_end_date !== undefined && !isDate(row.bc_end_date)) return null;
  if (typeof row.purpose !== 'string' || !row.purpose.trim() || row.purpose.length > 500) return null;

  const filing = row.source_filing;
  if (!filing || filing.verified !== true || !EXCHANGES.has(filing.exchange)) return null;
  if (filing.circular_ref !== null && filing.circular_ref !== undefined && (typeof filing.circular_ref !== 'string' || filing.circular_ref.length > 500)) return null;

  return {
    action_type: row.action_type,
    purpose: row.purpose.trim(),
    ex_date: row.ex_date ?? null,
    record_date: row.record_date ?? null,
    bc_start_date: row.bc_start_date ?? null,
    bc_end_date: row.bc_end_date ?? null,
    status: row.status,
    source_filing: {
      verified: true,
      exchange: filing.exchange,
      circular_ref: filing.circular_ref ?? null
    }
  };
}

function validateCorporateActions(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeCorporateAction).filter(Boolean).slice(0, 200);
}

function normalizeDirector(row) {
  if (!row || typeof row !== 'object') return null;
  if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 200) return null;
  if (typeof row.designation !== 'string' || !row.designation.trim() || row.designation.length > 200) return null;
  if (!MANAGEMENT_CATEGORIES.has(row.category)) return null;
  if (row.appointment_date !== null && row.appointment_date !== undefined && !isDate(row.appointment_date)) return null;
  if (row.cessation_date !== null && row.cessation_date !== undefined && !isDate(row.cessation_date)) return null;
  if (typeof row.is_active !== 'boolean') return null;
  if (row.din !== null && row.din !== undefined && (typeof row.din !== 'string' || !/^\d{8}$/.test(row.din))) return null;
  if (!MANAGEMENT_DIN_STATUSES.has(row.din_status ?? 'UNKNOWN')) return null;
  if (row.term_start_date !== null && row.term_start_date !== undefined && !isDate(row.term_start_date)) return null;
  if (row.term_end_date !== null && row.term_end_date !== undefined && !isDate(row.term_end_date)) return null;
  if (row.term_duration_years !== null && row.term_duration_years !== undefined && (typeof row.term_duration_years !== 'number' || !Number.isFinite(row.term_duration_years) || row.term_duration_years < 0 || row.term_duration_years > 50)) return null;
  if (row.disqualification_flag !== null && row.disqualification_flag !== undefined && typeof row.disqualification_flag !== 'boolean') return null;

  return {
    name: row.name.trim(),
    din: row.din ?? null,
    din_status: row.din_status ?? 'UNKNOWN',
    disqualification_flag: row.disqualification_flag ?? (row.din_status === 'DISQUALIFIED'),
    designation: row.designation.trim(),
    category: row.category,
    appointment_date: row.appointment_date ?? null,
    cessation_date: row.cessation_date ?? null,
    term_start_date: row.term_start_date ?? null,
    term_end_date: row.term_end_date ?? null,
    term_duration_years: row.term_duration_years ?? null,
    is_active: row.is_active
  };
}

function normalizeKeyExecutive(row) {
  if (!row || typeof row !== 'object') return null;
  if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 200) return null;
  if (typeof row.designation !== 'string' || !row.designation.trim() || row.designation.length > 200) return null;
  if (row.appointment_date !== null && row.appointment_date !== undefined && !isDate(row.appointment_date)) return null;
  return {
    name: row.name.trim(),
    designation: row.designation.trim(),
    appointment_date: row.appointment_date ?? null
  };
}

function normalizeManagement(raw) {
  if (!raw || typeof raw !== 'object' || raw.verified !== true || !EXCHANGES.has(raw.source) || !isDate(raw.as_of_date)) return null;
  const management = raw.management;
  if (!management || typeof management !== 'object' || !Array.isArray(management.board_of_directors) || !Array.isArray(management.key_executives)) return null;

  const board = management.board_of_directors.map(normalizeDirector);
  const executives = management.key_executives.map(normalizeKeyExecutive);
  if (board.some(item => !item) || executives.some(item => !item)) return null;

  return {
    verified: true,
    source: raw.source,
    as_of_date: raw.as_of_date,
    circular_ref: typeof raw.circular_ref === 'string' && raw.circular_ref.length <= 500 ? raw.circular_ref : null,
    management: {
      board_of_directors: board.slice(0, 200),
      key_executives: executives.slice(0, 100)
    }
  };
}

function validateManagementPayload(raw) {
  const normalized = normalizeManagement(raw);
  if (!normalized) return null;
  return normalized.management;
}

function normalizeProviderPayload(raw) {
  if (!raw || raw.verified !== true || !EXCHANGES.has(raw.source) || !isDate(raw.as_of_date)) {
    return { verified: false, source: null, as_of_date: null, financials: [], shareholding: null, corporate_actions: [], management: null };
  }
  return {
    verified: true,
    source: raw.source,
    as_of_date: raw.as_of_date,
    financials: validateFinancialRows(raw.financials),
    shareholding: validateShareholding(raw.shareholding),
    corporate_actions: validateCorporateActions(raw.corporate_actions),
    management: validateManagementPayload(raw)
  };
}

async function loadCompany360Data() {
  const url = String(process.env.COMPANY_360_FINANCIALS_URL || '').trim();
  const corporateActionsUrl = String(process.env.COMPANY_360_CORPORATE_ACTIONS_URL || '').trim();
  const managementUrl = String(process.env.COMPANY_360_MANAGEMENT_URL || '').trim();
  const urls = [...new Set([url, corporateActionsUrl, managementUrl].filter(Boolean))];
  if (urls.length === 0) return { verified: false, source: null, as_of_date: null, financials: [], shareholding: null, corporate_actions: [], management: null };

  const results = await Promise.all(urls.map(async sourceUrl => {
    try { return normalizeProviderPayload(await requestJson(sourceUrl)); }
    catch (error) { return { verified: false, source: null, as_of_date: null, financials: [], shareholding: null, corporate_actions: [], management: null, error: error.message }; }
  }));

  const primary = results.find(item => item.verified) || results[0];
  const actions = results.flatMap(item => item.corporate_actions || []);
  const uniqueActions = [];
  const seenActions = new Set();
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (!seenActions.has(key)) { seenActions.add(key); uniqueActions.push(action); }
  }

  const managementSources = results.filter(item => item.verified && item.management);
  const management = managementSources[0]?.management || null;
  const managementSource = managementSources[0]?.source || null;
  const managementAsOfDate = managementSources[0]?.as_of_date || null;
  const managementCircularRef = managementSources[0]?.circular_ref || null;

  return {
    verified: primary.verified === true,
    source: primary.source || null,
    as_of_date: primary.as_of_date || null,
    financials: primary.financials || [],
    shareholding: primary.shareholding || null,
    corporate_actions: uniqueActions.slice(0, 200),
    management,
    management_source: managementSource,
    management_as_of_date: managementAsOfDate,
    management_circular_ref: managementCircularRef
  };
}

module.exports = {
  loadCompany360Data,
  normalizeProviderPayload,
  validateFinancialRows,
  validateShareholding,
  normalizeCorporateAction,
  validateCorporateActions,
  normalizeDirector,
  normalizeKeyExecutive,
  normalizeManagement,
  validateManagementPayload
};
