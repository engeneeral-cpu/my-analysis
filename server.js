const express = require('express');
const path = require('path');
const cors = require('cors');
const { registerAuthRoutes } = require('./auth-routes');
const { registerCompanyRoutes } = require('./company-routes');
const { registerLiveMarketRoutes } = require('./live-market-routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

// Register all API routes BEFORE the SPA fallback.
registerAuthRoutes(app);
registerCompanyRoutes(app);
registerLiveMarketRoutes(app);

let verifiedMarketData = { nifty: null, equities: [] };

function validateMarketDataset(dataset) {
  return !!dataset && Array.isArray(dataset.equities);
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'tara-ai', status: 'ok', time: new Date().toISOString() });
});

app.get('/api/market-data', (req, res) => {
  if (validateMarketDataset(verifiedMarketData)) {
    return res.json({ success: true, timestamp: new Date().toISOString(), data: verifiedMarketData });
  }
  res.status(500).json({ success: false, error: 'Market data validation failed' });
});

app.post('/api/analyze', (req, res) => {
  const query = String(req.body?.query || '').trim();
  res.json({
    success: true,
    aiName: 'Tara',
    found: false,
    text: `Tara is ready to research "${query}". Source-backed company intelligence is served through the company API.`
  });
});

// Unknown API routes must return JSON, never index.html.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Tara API endpoint not found.' });
});

// Website fallback comes LAST.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Tara AI Engine] Active on port ${PORT}`);
});
