const $=id=>document.getElementById(id);
const LANGS=[['en','English'],['hi','Hindi'],['te','Telugu'],['mr','Marathi'],['ta','Tamil'],['bn','Bengali'],['gu','Gujarati'],['kn','Kannada'],['ml','Malayalam'],['pa','Punjabi'],['or','Odia'],['as','Assamese'],['ur','Urdu'],['kok','Konkani'],['ne','Nepali']];
const language=$('language'); LANGS.forEach(([code,label])=>{const o=document.createElement('option');o.value=code;o.textContent=label;language.appendChild(o)});
language.value=localStorage.getItem('aarohi-lang')||'en';
function applyLang(){const t=AAROHI_I18N[language.value]||AAROHI_I18N.en;document.documentElement.lang=language.value;$('tag').textContent=t.tag;$('languageLabel').textContent=t.language;$('query').placeholder=t.search;$('companiesTitle').textContent=t.companies;$('historyText').textContent=t.history+' — '+t.verified;$('sourcesTitle').textContent=t.sources;$('disclaimer').textContent=t.disclaimer;localStorage.setItem('aarohi-lang',language.value)}
language.addEventListener('change',applyLang);applyLang();

// Demo index is intentionally small. Production will be fed by licensed NSE/BSE datasets.
const seed=[
 {name:'Reliance Industries Limited',symbol:'RELIANCE',nse:'RELIANCE',bse:'500325',site:'https://www.ril.com/',note:'Corporate history, filings, results and exchange records.'},
 {name:'Tata Consultancy Services Limited',symbol:'TCS',nse:'TCS',bse:'532540',site:'https://www.tcs.com/',note:'Corporate history, filings, results and exchange records.'},
 {name:'HDFC Bank Limited',symbol:'HDFCBANK',nse:'HDFCBANK',bse:'500180',site:'https://www.hdfcbank.com/',note:'Corporate history, filings, results and exchange records.'},
 {name:'State Bank of India',symbol:'SBIN',nse:'SBIN',bse:'500112',site:'https://sbi.co.in/',note:'Corporate history, filings, results and exchange records.'},
 {name:'Tata Motors Limited',symbol:'TATAMOTORS',nse:'TATAMOTORS',bse:'500570',site:'https://www.tatamotors.com/',note:'Corporate history, filings, results and exchange records.'}
];
function card(c){return `<article class="company"><div class="company-head"><div><h2>${c.name}</h2><span class="symbol">${c.symbol}</span></div><div class="badges"><span class="badge">NSE</span><span class="badge">BSE</span></div></div><div class="facts"><div class="fact"><small>NSE</small><b>${c.nse}</b></div><div class="fact"><small>BSE code</small><b>${c.bse}</b></div><div class="fact"><small>Coverage</small><b>History</b></div></div><p style="color:#77849d;line-height:1.6;font-size:13px">${c.note} Complete historical coverage will include price/volume, corporate actions, financial results, announcements and other available disclosures.</p><div class="links"><a target="_blank" rel="noopener" href="https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(c.nse)}">NSE ↗</a><a target="_blank" rel="noopener" href="https://www.bseindia.com/stock-share-price/${encodeURIComponent(c.name.toLowerCase().replaceAll(' ','-'))}/${c.bse}/">BSE ↗</a><a target="_blank" rel="noopener" href="${c.site}">${AAROHI_I18N[language.value].website} ↗</a></div></article>`}
function render(list){$('results').innerHTML=list.length?list.map(card).join(''):`<div class="empty">No indexed company found. Production search will query the complete NSE/BSE security master.</div>`}
function search(){const q=$('query').value.trim().toLowerCase();render(q?seed.filter(c=>[c.name,c.symbol,c.nse,c.bse].some(x=>x.toLowerCase().includes(q))):seed)}
$('searchBtn').addEventListener('click',search);$('query').addEventListener('keydown',e=>{if(e.key==='Enter')search()});render(seed);
