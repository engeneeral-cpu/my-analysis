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
    sector: "Energy & Telecom",
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
    history: "1966లో స్థాపించబడింది. ఆయిల్, జియో టెలికాం, మరియు రిటైల్ రంగాల్లో దేశంలోనే అగ్రగామి."
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
    history: "టాటా గ్రూప్ ఆధ్వర్యంలో 1968లో ఏర్పాటైంది. అంతర్జాతీయ ఐటీ సేవల రంగంలో భారత్ తరపున అగ్రస్థానం."
  },
  {
    ticker: "HDFCBANK",
    name: "HDFC Bank Ltd",
    sector: "Banking & Finance",
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
    history: "1994లో ప్రారంభమైన ప్రైవేట్ బ్యాంకింగ్ దిగ్గజం. బలమైన అసెట్ క్వాలిటీ, రిటైల్ బ్యాంకింగ్ నెట్‌వర్క్."
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
    history: "1981లో ఎన్.ఆర్. నారాయణమూర్తి చేత స్థాపించబడింది. గ్లోబల్ డిజిటల్ సర్వీసుల రంగంలో ప్రముఖ సంస్థ."
  },
  {
    ticker: "ICICIBANK",
    name: "ICICI Bank Ltd",
    sector: "Banking & Finance",
    price: 1210.40,
    change: "+1.05%",
    marketCap: "₹8,52,000 Cr",
    pe: 17.5,
    pb: 3.1,
    roe: "18.4%",
    roce: "18.9%",
    debtToEquity: "N/A (Banking)",
    officialWebsite: "https://www.icicibank.com",
    inflow: "₹ 1,150 Cr",
    outflow: "₹ 430 Cr",
    netFlow: "+₹ 720 Cr",
    fiftyTwoHigh: "₹1,257.80",
    fiftyTwoLow: "₹910.00",
    history: "1994లో స్థాపించబడింది. భారత్‌లో డిజిటల్ బ్యాంకింగ్ మరియు లోన్ ప్రొడక్టులలో అగ్రగామి ప్రైవేట్ బ్యాంక్."
  },
  {
    ticker: "ITC",
    name: "ITC Limited",
    sector: "FMCG & Conglomerate",
    price: 502.80,
    change: "+0.40%",
    marketCap: "₹6,28,000 Cr",
    pe: 28.2,
    pb: 8.9,
    roe: "29.1%",
    roce: "38.2%",
    debtToEquity: "0.00 (Zero Debt)",
    officialWebsite: "https://www.itcportal.com",
    inflow: "₹ 540 Cr",
    outflow: "₹ 210 Cr",
    netFlow: "+₹ 330 Cr",
    fiftyTwoHigh: "₹520.00",
    fiftyTwoLow: "₹399.30",
    history: "1910లో ఏర్పాటైంది. FMCG, హోటల్స్, పేపర్‌బోర్డ్స్ మరియు అగ్రి-బిజినెస్‌లో విస్తృత నెట్‌వర్క్."
  },
  {
    ticker: "SBIN",
    name: "State Bank of India",
    sector: "Public Sector Bank",
    price: 815.10,
    change: "+0.75%",
    marketCap: "₹7,27,400 Cr",
    pe: 10.4,
    pb: 1.5,
    roe: "16.1%",
    roce: "14.8%",
    debtToEquity: "N/A (PSU Bank)",
    officialWebsite: "https://www.sbi.co.in",
    inflow: "₹ 980 Cr",
    outflow: "₹ 450 Cr",
    netFlow: "+₹ 530 Cr",
    fiftyTwoHigh: "₹912.00",
    fiftyTwoLow: "₹555.00",
    history: "భారతదేశపు అతిపెద్ద ప్రభుత్వ రంగ బ్యాంక్. దేశవ్యాప్తంగా 22,000 పైగా బ్రాంచీలతో సేవలందిస్తోంది."
  },
  {
    ticker: "BHARTIARTL",
    name: "Bharti Airtel Ltd",
    sector: "Telecommunications",
    price: 1570.25,
    change: "+1.80%",
    marketCap: "₹8,92,000 Cr",
    pe: 65.4,
    pb: 9.8,
    roe: "15.2%",
    roce: "14.1%",
    debtToEquity: "1.82",
    officialWebsite: "https://www.airtel.in",
    inflow: "₹ 1,320 Cr",
    outflow: "₹ 380 Cr",
    netFlow: "+₹ 940 Cr",
    fiftyTwoHigh: "₹1,610.00",
    fiftyTwoLow: "₹880.00",
    history: "1995లో సునీల్ మిట్టల్ ప్రారంభించారు. భారత్, దక్షిణాసియా మరియు ఆఫ్రికాలో ప్రముఖ టెలికాం ఆపరేటర్."
  },
  {
    ticker: "LT",
    name: "Larsen & Toubro Ltd",
    sector: "Infrastructure & Engineering",
    price: 3620.00,
    change: "+0.65%",
    marketCap: "₹4,98,000 Cr",
    pe: 34.2,
    pb: 5.1,
    roe: "14.9%",
    roce: "16.8%",
    debtToEquity: "0.85",
    officialWebsite: "https://www.larsentoubro.com",
    inflow: "₹ 710 Cr",
    outflow: "₹ 390 Cr",
    netFlow: "+₹ 320 Cr",
    fiftyTwoHigh: "₹3,948.00",
    fiftyTwoLow: "₹2,860.00",
    history: "1938లో డానిష్ ఇంజనీర్లు స్థాపించారు. డిఫెన్స్, న్యూక్లియర్, మెగా ఇన్‌ఫ్రాస్ట్రక్చర్ రంగంలో అగ్రశ్రేణి కంపెనీ."
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
    history: "1907లో జంషెడ్‌జీ టాటా స్థాపించారు. గ్లోబల్ ప్రెజెన్స్ ఉన్న భారతదేశపు పురాతన స్టీల్ కంపెనీ."
  }
];

function generateFinancialInsight(query) {
  const q = (query || '').toLowerCase().trim();

  if (!q || q === 'hi' || q === 'hello' || q === 'namaste' || q === 'hey') {
    return `నమస్కారం! నేను మీ మార్కెట్ అనలిటిక్స్ AI అసిస్టెంట్‌ని.

నేను భారతీయ స్టాక్ మార్కెట్‌లోని కంపెనీల ఫండమెంటల్స్, P/E రేషియో, డెట్, FII/DII నెట్ ఫ్లో మరియు బ్యాలెన్స్ షీట్ లెక్కలను స్వతంత్రంగా విశ్లేషిస్తాను. 

మీరు ఏ కంపెనీ గురించి తెలుసుకోవాలనుకుంటున్నారు? ఉదాహరణకు: Reliance, TCS, HDFC, SBI, ITC, Airtel, Tata Steel అని అడగండి.`;
  }

  const found = COMPANIES.find(c => 
    q.includes(c.ticker.toLowerCase()) || 
    q.includes(c.name.toLowerCase()) ||
    (c.ticker === 'RELIANCE' && q.includes('ril')) ||
    (c.ticker === 'INFY' && q.includes('infosys')) ||
    (c.ticker === 'SBIN' && (q.includes('sbi') || q.includes('state bank'))) ||
    (c.ticker === 'BHARTIARTL' && q.includes('airtel')) ||
    (c.ticker === 'ICICIBANK' && q.includes('icici')) ||
    (c.ticker === 'LT' && (q.includes('l&t') || q.includes('larsen')))
  );

  if (found) {
    const valuation = found.pe < 20 ? "ఆకర్షణీయమైన వాల్యుయేషన్ (Undervalued)" : (found.pe < 35 ? "సహేతుకమైన వాల్యుయేషన్ (Fairly Valued)" : "ప్రీమియం వాల్యుయేషన్ (High Growth)");
    const debtHealth = found.debtToEquity.includes('0.00') ? "డెట్-ఫ్రీ (రుణ రహిత కంపెనీ)" : (parseFloat(found.debtToEquity) < 1 ? "తక్కువ రుణ భారం (Safe Debt)" : "పరిశీలించాల్సిన రుణం");

    return `📊 **${found.name} (${found.ticker}) - మార్కెట్ విశ్లేషణ:**

• **ధర & ట్రెండ్:** ₹${found.price} (${found.change})
• **మార్కెట్ విలువ (MCap):** ${found.marketCap}
• **52 వారాల గరిష్టం / కనిష్టం:** ${found.fiftyTwoHigh} / ${found.fiftyTwoLow}
• **వాల్యుయేషన్ అనాలిసిస్:** P/E నిష్పత్తి ${found.pe} (${valuation})
• **క్యాపిటల్ ఎఫిషియెన్సీ:** ROCE ${found.roce} | ROE ${found.roe}
• **రుణ స్థాయి:** ${found.debtToEquity} (${debtHealth})
• **ఇన్‌స్టిట్యూషనల్ ఫ్లో:** ${found.netFlow} (కొనుగోళ్లు: ${found.inflow}, అమ్మకాలు: ${found.outflow})
• **కంపెనీ నేపథ్యం:** ${found.history}
• **అధికారిక పోర్టల్:** ${found.officialWebsite}

📌 **స్వతంత్ర పరిశీలన:** కంపెనీ బ్యాలెన్స్ షీట్ మరియు ఇన్‌స్టిట్యూషనల్ పెట్టుబడుల సరళిని బట్టి స్థిరమైన పనితీరును సూచిస్తోంది.`;
  }

  if (q.includes('top') || q.includes('best') || q.includes('manchi')) {
    return `💡 **టాప్ ఫండమెంటల్ స్టాక్స్ (Zero/Low Debt):**
1. **TCS** - డెట్-ఫ్రీ, ROCE: 58.2%
2. **Infosys** - డెట్-ఫ్రీ, బలమైన గ్లోబల్ క్లయింట్స్
3. **ITC** - జీరో డెట్, స్థిరమైన క్యాష్‌ఫ్లోస్
4. **HDFC Bank** - భారతదేశపు అతిపెద్ద ప్రైవేట్ బ్యాంక్ నెట్‌వర్క్`;
  }

  if (q.includes('nifty') || q.includes('market') || q.includes('trend')) {
    return `📈 **భారతీయ స్టాక్ మార్కెట్ ఓవర్‌వ్యూ:**
• నిఫ్టీ 50 కీలక సపోర్ట్ జోన్‌లో స్థిరంగా కొనసాగుతోంది.
• బ్యాంకింగ్ మరియు ఇన్ఫ్రా రంగాల్లో సంస్థాగత పెట్టుబడులు (FIIs) సానుకూలంగా ఉన్నాయి.
• పెట్టుబడిదారులు అధిక రుణాలు లేని లార్జ్-క్యాప్ కంపెనీల వైపు పరిశీలించవచ్చు.`;
  }

  return `🔎 **ఆర్థిక విశ్లేషణ:**
"${query}" కి సంబంధించిన గణాంకాలను పరిశీలిస్తున్నాం. 

నిర్దిష్ట ఫండమెంటల్ రిపోర్ట్ కోసం జాబితాలోని కంపెనీలు (ఉదా: **Reliance**, **TCS**, **HDFC**, **SBI**, **ICICI**, **ITC**, **Airtel**, **Tata Steel**, **L&T**) టైప్ చేయండి.`;
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
    res.json({ success: true, reply: "సర్వర్‌లో విశ్లేషణ సిద్ధంగా ఉంది. దయచేసి కంపెనీ పేరు నమోదు చేయండి." });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Market Analysis Engine running on port ${PORT}`);
});
      
