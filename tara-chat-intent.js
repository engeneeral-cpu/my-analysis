const KNOWN_SYMBOLS = new Set(['TCS','TATAMOTORS','TATASTEEL','TATAELXSI','RELIANCE','INFY','INFOSYS','HDFCBANK','HDFC','ICICIBANK','SBIN','ITC','LT','WIPRO','HCLTECH','BHARTIARTL','MARUTI','M&M','M&MFIN','AXISBANK','KOTAKBANK','ADANIENT','ADANIPORTS','SUNPHARMA','NTPC','POWERGRID','ONGC','COALINDIA','ASIANPAINT','HINDUNILVR','BAJFINANCE','BAJAJFINSV','NESTLEIND','ULTRACEMCO','TITAN','TECHM','JSWSTEEL','BANKNIFTY','NIFTY','NIFTY50','SENSEX']);
const ALIASES = new Map([['TATA MOTORS','TATAMOTORS'],['TATA MOTOR','TATAMOTORS'],['RELIANCE INDUSTRIES','RELIANCE'],['RELIANCE','RELIANCE'],['INFOSYS','INFY'],['HDFC BANK','HDFCBANK'],['ICICI BANK','ICICIBANK'],['STATE BANK OF INDIA','SBIN'],['SBI','SBIN'],['LARSEN AND TOUBRO','LT'],['L&T','LT'],['M AND M','M&M'],['MAHINDRA AND MAHINDRA','M&M'],['BANK NIFTY','BANKNIFTY'],['NIFTY 50','NIFTY50'],['SENSEX','SENSEX']]);
const LANGS = new Set(['en','hi','te','mr','ta','bn','gu','kn','ml','pa','or','as','ur','gom','ne']);
const STOP_WORDS = new Set(['HI','HELLO','HEY','HO','TARA','AI','OK','OKAY','YES','NO','NAMASTE']);
function normalizeLanguage(value){const x=String(value||'en').toLowerCase().trim();return LANGS.has(x)?x:'en';}
function extractSymbol(text=''){
  const raw=String(text).toUpperCase().replace(/[’']/g,"'").replace(/[^-A-Z0-9&. ]+/g,' ');
  for(const [alias,symbol] of ALIASES){
    const pattern='\\b'+alias.replace(/[&]/g,'\\&').replace(/ /g,'\\s+')+'\\b';
    if(new RegExp(pattern,'i').test(raw))return symbol;
  }
  const tokens=raw.split(/\s+/).filter(Boolean);
  const candidates=tokens.filter(t=>!STOP_WORDS.has(t)&&(KNOWN_SYMBOLS.has(t)||/^[A-Z]{2,15}$/.test(t)));
  if(candidates.length===1)return candidates[0];
  return candidates.find(t=>/^[A-Z]{2,15}$/.test(t))||'';
}
function detectIntent(query=''){
  const q=String(query).toLowerCase().trim();
  if(!q)return'GENERAL_MARKET';
  if(/^(hi|hello|hey|ho|namaste|good morning|good afternoon|good evening|నమస్తే|హాయ్|హలో|నమస్కారం|नमस्ते|हाय|नमस्कार|வணக்கம்|ನಮಸ್ಕಾರ|നമസ്കാരം|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|নমস্কার)[!,. ]*$/.test(q))return'GREETING';
  if(/\b(nuvvu?|nuv|meeru|meer|nuvvu)?\s*(ai|artificial intelligence)\s*(va|vavaa|vha|ho|నా|వా)\b/.test(q)||/\b(who are you|what are you|are you an? ai|are you ai|tell me about yourself)\b/.test(q)||/(మీరు|నువ్వు|నువ్).*(ai|కృత్రిమ మేధస్సు)/.test(q))return'IDENTITY';
  if(/\b(tomorrow|today|now|next|open|close|opening|closing|market hours|market open|market closed|trading session|pre[- ]?open|market timing|market time|రేపు|ఈరోజు|మార్కెట్|நாளை|இன்று|சந்தை|कल|आज|बाज़ार|उद्या|बाजार|നാളെ|ഇന്ന്|ಮಾರುಕಟ್ಟೆ|ನಾಳೆ|ਕੱਲ੍ਹ|ਅੱਜ|বাজার|କାଲି|ଆଜି|বজাৰ|কালি|کل|بازار)\b/.test(q))return'MARKET_STATUS';
  if(/\b(price|share price|stock price|ltp|quote|cmp|current value|current price|ధర|షేర్ ధర|விலை|பங்கு விலை|कीमत|शेयर भाव|किंमत|মূল্য|দাম|দর|ભાવ|ಬೆಲೆ|ಷೇರು ಬೆಲೆ|വില|ഓഹരി വില|ਕੀਮਤ|ਸ਼ੇਅਰ ਕੀਮਤ|ମୂଲ୍ୟ|ଶେୟାର ମୂଲ୍ୟ|قیمت|شیئر قیمت)\b/.test(q))return'QUOTE';
  if(/\b(rsi|macd|sma|ema|vwap|technical|trend|support|resistance|breakout|candlestick|moving average|chart|technical analysis)\b/.test(q))return'TECHNICAL_ANALYSIS';
  if(/\b(financial|fundamental|pe|p\/e|profit|revenue|eps|debt|cash flow|balance sheet|valuation|growth|margin)\b/.test(q))return'FUNDAMENTAL_ANALYSIS';
  if(/\b(risk|volatility|drawdown|safe|danger|downside)\b/.test(q))return'RISK_ANALYSIS';
  if(/\b(portfolio|sip|allocation|diversif|holdings)\b/.test(q))return'PORTFOLIO';
  if(/\b(stock|share|company|nse|bse|symbol|listed)\b/.test(q)||extractSymbol(q))return'MARKET_SEARCH';
  return'GENERAL_MARKET';
}
function quote(prefix,symbol,suffix){return prefix+symbol+suffix;}
function makeReply(greet,marketStatus,quotePrefix,quoteSuffix,general,needSymbol){return{greet,marketStatus,quote:function(symbol){return quote(quotePrefix,symbol,quoteSuffix);},general,needSymbol};}
const REPLIES={
 en:makeReply("Hi! I'm Tara AI. I'm ready to help with market intelligence, company research and finance education. Tell me a stock symbol such as TCS or RELIANCE, or ask a general market question.",'NSE/BSE regular equity trading is normally 09:15–15:30 IST on trading days; holidays and special sessions can differ. For live status, Tara needs a verified market-status feed.','I recognized ',". To show its real current price, Tara needs a verified live market-data feed. I won't invent or estimate the price.",'I understood your market question. Tara can answer general market concepts without a company symbol, and can switch to company-specific analysis when you provide a symbol or name.','I can analyze a company, but I need a company name or NSE/BSE symbol such as TCS, TATAMOTORS, RELIANCE or INFY.'),
 hi:makeReply('नमस्ते! मैं Tara AI हूँ। मैं मार्केट इंटेलिजेंस, कंपनी रिसर्च और वित्तीय शिक्षा में मदद करने के लिए तैयार हूँ।','NSE/BSE की सामान्य इक्विटी ट्रेडिंग आमतौर पर ट्रेडिंग दिनों में 09:15–15:30 IST होती है। छुट्टियों और विशेष सत्रों में बदलाव हो सकता है। लाइव स्थिति के लिए सत्यापित डेटा जरूरी है।','', ' को मैंने पहचान लिया है। वास्तविक मौजूदा कीमत के लिए सत्यापित लाइव मार्केट डेटा जरूरी है।','मैंने आपका मार्केट सवाल समझ लिया। कंपनी-विशिष्ट विश्लेषण के लिए सिंबल या कंपनी का नाम दें।','कंपनी का नाम या NSE/BSE सिंबल दें। उदाहरण: TCS, TATAMOTORS, RELIANCE, INFY.'),
 te:makeReply('నమస్తే! నేను Tara AI. Market intelligence, company research మరియు finance education కోసం సిద్ధంగా ఉన్నాను.','NSE/BSE regular equity trading సాధారణంగా trading daysలో 09:15–15:30 IST. నిజమైన live status కోసం verified feed అవసరం.','', ' symbol ను నేను గుర్తించాను. నిజమైన current price కోసం verified live market-data feed అవసరం.','మీ market question ను అర్థం చేసుకున్నాను. Company-specific analysis కోసం symbol లేదా company name ఇవ్వండి.','Company name లేదా NSE/BSE symbol ఇవ్వండి. ఉదాహరణ: TCS, TATAMOTORS, RELIANCE, INFY.'),
 mr:makeReply('नमस्कार! मी Tara AI आहे. मार्केट इंटेलिजन्स, कंपनी रिसर्च आणि आर्थिक शिक्षणासाठी मी तयार आहे.','NSE/BSE नियमित इक्विटी ट्रेडिंग साधारणपणे 09:15–15:30 IST असते. लाइव्ह स्थितीसाठी सत्यापित डेटा आवश्यक आहे.','', ' मी ओळखला आहे. खरी सध्याची किंमत दाखवण्यासाठी सत्यापित लाइव्ह मार्केट डेटा आवश्यक आहे.','तुमचा मार्केट प्रश्न समजला. कंपनी-विशिष्ट विश्लेषणासाठी सिंबल किंवा कंपनीचे नाव द्या.','कंपनीचे नाव किंवा NSE/BSE सिंबल द्या. उदाहरण: TCS, TATAMOTORS, RELIANCE, INFY.'),
 ta:makeReply('வணக்கம்! நான் Tara AI. சந்தை நுண்ணறிவு, நிறுவன ஆய்வு மற்றும் நிதிக் கல்வியில் உதவ தயாராக இருக்கிறேன்.','NSE/BSE வழக்கமான equity trading பொதுவாக 09:15–15:30 IST. உண்மையான live status-க்கு verified feed தேவை.','', ' என்பதை நான் கண்டறிந்தேன். உண்மையான தற்போதைய விலைக்கு verified live market-data feed தேவை.','உங்கள் சந்தை கேள்வியை புரிந்துகொண்டேன். Company-specific analysis-க்கு symbol அல்லது company name கொடுக்கலாம்.','Company name அல்லது NSE/BSE symbol கொடுக்கவும். உதாரணம்: TCS, TATAMOTORS, RELIANCE, INFY.'),
 bn:makeReply('নমস্কার! আমি Tara AI। মার্কেট ইন্টেলিজেন্স, কোম্পানি রিসার্চ এবং আর্থিক শিক্ষায় সাহায্য করতে প্রস্তুত।','NSE/BSE-এর নিয়মিত ট্রেডিং সাধারণত 09:15–15:30 IST। লাইভ স্ট্যাটাসের জন্য যাচাইকৃত ফিড দরকার।','', ' আমি শনাক্ত করেছি। প্রকৃত বর্তমান দামের জন্য যাচাইকৃত লাইভ মার্কেট-ডেটা ফিড দরকার।','আপনার বাজারের প্রশ্নটি বুঝেছি। কোম্পানি-নির্দিষ্ট বিশ্লেষণের জন্য সিম্বল বা কোম্পানির নাম দিন।','কোম্পানির নাম বা NSE/BSE সিম্বল দিন। উদাহরণ: TCS, TATAMOTORS, RELIANCE, INFY.'),
 gu:makeReply('નમસ્તે! હું Tara AI છું. માર્કેટ ઇન્ટેલિજન્સ, કંપની રિસર્ચ અને નાણાકીય શિક્ષણમાં મદદ કરવા તૈયાર છું.','NSE/BSE નિયમિત ઇક્વિટી ટ્રેડિંગ સામાન્ય રીતે 09:15–15:30 IST હોય છે. લાઇવ સ્થિતિ માટે ચકાસાયેલ ફીડ જરૂરી છે.','', ' મેં ઓળખી લીધું છે. વાસ્તવિક વર્તમાન કિંમત માટે ચકાસાયેલ લાઇવ માર્કેટ-ડેટા ફીડ જરૂરી છે.','તમારો માર્કેટ પ્રશ્ન સમજાયો. કંપની-વિશિષ્ટ વિશ્લેષણ માટે સિમ્બોલ અથવા કંપનીનું નામ આપો.','કંપનીનું નામ અથવા NSE/BSE સિમ્બોલ આપો. ઉદાહરણ: TCS, TATAMOTORS, RELIANCE, INFY.'),
 kn:makeReply('ನಮಸ್ಕಾರ! ನಾನು Tara AI. ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿವಂತಿಕೆ, ಕಂಪನಿ ಸಂಶೋಧನೆ ಮತ್ತು ಹಣಕಾಸು ಶಿಕ್ಷಣದಲ್ಲಿ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧನಿದ್ದೇನೆ.','NSE/BSE ನಿಯಮಿತ ಈಕ್ವಿಟಿ ಟ್ರೇಡಿಂಗ್ ಸಾಮಾನ್ಯವಾಗಿ 09:15–15:30 IST. ಲೈವ್ ಸ್ಥಿತಿಗೆ ಪರಿಶೀಲಿತ ಫೀಡ್ ಅಗತ್ಯವಿದೆ.','', ' ಅನ್ನು ನಾನು ಗುರುತಿಸಿದ್ದೇನೆ. ನಿಜವಾದ ಪ್ರಸ್ತುತ ಬೆಲೆಗೆ ಪರಿಶೀಲಿತ ಲೈವ್ ಮಾರ್ಕೆಟ್-ಡೇಟಾ ಫೀಡ್ ಅಗತ್ಯವಿದೆ.','ನಿಮ್ಮ ಮಾರುಕಟ್ಟೆ ಪ್ರಶ್ನೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ಕಂಪನಿ-ನಿರ್ದಿಷ್ಟ ವಿಶ್ಲೇಷಣೆಗೆ ಸಿಂಬಲ್ ಅಥವಾ ಕಂಪನಿ ಹೆಸರು ನೀಡಿ.','ಕಂಪನಿ ಹೆಸರು ಅಥವಾ NSE/BSE ಸಿಂಬಲ್ ನೀಡಿ. ಉದಾಹರಣೆ: TCS, TATAMOTORS, RELIANCE, INFY.'),
 ml:makeReply('നമസ്കാരം! ഞാൻ Tara AI. മാർക്കറ്റ് ഇന്റലിജൻസ്, കമ്പനി റിസർച്ച്, സാമ്പത്തിക വിദ്യാഭ്യാസം എന്നിവയിൽ സഹായിക്കാൻ തയ്യാറാണ്.','NSE/BSE സാധാരണ ട്രേഡിംഗ് 09:15–15:30 IST ആണ്. ലൈവ് സ്റ്റാറ്റസിന് പരിശോധിച്ച ഫീഡ് ആവശ്യമാണ്.','', ' എന്ന് ഞാൻ തിരിച്ചറിഞ്ഞു. യഥാർത്ഥ നിലവിലെ വിലയ്ക്ക് പരിശോധിച്ച ലൈവ് മാർക്കറ്റ്-ഡാറ്റ ഫീഡ് ആവശ്യമാണ്.','നിങ്ങളുടെ മാർക്കറ്റ് ചോദ്യം മനസ്സിലാക്കി. കമ്പനി-സ്പെസിഫിക് വിശകലനത്തിന് സിംബൽ അല്ലെങ്കിൽ കമ്പനി പേര് നൽകുക.','കമ്പനി പേരോ NSE/BSE സിംബലോ നൽകുക. ഉദാഹരണം: TCS, TATAMOTORS, RELIANCE, INFY.'),
 pa:makeReply('ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Tara AI ਹਾਂ। ਮਾਰਕੀਟ ਇੰਟੈਲੀਜੈਂਸ, ਕੰਪਨੀ ਰਿਸਰਚ ਅਤੇ ਵਿੱਤੀ ਸਿੱਖਿਆ ਵਿੱਚ ਮਦਦ ਲਈ ਤਿਆਰ ਹਾਂ।','NSE/BSE ਦੀ ਨਿਯਮਤ ਇਕਵਿਟੀ ਟ੍ਰੇਡਿੰਗ ਆਮ ਤੌਰ ਤੇ 09:15–15:30 IST ਹੁੰਦੀ ਹੈ। ਲਾਈਵ ਸਥਿਤੀ ਲਈ ਪ੍ਰਮਾਣਿਤ ਫੀਡ ਲੋੜੀਂਦੀ ਹੈ।','', ' ਨੂੰ ਮੈਂ ਪਛਾਣ ਲਿਆ ਹੈ। ਅਸਲ ਮੌਜੂਦਾ ਕੀਮਤ ਲਈ ਪ੍ਰਮਾਣਿਤ ਲਾਈਵ ਮਾਰਕੀਟ-ਡਾਟਾ ਫੀਡ ਲੋੜੀਂਦੀ ਹੈ।','ਮੈਂ ਤੁਹਾਡਾ ਮਾਰਕੀਟ ਸਵਾਲ ਸਮਝ ਲਿਆ ਹੈ। ਕੰਪਨੀ-ਵਿਸ਼ੇਸ਼ ਵਿਸ਼ਲੇਸ਼ਣ ਲਈ ਸਿੰਬਲ ਜਾਂ ਨਾਮ ਦਿਓ।','ਕੰਪਨੀ ਦਾ ਨਾਮ ਜਾਂ NSE/BSE ਸਿੰਬਲ ਦਿਓ। ਉਦਾਹਰਨ: TCS, TATAMOTORS, RELIANCE, INFY.'),
 or:makeReply('ନମସ୍କାର! ମୁଁ Tara AI। ମାର୍କେଟ ଇଣ୍ଟେଲିଜେନ୍ସ, କମ୍ପାନୀ ରିସର୍ଚ୍ଚ ଏବଂ ଆର୍ଥିକ ଶିକ୍ଷାରେ ସହାୟତା ପାଇଁ ପ୍ରସ୍ତୁତ।','NSE/BSE ନିୟମିତ ଇକ୍ୱିଟି ଟ୍ରେଡିଂ ସାଧାରଣତଃ 09:15–15:30 IST ହୁଏ। ଲାଇଭ ସ୍ଥିତି ପାଇଁ ଯାଞ୍ଚିତ ଫିଡ ଆବଶ୍ୟକ।','', ' କୁ ମୁଁ ଚିହ୍ନଟ କରିଛି। ପ୍ରକୃତ ବର୍ତ୍ତମାନ ମୂଲ୍ୟ ପାଇଁ ଯାଞ୍ଚିତ ଲାଇଭ ମାର୍କେଟ-ଡାଟା ଫିଡ ଆବଶ୍ୟକ।','ଆପଣଙ୍କର ମାର୍କେଟ ପ୍ରଶ୍ନକୁ ବୁଝିଛି। କମ୍ପାନୀ-ନିର୍ଦ୍ଦିଷ୍ଟ ବିଶ୍ଳେଷଣ ପାଇଁ ସିମ୍ବଲ କିମ୍ବା କମ୍ପାନୀ ନାମ ଦିଅନ୍ତୁ।','କମ୍ପାନୀ ନାମ କିମ୍ବା NSE/BSE ସିମ୍ବଲ ଦିଅନ୍ତୁ। ଉଦାହରଣ: TCS, TATAMOTORS, RELIANCE, INFY.'),
 as:makeReply('নমস্কাৰ! মই Tara AI। মাৰ্কেট ইণ্টেলিজেন্স, কোম্পানী ৰিচাৰ্চ আৰু বিত্তীয় শিক্ষাত সহায় কৰিবলৈ সাজু।','NSE/BSE-ৰ নিয়মীয়া ইকুইটি ট্ৰেডিং সাধাৰণতে 09:15–15:30 IST হয়। লাইভ অৱস্থাৰ বাবে যাচাইকৃত ফীড প্ৰয়োজন।','', ' মই চিনাক্ত কৰিছোঁ। প্ৰকৃত বৰ্তমান মূল্যৰ বাবে যাচাইকৃত লাইভ মাৰ্কেট-ডাটা ফীড প্ৰয়োজন।','আপোনাৰ মাৰ্কেট প্ৰশ্নটো বুজিছোঁ। কোম্পানী-নিৰ্দিষ্ট বিশ্লেষণৰ বাবে ছিম্বল বা কোম্পানীৰ নাম দিয়ক।','কোম্পানীৰ নাম বা NSE/BSE ছিম্বল দিয়ক। উদাহৰণ: TCS, TATAMOTORS, RELIANCE, INFY.'),
 ur:makeReply('السلام علیکم! میں Tara AI ہوں۔ مارکیٹ انٹیلیجنس، کمپنی ریسرچ اور مالی تعلیم میں مدد کے لیے تیار ہوں۔','NSE/BSE کی باقاعدہ ایکویٹی ٹریڈنگ عام طور پر 09:15–15:30 IST ہوتی ہے۔ لائیو اسٹیٹس کے لیے تصدیق شدہ فیڈ ضروری ہے۔','', ' کو میں نے شناخت کیا ہے۔ حقیقی موجودہ قیمت کے لیے تصدیق شدہ لائیو مارکیٹ ڈیٹا فیڈ ضروری ہے۔','میں نے آپ کا مارکیٹ سوال سمجھ لیا۔ کمپنی مخصوص تجزیے کے لیے سمبل یا کمپنی کا نام دیں۔','کمپنی کا نام یا NSE/BSE سمبل دیں۔ مثال: TCS, TATAMOTORS, RELIANCE, INFY.'),
 gom:makeReply('नमस्कार! हांव Tara AI. मार्केट इंटेलिजन्स, कंपनी रिसर्च आनी फायनान्स शिक्षणाक मदत करपाक तयार आसा.','NSE/BSE नियमित इक्विटी ट्रेडिंग साधारण 09:15–15:30 IST आसता. लाईव्ह स्थितीक खात्री केल्लो फीड जाय.','', ' हांव ओळखला. खरी सद्याची किंमत दाखोवपाक खात्री केल्लो लाईव्ह मार्केट-डेटा फीड जाय.','तुमचो मार्केट प्रस्न समजला. कंपनी-विशिष्ट विश्लेषणाखातीर सिंबल वा कंपनीचें नांव दियात.','कंपनीचें नांव वा NSE/BSE सिंबल दियात. उदाहरण: TCS, TATAMOTORS, RELIANCE, INFY.'),
 ne:makeReply('नमस्ते! म Tara AI हुँ। बजार बुद्धिमत्ता, कम्पनी अनुसन्धान र वित्तीय शिक्षामा सहयोग गर्न तयार छु।','NSE/BSE को नियमित इक्विटी ट्रेडिङ सामान्यतया 09:15–15:30 IST हुन्छ। लाइभ स्थितिका लागि प्रमाणित फीड आवश्यक हुन्छ।','', ' लाई मैले पहिचान गरेको छु। वास्तविक हालको मूल्यका लागि प्रमाणित लाइभ मार्केट-डाटा फीड आवश्यक हुन्छ।','तपाईंको बजार प्रश्न बुझें। कम्पनी-विशिष्ट विश्लेषणका लागि सिम्बल वा कम्पनीको नाम दिनुहोस्।','कम्पनीको नाम वा NSE/BSE सिम्बल दिनुहोस्। उदाहरण: TCS, TATAMOTORS, RELIANCE, INFY.')
};
const IDENTITY_REPLIES={
 en:"I'm Tara AI, your intelligent market companion. I can help with Indian market intelligence, company research, finance education and verified-data analysis. I do not invent live prices or facts.",
 hi:'मैं Tara AI हूँ — आपका intelligent market companion. मैं भारतीय मार्केट इंटेलिजेंस, कंपनी रिसर्च, वित्तीय शिक्षा और सत्यापित डेटा विश्लेषण में मदद करती हूँ। मैं लाइव कीमतें या तथ्य गढ़ती नहीं हूँ।',
 te:'నేను Tara AI — మీ intelligent market companion. భారతీయ మార్కెట్ ఇంటెలిజెన్స్, కంపెనీ రీసెర్చ్, finance education మరియు verified-data analysisలో నేను సహాయం చేస్తాను. నేను live prices లేదా facts ను ఊహించి చెప్పను.',
 mr:'मी Tara AI — तुमची intelligent market companion आहे. भारतीय मार्केट इंटेलिजन्स, कंपनी रिसर्च, आर्थिक शिक्षण आणि सत्यापित डेटा विश्लेषणात मदत करते. मी लाइव्ह किंमती किंवा तथ्ये बनवत नाही.',
 ta:'நான் Tara AI — உங்கள் intelligent market companion. இந்திய சந்தை நுண்ணறிவு, நிறுவன ஆய்வு, நிதிக் கல்வி மற்றும் verified-data analysis-ல் உதவுகிறேன். நான் live prices அல்லது facts-ஐ உருவாக்கமாட்டேன்.',
 bn:'আমি Tara AI — আপনার intelligent market companion. ভারতীয় বাজারের তথ্য, কোম্পানি গবেষণা, আর্থিক শিক্ষা এবং যাচাইকৃত ডেটা বিশ্লেষণে সাহায্য করি। আমি লাইভ দাম বা তথ্য বানিয়ে বলি না।',
 gu:'હું Tara AI — તમારું intelligent market companion. ભારતીય માર્કેટ ઇન્ટેલિજન્સ, કંપની રિસર્ચ, નાણાકીય શિક્ષણ અને ચકાસાયેલ ડેટા વિશ્લેષણમાં મદદ કરું છું. હું લાઇવ કિંમતો અથવા તથ્યો બનાવતી નથી.',
 kn:'ನಾನು Tara AI — ನಿಮ್ಮ intelligent market companion. ಭಾರತೀಯ ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿ, ಕಂಪನಿ ಸಂಶೋಧನೆ, ಹಣಕಾಸು ಶಿಕ್ಷಣ ಮತ್ತು ಪರಿಶೀಲಿತ ಡೇಟಾ ವಿಶ್ಲೇಷಣದಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ನಾನು ಲೈವ್ ಬೆಲೆಗಳು ಅಥವಾ ಮಾಹಿತಿಯನ್ನು ಕಲ್ಪಿಸಿ ಹೇಳುವುದಿಲ್ಲ.',
 ml:'ഞാൻ Tara AI — നിങ്ങളുടെ intelligent market companion. ഇന്ത്യൻ മാർക്കറ്റ് ഇന്റലിജൻസ്, കമ്പനി റിസർച്ച്, സാമ്പത്തിക വിദ്യാഭ്യാസം, പരിശോധിച്ച ഡാറ്റാ വിശകലനം എന്നിവയിൽ സഹായിക്കുന്നു. ഞാൻ live prices അല്ലെങ്കിൽ facts കെട്ടിച്ചമയ്ക്കില്ല.',
 pa:'ਮੈਂ Tara AI ਹਾਂ — ਤੁਹਾਡਾ intelligent market companion. ਭਾਰਤੀ ਮਾਰਕੀਟ ਇੰਟੈਲੀਜੈਂਸ, ਕੰਪਨੀ ਰਿਸਰਚ, ਵਿੱਤੀ ਸਿੱਖਿਆ ਅਤੇ ਪ੍ਰਮਾਣਿਤ ਡਾਟਾ ਵਿਸ਼ਲੇਸ਼ਣ ਵਿੱਚ ਮਦਦ ਕਰਦੀ ਹਾਂ। ਮੈਂ ਲਾਈਵ ਕੀਮਤਾਂ ਜਾਂ ਤੱਥ ਨਹੀਂ ਘੜਦੀ।',
 or:'ମୁଁ Tara AI — ଆପଣଙ୍କର intelligent market companion। ଭାରତୀୟ ମାର୍କେଟ ଇଣ୍ଟେଲିଜେନ୍ସ, କମ୍ପାନୀ ରିସର୍ଚ୍ଚ, ଆର୍ଥିକ ଶିକ୍ଷା ଏବଂ ଯାଞ୍ଚିତ ଡାଟା ବିଶ୍ଳେଷଣରେ ସହାୟତା କରେ। ମୁଁ ଲାଇଭ ମୂଲ୍ୟ କିମ୍ବା ତଥ୍ୟ ଗଢ଼େ ନାହିଁ।',
 as:'মই Tara AI — আপোনাৰ intelligent market companion। ভাৰতীয় মাৰ্কেট ইণ্টেলিজেন্স, কোম্পানী ৰিচাৰ্চ, বিত্তীয় শিক্ষা আৰু যাচাইকৃত ডাটা বিশ্লেষণত সহায় কৰোঁ। মই লাইভ মূল্য বা তথ্য বনাই নকওঁ।',
 ur:'میں Tara AI ہوں — آپ کی intelligent market companion۔ میں بھارتی مارکیٹ انٹیلیجنس، کمپنی ریسرچ، مالی تعلیم اور تصدیق شدہ ڈیٹا تجزیے میں مدد کرتی ہوں۔ میں لائیو قیمتیں یا حقائق گھڑ کر نہیں بتاتی۔',
 gom:'हांव Tara AI — तुमची intelligent market companion. भारतीय मार्केट इंटेलिजन्स, कंपनी रिसर्च, फायनान्स शिक्षण आनी खात्री केल्ल्या डेटा विश्लेषणांत हांव मदत करता. हांव लाईव्ह किंमती वा तथ्यां घडयना.',
 ne:'म Tara AI हुँ — तपाईंको intelligent market companion। भारतीय बजार बुद्धिमत्ता, कम्पनी अनुसन्धान, वित्तीय शिक्षा र प्रमाणित डेटा विश्लेषणमा सहयोग गर्छु। म लाइभ मूल्य वा तथ्य बनाउँदिन।'
};
function nativeReply(intent,symbol='',language='en'){
  const lang=normalizeLanguage(language);
  const replies=REPLIES[lang]||REPLIES.en;
  switch(intent){
    case 'GREETING': return replies.greet;
    case 'IDENTITY': return IDENTITY_REPLIES[lang]||IDENTITY_REPLIES.en;
    case 'MARKET_STATUS': return replies.marketStatus;
    case 'QUOTE':
    case 'MARKET_SEARCH':
    case 'TECHNICAL_ANALYSIS':
    case 'FUNDAMENTAL_ANALYSIS':
    case 'RISK_ANALYSIS': return symbol?replies.quote(symbol):replies.needSymbol;
    case 'PORTFOLIO': return replies.general;
    default: return replies.general;
  }
}
module.exports={normalizeLanguage,extractSymbol,detectIntent,nativeReply};
