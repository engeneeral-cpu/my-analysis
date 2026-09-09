const app=document.getElementById('app');
const symbol=new URLSearchParams(location.search).get('symbol');
const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const metric=(label,value)=>`<div class="metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
const money=v=>v==null?'—':'₹'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:2});
const number=v=>v==null?'—':Number(v).toLocaleString('en-IN');
const pct=v=>v==null?'—':`${v>=0?'+':''}${Number(v).toFixed(2)}%`;
const ranges=[['1d','Daily'],['1w','Weekly'],['1m','Monthly'],['3m','3 Months'],['6m','6 Months'],['1y','1 Year'],['3y','3 Years'],['5y','5 Years'],['10y','10 Years'],['all','All Time']];

function renderHistoryShell(){
 return `<div class="panel wide history-panel" id="history"><div class="history-head"><div><h2>Market history</h2><p>Source-backed historical OHLCV across every supported period.</p></div><span class="history-status" id="historyStatus">Checking data source…</span></div><div class="range-tabs" role="tablist">${ranges.map(([key,label],i)=>`<button class="range-tab${i===5?' active':''}" data-range="${key}" role="tab">${label}</button>`).join('')}</div><div id="historyBody" class="history-body"><div class="history-empty">Select a period to load historical market data.</div></div></div>`;
}

function renderHistory(data,range){
 const rows=data.rows||[];
 const latest=rows[rows.length-1], first=rows[0];
 const periodChange=first?.close&&latest?.close?((latest.close-first.close)/first.close)*100:null;
 const maxHigh=rows.reduce((m,r)=>r.high!=null?Math.max(m,r.high):m,null);
 const minLow=rows.reduce((m,r)=>r.low!=null?Math.min(m,r.low):m,null);
 const volume=rows.reduce((s,r)=>s+(r.volume||0),0);
 document.getElementById('historyStatus').textContent=`${rows.length.toLocaleString('en-IN')} sessions • ${esc(data.source||'Provider')}`;
 document.getElementById('historyBody').innerHTML=`<div class="history-summary">${metric('Period return',pct(periodChange))}${metric('Period high',money(maxHigh))}${metric('Period low',money(minLow))}${metric('Total volume',number(volume))}</div><div class="history-table-wrap"><table class="history-table"><thead><tr><th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th><th>Traded value</th></tr></thead><tbody>${rows.slice(-250).reverse().map(r=>`<tr><td>${esc(String(r.date).slice(0,10))}</td><td>${money(r.open)}</td><td>${money(r.high)}</td><td>${money(r.low)}</td><td>${money(r.close)}</td><td>${number(r.volume)}</td><td>${money(r.tradedValue)}</td></tr>`).join('')}</tbody></table></div><p class="history-foot">${rows.length>250?'Showing the latest 250 sessions in the table.':'Complete returned history shown.'} • Range: ${esc(range)} • As of ${esc(data.asOf)}</p>`;
}

async function loadHistory(range='1y'){
 const body=document.getElementById('historyBody'), status=document.getElementById('historyStatus');
 if(!body)return;
 body.innerHTML='<div class="history-loading">Loading verified historical market data…</div>'; status.textContent='Loading…';
 document.querySelectorAll('.range-tab').forEach(b=>b.classList.toggle('active',b.dataset.range===range));
 try{
  const r=await fetch(`/api/market-history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`,{cache:'no-store',headers:{Accept:'application/json'}});
  const d=await r.json(); if(!r.ok||!d.success)throw new Error(d?.error||'Historical data unavailable');
  renderHistory(d,range);
 }catch(e){status.textContent='Data unavailable';body.innerHTML=`<div class="history-empty"><strong>Historical data is not connected yet.</strong><p>${esc(e.message)}</p><small>No fabricated prices are displayed. Connect an authorized/licensed EOD provider to populate Daily through All Time.</small></div>`;}
}

async function loadPreviousTradingDay(){
 const box=document.getElementById('previousDayBody'); if(!box)return;
 try{
  const r=await fetch(`/api/market-history/${encodeURIComponent(symbol)}/previous`,{cache:'no-store',headers:{Accept:'application/json'}});
  const d=await r.json(); if(!r.ok||!d.success)throw new Error(d?.error||'Previous trading-day data unavailable');
  const x=d.rows?.[0]; box.innerHTML=`<div class="history-summary">${metric('Trading date',String(x.date).slice(0,10))}${metric('Open',money(x.open))}${metric('High',money(x.high))}${metric('Low',money(x.low))}${metric('Close',money(x.close))}${metric('Volume',number(x.volume))}${metric('Traded value',money(x.tradedValue))}</div><p class="history-foot">Source: ${esc(d.source)} • As of ${esc(d.asOf)}</p>`;
 }catch(e){box.innerHTML=`<div class="history-empty"><strong>Previous trading-day data unavailable.</strong><p>${esc(e.message)}</p></div>`;}
}

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
  <div class="panel wide"><h2>Previous trading day</h2><div id="previousDayBody" class="history-body"><div class="history-loading">Checking previous trading-day data…</div></div></div>
  ${renderHistoryShell()}
  <div class="panel wide"><h2>Official company sources</h2><div class="links"><a target="_blank" rel="noopener" href="${esc(c.nseUrl)}">NSE Quote ↗</a><a target="_blank" rel="noopener" href="https://www.nseindia.com/companies-listing/corporate-filings-financial-results?symbol=${encodeURIComponent(c.symbol)}">Financial Results ↗</a><a target="_blank" rel="noopener" href="https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${encodeURIComponent(c.symbol)}">Announcements ↗</a><a target="_blank" rel="noopener" href="https://www.nseindia.com/companies-listing/corporate-filings-actions?symbol=${encodeURIComponent(c.symbol)}">Corporate Actions ↗</a><a target="_blank" rel="noopener" href="https://www.bseindia.com/">BSE India ↗</a></div></div>
  <div class="panel wide"><h2>Tara AI analysis status</h2><p class="note">Historical market ranges are wired into the product. Actual prices appear only after an authorized/licensed historical data source is connected. Tara AI will never invent missing market numbers.</p><div class="locked">History pipeline: Daily → Weekly → Monthly → 3M → 6M → 1Y → 3Y → 5Y → 10Y → All Time → AI technical/fundamental/risk analysis.</div></div></section></div>`;
  document.querySelectorAll('.range-tab').forEach(btn=>btn.addEventListener('click',()=>loadHistory(btn.dataset.range)));
  loadPreviousTradingDay(); loadHistory('1y');
 }catch(e){app.innerHTML=`<div class="error">${esc(e.message)}</div>`}
}
load();
