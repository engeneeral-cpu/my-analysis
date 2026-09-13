const ENGINE_VERSION = '0.1.0';

const TARGETS = Object.freeze({
  marketData: 'live market data',
  financialData: 'verified financial data',
  history: 'historical market data',
  realtime: 'real-time streaming',
  news: 'news and sentiment',
  fundamentals: 'fundamental analysis',
  risk: 'risk intelligence',
  portfolio: 'portfolio intelligence',
  decision: 'decision and reasoning',
  knowledge: 'finance knowledge engine',
  ownModel: 'Tara own model',
  scale: 'large-scale architecture',
  security: 'security and compliance',
  languages: 'multilingual intelligence'
});

function configured(name, required) {
  const value = String(process.env[name] || '').trim();
  return { configured: Boolean(value), provider: value || null, required };
}

function providerStatus() {
  return {
    marketData: configured('MARKET_DATA_PROVIDER_NAME', true),
    financialData: configured('FINANCIAL_DATA_PROVIDER_NAME', true),
    history: configured('MARKET_HISTORY_PROVIDER_NAME', true),
    realtime: configured('MARKET_DATA_STREAM_PROVIDER_NAME', true),
    news: configured('NEWS_PROVIDER_NAME', true),
    ownModel: configured('TARA_MODEL_PROVIDER_NAME', false)
  };
}

function evidence(item) {
  if (!item || item.value === undefined || item.value === null || item.value === '') return null;
  return { value: item.value, source: item.source || null, retrievedAt: item.retrievedAt || null, verified: item.verified === true };
}

function analyze(input = {}) {
  const symbol = String(input.symbol || '').trim().toUpperCase();
  if (!symbol) throw new Error('A valid company symbol is required.');

  const verified = [];
  const missing = [];
  const add = (name, item) => {
    const e = evidence(item);
    if (e && e.verified && e.source) verified.push({ name, ...e });
    else missing.push(name);
  };

  add('price', input.price);
  add('previousClose', input.previousClose);
  add('volume', input.volume);
  add('revenue', input.revenue);
  add('profit', input.profit);
  add('eps', input.eps);
  add('debt', input.debt);
  add('cashFlow', input.cashFlow);

  const completeness = Math.round((verified.length / 8) * 100);
  return {
    success: true,
    engine: 'Tara Intelligence Engine',
    version: ENGINE_VERSION,
    symbol,
    mode: 'evidence-first',
    decision: 'insufficient_verified_evidence',
    confidence: 0,
    completeness,
    verifiedEvidence: verified,
    missingEvidence: missing,
    scenarios: [],
    warnings: ['Tara does not invent market or financial values.', 'A decision requires verified inputs from authorized/licensed sources.'],
    nextRequired: missing,
    generatedAt: new Date().toISOString()
  };
}

function targetStatus() {
  const providers = providerStatus();
  return Object.entries(TARGETS).map(([id, name]) => ({
    id, name,
    status: ['scale','security','languages','decision','knowledge'].includes(id) ? 'foundation' : (providers[id]?.configured ? 'connected' : 'ready_for_provider'),
    provider: providers[id]?.provider || null
  }));
}

module.exports = { ENGINE_VERSION, TARGETS, providerStatus, targetStatus, analyze };