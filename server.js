const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE"
});

// Primary Benchmark Equities (Loaded by default on dashboard initialization)
const BENCHMARK_EQUITIES = [
  { ticker: "RELIANCE", name: "Reliance Industries Ltd", sector: "Energy & Telecom", price: "2984.50", change: "+1.45%", high52: "3024.90", low52: "2220.30", pe: "26.8", mcap: "₹20,18,500 Cr" },
  { ticker: "TCS", name: "Tata Consultancy Services Ltd", sector: "IT Services", price: "4240.20", change: "+0.92%", high52: "4592.25", low52: "3313.00", pe: "29.5", mcap: "₹15,34,200 Cr" },
  { ticker: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking & Finance", price: "1662.30", change: "+1.18%", high52: "1794.00", low52: "1363.55", pe: "18.2", mcap: "₹12,65,400 Cr" },
  { ticker: "INFY", name: "Infosys Ltd", sector: "IT Services", price: "1845.60", change: "-0.35%", high52: "1975.00", low52: "1358.35", pe: "27.1", mcap: "₹7,65,000 Cr" },
  { ticker: "TATAMOTORS", name: "Tata Motors Ltd", sector: "Automobile & EV", price: "985.40", change: "+2.15%", high52: "1179.00", low52: "600.50", pe: "11.2", mcap: "₹3,62,000 Cr" },
  { ticker: "HEROMOTOCO", name: "Hero MotoCorp Ltd", sector: "Automobile (2W)", price: "5420.00", change: "+1.10%", high52: "5894.00", low52: "2980.00", pe: "27.4", mcap: "₹1,08,300 Cr" },
  { ticker: "MRF", name: "MRF Ltd", sector: "Tyres & Rubber", price: "134200.00", change: "+0.45%", high52: "151280.00", low52: "107000.00", pe: "24.1", mcap: "₹56,900 Cr" },
  { ticker: "SBIN", name: "State Bank of India", sector: "Public Sector Banking", price: "815.10", change: "+0.75%", high52: "912.00", low52: "555.00", pe: "10.4", mcap: "₹7,27,400 Cr" },
  { ticker: "BHARTIARTL", name: "Bharti Airtel Ltd", sector: "Telecommunications", price: "1570.25", change: "+1.80%", high52: "1610.00", low52: "880.00", pe: "65.4", mcap: "₹8,92,000 Cr" },
  { ticker: "ITC", name: "ITC Ltd", sector: "Consumer Goods", price: "502.80", change: "+0.40%", high52: "520.00", low52: "399.30", pe: "28.2", mcap: "₹6,28,000 Cr" }
];

// Real-Time NSE/BSE Equity Lookup Engine
async function fetchStockFromExchange(query) {
  const clean = query.trim().toUpperCase().replace('.NS', '').replace('.BO', '');
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean + '.NS')}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta || !meta.regularMarketPrice) return null;

    const price = meta.regularMarketPrice;
    const prev = meta.previousClose || price;
    const diff = price - prev;
    const pct = ((diff / prev) * 100).toFixed(2);

    return {
      ticker: clean,
      name: meta.shortName || clean,
      sector: meta.instrumentType || "NSE/BSE Listed Equity",
      price: price.toFixed(2),
      change: (diff >= 0 ? '+' : '') + pct + '%',
      high52: (meta.fiftyTwoWeekHigh || price).toFixed(2),
      low52: (meta.fiftyTwoWeekLow || price).toFixed(2),
      pe: "Market Dynamic",
      mcap: "Exchange Traded"
    };
  } catch (err) {
    return null;
  }
}

// REST Endpoints
app.get('/api/equities', (req, res) => {
  res.json(BENCHMARK_EQUITIES);
});

app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json(BENCHMARK_EQUITIES);

  // Check benchmark cache first
  const matchedLocal = BENCHMARK_EQUITIES.filter(item => 
    item.ticker.toLowerCase().includes(query.toLowerCase()) || 
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  if (matchedLocal.length > 0) {
    return res.json(matchedLocal);
  }

  // Query live exchange if not in top local cache
  const liveStock = await fetchStockFromExchange(query);
  if (liveStock) {
    return res.json([liveStock]);
  }

  res.json([]);
});

// Autonomous Gemini AI Financial Engine (Aadhya)
app.post('/api/ai/analyze', async (req, res) => {
  const userPrompt = (req.body.prompt || '').trim();
  if (!userPrompt) {
    return res.status(400).json({ error: "Empty analysis query." });
  }

  try {
    const systemPrompt = `You are Aadhya, a premier financial research analyst for the Indian Stock Market (NSE and BSE).
Provide a structured, unbiased fundamental dossier and technical momentum report.
Strict Rules:
1. Do not include external hyperlinks or company website links.
2. Structure your analysis with: Valuation multiples (P/E), 52-Week Range, Core Business Revenue Drivers, Institutional Activity, and Risk Factors.
3. Keep the output professional, scannable, and clean. Provide a short 2-sentence summary at the end tailored for voice speech synthesis.`;

    const aiResponse = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Query: ${userPrompt}` }] }
      ]
    });

    const analysisText = aiResponse.text || "Unable to extract financial models at this time.";

    // Generate speech text from final conclusions
    const speechSummary = analysisText.split('\n').filter(line => line.trim().length > 20).slice(-2).join(' ') || analysisText.slice(0, 180);

    res.json({
      success: true,
      analysis: analysisText,
      speechText: speechSummary.replace(/[*#_]/g, '')
    });
  } catch (error) {
    console.error("Gemini Engine Execution Error:", error);
    res.status(500).json({
      success: false,
      analysis: "Autonomous AI engine encounter: please verify your GEMINI_API_KEY environment variable.",
      speechText: "AI engine connection failed. Please check the API configuration."
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Financial Terminal Server active on port ${PORT}`);
});
