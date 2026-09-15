const https = require('https');
const rateLimit = require('express-rate-limit');
const { getUniverse } = require('./company-routes');
const { loadCompany360Data } = require('./company-360-data-service');
const { loadCompany360News } = require('./company-360-news-service');

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

function fetchNseQuoteMetadata(symbol) {
  return new Promise((resolve) => {
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/'
      }
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) return resolve(null);
        try {
          const payload = JSON.parse(body);
          const metadata = payload?.metadata || {};
          const info = payload?.info || {};
          const isin = String(metadata.isin || info.isin || '').trim().toUpperCase();
          if (!/^IN[A-Z0-9]{10}$/.test(isin)) return resolve(null);
          resolve({
            isin,
            company_name: String(metadata.companyName || info.companyName || '').trim() || null,
            series: String(metadata.series || '').trim() || null,
            listing_date: String(metadata.listingDate || '').trim() || null,
            industry: String(metadata.industry || info.industry || '').trim() || null,
            source: 'NSE live quote metadata',
            as_of_date: new Date().toISOString()
          });
        } catch { resolve(null); }
      });
    });
    req.setTimeout(8000, () => req.destroy());
    req.on('error', () => resolve(null));
  });
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

function emptyManagement() {
  return {
    data: { board_of_directors: [], key_executives: [] },
    metadata: { source: null, circular_ref: null, as_of_date: null, verified: false },
    notice: 'Awaiting official management disclosure from exchange'
  };
}

function emptyDisclosuresNews() {
  return {
    data: [],
    status: { verified: false, as_of_date: null, source: null },
    notice: 'Awaiting official exchange disclosure or licensed news source'
  };
}

function buildFinancials(provider) {
  if (!provider.verified || !Array.isArray(provider.financials) || provider.financials.length === 0) return emptyFinancials();
  return { data: provider.financials, status: { verified: true, as_of_date: provider.as_of_date, source: provider.source }, notice: null };
}

function buildShareholding(provider) {
  if (!provider.verified || !provider.shareholding) return emptyShareholding();
  return { data: provider.shareholding, status: { verified: true, as_of_date: provider.as_of_date, source: provider.source }, notice: null };
}

function buildCorporateActions(provider) {
  if (!provider.verified || !Array.isArray(provider.corporate_actions) || provider.corporate_actions.length === 0) return emptyCorporateActions();
  return {
    data: provider.corporate_actions,
    status: { verified: true, as_of_date: provider.as_of_date, source: provider.source },
    notice: null
  };
}

function buildManagement(provider) {
  if (!provider.management || provider.management_source === null || !provider.management_as_of_date) return emptyManagement();
  return {
    data: provider.management,
    metadata: {
      source: provider.management_source,
      circular_ref: provider.management_circular_ref,
      as_of_date: provider.management_as_of_date,
      verified: true
    },
    notice: null
  };
}

function buildDisclosuresNews(news) {
  if (!news || news.verified !== true || !Array.isArray(news.items) || news.items.length === 0) return emptyDisclosuresNews();
  return {
    data: news.items,
    status: { verified: true, as_of_date: news.as_of_date, source: news.source },
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
  const [provider, news, liveMetadata] = await Promise.all([
    loadCompany360Data(symbol),
    loadCompany360News(symbol),
    fetchNseQuoteMetadata(symbol)
  ]);

  const identitySource = liveMetadata?.isin
    ? `${company.verifiedSources.join(' + ') || 'Verified company master'} + NSE live quote metadata`
    : company.verifiedSources.join(' + ') || 'Verified company master';
  const management = buildManagement(provider);
  const disclosuresNews = buildDisclosuresNews(news);

  const result = {
    success: true,
    schemaVersion: '1.5.0',
    symbol,
    generatedAt,
    data_policy: 'strict-zero-fake-data',
    profile: {
      symbol: company.nseSymbol || company.bseSymbol || symbol,
      company_name: liveMetadata?.company_name || company.name || null,
      isin: liveMetadata?.isin || company.isin || null,
      exchange: company.exchange || null,
      industry: liveMetadata?.industry ? { value: liveMetadata.industry, verified: true, source: liveMetadata.source, as_of_date: liveMetadata.as_of_date } : missingField(),
      sector: missingField(),
      listing_date: liveMetadata?.listing_date ? { value: liveMetadata.listing_date, verified: true, source: liveMetadata.source, as_of_date: liveMetadata.as_of_date } : missingField(),
      face_value: missingField(),
      data_status: {
        verified: true,
        source: identitySource,
        as_of_date: liveMetadata?.as_of_date || generatedAt,
        isin_live: Boolean(liveMetadata?.isin),
        isin_notice: liveMetadata?.isin ? null : 'Live NSE ISIN metadata was unavailable; no ISIN was fabricated.'
      }
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
    management,
    disclosures_news: disclosuresNews,
    sources: {
      verified_universe: universe.sources,
      identity: liveMetadata?.isin ? liveMetadata.source : null,
      financials: provider.verified ? provider.source : null,
      shareholding: provider.verified ? provider.source : null,
      corporate_actions: provider.verified && provider.corporate_actions.length ? provider.source : null,
      management: management.metadata.verified ? management.metadata.source : null,
      disclosures_news: disclosuresNews.status.verified ? disclosuresNews.status.source : null
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
  emptyCorporateActions,
  buildManagement,
  emptyManagement,
  buildDisclosuresNews,
  emptyDisclosuresNews,
  fetchNseQuoteMetadata
};
