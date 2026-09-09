const $=id=>document.getElementById(id);
const LANGS=[['en','English'],['hi','Hindi'],['te','Telugu'],['mr','Marathi'],['ta','Tamil'],['bn','Bengali'],['gu','Gujarati'],['kn','Kannada'],['ml','Malayalam'],['pa','Punjabi'],['or','Odia'],['as','Assamese'],['ur','Urdu'],['kok','Konkani'],['ne','Nepali']];
const language=$('language'); LANGS.forEach(([code,label])=>{const o=document.createElement('option');o.value=code;o.textContent=label;language.appendChild(o)});
language.value=localStorage.getItem('aarohi-lang')||'en';
function applyLang(){const t=AAROHI_I18N[language.value]||AAROHI_I18N.en;document.documentElement.lang=language.value;$('tag').textContent=t.tag;$('languageLabel').textContent=t.language;$('query').placeholder=t.search;$('companiesTitle').textContent=t.companies;$('historyText').textContent=t.history+' — '+t.verified;$('sourcesTitle').textContent=t.sources;$('disclaimer').textContent=t.disclaimer;localStorage.setItem('aarohi-lang',language.value)}
language.addEventListener('change',applyLang);applyLang();

let universe=[];
const money=v=>v==null?'—':'₹'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:2});
const pct=v=>v==null?'—':`${v>=0?'+':''}${Number(v).toFixed(2)}%`;
const num=v=>v==null?'—':Number(v).toLocaleString('en-IN');

function metric(label,value,sub=''){return `<div class="fact"><small>${label}</small><b>${value}</b>${sub?`<span>${sub}</span>`:''}</div>`}
function card(c){return `<article class="company live-card" data-symbol="${c.symbol}">
<div class="company-head"><div><h2>${c.name}</h2><span class="symbol">${c.symbol}</span><span class="isin">ISIN ${c.isin||'—'}</span></div><div class="badges"><span class="badge">NSE</span><span class="badge">${c.series||'EQ'}</span></div></div>
<div class="live-strip"><div class="live-dot"></div><strong>Today / Live market</strong><span class="freshness" data-freshness>Waiting for feed…</span></div>
<div class="facts live-facts">
${metric('LTP','—')} ${metric('Today %','—')} ${metric('Open','—')} ${metric('Day High','—')} ${metric('Day Low','—')} ${metric('Volume','—')}
</div>
<div class="profit-box"><div><small>Latest reported net profit</small><strong data-profit>Not loaded</strong></div><div><small>Data as of</small><strong data-asof>—</strong></div></div>
<p class="live-reason" data-reason>Live quote and latest company financial result will be shown here. No fabricated numbers.</p>
<div class="links"><a target="_blank" rel="noopener" href="${c.nseUrl}">NSE ↗</a><a target="_blank" rel="noopener" href="https://www.bseindia.com/">BSE ↗</a><a target="_blank" rel="noopener" href="https://www.nseindia.com/search?q=${encodeURIComponent(c.name)}">Company disclosures ↗</a></div>
</article>`}

function render(list){$('results').innerHTML=list.length?list.map(card).join(''):`<div class="empty">No company found in the official NSE security master.</div>`;loadQuotes()}

async function loadUniverse(q=''){
  $('results').innerHTML='<div class="empty">Loading official NSE company universe…</div>';
  try{
    const r=await fetch(`/api/companies?limit=100${q?`&q=${encodeURIComponent(q)}`:''}`,{cache:'no-store'});
    const data=await r.json();
    if(!r.ok||!data.success) throw new Error(data.error||'Company universe unavailable');
    universe=data.results||[];
    $('verifiedText').textContent=`${data.total.toLocaleString('en-IN')} NSE securities indexed`;
    render(universe);
  }catch(e){$('results').innerHTML=`<div class="empty">${e.message}</div>`}
}

async function loadQuotes(){
  document.querySelectorAll('.live-card').forEach(async card=>{
    const symbol=card.dataset.symbol;
    try{
      const r=await fetch(`/api/live-market/quote/${encodeURIComponent(symbol)}`,{cache:'no-store'});
      const data=await r.json();
      if(!r.ok||!data.success) throw new Error(data.error||'Live feed unavailable');
      const q=data.quote;
      const facts=card.querySelectorAll('.live-facts .fact b');
      [q.ltp,q.percentChange,q.open,q.high,q.low,q.volume].forEach((v,i)=>facts[i].textContent=i===1?pct(v):i===5?num(v):money(v));
      card.querySelector('[data-freshness]').textContent=`LIVE • ${new Date(q.asOf).toLocaleString('en-IN')}`;
      card.querySelector('[data-freshness]').dataset.live='1';
      card.querySelector('[data-reason]').textContent=`Today: ${money(q.change)} (${pct(q.percentChange)}) from previous close. High ${money(q.high)}, low ${money(q.low)}.`;
    }catch(e){
      card.querySelector('[data-freshness]').textContent='Live feed not connected';
      card.querySelector('[data-reason]').textContent='No live number is displayed until an authorized market-data feed is connected. This prevents stale or invented prices.';
    }
  });
}

async function search(){const q=$('query').value.trim();await loadUniverse(q)}
$('searchBtn').addEventListener('click',search);$('query').addEventListener('keydown',e=>{if(e.key==='Enter')search()});
loadUniverse();
setInterval(()=>{if(universe.length)loadQuotes()},15000);
