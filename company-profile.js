const app=document.getElementById('app');
const symbol=new URLSearchParams(location.search).get('symbol');
const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const metric=(label,value)=>`<div class="metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
async function load(){
 if(!symbol){app.innerHTML='<div class="error">No company symbol was supplied.</div>';return}
 try{
  const r=await fetch(`/api/companies?q=${encodeURIComponent(symbol)}&limit=10`,{cache:'no-store'}); const d=await r.json();
  const c=(d.results||[]).find(x=>x.symbol===symbol)||(d.results||[])[0]; if(!r.ok||!c) throw new Error('Company not found in the NSE security master.');
  document.title=`Tara AI — ${c.name}`;
  app.innerHTML=`<div class="wrap"><section class="hero"><div><div class="eyebrow">INDIA • NSE EQUITY</div><h1>${esc(c.name)}</h1><div class="meta"><b>${esc(c.symbol)}</b> · ISIN ${esc(c.isin)} · Series ${esc(c.series||'EQ')}</div></div><div class="status"><span class="dot">●</span> Verified company master<br><small>Source: NSE security master</small></div></section>
  <section class="grid"><div class="panel"><h2>Company identity</h2>${metric('Exchange',c.exchange)}${metric('NSE Symbol',c.symbol)}${metric('ISIN',c.isin)}${metric('Series',c.series||'EQ')}</div>
  <div class="panel"><h2>Market snapshot</h2>${metric('LTP','Live feed not connected')}${metric('Today %','—')}${metric('Day High / Low','—')}${metric('Volume','—')}</div>
  <div class="panel"><h2>Financial intelligence</h2>${metric('Revenue','Not loaded')}${metric('Net Profit','Not loaded')}${metric('EPS / P-E','Not loaded')}${metric('ROE / ROCE','Not loaded')}</div>
  <div class="panel wide"><h2>Official company sources</h2><div class="links"><a target="_blank" rel="noopener" href="${esc(c.nseUrl)}">NSE Quote ↗</a><a target="_blank" rel="noopener" href="https://www.nseindia.com/companies-listing/corporate-filings-financial-results?symbol=${encodeURIComponent(c.symbol)}">Financial Results ↗</a><a target="_blank" rel="noopener" href="https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${encodeURIComponent(c.symbol)}">Announcements ↗</a><a target="_blank" rel="noopener" href="https://www.nseindia.com/companies-listing/corporate-filings-actions?symbol=${encodeURIComponent(c.symbol)}">Corporate Actions ↗</a><a target="_blank" rel="noopener" href="https://www.bseindia.com/">BSE India ↗</a></div></div>
  <div class="panel wide"><h2>Tara AI analysis status</h2><p class="note">This profile now has a verified NSE identity layer. Live price, historical OHLCV and financial metrics will only be displayed after an authorized market-data/financial-data source is connected. Tara AI will never invent missing market numbers.</p><div class="locked">Next pipeline: Financial results → historical prices → corporate actions → live market feed → AI fundamental/technical/risk analysis.</div></div></section></div>`;
 }catch(e){app.innerHTML=`<div class="error">${esc(e.message)}</div>`}
}
load();
