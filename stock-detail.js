(() => {
  const symbol = new URLSearchParams(location.search).get('symbol');
  if (!symbol) return;
  const esc = v => String(v ?? '—').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const val = v => v === null || v === undefined || v === '' ? '<span class="sd-unavailable">Unavailable</span>' : esc(v);
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const money = v => num(v) == null ? '<span class="sd-unavailable">Unavailable</span>' : `₹${num(v).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
  const pct = v => num(v) == null ? '<span class="sd-unavailable">Unavailable</span>' : `${num(v)>=0?'+':''}${num(v).toFixed(2)}%`;
  const card = (title, body, cls='') => `<section class="sd-card ${cls}"><div class="sd-card-head"><h3>${esc(title)}</h3></div>${body}</section>`;
  const metric = (label, value, formatter=val) => `<div class="sd-metric"><small>${esc(label)}</small><strong>${formatter(value)}</strong></div>`;
  const empty = text => `<div class="sd-empty"><b>Verified data unavailable</b><p>${esc(text || 'Connect an authorized/licensed provider to populate this field.')}</p></div>`;
  const table = (headers, rows, emptyText) => rows?.length ? `<div class="sd-table-wrap"><table class="sd-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${typeof c==='string'&&c.startsWith('<span')?c:esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : empty(emptyText);

  async function fetchJSON(url) { const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}}); const d=await r.json(); if(!r.ok || d.success===false) throw new Error(d.error||'Data unavailable'); return d; }

  function renderShell(company, intel) {
    document.getElementById('taraStockDetail')?.remove();
    const identity=intel.identity||{}, market=intel.market||{}, financials=intel.financials||{};
    const host=document.querySelector('.wrap')||document.getElementById('app'); if(!host)return;
    const companyName=identity['Company Name']||identity.name||company?.name||symbol;
    host.insertAdjacentHTML('afterbegin', `<section id="taraStockDetail" class="sd-shell">
      <div class="sd-hero">
        <div><div class="sd-eyebrow">TARA AI • NSE / BSE STOCK INTELLIGENCE</div><h2>${esc(companyName)}</h2><p>${esc(symbol)} · Series ${val(identity.Series||company?.series||'EQ')} · ISIN ${val(identity.ISIN||company?.isin)}</p></div>
        <div class="sd-live-state"><span></span><b id="sdLiveLabel">Live feed pending</b><small>Verified data only</small></div>
      </div>
      <div class="sd-quote-grid" id="sdQuoteGrid">
        ${metric('LTP',market.LTP||market['Last Price'],money)}${metric('Change',market.Change,money)}${metric('Change %',market['Change %']||market.changePercent,pct)}${metric('Previous Close',market['Previous Close'],money)}
        ${metric('Open',market.Open,money)}${metric('High',market.High,money)}${metric('Low',market.Low,money)}${metric('Close',market.Close,money)}
        ${metric('52W High',market['52W High'],money)}${metric('52W Low',market['52W Low'],money)}${metric('Upper Circuit',market['Upper Circuit'],money)}${metric('Lower Circuit',market['Lower Circuit'],money)}
      </div>
      ${card('Market depth • Level 2', `<div id="sdDepth">${empty('Top 5 bid/offer data requires an authorized Level-2 market-data feed.')}</div>`)}
      ${card('Interactive price chart', `<div class="sd-timeframes"><button class="sd-time active" data-range="1d">1D</button><button class="sd-time" data-range="1w">1W</button><button class="sd-time" data-range="1m">1M</button><button class="sd-time" data-range="1y">1Y</button><button class="sd-time" data-range="5y">5Y</button><button class="sd-time" data-range="all">MAX</button></div><div id="sdChart">${empty('Verified OHLCV history is required before drawing a price chart.')}</div>`,'sd-chart-card')}
      ${card('Trading & security information', `<div class="sd-metric-grid">${metric('Traded Volume',market.Volume||market.volume, v=>num(v)==null?'<span class="sd-unavailable">Unavailable</span>':num(v).toLocaleString('en-IN'))}${metric('Traded Value',market['Traded Value'],money)}${metric('Delivery Volume',market['Delivery Volume'],v=>v==null?'<span class="sd-unavailable">Unavailable</span>':num(v).toLocaleString('en-IN'))}${metric('Delivery %',market['Delivery %'],pct)}${metric('Face Value',market['Face Value'],money)}${metric('Market Lot',market['Market Lot'])}${metric('Tick Size',market['Tick Size'],money)}${metric('Market Cap',market['Market Cap'],money)}</div>`)}
      <div class="sd-two-col">
        ${card('Financial results', `<div id="sdFinancials">${empty('Quarterly revenue, profit and EPS require an authorized structured financial-data source.')}</div>`)}
        ${card('Shareholding pattern', `<div id="sdShareholding">${empty('Promoter, FII, DII and public holdings require verified filing data.')}</div>`)}
      </div>
      <div class="sd-two-col">
        ${card('Corporate actions', `<div id="sdActions">${empty('Dividends, bonus, splits and other corporate actions will appear from verified filings.')}</div>`)}
        ${card('Announcements & board meetings', `<div id="sdAnnouncements">${empty('Exchange announcements and board-meeting notices will appear when connected.')}</div>`)}
      </div>
      ${card('Peer comparison', `<div id="sdPeers">${table(['Company','Market Cap','P/E','P/B','Dividend Yield'],[], 'Verified peer fundamentals are not connected yet.')}</div>`)}
      ${card('Tara AI insight', `<div class="sd-insight-grid"><div><small>Technical</small><b id="sdTechnical">Awaiting verified market data</b></div><div><small>Fundamental</small><b id="sdFundamental">Awaiting verified financial data</b></div><div><small>Risk</small><b id="sdRisk">Awaiting verified risk inputs</b></div></div><div class="sd-disclaimer">Tara AI analysis is informational and evidence-first. It does not guarantee returns or constitute personalized investment advice.</div>`,'sd-tara')}
    </section>`);
    bindTimeframes();
    loadHistory('1d');
    hydrateStatic(intel);
  }

  function bindTimeframes(){document.querySelectorAll('.sd-time').forEach(b=>b.onclick=()=>{document.querySelectorAll('.sd-time').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadHistory(b.dataset.range);});}
  function renderChart(rows){
    const clean=(rows||[]).filter(r=>num(r.close)!=null).slice(-180); if(clean.length<2){document.getElementById('sdChart').innerHTML=empty('Not enough verified sessions to draw the chart.');return;}
    const W=1000,H=300,p=34, vals=clean.map(r=>num(r.close)), min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
    const path=vals.map((v,i)=>`${i?'L':'M'} ${(p+i*(W-p*2)/Math.max(vals.length-1,1)).toFixed(1)} ${(p+(max-v)/span*(H-p*2)).toFixed(1)}`).join(' ');
    const bars=clean.map((r,i)=>{const v=num(r.volume)||0;const maxV=Math.max(...clean.map(x=>num(x.volume)||0))||1;const h=v/maxV*45;const x=p+i*(W-p*2)/Math.max(clean.length-1,1);return `<rect class="sd-volume" x="${x-2}" y="${H-10-h}" width="4" height="${h}" rx="2"/>`;}).join('');
    document.getElementById('sdChart').innerHTML=`<div class="sd-chart-meta"><span>${clean.length} verified sessions</span><span>Close price + volume</span></div><div class="sd-chart-scroll"><svg viewBox="0 0 ${W} ${H}" class="sd-svg" role="img" aria-label="Price chart"><line class="sd-grid" x1="${p}" y1="${p}" x2="${W-p}" y2="${p}"/><line class="sd-grid" x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}"/><path class="sd-price" d="${path}"/>${bars}</svg></div>`;
  }
  async function loadHistory(range){try{const d=await fetchJSON(`/api/market-history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`);renderChart(d.rows||[]);}catch(e){document.getElementById('sdChart').innerHTML=empty(e.message);}}

  function hydrateStatic(data){
    const f=data.financials||{}; const s=data.shareholding||{}; const ca=data.corporateActions||[]; const ann=data.announcements||[]; const peers=data.peers||[];
    const financialRows=Array.isArray(f.quarters)?f.quarters:[];
    document.getElementById('sdFinancials').innerHTML=financialRows.length?table(['Period','Revenue','Net Profit','EPS'],financialRows.map(x=>[x.period||x.date,money(x.revenue),money(x.netProfit||x.profit),x.eps??'Unavailable'])):empty('Quarterly revenue, net profit and EPS require verified financial data.');
    const sh=[['Promoter',s.Promoter??s.promoter],['FII',s.FII??s.fii],['DII',s.DII??s.dii],['Public',s.Public??s.public]].filter(x=>x[1]!=null);document.getElementById('sdShareholding').innerHTML=sh.length?`<div class="sd-holdings">${sh.map(x=>`<div><span>${esc(x[0])}</span><b>${pct(x[1])}</b><i style="width:${Math.max(0,Math.min(100,num(x[1])||0))}%"></i></div>`).join('')}</div>`:empty('Promoter, FII, DII and public holding percentages are not connected.');
    document.getElementById('sdActions').innerHTML=Array.isArray(ca)&&ca.length?`<ul class="sd-list">${ca.slice(0,12).map(x=>`<li><b>${esc(x.title||x.type||'Corporate action')}</b><span>${esc(x.date||'Date unavailable')}</span></li>`).join('')}</ul>`:empty();
    document.getElementById('sdAnnouncements').innerHTML=Array.isArray(ann)&&ann.length?`<ul class="sd-list">${ann.slice(0,12).map(x=>`<li><b>${esc(x.title||x.subject||'Announcement')}</b><span>${esc(x.date||'Date unavailable')}</span></li>`).join('')}</ul>`:empty();
    const pr=Array.isArray(peers)?peers:[];document.getElementById('sdPeers').innerHTML=table(['Company','Market Cap','P/E','P/B','Dividend Yield'],pr.map(x=>[x.name||x.symbol||'—',x.marketCap??'Unavailable',x.pe??'Unavailable',x.pb??'Unavailable',x.dividendYield??'Unavailable']),'Verified peer fundamentals are not connected yet.');
  }

  async function start(){
    try{
      const [companyData,intel]=await Promise.all([fetchJSON(`/api/companies?q=${encodeURIComponent(symbol)}&limit=10`),fetchJSON(`/api/company-intelligence/${encodeURIComponent(symbol)}`)]);
      const company=(companyData.results||[]).find(x=>x.symbol===symbol)||(companyData.results||[])[0];
      if(!company)throw new Error('Company not found in the verified NSE/BSE company master.');
      renderShell(company,intel);
      try{const q=await fetchJSON(`/api/live-market/quote/${encodeURIComponent(symbol)}`);if(q?.success&&q.quote){document.getElementById('sdLiveLabel').textContent='Verified live feed';const m=q.quote;document.getElementById('sdQuoteGrid').innerHTML=[metric('LTP',m.ltp,money),metric('Change',m.change,money),metric('Change %',m.percentChange,pct),metric('Previous Close',m.previousClose,money),metric('Open',m.open,money),metric('High',m.high,money),metric('Low',m.low,money),metric('Close',m.close,money),metric('52W High',m.high52w,money),metric('52W Low',m.low52w,money),metric('Upper Circuit',m.upperCircuit,money),metric('Lower Circuit',m.lowerCircuit,money)].join('');}}catch{}
    }catch(e){const host=document.querySelector('.wrap')||document.getElementById('app');if(host)host.insertAdjacentHTML('afterbegin',`<section class="sd-shell"><div class="sd-empty"><b>Stock intelligence unavailable</b><p>${esc(e.message)}</p></div></section>`);}
  }
  const t=setInterval(()=>{if(document.querySelector('.wrap')){clearInterval(t);start();}},100);setTimeout(()=>clearInterval(t),10000);
})();
