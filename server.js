const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Set your Gemini API key in Render Environment Variables or paste it below
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Equities Directory with Official Website Links & Fundamental Metrics
const EQUITIES = [
  { 
    ticker: "RELIANCE", 
    name: "Reliance Industries Ltd", 
    sector: "Energy & Telecom", 
    price: "2984.50", 
    change: "+1.45%", 
    pe: "26.8", 
    mcap: "₹20,18,500 Cr", 
    fiftyTwoHigh: "₹3,024.90", 
    fiftyTwoLow: "₹2,220.30", 
    website: "https://www.ril.com", 
    desc: "India's highest market-cap conglomerate spanning Oil-to-Chemicals, Jio Digital, and Reliance Retail." 
  },
  { 
    ticker: "TCS", 
    name: "Tata Consultancy Services Ltd", 
    sector: "IT Services", 
    price: "4240.20", 
    change: "+0.92%", 
    pe: "29.5", 
    mcap: "₹15,34,200 Cr", 
    fiftyTwoHigh: "₹4,592.25", 
    fiftyTwoLow: "₹3,313.00", 
    website: "https://www.tcs.com", 
    desc: "Global flagship IT service powerhouse under Tata Group with pristine cash generation and zero debt." 
  },
  { 
    ticker: "HEROMOTOCO", 
    name: "Hero MotoCorp Ltd", 
    sector: "Automobile (2W)", 
    price: "5420.00", 
    change: "+1.10%", 
    pe: "27.4", 
    mcap: "₹1,08,300 Cr", 
    fiftyTwoHigh: "₹5,894.00", 
    fiftyTwoLow: "₹2,980.00", 
    website: "https://www.heromotocorp.com", 
    desc: "World's largest two-wheeler manufacturer with virtually zero debt and leading rural/urban distribution." 
  },
  { 
    ticker: "TATAMOTORS", 
    name: "Tata Motors Ltd", 
    sector: "Automobile & EV", 
    price: "985.40", 
    change: "+2.15%", 
    pe: "11.2", 
    mcap: "₹3,62,000 Cr", 
    fiftyTwoHigh: "₹1,179.00", 
    fiftyTwoLow: "₹600.50", 
    website: "https://www.tatamotors.com", 
    desc: "Market leader in domestic electric passenger vehicles and commercial mobility alongside Jaguar Land Rover." 
  },
  { 
    ticker: "MRF", 
    name: "MRF Limited", 
    sector: "Tyres & Rubber", 
    price: "134200.00", 
    change: "+0.45%", 
    pe: "24.1", 
    mcap: "₹56,900 Cr", 
    fiftyTwoHigh: "₹151,280.00", 
    fiftyTwoLow: "₹107,000.00", 
    website: "https://www.mrftyres.com", 
    desc: "India's highest-priced listed equity and leading tyre manufacturer across personal and commercial vehicles." 
  },
  { 
    ticker: "HDFCBANK", 
    name: "HDFC Bank Ltd", 
    sector: "Banking & Finance", 
    price: "1662.30", 
    change: "+1.18%", 
    pe: "18.2", 
    mcap: "₹12,65,400 Cr", 
    fiftyTwoHigh: "₹1,794.00", 
    fiftyTwoLow: "₹1,363.55", 
    website: "https://www.hdfcbank.com", 
    desc: "Premier private sector bank in India with industry-leading capital adequacy and extensive branch coverage." 
  },
  { 
    ticker: "INFY", 
    name: "Infosys Limited", 
    sector: "IT Services", 
    price: "1845.60", 
    change: "-0.35%", 
    pe: "27.1", 
    mcap: "₹7,65,000 Cr", 
    fiftyTwoHigh: "₹1,975.00", 
    fiftyTwoLow: "₹1,358.35", 
    website: "https://www.infosys.com", 
    desc: "Global pioneer in digital consulting and next-generation software services with a debt-free profile." 
  },
  { 
    ticker: "SBIN", 
    name: "State Bank of India", 
    sector: "Public Sector Banking", 
    price: "815.10", 
    change: "+0.75%", 
    pe: "10.4", 
    mcap: "₹7,27,400 Cr", 
    fiftyTwoHigh: "₹912.00", 
    fiftyTwoLow: "₹555.00", 
    website: "https://www.sbi.co.in", 
    desc: "India's largest public sector bank commanding approximately one-fourth of the national loan market." 
  },
  { 
    ticker: "ITC", 
    name: "ITC Limited", 
    sector: "FMCG & Hotels", 
    price: "502.80", 
    change: "+0.40%", 
    pe: "28.2", 
    mcap: "₹6,28,000 Cr", 
    fiftyTwoHigh: "₹520.00", 
    fiftyTwoLow: "₹399.30", 
    website: "https://www.itcportal.com", 
    desc: "Conglomerate commanding high market share in cigarettes, FMCG products, paperboards, and luxury hotels." 
  },
  { 
    ticker: "BHARTIARTL", 
    name: "Bharti Airtel Ltd", 
    sector: "Telecommunications", 
    price: "1570.25", 
    change: "+1.80%", 
    pe: "65.4", 
    mcap: "₹8,92,000 Cr", 
    fiftyTwoHigh: "₹1,610.00", 
    fiftyTwoLow: "₹880.00", 
    website: "https://www.airtel.in", 
    desc: "Leading telecommunications company providing 5G connectivity and digital services across India and Africa." 
  }
];

// Top Institutional Mutual Funds
const MUTUAL_FUNDS = [
  { id: "MF-01", name: "Parag Parikh Flexi Cap Fund", category: "Flexi Cap", nav: "₹78.42", cagr3Y: "21.4%", rating: "5★", minSip: "₹1,000" },
  { id: "MF-02", name: "HDFC Mid-Cap Opportunities Fund", category: "Mid Cap", nav: "₹184.20", cagr3Y: "27.8%", rating: "5★", minSip: "₹500" },
  { id: "MF-03", name: "Mirae Asset Large Cap Fund", category: "Large Cap", nav: "₹112.50", cagr3Y: "16.9%", rating: "4★", minSip: "₹1,000" },
  { id: "MF-04", name: "SBI Small Cap Fund", category: "Small Cap", nav: "₹168.10", cagr3Y: "24.2%", rating: "5★", minSip: "₹500" }
];

app.get('/api/equities', (req, res) => res.json(EQUITIES));
app.get('/api/mutual-funds', (req, res) => res.json(MUTUAL_FUNDS));

// Live Gemini AI Research Engine with Fallback Rule Engine
app.post('/api/ai/chat', async (req, res) => {
  const userMessage = (req.body && req.body.message ? req.body.message : '').trim();

  if (!userMessage) {
    return res.json({ reply: "Please enter a valid stock ticker or company name to begin analysis." });
  }

  // Attempt real Gemini API call if key is provided
  if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: `You are Aadhya, a female financial analyst for Indian Stock Markets (NSE & BSE). 
Analyze the following query professionally, mentioning valuation, fundamentals, 52-week trends, and risk assessments. Keep it clear and concise.
Query: "${userMessage}"`
              }
            ]
          }
        ]
      };

      const geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await geminiRes.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) {
        return res.json({ reply: generatedText });
      }
    } catch (err) {
      console.error("Gemini API connection error:", err);
    }
  }

  // Fallback Engine if Gemini key is unset or rate-limited
  const q = userMessage.toLowerCase();
  const found = EQUITIES.find(e => 
    q.includes(e.ticker.toLowerCase()) || 
    q.includes(e.name.toLowerCase()) ||
    (e.ticker === "HEROMOTOCO" && q.includes("hero")) ||
    (e.ticker === "TATAMOTORS" && q.includes("tata")) ||
    (e.ticker === "MRF" && q.includes("mrf")) ||
    (e.ticker === "RELIANCE" && q.includes("reliance")) ||
    (e.ticker === "SBIN" && q.includes("sbi"))
  );

  if (found) {
    return res.json({
      reply: `📊 **${found.name} (${found.ticker}) Equity Dossier:**\n\n` +
             `• **Live Price:** ₹${found.price} (${found.change})\n` +
             `• **Sector:** ${found.sector}\n` +
             `• **Market Capitalization:** ${found.mcap}\n` +
             `• **52-Week Range:** ${found.fiftyTwoLow} — ${found.fiftyTwoHigh}\n` +
             `• **P/E Ratio:** ${found.pe}\n` +
             `• **Summary:** ${found.desc}\n` +
             `• **Official Portal:** ${found.website}\n\n` +
             `📌 **Analyst Perspective:** The company maintains solid institutional backing and healthy operational cash flow within its sector.`
    });
  }

  return res.json({
    reply: `🔍 **Market Overview for "${userMessage}":**\n\nEquities across NSE and BSE are consolidating near strategic resistance levels. For comprehensive fundamental dossiers, search for companies such as **Hero MotoCorp**, **Tata Motors**, **Reliance**, **MRF**, or **SBI**.`
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
      
