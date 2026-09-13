const { getUniverse } = require('./company-routes');

function cleanSymbol(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9&_-]/g, '');
}

function unavailable(source = 'not-configured') {
  return { status: 'unavailable', value: null, source, verified: false };
}

function verified(value, source, retrievedAt) {
  return { status: 'verified', value, source, verified: true, retrievedAt };
}

function registerCompanyIntelligenceRoutes(app) {
  app.get('/api/company-intelligence/:symbol', async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success: false, error: 'Company symbol is required.' });

    try {
      const universe = await getUniverse();
      const company = universe.rows.find(c => String(c.nseSymbol || '').toUpperCase() === symbol || String(c.bseSymbol || '').toUpperCase() === symbol || String(c.bseCode || '').toUpperCase() === symbol);
      if (!company) return res.status(404).json({ success: false, error: 'Company not found in the verified NSE/BSE company master.' });

      const retrievedAt = new Date().toISOString();
      const q = encodeURIComponent(company.nseSymbol || symbol);
      const liveProvider = process.env.MARKET_DATA_PROVIDER_NAME || null;
      const historyProvider = process.env.MARKET_HISTORY_PROVIDER_NAME || null;
      const financialProvider = process.env.FINANCIAL_DATA_PROVIDER_NAME || null;

      return res.json({
        success: true,
        symbol: company.nseSymbol || symbol,
        pageVersion: 'company-360-v2',
        sourcePolicy: 'Official exchange/company disclosures first; licensed providers for commercial financial/market datasets.',
        dataContract: {
          live: liveProvider ? 'provider-configured' : 'provider-pending',
          historical: historyProvider ? 'provider-configured' : 'provider-pending',
          financials: financialProvider ? 'provider-configured' : 'provider-pending',
          fabricatedValues: false
        },
        identity: {
          companyName: verified(company.name, company.verifiedSources.join(' + '), retrievedAt),
          name: verified(company.name, company.verifiedSources.join(' + '), retrievedAt),
          nseSymbol: company.nseSymbol ? verified(company.nseSymbol, 'NSE official security master', retrievedAt) : unavailable('NSE official security master'),
          bseSymbol: company.bseSymbol ? verified(company.bseSymbol, 'BSE official/authorized security master', retrievedAt) : unavailable('BSE security master'),
          bseCode: company.bseCode ? verified(company.bseCode, 'BSE official/authorized security master', retrievedAt) : unavailable('BSE security master'),
          isin: verified(company.isin, company.verifiedSources.join(' + '), retrievedAt),
          series: verified(company.series || 'EQ', 'NSE official security master', retrievedAt),
          exchange: verified(company.exchange, company.verifiedSources.join(' + '), retrievedAt),
          verifiedSources: company.verifiedSources
        },
        hero: {
          companyName: verified(company.name, company.verifiedSources.join(' + '), retrievedAt),
          series: verified(company.series || 'EQ', 'NSE official security master', retrievedAt),
          isin: verified(company.isin, company.verifiedSources.join(' + '), retrievedAt),
          symbol: company.nseSymbol || symbol,
          ltp: unavailable('licensed-live-feed'),
          change: unavailable('licensed-live-feed'),
          changePercent: unavailable('licensed-live-feed'),
          previousClose: unavailable('licensed-historical-feed'),
          day: { open: unavailable(), high: unavailable(), low: unavailable(), close: unavailable() },
          week52: { high: unavailable(), highDate: unavailable(), low: unavailable(), lowDate: unavailable() },
          circuits: { upper: unavailable('exchange-security-master'), lower: unavailable('exchange-security-master') }
        },
        marketDepth: {
          status: 'provider-pending', bids: [], offers: [],
          totalBuyQuantity: unavailable('level-2-feed'), totalSellQuantity: unavailable('level-2-feed'),
          note: 'Top-5 bid/offer depth requires an authorized Level-2 market-data feed.'
        },
        chart: {
          status: historyProvider ? 'provider-configured' : 'provider-pending',
          timeframes: ['1D', '1W', '1M', '1Y', '5Y', 'MAX'], candles: [], volume: [],
          source: historyProvider || 'licensed historical provider'
        },
        tradingInfo: {
          volume: unavailable('licensed-live-feed'), tradedValue: unavailable('licensed-live-feed'),
          deliveryVolume: unavailable('authorized-delivery-data'), deliveryPercent: unavailable('authorized-delivery-data'),
          faceValue: unavailable('exchange-security-master'), marketLot: unavailable('exchange-security-master'),
          tickSize: unavailable('exchange-security-master'), marketCap: unavailable('verified-financial-data')
        },
        financials: {
          status: financialProvider ? 'provider-configured' : 'provider-pending',
          periods: [], revenue: [], netProfit: [], eps: [], margins: [], balanceSheet: {}, cashFlow: {}, ratios: {}
        },
        shareholding: {
          status: financialProvider ? 'provider-configured' : 'provider-pending',
          promoter: unavailable('shareholding-feed'), fii: unavailable('shareholding-feed'),
          dii: unavailable('shareholding-feed'), public: unavailable('shareholding-feed')
        },
        corporate: { announcements: [], boardMeetings: [], corporateActions: [], dividends: [], financialResults: [], annualReports: [], investorPresentations: [] },
        peers: { status: financialProvider ? 'provider-configured' : 'provider-pending', rows: [], fields: ['Company', 'Market Cap', 'P/E', 'P/B', 'Dividend Yield'] },
        taraInsight: { status: 'awaiting-verified-evidence', technical: null, fundamentals: null, risk: null, scenario: null, score: null },
        official: {
          nseQuote: company.nseUrl || `https://www.nseindia.com/get-quotes/equity?symbol=${q}`,
          nseResults: `https://www.nseindia.com/companies-listing/corporate-filings-financial-results?symbol=${q}`,
          nseAnnouncements: `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${q}`,
          nseShareholding: `https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=${q}`,
          nseCorporateActions: `https://www.nseindia.com/companies-listing/corporate-filings-actions?symbol=${q}`,
          nseGovernance: `https://www.nseindia.com/companies-listing/corporate-filings-governance?symbol=${q}`,
          bseSearch: company.bseUrl || 'https://www.bseindia.com/',
          sebiFilings: 'https://www.sebi.gov.in/curation/corporate_filings.html'
        },
        availability: {
          identity: 'verified', marketDepth: 'requires_authorized_level2_feed',
          priceHistory: historyProvider ? 'provider-configured' : 'requires_authorized_market_provider',
          livePrice: liveProvider ? 'provider-configured' : 'requires_authorized_live_feed',
          financials: financialProvider ? 'provider-configured' : 'requires_authorized_financial_data_source',
          filings: 'official_exchange_sources', news: 'requires_authorized_news_source', valuation: 'computed_from_verified_financial_data'
        },
        generatedAt: retrievedAt
      });
    } catch (error) {
      console.error('[Tara Company Intelligence]', error.message);
      return res.status(503).json({ success: false, error: 'Verified company master is temporarily unavailable.' });
    }
  });
}

module.exports = { registerCompanyIntelligenceRoutes };