const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const COMPANIES = [
  {
    ticker: "RELIANCE",
    name: "Reliance Industries Ltd",
    sector: "Energy, Telecom & Retail",
    price: 2984.50,
    change: "+1.45%",
    marketCap: "₹20,18,500 Cr",
    pe: 26.8,
    pb: 2.1,
    roe: "9.2%",
    roce: "12.4%",
    debtToEquity: "0.38",
    officialWebsite: "https://www.ril.com",
    inflow: "₹ 1,420 Cr",
    outflow: "₹ 410 Cr",
    netFlow: "+₹ 1,010 Cr",
    fiftyTwoHigh: "₹3,024.90",
    fiftyTwoLow: "₹2,220.30",
    history: "Founded by Dhirubhai Ambani in 1966. India's largest conglomerate spanning Oil-to-Chemicals, Jio telecom, and Reliance Retail."
  },
  {
    ticker: "TCS",
    name: "Tata Consultancy Services",
    sector: "IT Services & Consulting",
    price: 4240.20,
    change: "+0.92%",
    marketCap: "₹15,34,200 Cr",
    pe: 29.5,
    pb: 14.2,
    roe: "48.5%",
    roce: "58.2%",
    debtToEquity: "0.00 (Zero Debt)",
    officialWebsite: "https://www.tcs.com",
    inflow: "₹ 890 Cr",
    outflow: "₹ 210 Cr",
    netFlow: "+₹ 680 Cr",
    fiftyTwoHigh: "₹4,592.25",
    fiftyTwoLow: "₹3,313.00",
    history: "Established in 1968 by Tata Group. India's premier IT export and software services provider globally."
  },
  {
    ticker: "HDFCBANK",
    name: "HDFC Bank Ltd",
    sector: "Banking & Financials",
    price: 1662.30,
    change: "+1.18%",
    marketCap: "₹12,65,400 Cr",
    pe: 18.2,
    pb: 2.8,
    roe: "16.8%",
    roce: "17.1%",
    debtToEquity: "N/A (Banking)",
    officialWebsite: "https://www.hdfcbank.com",
    inflow: "₹ 2,340 Cr",
    outflow: "₹ 820 Cr",
    netFlow: "+₹ 1,520 Cr",
    fiftyTwoHigh: "₹1,794.00",
    fiftyTwoLow: "₹1,363.55",
    history: "Founded in 1994. India's largest private sector bank with industry-leading asset quality and CASA ratio."
  },
  {
    ticker: "INFY",
    name: "Infosys Limited",
    sector: "IT Services",
    price: 1845.60,
    change: "-0.35%",
    marketCap: "₹7,65,000 Cr",
    pe: 27.1,
    pb: 8.4,
    roe: "31.2%",
    roce: "40.5%",
    debtToEquity: "0.00 (Zero Debt)",
    officialWebsite: "https://www.infosys.com",
    inflow: "₹ 620 Cr",
    outflow: "₹ 740 Cr",
    netFlow: "-₹ 120 Cr",
    fiftyTwoHigh: "₹1,975.00",
    fiftyTwoLow: "₹1,358.35",
    history: "Founded in 1981 by N.R. Narayana Murthy and team. Pioneer in Indian software exports and digital transformation."
  },
  {
    ticker: "TATASTEEL",
    name: "Tata Steel Ltd",
    sector: "Metals & Mining",
    price: 154.60,
    change: "-0.45%",
    marketCap: "₹1,93,100 Cr",
    pe: 14.8,
    pb: 1.6,
    roe: "11.2%",
    roce: "15.6%",
    debtToEquity: "0.62",
    officialWebsite: "https://www.tatasteel.com",
    inflow: "₹ 410 Cr",
    outflow: "₹ 530 Cr",
    netFlow: "-₹ 120 Cr",
    fiftyTwoHigh: "₹184.60",
    fiftyTwoLow: "₹114.25",
    history: "Founded in 1907 by Jamsetji Tata. One of the top global steel manufacturers with extensive European and Indian operations."
  }
];

function generateFinancialInsight(query) {
  const q = (query || '').toLowerCase().trim();

  if (!q || q === 'hi' || q === 'hello' || q === 'namaste' || q === 'hey') {
    return `నమస్కారం! నేను ఆధ్ర్య (Aadhya) - Market Intelligence & Stock Analyst.\n\nనేను మీకు Groww & Angel One తరహాలో స్టాక్ ఫండమెంటల్స్, P/E, 52-Week రేంజ్, FII/DII క్యాష్ ఫ్లోస్ మరియు బ్యాలెన్స్ షీట్ ఆడిట్ వివరాలను విశ్లేషించి ఇస్తాను.\n\nమీరు ఏ స్టాక్ గురించి తెలుసుకోవాలనుకుంటున్నారు? (ఉదాహరణకు: Reliance, TCS, HDFC Bank, Infosys, Tata Steel అని అడగండి).`;
  }

  const found = COMPANIES.find(c => 
    q.includes(c.ticker.toLowerCase()) || 
    q.includes(c.name.toLowerCase()) ||
    (c.ticker === 'RELIANCE' && q.includes('ril')) ||
    (c.ticker === 'INFY' && q.includes('infosys'))
  );

  if (found) {
    return `📊 **${found.name} (${found.ticker}) పూర్తి విశ్లేషణ:**\n\n• **ప్రస్తుత ధర:** ₹${found.price} (${found.change})\n• **మార్కెట్ క్యాప్:** ${found.marketCap}\n• **52W High / Low:** ${found.fiftyTwoHigh} / ${found.fiftyTwoLow}\n• **Valuation:** P/E: ${found.pe} | ROCE: ${found.roce} | ROE: ${found.roe}\n• **రుణ నిష్పత్తి (Debt to Equity):** ${found.debtToEquity}\n• **ఇన్‌స్టిట్యూషనల్ ఫ్లో:** ${found.netFlow} (ఇన్-ఫ్లో: ${found.inflow}, అవుట్-ఫ్లో: ${found.outflow})\n• **కంపెనీ హిస్టరీ:** ${found.history}\n• **అధికారిక వెబ్‌సైట్:** ${found.officialWebsite}\n\n💡 **రిసర్చ్ రేటింగ్:** ఫండమెంటల్స్ ప్రకారం దీర్ఘకాలిక పెట్టుబడికి ఇన్‌స్టిట్యూషనల్ సపోర్ట్ బలంగా ఉంది.`;
  }

  if (q.includes('market') || q.includes('nifty') || q.includes('sensex') || q.includes('trend')) {
    return `📈 **భారతీయ మార్కెట్ ట్రెండ్ రిపోర్ట్:**\n• **FII యాక్టివిటీ:** బ్యాంకింగ్ & ఎనర్జీ రంగాల్లో కొనుగోళ్లు చురుగ్గా ఉన్నాయి.\n• **నిఫ్టీ ఔట్‌లుక్:** సపోర్ట్ లెవెల్స్ స్థిరంగా ఉన్నాయి.\n• **సలహా:** బలమైన బ్యాలెన్స్ షీట్ మరియు తక్కువ డెట్ ఉన్న లార్జ్ క్యాప్ స్టాక్స్ వైపు మొగ్గు చూపడం శ్రేయస్కరం.`;
  }

  return `✅ **ఆర్థిక విశ్లేషణ ఫలితం:**\n"${query}" పై విశ్లేషణ పూర్తయింది. మార్కెట్‌లో ప్రస్తుతం టెక్నికల్ కన్సాలిడేషన్ నడుస్తోంది.\n\nనిర్దిష్ట కంపెనీల పూర్తి స్థాయి బ్యాలెన్స్ షీట్ మరియు టార్గెట్స్ కోసం **Reliance**, **TCS**, **HDFC Bank**, **Infosys** లేదా **Tata Steel** అని అడగండి!`;
}

app.get('/api/companies', (req, res) => {
  res.json(COMPANIES);
});

app.post('/api/ai/chat', (req, res) => {
  try {
    const userMsg = req.body && req.body.message ? req.body.message : '';
    const reply = generateFinancialInsight(userMsg);
    res.json({ success: true, reply: reply });
  } catch (err) {
    res.json({ success: true, reply: "సర్వర్‌లో విశ్లేషణ సిద్ధంగా ఉంది. దయచేసి కంపెనీ పేరు టైప్ చేయండి." });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Market Analysis Terminal active on port ${PORT}`);
});
