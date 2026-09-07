const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// A to Z Comprehensive Directory of Indian Listed Equities (NSE/BSE)
const MASTER_EQUITIES = [
  { ticker: "ADANIENT", name: "Adani Enterprises Ltd", sector: "Conglomerate", price: "3120.40", change: "+1.25%", pe: "94.2", mcap: "₹3,55,700 Cr", range52: "₹2,142 - ₹3,350", flow: "Bullish" },
  { ticker: "BAJFINANCE", name: "Bajaj Finance Ltd", sector: "Non-Banking Financial", price: "6890.10", change: "-0.40%", pe: "28.6", mcap: "₹4,26,100 Cr", range52: "₹6,160 - ₹7,850", flow: "Consolidating" },
  { ticker: "CIPLA", name: "Cipla Limited", sector: "Pharmaceuticals", price: "1510.80", change: "+0.85%", pe: "26.3", mcap: "₹1,21,900 Cr", range52: "₹1,132 - ₹1,580", flow: "Bullish" },
  { ticker: "DIVISLAB", name: "Divi's Laboratories Ltd", sector: "Healthcare & API", price: "4890.00", change: "+1.90%", pe: "68.4", mcap: "₹1,29,800 Cr", range52: "₹3,350 - ₹5,100", flow: "Strong Inflow" },
  { ticker: "EICHERMOT", name: "Eicher Motors Ltd", sector: "Automobile (Royal Enfield)", price: "4780.25", change: "+0.60%", pe: "32.1", mcap: "₹1,31,000 Cr", range52: "₹3,520 - ₹5,010", flow: "Accumulation" },
  { ticker: "FEDERALBNK", name: "The Federal Bank Ltd", sector: "Private Banking", price: "192.40", change: "+1.15%", pe: "11.8", mcap: "₹46,800 Cr", range52: "₹135 - ₹205", flow: "Moderate Inflow" },
  { ticker: "GRASIM", name: "Grasim Industries Ltd", sector: "Materials & Chemicals", price: "2680.00", change: "-0.20%", pe: "29.4", mcap: "₹1,82,400 Cr", range52: "₹1,880 - ₹2,875", flow: "Neutral" },
  { ticker: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking & Financials", price: "1662.30", change: "+1.18%", pe: "18.2", mcap: "₹12,65,400 Cr", range52: "₹1,363 - ₹1,794", flow: "Institutional Inflow" },
  { ticker: "INFY", name: "Infosys Limited", sector: "Information Technology", price: "1845.60", change: "-0.35%", pe: "27.1", mcap: "₹7,65,000 Cr", range52: "₹1,358 - ₹1,975", flow: "Neutral" },
  { ticker: "JSWSTEEL", name: "JSW Steel Ltd", sector: "Metals & Mining", price: "940.50", change: "+0.70%", pe: "22.5", mcap: "₹2,30,100 Cr", range52: "₹740 - ₹1,015", flow: "Bullish" },
  { ticker: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd", sector: "Private Banking", price: "1785.00", change: "+0.30%", pe: "20.1", mcap: "₹3,55,000 Cr", range52: "₹1,544 - ₹1,925", flow: "Consolidating" },
  { ticker: "LT", name: "Larsen & Toubro Ltd", sector: "Capital Goods & Defense", price: "3620.00", change: "+0.65%", pe: "34.2", mcap: "₹4,98,000 Cr", range52: "₹2,860 - ₹3,948", flow: "High Accumulation" },
  { ticker: "MARUTI", name: "Maruti Suzuki India Ltd", sector: "Automobile (Passenger)", price: "12450.00", change: "+1.40%", pe: "28.0", mcap: "₹3,91,200 Cr", range52: "₹9,730 - ₹13,680", flow: "Institutional Inflow" },
  { ticker: "NTPC", name: "NTPC Limited", sector: "Power Generation", price: "415.20", change: "+1.75%", pe: "18.4", mcap: "₹4,02,600 Cr", range52: "₹230 - ₹448", flow: "Strong Inflow" },
  { ticker: "ONGC", name: "Oil & Natural Gas Corp", sector: "Energy & Exploration", price: "295.60", change: "+0.45%", pe: "7.8", mcap: "₹3,71,900 Cr", range52: "₹180 - ₹344", flow: "Value Buying" },
  { ticker: "POLYCAB", name: "Polycab India Ltd", sector: "Cables & Electricals", price: "6650.00", change: "+2.10%", pe: "48.2", mcap: "₹1,00,100 Cr", range52: "₹4,600 - ₹7,350", flow: "Bullish" },
  { ticker: "RELIANCE", name: "Reliance Industries Ltd", sector: "Energy, Telecom & Retail", price: "2984.50", change: "+1.45%", pe: "26.8", mcap: "₹20,18,500 Cr", range52: "₹2,220 - ₹3,024", flow: "High Inflow" },
  { ticker: "SBIN", name: "State Bank of India", sector: "Public Sector Banking", price: "815.10", change: "+0.75%", pe: "10.4", mcap: "₹7,27,400 Cr", range52: "₹555 - ₹912", flow: "Institutional Inflow" },
  { ticker: "TCS", name: "Tata Consultancy Services Ltd", sector: "IT Services", price: "4240.20", change: "+0.92%", pe: "29.5", mcap: "₹15,34,200 Cr", range52: "₹3,313 - ₹4,592", flow: "Zero Debt Safe" },
  { ticker: "ULTRACEMCO", name: "UltraTech Cement Ltd", sector: "Building Materials", price: "11240.00", change: "+0.50%", pe: "41.6", mcap: "₹3,24,500 Cr", range52: "₹8,200 - ₹12,140", flow: "Steady" },
  { ticker: "VEDL", name: "Vedanta Limited", sector: "Natural Resources", price: "462.80", change: "-0.80%", pe: "13.2", mcap: "₹1,72,300 Cr", range52: "₹211 - ₹506", flow: "High Dividend Yield" },
  { ticker: "WIPRO", name: "Wipro Limited", sector: "IT Services", price: "525.40", change: "+0.25%", pe: "21.3", mcap: "₹2,74,600 Cr", range52: "₹395 - ₹580", flow: "Turnaround Watch" },
  { ticker: "YESBANK", name: "Yes Bank Ltd", sector: "Private Banking", price: "23.40", change: "+0.85%", pe: "56.0", mcap: "₹73,400 Cr", range52: "₹16.5 - ₹32.8", flow: "Retail Active" },
  { ticker: "ZOMATO", name: "Zomato Limited", sector: "Internet & Consumer Tech", price: "248.60", change: "+3.20%", pe: "115.0", mcap: "₹2,19,400 Cr", range52: "₹98 - ₹298", flow: "High Momentum" }
];

// Returns all equities or filtered matches
app.get('/api/equities', (req, res) => {
  const q = (req.query.q || '').trim().toUpperCase();
  if (!q) return res.json(MASTER_EQUITIES);

  const filtered = MASTER_EQUITIES.filter(stock => 
    stock.ticker.includes(q) || 
    stock.name.toUpperCase().includes(q) || 
    stock.sector.toUpperCase().includes(q)
  );
  res.json(filtered);
});

// Autonomous AI Analytics Engine backed by Gemini REST API
app.post('/api/ai/analyze', async (req, res) => {
  const prompt = (req.body.prompt || '').trim();

  if (!prompt) {
    return res.status(400).json({ error: "Missing query prompt" });
  }

  // Find if a specific equity in our directory is referenced
  const matchedStock = MASTER_EQUITIES.find(s => 
    prompt.toUpperCase().includes(s.ticker) || 
    prompt.toUpperCase().includes(s.name.toUpperCase())
  );

  // Attempt evaluation through Google Gemini API
  if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Aadhya, an institutional equity research analyst for the Indian Stock Market (NSE & BSE). 
Provide a professional, objective valuation report and structural trend analysis for this prompt: "${prompt}".
Rules:
- Keep the response direct, factual, and concise (under 120 words).
- Do not mention third-party retail broker names or external unauthorized links.
- Focus on fundamental metrics, valuation multiples (P/E), 52-week parameters, and institutional momentum.`
            }]
          }]
        })
      });

      const geminiData = await response.json();
      const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        return res.json({
          source: "Gemini Intelligence",
          analysis: generatedText
        });
      }
    } catch (err) {
      console.error("Gemini API call failed, defaulting to autonomous algorithm:", err.message);
    }
  }

  // Fallback Internal Quantitative Evaluation Engine
  if (matchedStock) {
    const valuation = parseFloat(matchedStock.pe) < 22 ? "Undervalued / Attractive Multiple" : (parseFloat(matchedStock.pe) < 40 ? "Fairly Priced Multiple" : "High Growth / Premium Valuation");
    return res.json({
      source: "Autonomous Quant Engine",
      analysis: `Institutional Assessment for ${matchedStock.name} (${matchedStock.ticker}):
• Trading Price: ₹${matchedStock.price} (${matchedStock.change})
• Sector: ${matchedStock.sector}
• Capitalization: ${matchedStock.mcap}
• Valuation: P/E of ${matchedStock.pe} (${valuation})
• 52-Week Range: ${matchedStock.range52}
• Institutional Order Flow: ${matchedStock.flow}
• Structural Summary: The asset demonstrates steady baseline support within its benchmark band with verified order settlement parameters.`
    });
  }

  // Generic Market Context Fallback
  return res.json({
    source: "Autonomous Quant Engine",
    analysis: `Institutional Analysis for "${prompt}":
NSE and BSE indices are reflecting steady participation across banking, energy, and infrastructure sectors. Monitor sector rotation and debt-to-equity ratios when establishing risk-adjusted positions.`
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Institutional Terminal online on port ${PORT}`);
});
        
