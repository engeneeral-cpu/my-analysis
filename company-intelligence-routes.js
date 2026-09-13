function cleanSymbol(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9&_-]/g, '');
}

function unavailable(source = 'not-configured') {
  return { status: 'unavailable', value: null, source, verified: false };
}

function registerCompanyIntelligenceRoutes(app) {
  app.get('/api/company-intelligence/:symbol', (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success:false, error:'Company symbol is required.' });

    const q = encodeURIComponent(symbol);
    const liveProvider = process.env.MARKET_DATA_PROVIDER_NAME || null;
    const historyProvider = process.env.MARKET_HISTORY_PROVIDER_NAME || null;
    const financialProvider = process.env.FINANCIAL_DATA_PROVIDER_NAME || null;

    res.json({
      success: true,
      symbol,
      pageVersion: 'stock-detail-v1',
      sourcePolicy: 'Official exchange/company disclosures first; licensed providers for commercial financial/market datasets.',
      dataContract: {
        live: liveProvider ? 'provider-configured' : 'provider-pending',
        historical: historyProvider ? 'provider-configured' : 'provider-pending',
        financials: financialProvider ? 'provider-configured' : 'provider-pending',
        fabricatedValues: false
      },
      hero: {
        companyName: unavailable('company-master'),
        series: unavailable('exchange-security-master'),
        isin: unavailable('exchange-security-master'),
        symbol,
        ltp: unavailable('licensed-live-feed'),
        change: unavailable('licensed-live-feed'),
        changePercent: unavailable('licensed-live-feed'),
        previousClose: unavailable('licensed-historical-feed'),
        day: { open: unavailable(), high: unavailable(), low: unavailable(), close: unavailable() },
        week52: { high: unavailable(), highDate: unavailable(), low: unavailable(), lowDate: unavailable() },
        circuits: { upper: unavailable('exchange-security-master'), lower: unavailable('exchange-security-master') }
      },
      marketDepth: {
        status: 'provider-pending',
        bids: [], offers: [],
        totalBuyQuantity: unavailable('level-2-feed'),
        totalSellQuantity: unavailable('level-2-feed'),
        note: 'Top-5 bid/offer depth requires an authorized Level-2 market-data feed.'
      },
      chart: {
        status: historyProvider ? 'provider-configured' : 'provider-pending',
        timeframes: ['1D','1W','1M','1Y','5Y','MAX'],
        candles: [],
        volume: [],
        source: historyProvider || 'licensed historical provider'
      },
      tradingInfo: {
        volume: unavailable('licensed-live-feed'),
        tradedValue: unavailable('licensed-live-feed'),
        deliveryVolume: unavailable('authorized-delivery-data'),
        deliveryPercent: unavailable('authorized-delivery-data'),
        faceValue: unavailable('exchange-security-master'),
        marketLot: unavailable('exchange-security-master'),
        tickSize: unavailable('exchange-security-master'),
        marketCap: unavailable('verified-financial-data')
      },
      financials: {
        status: financialProvider ? 'provider-configured' : 'provider-pending',
        periods: [],
        revenue: [], netProfit: [], eps: [], margins: [],
        balanceSheet: {}, cashFlow: {}, ratios: {}
      },
      shareholding: {
        status: financialProvider ? 'provider-configured' : 'provider-pending',
        promoter: unavailable('shareholding-feed'), fii: unavailable('shareholding-feed'),
        dii: unavailable('shareholding-feed'), public: unavailable('shareholding-feed')
      },
      corporate: {
        announcements: [], boardMeetings: [], corporateActions: [], dividends: [],
        financialResults: [], annualReports: [], investorPresentations: []
      },
      peers: {
        status: financialProvider ? 'provider-configured' : 'provider-pending',
        rows: [], fields: ['Company','Market Cap','P/E','P/B','Dividend Yield']
      },
      taraInsight: {
        status: 'awaiting-verified-evidence',
        technical: null,
        fundamentals: null,
        risk: null,
        scenario: null,
        score: null
      },
      official: {
        nseQuote: `https://www.nseindia.com/get-quotes/equity?symbol=${q}`,
        nseResults: `https://www.nseindia.com/companies-listing/corporate-filings-financial-results?symbol=${q}`,
        nseAnnouncements: `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${q}`,
        nseShareholding: `https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=${q}`,
        nseCorporateActions: `https://www.nseindia.com/companies-listing/corporate-filings-actions?symbol=${q}`,
        nseGovernance: `https://www.nseindia.com/companies-listing/corporate-filings-governance?symbol=${q}`,
        bseSearch: 'https://www.bseindia.com/',
        sebiFilings: 'https://www.sebi.gov.in/curation/corporate_filings.html'
      },
      availability: {
        identity: 'available', marketDepth: 'requires_authorized_level2_feed', priceHistory: 'available_when_authorized_market_provider_is_configured',
        livePrice: 'available_when_authorized_live_feed_is_configured', financials: 'requires_authorized_financial_data_source',
        filings: 'official_exchange_sources', news: 'requires_authorized_news_source', valuation: 'computed_from_verified_financial_data'
      },
      generatedAt: new Date().toISOString()
    });
  });
}
module.exports = { registerCompanyIntelligenceRoutes };
