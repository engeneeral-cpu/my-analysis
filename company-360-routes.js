const https = require('https');
const { getUniverse } = require('./company-routes');

const CACHE_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const cache = new Map();

const SOURCE_ENV = {
  financials: 'COMPANY_360_FINANCIALS_URL',
  shareholding: 'COMPANY_360_SHAREHOLDING_URL',
  corporateActions: 'COMPANY_360_CORPORATE_ACTIONS_URL',
  management: 'COMPANY_360_MANAGEMENT_URL',
  disclosures: 'COMPANY_360_DISCLOSURES_URL'
};

function sanitizeSymbol(value) {
  const symbol = String(value || '').trim().toUpperCase();
  if (!symbol || symbol.length > 30 || !/^[A-Z0-9&_-]+$/.test(symbol)) return null;
  return symbol;
}

function unavailable(notice = 'Awaiting official exchange disclosure') {
  return { value: null, verified: false, notice };
}

function emptySection(notice = 'Awaiting official exchange disclosure') {
  return { data: [], verified: false, notice };
}

function sectionStatus(source, verified = false, notice = 'Awaiting official exchange disclosure') {
  return { status: verified ? 'verified' : source ? 'awaiting_verification' : 'unavailable', source: source || null, verified, notice };
}

function downloadJson(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('Source URL is not configured'));
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; fn(value); };
    const req = https.get(url, {
      headers: {
        'User-Agent': 'TaraAI/3.1 company-360',
        Accept: 'application/json,text/csv,*/*'
      }
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return downloadJson(response.headers.location).then(v => finish(resolve, v), e => finish(reject, e));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return finish(reject, new Error(`Source returned HTTP ${response.statusCode}`));
      }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          req.destroy(new Error('Source response exceeded safety limit'));
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          const data = JSON.parse(raw);
          finish(resolve, data);
        } catch {
          finish(reject, new Error('Configured source did not return valid JSON'));
        }
      });
      response.on('error', error => finish(reject, error));
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('Source request timed out')));
    req.on('error', error => finish(reject, error));
  });
}

function sourceResult(source, raw) {
  // Provider adapters must return { data, verified, retrievedAt, notice }.
  // This route never treats raw provider data as verified by itself.
  if (!raw || raw.verified !== true || !raw.retrievedAt) {
    return { data: null, verified: false, source: source || null, retrievedAt: null, notice: 'Awaiting official exchange disclosure' };
  }
  return {
    data: raw.data ?? null,
    verified: true,
    source: source || raw.source || null,
    retrievedAt: raw.retrievedAt,
    notice: raw.notice || null
  };
}

function findCompany(rows, symbol) {
  return rows.find(company =>
    String(company.nseSymbol || '').toUpperCase() === symbol ||
    String(company.bseSymbol || '').toUpperCase() === symbol ||
    String(company.bseCode || '').toUpperCase() === symbol
  );
}

async function getCompany360(symbol) {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const universe = await getUniverse();
  const company = findCompany(universe.rows, symbol);
  if (!company) {
    const error = new Error('Company not found in verified universe');
    error.statusCode = 404;
    throw error;
  }

  const generatedAt = new Date().toISOString();
  const providerResults = {};

  for (const [section, envName] of Object.entries(SOURCE_ENV)) {
    const source = String(process.env[envName] || '').trim();
    if (!source) {
      providerResults[section] = sourceResult(null, null);
      continue;
    }
    try {
      const raw = await downloadJson(source);
      providerResults[section] = sourceResult(source, raw);
    } catch (error) {
      providerResults[section] = {
        data: null,
        verified: false,
        source,
        retrievedAt: null,
        notice: 'Awaiting official exchange disclosure',
        error: error.message
      };
    }
  }

  const identitySource = company.verifiedSources.join(' + ') || 'Verified company master';
  const identity = {
    symbol: company.nseSymbol || company.bseSymbol || symbol,
    company_name: company.name || null,
    isin: company.isin || null,
    exchange: company.exchange || null,
    industry: unavailable(),
    sector: unavailable(),
    listing_date: unavailable(),
    face_value: unavailable()
  };

  // Identity fields from the verified universe are safe facts. Fields not present in that
  // universe remain explicitly unverified instead of being guessed.
  identity.symbol = company.nseSymbol || company.bseSymbol || symbol;
  identity.company_name = company.name || null;
  identity.isin = company.isin || null;
  identity.exchange = company.exchange || null;
  identity._source = { source: identitySource, verified: true, retrievedAt: generatedAt };

  const financials = providerResults.financials.verified && Array.isArray(providerResults.financials.data)
    ? { data: providerResults.financials.data.slice(0, 8), status: sectionStatus(providerResults.financials.source, true, null), source: providerResults.financials.source, retrievedAt: providerResults.financials.retrievedAt }
    : { ...emptySection(), status: sectionStatus(providerResults.financials.source) };

  const shareholding = providerResults.shareholding.verified && Array.isArray(providerResults.shareholding.data)
    ? { data: providerResults.shareholding.data.slice(0, 1), status: sectionStatus(providerResults.shareholding.source, true, null), source: providerResults.shareholding.source, retrievedAt: providerResults.shareholding.retrievedAt }
    : { ...emptySection(), status: sectionStatus(providerResults.shareholding.source) };

  const corporateActions = providerResults.corporateActions.verified && Array.isArray(providerResults.corporateActions.data)
    ? { data: providerResults.corporateActions.data, status: sectionStatus(providerResults.corporateActions.source, true, null), source: providerResults.corporateActions.source, retrievedAt: providerResults.corporateActions.retrievedAt }
    : { ...emptySection(), status: sectionStatus(providerResults.corporateActions.source) };

  const management = providerResults.management.verified && Array.isArray(providerResults.management.data)
    ? { data: providerResults.management.data, status: sectionStatus(providerResults.management.source, true, null), source: providerResults.management.source, retrievedAt: providerResults.management.retrievedAt }
    : { ...emptySection(), status: sectionStatus(providerResults.management.source) };

  const disclosures = providerResults.disclosures.verified && Array.isArray(providerResults.disclosures.data)
    ? { data: providerResults.disclosures.data, status: sectionStatus(providerResults.disclosures.source, true, null), source: providerResults.disclosures.source, retrievedAt: providerResults.disclosures.retrievedAt }
    : { ...emptySection(), status: sectionStatus(providerResults.disclosures.source) };

  const result = {
    success: true,
    schemaVersion: '1.0.0',
    symbol,
    generatedAt,
    data_policy: 'strict-zero-fake-data',
    profile: identity,
    trading_overview: {
      previous_close: unavailable('Awaiting authorized live/historical market feed'),
      week52_high: unavailable(),
      week52_low: unavailable(),
      upper_circuit: unavailable(),
      lower_circuit: unavailable(),
      data_status: 'awaiting_live_feed'
    },
    financials,
    shareholding,
    corporate_actions: corporateActions,
    management,
    disclosures_news: disclosures,
    sources: {
      verified_universe: universe.sources,
      financials: providerResults.financials.source,
      shareholding: providerResults.shareholding.source,
      corporate_actions: providerResults.corporateActions.source,
      management: providerResults.management.source,
      disclosures: providerResults.disclosures.source
    }
  };

  cache.set(symbol, { at: Date.now(), data: result });
  return result;
}

function registerCompany360Routes(app) {
  const limiter = require('express-rate-limit')({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, error: 'Too many Company 360 requests. Please try again later.' }
  });

  app.use('/api/v1/company', limiter);

  app.get('/api/v1/company/:symbol/360', async (req, res) => {
    const symbol = sanitizeSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success: false, error: 'Invalid company symbol' });

    try {
      return res.json(await getCompany360(symbol));
    } catch (error) {
      if (error.statusCode === 404) return res.status(404).json({ error: 'Company not found in verified universe' });
      console.error('[Tara Company 360]', error.message);
      return res.status(503).json({ success: false, error: 'Company 360 data is temporarily unavailable' });
    }
  });
}

module.exports = { registerCompany360Routes, getCompany360, sanitizeSymbol };