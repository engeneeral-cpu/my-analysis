const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Legacy dashboard data kept only for compatibility; live/company pages use the source-backed routes.
let verifiedMarketData = { nifty: null, equities: [] };

function validateMarketDataset(dataset) {
  return !!dataset && Array.isArray(dataset.equities);
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'aarohi-ai', status: 'ok', time: new Date().toISOString() });
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
    aiName: 'Aarohi',
    found: false,
    text: `Aarohi is ready to research "${query}". Source-backed company intelligence is served through the company API.`
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Aarohi AI Engine] Active on port ${PORT}`);
});
