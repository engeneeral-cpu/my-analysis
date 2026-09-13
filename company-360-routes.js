const { getUniverse } = require('./company-routes');
const rateLimit = require('express-rate-limit');
const { loadCompany360Data } = require('./company-360-data-service');

const CACHE_MS = 15 * 60 * 1000;
const cache = new Map();

function sanitizeSymbol(value) {
  const symbol = String(value || '').trim().toUpperCase();
  if (!symbol || symbol.length > 30 || !/^[A-Z0-9&_-]+$/.test(symbol)) return null;
  return symbol;
}

function missingField(notice = 'Awaiting official exchange disclosure') {
  return { value: null, verified: false, notice };
}

function findCompany(rows, symbol) {
  return rows.find(company => String(company.nseSymbol || '').toUpperCase() === symbol || String(company.bseSymbol || '').toUpperCase() === symbol || String(company.bseCode || '').toUpperCase() === symbol);
}

function emptyFinancials() {
  return { data: [], status: { verified: false, as_of_date: null, source: null }, notice: 'Awaiting quarterly filing ingestion' };
}

function emptyShareholding() {
  return { data: null, status: { verified: false, as_of_date: null, source: null }, notice: 'Awaiting quarterly filing ingestion' };
}

function emptyCorporateActions() {
  return { data: [], status: { verified: false, as_of_date: null, source: null }, notice: 'No active or historical corporate actions reported to exchange' };
}

function buildFinancials(provider) {
  if (!provider.verified || !Array.isArray(provider.financials) || provider.financials.length === 0) return emptyFinancials();
  return { data: provider.financials, status: { verified: true, as_of_date: provider.as_of_date, source: 'NSE_DISCLOSURES' }, notice: null };
}

function buildShareholding(provider) {
  if (!provider.verified || !provider.shareholding) return emptyShareholding();
  return { data: provider.shareholding, status: { verified: true, as_of_date: provider.as_of_date, source: 'NSE_DISCLOSURES' }, notice: null };
}

function buildCorporateActions(provider) {
  if (!provider.verified || !Array.isArray(provider.corporate_actions) || provider.corporate_actions.length === 0) return emptyCorporateActions();
  return {
    data: provider.corporate_actions,
    status: { verified: true, as_of_date: provider.as_of_date, source: 'NSE_DISCLOSURES' },
    notice: null
  };
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
  const provider = await loadCompany360Data(symbol);
  const identitySource = company.verifiedSources.join(' + ') || 'Verified company master';

  const result = {
    success: true,
    schemaVersion: '1.2.0',
    symbol,
    generatedAt,
    data_policy: 'strict-zero-fake-data',
    profile: {
      symbol: company.nseSymbol || company.bseSymbol || symbol,
      company_name: company.name || null,
      isin: company.isin || null,
      exchange: company.exchange || null,
      industry: missingField(),
      sector: missingField(),
      listing_date: missingField(),
      face_value: missingField(),
      data_status: { verified: true, source: identitySource, as_of_date: generatedAt }
    },
    trading_overview: {
      previous_close: missingField('Awaiting live feed'),
      week52_high: missingField('Awaiting live feed'),
      week52_low: missingField('Awaiting live feed'),
      upper_circuit: missingField('Awaiting live feed'),
      lower_circuit: missingField('Awaiting live feed'),
      data_status: 'awaiting_live_feed'
    },
    financials: buildFinancials(provider),
    shareholding: buildShareholding(provider),
    corporate_actions: buildCorporateActions(provider),
    management: { data: [], status: { verified: false, as_of_date: null, source: null }, notice: 'Awaiting official exchange disclosure' },
    disclosures_news: { data: [], status: { verified: false, as_of_date: null, source: null }, notice: 'Awaiting official exchange disclosure' },
    sources: {
      verified_universe: universe.sources,
      financials: provider.verified ? 'NSE_DISCLOSURES' : null,
      shareholding: provider.verified ? 'NSE_DISCLOSURES' : null,
      corporate_actions: provider.verified && provider.corporate_actions.length ? 'NSE_DISCLOSURES' : null
    }
  };

  cache.set(symbol, { at: Date.now(), data: result });
  return result;
}

function registerCompany360Routes(app) {
  app.use('/api/v1/company', rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, error: 'Too many Company 360 requests. Please try again later.' }
  }));

  app.get('/api/v1/company/:symbol/360', async (req, res) => {
    const symbol = sanitizeSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success: false, error: 'Invalid company symbol' });
    try { return res.json(await getCompany360(symbol)); }
    catch (error) {
      if (error.statusCode === 404) return res.status(404).json({ error: 'Company not found in verified universe' });
      console.error('[Tara Company 360]', error.message);
      return res.status(503).json({ success: false, error: 'Company 360 data is temporarily unavailable' });
    }
  });
}

module.exports = {
  registerCompany360Routes,
  getCompany360,
  sanitizeSymbol,
  buildFinancials,
  buildShareholding,
  buildCorporateActions,
  emptyCorporateActions
};
