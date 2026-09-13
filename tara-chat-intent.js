const KNOWN_SYMBOLS = new Set([
  'TCS','TATAMOTORS','TATASTEEL','TATAELXSI','RELIANCE','INFY','INFOSYS','HDFCBANK','HDFC','ICICIBANK','SBIN','ITC','LT','WIPRO','HCLTECH','BHARTIARTL','MARUTI','M&M','M&MFIN','AXISBANK','KOTAKBANK','ADANIENT','ADANIPORTS','SUNPHARMA','NTPC','POWERGRID','ONGC','COALINDIA','ASIANPAINT','HINDUNILVR','BAJFINANCE','BAJAJFINSV','NESTLEIND','ULTRACEMCO','TITAN','TECHM','JSWSTEEL','BANKNIFTY','NIFTY','NIFTY50','SENSEX'
]);
const ALIASES = new Map([
  ['TATA MOTORS','TATAMOTORS'],['TATA MOTOR','TATAMOTORS'],['TCS','TCS'],['RELIANCE INDUSTRIES','RELIANCE'],['RELIANCE','RELIANCE'],['INFOSYS','INFY'],['HDFC BANK','HDFCBANK'],['ICICI BANK','ICICIBANK'],['STATE BANK OF INDIA','SBIN'],['SBI','SBIN'],['LARSEN AND TOUBRO','LT'],['L&T','LT'],['M AND M','M&M'],['MAHINDRA AND MAHINDRA','M&M'],['BANK NIFTY','BANKNIFTY'],['NIFTY 50','NIFTY50'],['SENSEX','SENSEX']
]);
const LANGS = new Set(['en','hi','te','mr','ta','bn','gu','kn','ml','pa','or','as','ur','gom','ne']);
function normalizeLanguage(value){const x=String(value||'en').toLowerCase().trim();return LANGS.has(x)?x:'en';}
function extractSymbol(text=''){
  const raw=String(text).toUpperCase().replace(/[’']/g,"'").replace(/[^A-Z0-9&.\- ]+/g,' ');
  for(const [alias,symbol] of ALIASES){if(new RegExp(`\\b${alias.replace(/[&]/g,'\\&').replace(/ /g,'\\s+')}\\b`,'i').test(raw))return symbol;}
  const tokens=raw.split(/\s+/).filter(Boolean);
  const candidates=tokens.filter(t=>KNOWN_SYMBOLS.has(t) || /^[A-Z]{2,15}$/.test(t));
  if(candidates.length===1)return candidates[0];
  const nseLike=tokens.find(t=>/^[A-Z]{2,15}$/.test(t));
  return nseLike||'';
}
function detectIntent(query=''){
  const q=String(query).toLowerCase().trim();
  if(!q)return 'GENERAL_MARKET';
  if(/^(hi|hello|hey|namaste|good morning|good afternoon|good evening|నమస్తే|హాయ్|హలో|வணக்கம்|வணக்கம|नमस्ते)[!,. ]*$/.test(q))return 'GREETING';
  if(/\b(tomorrow|today|now|next|open|close|opening|closing|market hours|market open|market closed|trading session|pre[- ]?open|market timing|market time|రేపు|ఈరోజు|మార్కెట్|நாளை|இன்று|சந்தை)\b/.test(q))return 'MARKET_STATUS';
  if(/\b(price|share price|stock price|ltp|quote|cmp|current value|current price|ధర|షేర్ ధర|விலை|பங்கு விலை)\b/.test(q))return 'QUOTE';
  if(/\b(rsi|macd|sma|ema|vwap|technical|trend|support|resistance|breakout|candlestick|moving average|chart|technical analysis)\b/.test(q))return 'TECHNICAL_ANALYSIS';
  if(/\b(financial|fundamental|pe|p\/e|profit|revenue|eps|debt|cash flow|balance sheet|valuation|growth|margin)\b/.test(q))return 'FUNDAMENTAL_ANALYSIS';
  if(/\b(risk|volatility|drawdown|safe|danger|downside)\b/.test(q))return 'RISK_ANALYSIS';
  if(/\b(portfolio|sip|allocation|diversif|holdings)\b/.test(q))return 'PORTFOLIO';
  if(/\b(stock|share|company|nse|bse|symbol|listed)\b/.test(q) || extractSymbol(q))return 'MARKET_SEARCH';
  return 'GENERAL_MARKET';
}
const REPLIES={
 en:{greet:"Hi! I'm Tara AI. I'm ready to help with market intelligence, company research and finance education. Tell me a stock symbol such as TCS or RELIANCE, or ask a general market question.",marketStatus:"I can explain the market session status. NSE/BSE regular equity trading is normally 09:15–15:30 IST on trading days; holidays and special sessions can differ. For a live status, Tara needs a verified market-status feed.",quote:(s)=>`I recognized ${s}. To show its real current price, Tara needs a verified live market-data feed. I won't invent or estimate the price.`,general:"I understood your market question. Tara can answer general market concepts without a company symbol, and can switch to company-specific analysis when you provide a symbol or name.",needSymbol:"I can analyze a company, but I need a company name or NSE/BSE symbol such as TCS, TATAMOTORS, RELIANCE or INFY."},
 ta:{greet:"வணக்கம்! நான் Tara AI. சந்தை நுண்ணறிவு, நிறுவன ஆய்வு மற்றும் நிதி கல்வியில் உதவ தயாராக இருக்கிறேன். TCS அல்லது RELIANCE போன்ற பங்கு சின்னத்தை கொடுக்கலாம், அல்லது பொதுவான சந்தை கேள்வி கேட்கலாம்.",marketStatus:"NSE/BSE வழக்கமான equity trading நேரம் பொதுவாக trading days-ல் 09:15–15:30 IST. விடுமுறை மற்றும் special sessions மாறுபடலாம். உண்மையான live status காட்ட verified market-status feed தேவை.",quote:(s)=>`${s} என்பதை நான் கண்டறிந்தேன். உண்மையான தற்போதைய விலையை காட்ட verified live market-data feed தேவை. நான் விலையை உருவாக்கி சொல்லமாட்டேன்.`,general:"உங்கள் சந்தை கேள்வியை புரிந்துகொண்டேன். பொதுவான market questions-க்கு company symbol தேவையில்லை. Company-specific analysis-க்கு symbol அல்லது company name கொடுக்கலாம்.",needSymbol:"Company analysis செய்ய company name அல்லது NSE/BSE symbol தேவை. உதாரணம்: TCS, TATAMOTORS, RELIANCE, INFY."},
 te:{greet:'నమస్తే! నేను Tara AI. Market intelligence, company research మరియు finance education కోసం సిద్ధంగా ఉన్నాను. TCS లేదా RELIANCE వంటి stock symbol ఇవ్వండి లేదా general market question అడగండి.',marketStatus:'NSE/BSE regular equity trading సాధారణంగా trading daysలో 09:15–15:30 IST. Holidays మరియు special sessions మారవచ్చు. నిజమైన live status కోసం verified market-status feed అవసరం.',quote:s=>`${s} symbol ను నేను గుర్తించాను. నిజమైన current price చూపించడానికి verified live market-data feed అవసరం. నేను price ను ఊహించి చెప్పను.`,general:'మీ market question ను అర్థం చేసుకున్నాను. General market questions కు company symbol అవసరం లేదు. Company-specific analysis కోసం symbol లేదా company name ఇవ్వవచ్చు.',needSymbol:'Company analysis కోసం company name లేదా NSE/BSE symbol ఇవ్వండి. ఉదాహరణ: TCS, TATAMOTORS, RELIANCE, INFY.'}
};
function nativeReply(intent,symbol,language){const l=REPLIES[normalizeLanguage(language)]||REPLIES.en;switch(intent){case'GREETING':return l.greet;case'MARKET_STATUS':return l.marketStatus;case'QUOTE':return symbol?l.quote(symbol):l.needSymbol;case'GENERAL_MARKET':return l.general;case'MARKET_SEARCH':return symbol?l.quote(symbol):l.needSymbol;default:return symbol?l.quote(symbol):l.needSymbol;}}
module.exports={normalizeLanguage,extractSymbol,detectIntent,nativeReply};
