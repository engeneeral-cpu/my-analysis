const ENGINE_VERSION = '1.1.0-native';

const TARGETS = Object.freeze({
  marketData:'live market data', financialData:'verified financial data', history:'historical market data',
  realtime:'real-time streaming', news:'news and sentiment', fundamentals:'fundamental analysis', risk:'risk intelligence',
  portfolio:'portfolio intelligence', decision:'decision and reasoning', knowledge:'finance knowledge engine', ownModel:'Tara own model',
  scale:'large-scale architecture', security:'security and compliance', languages:'multilingual intelligence'
});

function configured(name, required=true){ const value=String(process.env[name]||'').trim(); return {configured:Boolean(value),provider:value||null,required}; }
function providerStatus(){ return {
  marketData:configured('MARKET_DATA_PROVIDER_NAME'), financialData:configured('FINANCIAL_DATA_PROVIDER_NAME'),
  history:configured('MARKET_HISTORY_PROVIDER_NAME'), realtime:configured('MARKET_DATA_STREAM_PROVIDER_NAME'),
  news:configured('NEWS_PROVIDER_NAME'), ownModel:{configured:true,provider:'native-rule-engine',required:false}
}; }
function detectIntent(query=''){
  const q=String(query).toLowerCase().trim();
  if(/\b(hi|hello|hey|namaste|నమస్తే|హాయ్|హలో|who are you|what are you)\b/.test(q)) return 'GREETING';
  if(/\b(rsi|macd|sma|ema|vwap|technical|trend|support|resistance|breakout|candlestick|buy|sell)\b/.test(q)) return 'TECHNICAL_ANALYSIS';
  if(/\b(financial|fundamental|pe|p\/e|profit|revenue|eps|debt|cash flow|balance sheet|valuation)\b/.test(q)) return 'FUNDAMENTAL_ANALYSIS';
  if(/\b(risk|volatility|drawdown|safe|danger)\b/.test(q)) return 'RISK_ANALYSIS';
  if(/\b(portfolio|sip|allocation|diversif|holdings)\b/.test(q)) return 'PORTFOLIO';
  if(/\b(company|stock|share|market|nse|bse|tcs|reliance|infy)\b/.test(q)) return 'MARKET_SEARCH';
  return 'GENERAL_MARKET';
}
function num(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
function calculateTaraScore(data={}){
  let score=50, factors=[];
  const rsi=num(data.rsi), price=num(data.currentPrice ?? data.price), sma20=num(data.sma20), sma50=num(data.sma50), pe=num(data.pe), debtToEquity=num(data.debtToEquity);
  if(rsi!==null){ if(rsi<30){score+=20;factors.push('RSI indicates oversold conditions');} else if(rsi>70){score-=20;factors.push('RSI indicates overbought conditions');} else factors.push('RSI is not at an extreme'); }
  if(price!==null&&sma20!==null){ if(price>sma20){score+=7;factors.push('Price is above SMA 20');} else {score-=7;factors.push('Price is below SMA 20');} }
  if(price!==null&&sma50!==null){ if(price>sma50){score+=15;factors.push('Price is above SMA 50');} else {score-=15;factors.push('Price is below SMA 50');} }
  if(pe!==null&&pe>0){ if(pe<25){score+=15;factors.push('P/E is below the configured reference threshold');} else {score-=10;factors.push('P/E is above the configured reference threshold');} }
  if(debtToEquity!==null&&debtToEquity>=0){ if(debtToEquity<1){score+=10;factors.push('Debt-to-equity is below 1.0');} else if(debtToEquity>2){score-=15;factors.push('Debt-to-equity is above 2.0');} else factors.push('Debt-to-equity is between the reference thresholds'); }
  score=Math.max(0,Math.min(100,score));
  return {score,factors,confidence:factors.length?Math.min(95,40+factors.length*12):0};
}
function evidence(item){ if(!item||item.value===undefined||item.value===null||item.value==='') return null; return {value:item.value,source:item.source||null,retrievedAt:item.retrievedAt||null,verified:item.verified===true}; }
function analyze(input={}){
  const symbol=String(input.symbol||'').trim().toUpperCase(); if(!symbol) throw new Error('A valid company symbol is required.');
  const verified=[],missing=[]; const add=(name,item)=>{const e=evidence(item); if(e&&e.verified&&e.source) verified.push({name,...e}); else missing.push(name);};
  ['price','previousClose','volume','revenue','profit','eps','debt','cashFlow','pe','rsi','sma20','sma50','debtToEquity'].forEach(k=>add(k,input[k]));
  const technical=calculateTaraScore(input), completeness=Math.round(verified.length/14*100);
  return {success:true,engine:'Tara Intelligence Engine',version:ENGINE_VERSION,symbol,mode:'native-evidence-first',decision:verified.length?'scenario_only':'insufficient_verified_evidence',confidence:verified.length?Math.min(technical.confidence,completeness):0,completeness,verifiedEvidence:verified,missingEvidence:missing,technicalScore:technical.score,technicalFactors:technical.factors,scenarios:[],warnings:['Tara never invents market or financial values.','This score is analytical, not a guaranteed buy/sell signal.'],nextRequired:missing,generatedAt:new Date().toISOString()};
}
function processQuery(userQuery,stockContext={}){
  const intent=detectIntent(userQuery); const symbol=String(stockContext.symbol||'').toUpperCase();
  if(intent==='GREETING') return {intent,text:'నమస్తే! నేను Tara AI — మీ స్వంత market intelligence engine. Verified NSE/BSE data ఆధారంగా analysis చేయడానికి సిద్ధంగా ఉన్నాను.'};
  if(!symbol && ['TECHNICAL_ANALYSIS','FUNDAMENTAL_ANALYSIS','RISK_ANALYSIS','MARKET_SEARCH'].includes(intent)) return {intent,text:'మీరు విశ్లేషించాలనుకుంటున్న company name లేదా NSE/BSE symbol ఇవ్వండి. ఉదాహరణ: TCS, RELIANCE, INFY.'};
  if(intent==='TECHNICAL_ANALYSIS'){ const a=calculateTaraScore(stockContext); return {intent,score:a.score,confidence:a.confidence,factors:a.factors,text:`Tara Technical Evaluation — ${symbol}\nTara Market Score: ${a.score}/100\n${a.factors.map(x=>'• '+x).join('\n')||'• Verified RSI, moving-average and valuation inputs అవసరం.'}`}; }
  if(intent==='FUNDAMENTAL_ANALYSIS') return {intent,text:`Tara Fundamental Engine — ${symbol}\nRevenue, profit, EPS, debt, cash-flow, P/E మరియు balance-sheet inputs verified source నుంచి అందిన తర్వాత మాత్రమే conclusion ఇస్తాను.`};
  if(intent==='RISK_ANALYSIS') return {intent,text:`Tara Risk Engine — ${symbol}\nVolatility, drawdown, leverage, liquidity మరియు verified financial risk inputs అవసరం. Risk level ను ఊహించి చెప్పను.`};
  return {intent,text:`Tara AI native engine request received for ${symbol||'the market'}. Verified company/market evidence ఆధారంగా మాత్రమే analysis చేస్తాను.`};
}
function targetStatus(){const providers=providerStatus();return Object.entries(TARGETS).map(([id,name])=>({id,name,status:['scale','security','languages','decision','knowledge'].includes(id)?'foundation':(providers[id]?.configured?'connected':'ready_for_provider'),provider:providers[id]?.provider||null}));}
module.exports={ENGINE_VERSION,TARGETS,providerStatus,targetStatus,detectIntent,calculateTaraScore,processQuery,analyze};