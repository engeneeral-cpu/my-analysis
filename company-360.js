(() => {
  const symbol = new URLSearchParams(location.search).get('symbol');
  if (!symbol) return;
  const esc = s => String(s ?? '—').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const value = v => v === null || v === undefined || v === '' ? 'Not connected' : esc(v);
  const arr = v => Array.isArray(v) ? v : [];
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const money = v => num(v) == null ? '—' : `₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
  const pct = v => num(v) == null ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

  function item(label, v) { return `<div class="c360-item"><small>${esc(label)}</small><strong>${value(v)}</strong></div>`; }
  function list(title, rows, empty='No verified data connected yet.') {
    const a = arr(rows);
    const body = a.length ? `<ul>${a.slice(0,12).map(x => `<li>${esc(typeof x === 'string' ? x : (x.title || x.name || x.description || JSON.stringify(x)))}</li>`).join('')}</ul>` : `<div class="c360-empty">${esc(empty)}</div>`;
    return `<div class="c360-card"><h3>${esc(title)}</h3>${body}</div>`;
  }

  function miniLine(rows, field, label) {
    const points = arr(rows).map((r,i) => [num(r?.[field]),i]).filter(x=>x[0]!=null);
    if (points.length < 2) return `<div class="c360-chart-empty">Awaiting verified ${esc(label)} data</div>`;
    const vals=points.map(x=>x[0]), min=Math.min(...vals), max=Math.max(...vals), span=max-min||1, W=520,H=150,p=12;
    const path=points.map((x,i)=>`${i?'L':'M'} ${(p+i*(W-p*2)/Math.max(points.length-1,1)).toFixed(1)} ${(p+(max-x[0])/span*(H-p*2)).toFixed(1)}`).join(' ');
    return `<svg class="c360-mini-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} trend"><line class="c360-chart-grid" x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}"/><line class="c360-chart-grid" x1="${p}" y1="${p}" x2="${p}" y2="${H-p}"/><path class="c360-chart-line" d="${path}"/></svg>`;
  }

  function dashboard(data) {
    const m=data.market||{}, f=data.financials||{}, r=data.risk||{};
    const hist=arr(data.history?.rows || data.history);
    const last=m['Last Price'] ?? m.lastPrice ?? m.ltp ?? m.price;
    const change=m['Change %'] ?? m.changePercent ?? m.changePct;
    const high=m['52W High'] ?? m.high52w;
    const low=m['52W Low'] ?? m.low52w;
    const score=data.taraScore ?? data.score ?? data.market?.taraScore;
    return `<section class="c360-dashboard">
      <div class="c360-live-head"><div><div class="eyebrow">TARA AI • LIVE COMPANY DASHBOARD</div><h2>Market cockpit</h2><p>Live trading, price history, growth, downside and Tara intelligence in one place.</p></div><span class="c360-live-pill">● ${last===undefined?'Feed pending':'Live data'}</span></div>
      <div class="c360-kpis">
        <div class="c360-kpi"><small>Live price</small><strong>${value(last)}</strong><span>${pct(change)}</span></div>
        <div class="c360-kpi"><small>52W high</small><strong>${value(high)}</strong><span>Resistance context</span></div>
        <div class="c360-kpi"><small>52W low</small><strong>${value(low)}</strong><span>Downside context</span></div>
        <div class="c360-kpi tara"><small>Tara AI score</small><strong>${value(score)}</strong><span>Evidence-based • not a guarantee</span></div>
      </div>
      <div class="c360-widget-grid">
        <div class="c360-widget"><div class="c360-widget-title"><b>Price & trading trend</b><small>${hist.length?'Verified history':'Awaiting market stream'}</small></div>${miniLine(hist,'close','price')||''}<div class="c360-widget-foot">Candlestick + volume + SMA/RSI/MACD are available in Trading Analysis when verified history is connected.</div></div>
        <div class="c360-widget"><div class="c360-widget-title"><b>Growth & profit</b><small>Financial intelligence</small></div><div class="c360-growth-grid">${item('Revenue',f.Revenue ?? f.revenue)}${item('Profit',f.Profit ?? f.profit)}${item('EPS',f.EPS ?? f.eps)}${item('Margins',f.Margins ?? f.margins)}</div><div class="c360-widget-foot">Quarterly/yearly growth graphs will use source-backed financial periods only.</div></div>
        <div class="c360-widget"><div class="c360-widget-title"><b>Low / downside monitor</b><small>Risk intelligence</small></div><div class="c360-downside">${item('52W Low',low)}${item('Drawdown',m.Drawdown ?? m.drawdown)}${item('Financial risk',r['Financial risk'] ?? r.financialRisk)}${item('Market risk',r['Market risk'] ?? r.marketRisk)}</div><div class="c360-widget-foot">Scenario probabilities require verified data and Tara model evidence.</div></div>
      </div>
      <div class="c360-actions"><a class="c360-action" href="#tradingAnalysis">📈 Trading analysis</a><a class="c360-action" href="#history">📊 Full history</a><button class="c360-action" type="button" id="openTaraCompanyChat">💬 Ask Tara about this company</button></div>
      <div id="taraCompanyChat" class="c360-chat" hidden><div class="c360-chat-head"><div><b>Talk to Tara AI</b><small>Company context: ${esc(symbol)}</small></div><button type="button" id="closeTaraCompanyChat" aria-label="Close">×</button></div><div id="c360ChatMessages" class="c360-chat-messages"><div class="c360-chat-msg tara">Hi! I’m Tara AI. Ask me about this company’s price, history, growth, profit, risk or Tara Score.</div></div><form id="c360ChatForm" class="c360-chat-form"><input id="c360ChatInput" autocomplete="off" maxlength="1000" placeholder="Ask about this company…"><button type="submit">Send</button></form></div>
    </section>`;
  }

  function item(label, v) { return `<div class="c360-item"><small>${esc(label)}</small><strong>${value(v)}</strong></div>`; }

  function render(data) {
    const old=document.getElementById('taraCompany360'); if(old)old.remove();
    const sections=[
      ['Identity',data.identity,['Exchange','NSE Symbol','BSE Code','ISIN','Sector','Industry']],
      ['Market intelligence',data.market,['Last Price','Change','Volume','Market Cap','52W High','52W Low']],
      ['Financial intelligence',data.financials,['Revenue','Profit','EPS','Margins','Debt','Cash Flow']],
      ['Shareholding',data.shareholding,['Promoter','FII','DII','Public']],
      ['Management & governance',data.management,['Directors','CEO','Board Meetings','Governance']],
      ['Business intelligence',data.business,['Business','Segments','Subsidiaries','Products']],
      ['Valuation & peers',data.valuation||data.peers,['P/E','P/B','ROE','ROCE','Peer comparison']],
      ['Risk intelligence',data.risk,['Business risk','Financial risk','Market risk','Regulatory risk']],
      ['Opportunities',data.opportunities,['Growth drivers','Market gaps','Catalysts','Watch items']]
    ];
    const sectionHtml=sections.map(([title,obj,keys])=>{
      if(!obj||Array.isArray(obj))return list(title,obj);
      return `<div class="c360-card"><h3>${esc(title)}</h3><div class="c360-grid">${keys.map(k=>item(k,obj[k])).join('')}</div></div>`;
    }).join('');
    const sources=arr(data.sources); const news=arr(data.news).slice(0,8);
    const host=document.querySelector('.wrap')||document.getElementById('app'); if(!host)return;
    host.insertAdjacentHTML('beforeend',`<section id="taraCompany360" class="panel wide company360-panel">${dashboard(data)}
      <div class="c360-head"><div><div class="eyebrow">TARA AI • COMPANY 360°</div><h2>Company Intelligence</h2><p>One evidence-first view across identity, business, financials, ownership, governance, valuation and risk.</p></div><span class="c360-status">${data.status?esc(data.status):'Verified-source architecture'}</span></div>
      <div class="c360-grid-wrap">${sectionHtml}</div>
      <div class="c360-lower">${list('News & announcements',news.length?news:data.announcements)}${list('Corporate actions',data.corporateActions)}${list('Sources',sources)}</div>
      <div class="c360-note"><b>Tara AI evidence rule:</b> unavailable provider data stays unavailable. No fabricated financial, market, ownership or news values are displayed.</div>
    </section>`);
    bindChat(data);
  }

  function bindChat(data){
    const open=document.getElementById('openTaraCompanyChat'), close=document.getElementById('closeTaraCompanyChat'), box=document.getElementById('taraCompanyChat'), form=document.getElementById('c360ChatForm'), input=document.getElementById('c360ChatInput'), messages=document.getElementById('c360ChatMessages');
    if(!open||!box||!form)return;
    open.onclick=()=>{box.hidden=false;input.focus();}; if(close)close.onclick=()=>box.hidden=true;
    form.onsubmit=async e=>{e.preventDefault();const q=input.value.trim();if(!q)return;messages.insertAdjacentHTML('beforeend',`<div class="c360-chat-msg user">${esc(q)}</div>`);input.value='';const pending=document.createElement('div');pending.className='c360-chat-msg tara';pending.textContent='Checking verified company context…';messages.appendChild(pending);messages.scrollTop=messages.scrollHeight;
      try{const context={symbol,company:data.identity?.['Company Name']||data.identity?.name||symbol,market:data.market,financials:data.financials,risk:data.risk};const r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({message:`Company context: ${JSON.stringify(context)}\nUser question: ${q}`})});const d=await r.json();pending.textContent=d.reply||d.message||'Tara could not answer because verified data is unavailable.';}catch(err){pending.textContent='Tara could not connect right now. No unverified market claim was generated.'}messages.scrollTop=messages.scrollHeight;};
  }

  async function load(){
    try{const r=await fetch(`/api/company-intelligence/${encodeURIComponent(symbol)}`,{cache:'no-store',headers:{Accept:'application/json'}});const data=await r.json();if(!r.ok||data.success===false)throw new Error(data.error||'Company intelligence unavailable');render(data);
    }catch(e){const host=document.querySelector('.wrap')||document.getElementById('app');if(!host)return;host.insertAdjacentHTML('beforeend',`<section id="taraCompany360" class="panel wide company360-panel"><div class="c360-head"><div><div class="eyebrow">TARA AI • COMPANY 360°</div><h2>Company Intelligence</h2><p>Provider connection is not available yet.</p></div><span class="c360-status">Data unavailable</span></div><div class="c360-note">${esc(e.message)}<br>No fabricated company intelligence is shown.</div></section>`);}
  }
  const timer=setInterval(()=>{if(document.querySelector('.wrap')){clearInterval(timer);load();}},100);setTimeout(()=>clearInterval(timer),10000);
})();
