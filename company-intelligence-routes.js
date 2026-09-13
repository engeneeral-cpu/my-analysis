function registerCompanyIntelligenceRoutes(app) {
  app.get('/api/company-intelligence/:symbol', (req, res) => {
    const symbol = String(req.params.symbol || '').trim().toUpperCase().replace(/[^A-Z0-9&_-]/g, '');
    if (!symbol) return res.status(400).json({ success:false, error:'Company symbol is required.' });

    const q = encodeURIComponent(symbol);
    res.json({
      success: true,
      symbol,
      sourcePolicy: 'Official exchange/company disclosures first; licensed providers for commercial financial/market datasets.',
      sections: [
        'identity','business','history','market','price-history','financials','income-statement','balance-sheet','cash-flow','ratios',
        'shareholding','corporate-actions','dividends','announcements','board-meetings','results','annual-reports','investor-presentations',
        'governance','subsidiaries','management','peers','competitors','news','sentiment','technical-analysis','risk','valuation','scenarios'
      ],
      official: {
        nseQuote: `https://www.nseindia.com/get-quotes/equity?symbol=${q}`,
        nseResults: `https://www.nseindia.com/companies-listing/corporate-filings-financial-results?symbol=${q}`,
        nseAnnouncements: `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${q}`,
        nseShareholding: `https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=${q}`,
        nseCorporateActions: `https://www.nseindia.com/companies-listing/corporate-filings-actions?symbol=${q}`,
        nseGovernance: `https://www.nseindia.com/companies-listing/corporate-filings-governance?symbol=${q}`,
        bseSearch: `https://www.bseindia.com/`,
        sebiFilings: 'https://www.sebi.gov.in/curation/corporate_filings.html'
      },
      availability: {
        identity: 'available',
        priceHistory: 'available_when_authorized_market_provider_is_configured',
        livePrice: 'available_when_authorized_live_feed_is_configured',
        financials: 'requires_authorized_financial_data_source',
        filings: 'official_exchange_sources',
        news: 'requires_news_source',
        valuation: 'computed_from_verified_financial_data'
      },
      generatedAt: new Date().toISOString()
    });
  });
}
module.exports = { registerCompanyIntelligenceRoutes };
