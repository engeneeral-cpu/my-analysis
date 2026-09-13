const ENGINE_VERSION = '2.1.0-native-evidence';

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

// Strict validation for quantitative inputs. This never proves a source is licensed;
// licensing/authorization must come from the configured provider/data pipeline.
function validateMetrics(data){
  const errors=[];
  if(!data || typeof data!=='object') return {isValid:false,errors:['Missing market data payload']};
  const positive=['currentPrice','sma20','sma50'];
  for(const key of positive){const n=num(data[key]);if(n===null||n<=0)errors.push(`Invalid ${key}: must be a positive finite number`);}
  const rsi=num(data.rsi); if(rsi===null||rsi<0||rsi>100)errors.push('Invalid RSI: must be between 0 and 100');
  const pe=num(data.pe); if(pe===null||pe<0)errors.push('Invalid P/E ratio: must be zero or positive');
  const de=num(data.debtToEquity); if(de===null||de<0)errors.push('Invalid debt-to-equity ratio: must be zero or positive');
  if(!data.dataSource || data.dataSource.isVerified!==true)errors.push('Unverified market data: verified source evidence is required');
  if(!data.dataSource || !String(data.dataSource.name||'').trim())errors.push('Missing data source name');
  if(!data.dataSource || !String(data.dataSource.retrievedAt||'').trim())errors.push('Missing source retrieval timestamp');
  return {isValid:errors.length===0,errors};
}

function calculateMultiFactorScore(data={}){
  let score=50; const factors=[];
  const rsi=num(data.rsi), price=num(data.currentPrice), sma20=num(data.sma20), sma50=num(data.sma50), pe=num(data.pe), de=num(data.debtToEquity);
  if(rsi<30){score+=15;factors.push('RSI indicates oversold conditions');}
  else if(rsi>70){score-=15;factors.push('RSI indicates overbought conditions');}
  else if(rsi>=40&&rsi<=60){score+=8;factors.push('RSI is in a balanced momentum zone');}
  else factors.push('RSI is moderate');
  if(price>sma20&&sma20>sma50){score+=18;factors.push('Price > SMA20 > SMA50: bullish alignment');}
  else if(price<sma20&&sma20<sma50){score-=18;factors.push('Price < SMA20 < SMA50: bearish alignment');}
  else if(price>sma50){score+=8;factors.push('Price is above SMA50');}
  else {score-=8;factors.push('Price is below SMA50');}
  if(pe>0&&pe<=22){score+=12;factors.push('P/E is within the configured lower valuation band');}
  else if(pe>22&&pe<=45){score+=4;factors.push('P/E is within the configured middle valuation band');}
  else {score-=10;factors.push('P/E is in an elevated valuation band');}
  if(de===0){score+=12;factors.push('Debt-to-equity is zero');}
  else if(de<0.8){score+=8;factors.push('Debt-to-equity is below 0.8');}
  else if(de<=1.5){factors.push('Debt-to-equity is in a moderate leverage band');}
  else {score-=14;factors.push('Debt-to-equity is above 1.5');}
  score=Math.max(5,Math.min(95,score));
  let verdict='NEUTRAL',stance='HOLD / RANGEBOUND';
  if(score>=70){verdict='BULLISH';stance='STRUCTURAL-DIP RESEARCH ZONE';}
  else if(score<=40){verdict='BEARISH';stance='RISK-MITIGATION RESEARCH ZONE';}
  return {score,verdict,stance,factors};
}

function evidence(item){ if(!item||item.value===undefined||item.value===null||item.value==='') return null; return {value:item.value,source:item.source||null,retrievedAt:item.retrievedAt||null,verified:item.verified===true}; }
function analyze(input={}){
  const symbol=String(input.symbol||'').trim().toUpperCase(); if(!symbol) throw new Error('A valid company symbol is required.');
  const verified=[],missing=[]; const add=(name,item)=>{const e=evidence(item); if(e&&e.verified&&e.source&&e.retrievedAt) verified.push({name,...e}); else missing.push(name);};
  ['price','previousClose','volume','revenue','profit','eps','debt','cashFlow','pe','rsi','sma20','sma50','debtToEquity'].forEach(k=>add(k,input[k]));
  const core={currentPrice:input.price?.value,rsi:input.rsi?.value,sma20:input.sma20?.value,sma50:input.sma50?.value,pe:input.pe?.value,debtToEquity:input.debtToEquity?.value,dataSource:{name:input.price?.source||input.dataSource?.name,retrievedAt:input.price?.retrievedAt||input.dataSource?.retrievedAt,isVerified:verified.length>0&&['price','rsi','sma20','sma50','pe','debtToEquity'].every(k=>verified.some(v=>v.name===k))}};
  const gate=validateMetrics(core); const completeness=Math.round(verified.length/14*100);
  if(!gate.isValid){return {success:true,engine:'Tara Intelligence Engine',version:ENGINE_VERSION,symbol,mode:'native-evidence-first',decision:'insufficient_verified_evidence',status:'EVIDENCE_GATEKEEPER_BLOCKED',confidence:0,completeness,verifiedEvidence:verified,missingEvidence:missing,blockedReasons:gate.errors,technicalScore:null,technicalFactors:[],scenarios:[],warnings:['Tara never invents market or financial values.','A source being configured does not by itself prove licensing or authorization.'],nextRequired:missing,generatedAt:new Date().toISOString()};}
  const technical=calculateMultiFactorScore(core);
  return {success:true,engine:'Tara Intelligence Engine',version:ENGINE_VERSION,symbol,mode:'native-evidence-first',decision:'scenario_only',status:'ANALYSIS_COMPLETE',confidence:Math.min(technical.score===50?70:90,completeness),completeness,verifiedEvidence:verified,missingEvidence:missing,technicalScore:technical.score,technicalVerdict:technical.verdict,technicalStance:technical.stance,technicalFactors:technical.factors,scenarios:[],warnings:['Tara analysis is evidence-based and does not guarantee returns.'],nextRequired:missing,generatedAt:new Date().toISOString()};
}
function processQuery(userQuery,stockContext={}){
  const intent=detectIntent(userQuery); const symbol=String(stockContext.symbol||'').toUpperCase();
  if(intent==='GREETING') return {intent,text:'నమస్తే! నేను Tara AI — మీ స్వంత market intelligence engine. Verified NSE/BSE data ఆధారంగా analysis చేయడానికి సిద్ధంగా ఉన్నాను.'};
  if(!symbol&&['TECHNICAL_ANALYSIS','FUNDAMENTAL_ANALYSIS','RISK_ANALYSIS','MARKET_SEARCH'].includes(intent)) return {intent,text:'మీరు విశ్లేషించాలనుకుంటున్న company name లేదా NSE/BSE symbol ఇవ్వండి. ఉదాహరణ: TCS, RELIANCE, INFY.'};
  if(intent==='TECHNICAL_ANALYSIS'){const validation=validateMetrics({...stockContext,dataSource:stockContext.dataSource});if(!validation.isValid)return {intent,status:'EVIDENCE_GATEKEEPER_BLOCKED',score:null,confidence:0,factors:[],blockedReasons:validation.errors,text:`Tara Technical Evaluation — ${symbol}\nVerified market evidence లేకుండా score/conclusion ఇవ్వను.`};const a=calculateMultiFactorScore(stockContext);return {intent,status:'ANALYSIS_COMPLETE',score:a.score,confidence:Math.min(95,60+a.factors.length*7),verdict:a.verdict,stance:a.stance,factors:a.factors,text:`Tara Technical Evaluation — ${symbol}\nTara Market Score: ${a.score}/100\n${a.factors.map(x=>'• '+x).join('\n')}`};}
  if(intent==='FUNDAMENTAL_ANALYSIS') return {intent,text:`Tara Fundamental Engine — ${symbol}\nRevenue, profit, EPS, debt, cash-flow, P/E మరియు balance-sheet inputs verified source నుంచి అందిన తర్వాత మాత్రమే conclusion ఇస్తాను.`};
  if(intent==='RISK_ANALYSIS') return {intent,text:`Tara Risk Engine — ${symbol}\nVolatility, drawdown, leverage, liquidity మరియు verified financial risk inputs అవసరం. Risk level ను ఊహించి చెప్పను.`};
  return {intent,text:`Tara AI native engine request received for ${symbol||'the market'}. Verified company/market evidence ఆధారంగా మాత్రమే analysis చేస్తాను.`};
}
function targetStatus(){const providers=providerStatus();return Object.entries(TARGETS).map(([id,name])=>({id,name,status:['scale','security','languages','decision','knowledge'].includes(id)?'foundation':(providers[id]?.configured?'connected':'ready_for_provider'),provider:providers[id]?.provider||null}));}
module.exports={ENGINE_VERSION,TARGETS,providerStatus,targetStatus,detectIntent,validateMetrics,calculateMultiFactorScore,processQuery,analyze};
