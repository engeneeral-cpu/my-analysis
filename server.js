require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const COMPANY_REPOSITORY = [
  {
    ticker: "RELIANCE",
    name: "Reliance Industries Limited",
    sector: "Energy & Telecom Conglomerate",
    price: 2980.45,
    change: "+1.42%",
    pe: 26.8,
    roce: "12.4%",
    debtToEquity: "0.38",
    officialWebsite: "https://www.ril.com",
    inflow: "₹ 1,420 Cr (FII Inflow)",
    outflow: "₹ 410 Cr (DII Outflow)",
    netFlow: "+₹ 1,010 Cr",
    caAudit: {
      costEstimationRatio: "0.94 (Optimal Efficiency)",
      fibreCapExEstimation: "₹ 14,200 Cr Allocated",
      pendingAnalysis: "Audit clearance for retail subsidiary",
      cashFlowHealth: "AAA Institutional Grade"
    },
    history: "Founded by Dhirubhai Ambani in 1966. Grew into global energy, refining, petrochemicals, telecommunications (Jio), and retail."
  },
  {
    ticker: "TCS",
    name: "Tata Consultancy Services Ltd",
    sector: "Information Technology",
    price: 4235.10,
    change: "+0.85%",
    pe: 29.5,
    roce: "58.2%",
    debtToEquity: "0.00 (Zero Debt)",
    officialWebsite: "https://www.tcs.com",
    inflow: "₹ 890 Cr (FII + DII)",
    outflow: "₹ 210 Cr (Retail Exit)",
    netFlow: "+₹ 680 Cr",
    caAudit: {
      costEstimationRatio: "0.82 (High Margin Asset-Light)",
      fibreCapExEstimation: "₹ 1,150 Cr (Cloud Infrastructure)",
      pendingAnalysis: "European AI pipeline revenue verification",
      cashFlowHealth: "Superior Cash Conversion (99%)"
    },
    history: "Established in 1968 under Tata Sons. Pioneer of Indian IT offshoring, now one of the world's most valuable IT consultancies."
  },
  {
    ticker: "HDFCBANK",
    name: "HDFC Bank Limited",
    sector: "Banking & Financial Services",
    price: 1658.00,
    change: "+1.15%",
    pe: 18.2,
    roce: "17.1%",
    debtToEquity: "N/A (CASA: 38.4%)",
    officialWebsite: "https://www.hdfcbank.com",
    inflow: "₹ 2,340 Cr (Institutional Buying)",
    outflow: "₹ 820 Cr",
    netFlow: "+₹ 1,520 Cr",
    caAudit: {
      costEstimationRatio: "0.68 (Industry Low Cost-to-Income)",
      fibreCapExEstimation: "₹ 2,800 Cr (Core Banking Cloud)",
      pendingAnalysis: "Post-merger mortgage asset yield reconciliation",
      cashFlowHealth: "Capital Adequacy 18.8%"
    },
    history: "Incorporated in 1994 as part of RBI private bank deregulation. India's largest private bank by asset base."
  },
  {
    ticker: "TATASTEEL",
    name: "Tata Steel Limited",
    sector: "Metals & Mining",
    price: 154.20,
    change: "-0.40%",
    pe: 14.8,
    roce: "15.6%",
    debtToEquity: "0.62",
    officialWebsite: "https://www.tatasteel.com",
    inflow: "₹ 410 Cr",
    outflow: "₹ 530 Cr",
    netFlow: "-₹ 120 Cr",
    caAudit: {
      costEstimationRatio: "1.08 (Elevated transition costs)",
      fibreCapExEstimation: "₹ 8,400 Cr (Green Steel EAF)",
      pendingAnalysis: "UK Port Talbot EAF subsidy settlement",
      cashFlowHealth: "Adequate Liquidity Reserve"
    },
    history: "Founded in 1907 by Jamsetji Tata. Asia's first integrated private steel producer."
  }
];

// Smart Intelligent Financial Response Engine
function generateFinancialInsight(query) {
  const q = query.toLowerCase();
  
  if (q.includes('hi') || q.includes('hello') || q.includes('namaste')) {
    return `నమస్కారం! నేను ఆధ్ర్య (Aadhya), Senior CA & Institutional Market Analyst. నేను మీకు స్టాక్ అనాలిసిస్, కంపెనీ బ్యాలెన్స్ షీట్స్, FII/DII క్యాష్ ఫ్లోస్ మరియు CapEx ఖర్చులను విశ్లేషించడంలో సహాయపడతాను. మీరు ఏ కంపెనీ గురించి తెలుసుకోవాలనుకుంటున్నారు?`;
  }
  
  if (q.includes('reliance') || q.includes('ril')) {
    const c = COMPANY_REPOSITORY[0];
    return `📊 **Reliance Industries (RIL) CA Audit Summary:**\n• Current Price: ₹${c.price} (${c.change})\n• Institutional Net Flow: ${c.netFlow}\n• CapEx & Fibre: ${c.caAudit.fibreCapExEstimation}\n• Cost Efficiency: ${c.caAudit.costEstimationRatio}\n• Promoters & History: Founded by Dhirubhai Ambani in 1966. Strong institutional grade cash flows.`;
  }
  
  if (q.includes('tcs') || q.includes('tata consultancy')) {
    const c = COMPANY_REPOSITORY[1];
    return `📊 **TCS CA Financial Analysis:**\n• Current Price: ₹${c.price} (${c.change})\n• Debt: Zero Debt Company (D/E: 0.00)\n• Institutional Net Inflow: ${c.netFlow}\n• Cost Efficiency: ${c.caAudit.costEstimationRatio}\n• Audit Status: Verified, industry top-tier ROCE (58.2%).`;
  }
  
  if (q.includes('hdfc')) {
    const c = COMPANY_REPOSITORY[2];
    return `📊 **HDFC Bank Financial Audit:**\n• Price: ₹${c.price}\n• Net Inflow: ${c.netFlow} (Heavy institutional backing)\n• Capital Adequacy: 18.8% (Healthy reserve)\n• NIM & Metrics: Cost-to-income at 0.68 ratio.`;
  }
  
  if (q.includes('steel') || q.includes('tatasteel')) {
    const c = COMPANY_REPOSITORY[3];
    return `📊 **Tata Steel CA Analysis:**\n• Price: ₹${c.price} (${c.change})\n• Net Outflow: ${c.netFlow}\n• Transition CapEx: ${c.caAudit.fibreCapExEstimation}\n• Status: UK EAF subsidy reconciliation underway.`;
  }
  
  return `✅ **CA Institutional Insight:** "${query}" విశ్లేషణ పూర్తయింది. మార్కెట్ ట్రెండ్ ప్రకారం ప్రస్తుత FII ఇన్-ఫ్లో పాజిటివ్‌గా ఉంది. నిర్దిష్ట కంపెనీ (ఉదాహరణకు: Reliance, TCS, HDFC Bank, Tata Steel) లేదా బ్యాలెన్స్ షీట్ ఆడిట్ వివరాల కోసం అడగండి.`;
}

// API Routes
app.get('/api/companies', (req, res) => {
  res.json(COMPANY_REPOSITORY);
});

app.post('/api/ai/chat', (req, res) => {
  const userMsg = (req.body && req.body.message) ? req.body.message : '';
  const reply = generateFinancialInsight(userMsg);
  return res.json({ success: true, reply: reply });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
