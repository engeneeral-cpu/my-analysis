const NOVA_LANGUAGES = [
  {code:'en-IN', label:'English', short:'EN'},
  {code:'hi-IN', label:'हिन्दी', short:'HI'},
  {code:'bn-IN', label:'বাংলা', short:'BN'},
  {code:'te-IN', label:'తెలుగు', short:'TE'},
  {code:'mr-IN', label:'मराठी', short:'MR'},
  {code:'ta-IN', label:'தமிழ்', short:'TA'},
  {code:'gu-IN', label:'ગુજરાતી', short:'GU'},
  {code:'kn-IN', label:'ಕನ್ನಡ', short:'KN'},
  {code:'ml-IN', label:'മലയാളം', short:'ML'},
  {code:'pa-IN', label:'ਪੰਜਾਬੀ', short:'PA'},
  {code:'or-IN', label:'ଓଡ଼ିଆ', short:'OR'},
  {code:'as-IN', label:'অসমীয়া', short:'AS'},
  {code:'ur-IN', label:'اردو', short:'UR'},
  {code:'kok-IN', label:'कोंकणी', short:'KOK'},
  {code:'ks-IN', label:'कॉशुर / کٲشُر', short:'KS'}
];

const NOVA_COPY = {
  'en-IN': {welcome:'Meet Nova',subtitle:'Your female AI market intelligence companion.',companies:'India Company Intelligence',search:'Search NSE / BSE company',history:'Complete company timeline',website:'Official website',sources:'Verified sources',speak:'Speak',market:'Market',overview:'Overview',financials:'Financials',actions:'Corporate actions',filings:'Filings',risk:'Risk & uncertainty'},
  'hi-IN': {welcome:'नोवा से मिलिए',subtitle:'आपकी महिला AI मार्केट इंटेलिजेंस साथी।',companies:'भारत कंपनी इंटेलिजेंस',search:'NSE / BSE कंपनी खोजें',history:'कंपनी की पूरी समयरेखा',website:'आधिकारिक वेबसाइट',sources:'सत्यापित स्रोत',speak:'बोलें',market:'बाज़ार',overview:'सारांश',financials:'वित्तीय जानकारी',actions:'कॉर्पोरेट कार्रवाई',filings:'फाइलिंग',risk:'जोखिम और अनिश्चितता'},
  'bn-IN': {welcome:'নোভার সঙ্গে পরিচিত হন',subtitle:'আপনার মহিলা AI মার্কেট ইন্টেলিজেন্স সঙ্গী।',companies:'ভারত কোম্পানি ইন্টেলিজেন্স',search:'NSE / BSE কোম্পানি খুঁজুন',history:'সম্পূর্ণ কোম্পানি টাইমলাইন',website:'অফিসিয়াল ওয়েবসাইট',sources:'যাচাইকৃত উৎস',speak:'বলুন',market:'বাজার',overview:'সারাংশ',financials:'আর্থিক তথ্য',actions:'কর্পোরেট কার্যক্রম',filings:'ফাইলিং',risk:'ঝুঁকি ও অনিশ্চয়তা'},
  'te-IN': {welcome:'నోవాను కలవండి',subtitle:'మీ మహిళా AI మార్కెట్ ఇంటెలిజెన్స్ సహచరి.',companies:'భారత కంపెనీ ఇంటెలిజెన్స్',search:'NSE / BSE కంపెనీని వెతకండి',history:'కంపెనీ పూర్తి చరిత్ర',website:'అధికారిక వెబ్‌సైట్',sources:'ధృవీకరించిన మూలాలు',speak:'మాట్లాడు',market:'మార్కెట్',overview:'సారాంశం',financials:'ఆర్థిక సమాచారం',actions:'కార్పొరేట్ చర్యలు',filings:'ఫైలింగ్స్',risk:'రిస్క్ & అనిశ్చితి'},
  'mr-IN': {welcome:'नोव्हाला भेटा',subtitle:'तुमची महिला AI मार्केट इंटेलिजन्स साथीदार.',companies:'भारत कंपनी इंटेलिजन्स',search:'NSE / BSE कंपनी शोधा',history:'कंपनीची संपूर्ण टाइमलाइन',website:'अधिकृत वेबसाइट',sources:'सत्यापित स्रोत',speak:'बोला',market:'बाजार',overview:'आढावा',financials:'आर्थिक माहिती',actions:'कॉर्पोरेट कृती',filings:'फायलिंग्स',risk:'जोखीम आणि अनिश्चितता'},
  'ta-IN': {welcome:'நோவாவை சந்தியுங்கள்',subtitle:'உங்கள் பெண் AI சந்தை நுண்ணறிவு துணை.',companies:'இந்திய நிறுவன நுண்ணறிவு',search:'NSE / BSE நிறுவனத்தைத் தேடுங்கள்',history:'முழு நிறுவன காலவரிசை',website:'அதிகாரப்பூர்வ இணையதளம்',sources:'சரிபார்க்கப்பட்ட ஆதாரங்கள்',speak:'பேசு',market:'சந்தை',overview:'கண்ணோட்டம்',financials:'நிதி தகவல்',actions:'நிறுவன நடவடிக்கைகள்',filings:'தாக்கல்கள்',risk:'ஆபத்து மற்றும் நிச்சயமின்மை'},
  'gu-IN': {welcome:'નોવાને મળો',subtitle:'તમારી મહિલા AI માર્કેટ ઇન્ટેલિજન્સ સાથી.',companies:'ભારત કંપની ઇન્ટેલિજન્સ',search:'NSE / BSE કંપની શોધો',history:'કંપનીની સંપૂર્ણ સમયરેખા',website:'સત્તાવાર વેબસાઇટ',sources:'ચકાસેલા સ્ત્રોતો',speak:'બોલો',market:'બજાર',overview:'ઝાંખી',financials:'નાણાકીય માહિતી',actions:'કોર્પોરેટ કાર્યવાહી',filings:'ફાઇલિંગ્સ',risk:'જોખમ અને અનિશ્ચિતતા'},
  'kn-IN': {welcome:'ನೋವಾಳನ್ನು ಭೇಟಿ ಮಾಡಿ',subtitle:'ನಿಮ್ಮ ಮಹಿಳಾ AI ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿಮತ್ತೆ ಸಹಚರಿ.',companies:'ಭಾರತ ಕಂಪನಿ ಇಂಟೆಲಿಜೆನ್ಸ್',search:'NSE / BSE ಕಂಪನಿ ಹುಡುಕಿ',history:'ಕಂಪನಿಯ ಸಂಪೂರ್ಣ ಕಾಲರೇಖೆ',website:'ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್',sources:'ಪರಿಶೀಲಿತ ಮೂಲಗಳು',speak:'ಮಾತನಾಡಿ',market:'ಮಾರುಕಟ್ಟೆ',overview:'ಅವಲೋಕನ',financials:'ಹಣಕಾಸು ಮಾಹಿತಿ',actions:'ಕಾರ್ಪೊರೇಟ್ ಕ್ರಮಗಳು',filings:'ಫೈಲಿಂಗ್‌ಗಳು',risk:'ಅಪಾಯ ಮತ್ತು ಅನಿಶ್ಚಿತತೆ'},
  'ml-IN': {welcome:'നോവയെ പരിചയപ്പെടൂ',subtitle:'നിങ്ങളുടെ വനിതാ AI മാർക്കറ്റ് ഇന്റലിജൻസ് സഹായി.',companies:'ഇന്ത്യൻ കമ്പനി ഇന്റലിജൻസ്',search:'NSE / BSE കമ്പനി തിരയുക',history:'കമ്പനിയുടെ പൂർണ്ണ ടൈംലൈൻ',website:'ഔദ്യോഗിക വെബ്സൈറ്റ്',sources:'സ്ഥിരീകരിച്ച ഉറവിടങ്ങൾ',speak:'സംസാരിക്കുക',market:'വിപണി',overview:'അവലോകനം',financials:'സാമ്പത്തിക വിവരങ്ങൾ',actions:'കോർപ്പറേറ്റ് നടപടികൾ',filings:'ഫയലിംഗുകൾ',risk:'അപകടസാധ്യതയും അനിശ്ചിതത്വവും'},
  'pa-IN': {welcome:'ਨੋਵਾ ਨੂੰ ਮਿਲੋ',subtitle:'ਤੁਹਾਡੀ ਮਹਿਲਾ AI ਮਾਰਕੀਟ ਇੰਟੈਲੀਜੈਂਸ ਸਾਥੀ।',companies:'ਭਾਰਤ ਕੰਪਨੀ ਇੰਟੈਲੀਜੈਂਸ',search:'NSE / BSE ਕੰਪਨੀ ਖੋਜੋ',history:'ਕੰਪਨੀ ਦੀ ਪੂਰੀ ਟਾਈਮਲਾਈਨ',website:'ਅਧਿਕਾਰਤ ਵੈੱਬਸਾਈਟ',sources:'ਪ੍ਰਮਾਣਿਤ ਸਰੋਤ',speak:'ਬੋਲੋ',market:'ਮਾਰਕੀਟ',overview:'ਸੰਖੇਪ',financials:'ਵਿੱਤੀ ਜਾਣਕਾਰੀ',actions:'ਕਾਰਪੋਰੇਟ ਕਾਰਵਾਈਆਂ',filings:'ਫਾਈਲਿੰਗ',risk:'ਜੋਖਮ ਅਤੇ ਅਨਿਸ਼ਚਿਤਤਾ'},
  'or-IN': {welcome:'ନୋଭାଙ୍କୁ ଭେଟନ୍ତୁ',subtitle:'ଆପଣଙ୍କ ମହିଳା AI ମାର୍କେଟ ଇଣ୍ଟେଲିଜେନ୍ସ ସାଥୀ।',companies:'ଭାରତ କମ୍ପାନୀ ଇଣ୍ଟେଲିଜେନ୍ସ',search:'NSE / BSE କମ୍ପାନୀ ଖୋଜନ୍ତୁ',history:'ସମ୍ପୂର୍ଣ୍ଣ କମ୍ପାନୀ ଟାଇମଲାଇନ',website:'ଅଧିକାରିକ ୱେବସାଇଟ',sources:'ଯାଞ୍ଚିତ ଉତ୍ସ',speak:'କଥା କହନ୍ତୁ',market:'ବଜାର',overview:'ସାରାଂଶ',financials:'ଆର୍ଥିକ ସୂଚନା',actions:'କର୍ପୋରେଟ କାର୍ଯ୍ୟ',filings:'ଫାଇଲିଂ',risk:'ଝୁମ୍ପ ଓ ଅନିଶ୍ଚିତତା'},
  'as-IN': {welcome:'নোভাক লগ পাওক',subtitle:'আপোনাৰ মহিলা AI বজাৰ বুদ্ধিমত্তাৰ সহায়িকা।',companies:'ভাৰত কোম্পানী ইণ্টেলিজেন্স',search:'NSE / BSE কোম্পানী বিচাৰক',history:'সম্পূৰ্ণ কোম্পানী টাইমলাইন',website:'অফিচিয়েল ৱেবছাইট',sources:'পৰীক্ষিত উৎস',speak:'কওক',market:'বজাৰ',overview:'অভাৰভিউ',financials:'বিত্তীয় তথ্য',actions:'কৰ্পোৰেট কাৰ্য',filings:'ফাইলিং',risk:'বিপদ আৰু অনিশ্চয়তা'},
  'ur-IN': {welcome:'نووا سے ملیے',subtitle:'آپ کی خاتون AI مارکیٹ انٹیلیجنس ساتھی۔',companies:'بھارت کمپنی انٹیلیجنس',search:'NSE / BSE کمپنی تلاش کریں',history:'کمپنی کی مکمل ٹائم لائن',website:'سرکاری ویب سائٹ',sources:'تصدیق شدہ ذرائع',speak:'بولیں',market:'مارکیٹ',overview:'جائزہ',financials:'مالی معلومات',actions:'کارپوریٹ کارروائیاں',filings:'فائلنگز',risk:'خطرہ اور غیر یقینی'},
  'kok-IN': {welcome:'नोवाक मेळात',subtitle:'तुमची महिला AI बाजार बुद्धिमत्ता सोबती.',companies:'भारत कंपनी इंटेलिजन्स',search:'NSE / BSE कंपनी सोदात',history:'कंपनीची पूर्ण वेळरेखा',website:'अधिकृत संकेतस्थळ',sources:'तपासलेले स्रोत',speak:'उलोव',market:'बाजार',overview:'आढावो',financials:'आर्थिक माहिती',actions:'कॉर्पोरेट कृती',filings:'फायलिंग्स',risk:'जोखीम आनी अनिश्चितता'},
  'ks-IN': {welcome:'نووا سٕتھ ملاقات',subtitle:'تُہنٛد زنانہ AI مارکیٹ انٹیلیجنس ساتھی۔',companies:'ہندوستان کمپنی انٹیلیجنس',search:'NSE / BSE کمپنی ژھانڈو',history:'کمپنی مکمل تاریخ',website:'سرکاری ویب سائٹ',sources:'تصدیق شدہ ذرائع',speak:'بوٗلو',market:'مارکیٹ',overview:'جائزہ',financials:'مالی معلومات',actions:'کارپوریٹ کارروائیاں',filings:'فائلنگز',risk:'خطرہ تہ غیر یقینی'}
};

function novaLanguage(code){
  const lang = NOVA_LANGUAGES.find(x => x.code === code) || NOVA_LANGUAGES[0];
  localStorage.setItem('nova_language', lang.code);
  document.documentElement.lang = lang.code;
  const copy = NOVA_COPY[lang.code] || NOVA_COPY['en-IN'];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (copy[key]) el.textContent = copy[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (copy[key]) el.placeholder = copy[key];
  });
  window.NOVA_ACTIVE_LANGUAGE = lang;
  return lang;
}

function novaSpeak(text){
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = (window.NOVA_ACTIVE_LANGUAGE || NOVA_LANGUAGES[0]).code;
  utterance.rate = 0.94;
  utterance.pitch = 1.05;
  const voices = speechSynthesis.getVoices();
  const female = voices.find(v => /female|woman|google.*(hindi|telugu|tamil|english)/i.test(v.name + ' ' + v.voiceURI) && v.lang.toLowerCase().startsWith(utterance.lang.split('-')[0]));
  if (female) utterance.voice = female;
  speechSynthesis.speak(utterance);
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('nova_language') || 'en-IN';
  novaLanguage(saved);
});
