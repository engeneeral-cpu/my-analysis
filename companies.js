const $=id=>document.getElementById(id);
const LANGS=[['en','English'],['hi','Hindi'],['te','Telugu'],['mr','Marathi'],['ta','Tamil'],['bn','Bengali'],['gu','Gujarati'],['kn','Kannada'],['ml','Malayalam'],['pa','Punjabi'],['or','Odia'],['as','Assamese'],['ur','Urdu'],['kok','Konkani'],['ne','Nepali']];
const language=$('language');
LANGS.forEach(([code,label])=>{const o=document.createElement('option');o.value=code;o.textContent=label;language.appendChild(o)});
language.value=localStorage.getItem('aarohi-lang')||'en';
function applyLang(){const t=AAROHI_I18N[language.value]||AAROHI_I18N.en;document.documentElement.lang=language.value;$('tag').textContent=t.tag;$('languageLabel').textContent=t.language;$('query').placeholder=t.search;$('companiesTitle').textContent=t.companies;$('historyText').textContent=t.history+' — '+t.verified;$('sourcesTitle').textContent=t.sources;$('disclaimer').textContent=t.disclaimer;localStorage.setItem('aarohi-lang',language.value)}
language.addEventListener('change',applyLang);applyLang();

let lastUniverseTotal=0;
function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function card(c){
  const bseSearch=`https://www.bseindia.com/stock-share-price/`;
  return `<article class="company"><div class="company-head"><div><h2>${esc(c.name)}</h2><span class="symbol">${esc(c.symbol)}</span></div><div class="badges"><span class="badge">${esc(c.exchange)}</span><span class="badge">ISIN</span></div></div><div class="facts"><div class="fact"><small>Exchange</small><b>NSE</b></div><div class="fact"><small>Symbol</small><b>${esc(c.symbol)}</b></div><div class="fact"><small>ISIN</small><b>${esc(c.isin||'Available in source')}</b></div></div><p style="color:#77849d;line-height:1.6;font-size:13px">Source-backed company master record. Aarohi will use this identity to attach price history, financial results, filings, corporate actions, news, risk and AI reasoning.</p><div class="links"><a target="_blank" rel="noopener" href="${esc(c.nseUrl)}">NSE ↗</a><a target="_blank" rel="noopener" href="${bseSearch}">BSE search ↗</a><a target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(c.name+' official website')}">Official website ↗</a></div></article>`;
}
function render(list, q=''){
  const head=`<div class="universe-status"><strong>${lastUniverseTotal.toLocaleString()}+ NSE equity records indexed</strong><span>${q?list.length.toLocaleString()+' matches':'Showing the first '+list.length.toLocaleString()+' records'}</span></div>`;
  $('results').innerHTML=head+(list.length?list.map(c=>card(c)).join(''):`<div class="empty">No company matched. Try company name, NSE symbol or ISIN.</div>`);
}
async function loadCompanies(q=''){
  $('results').innerHTML='<div class="empty">Loading the official company universe…</div>';
  try{
    const url='/api/companies?limit=100'+(q?'&q='+encodeURIComponent(q):'');
    const response=await fetch(url,{headers:{Accept:'application/json'}});
    const data=await response.json();
    if(!response.ok||!data.success)throw new Error(data.error||'Company universe unavailable');
    lastUniverseTotal=data.total||0;
    render(data.results||[],q);
  }catch(error){
    $('results').innerHTML=`<div class="empty">${esc(error.message)}<br><small>Refresh after the Render deployment finishes.</small></div>`;
  }
}
function search(){loadCompanies($('query').value.trim());}
$('searchBtn').addEventListener('click',search);
$('query').addEventListener('keydown',e=>{if(e.key==='Enter')search()});
loadCompanies();
