(() => {
  const symbol = new URLSearchParams(location.search).get('symbol');
  if (!symbol) return;

  const esc = s => String(s ?? '—').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const value = v => v === null || v === undefined || v === '' ? 'Not connected' : esc(v);
  const arr = v => Array.isArray(v) ? v : [];

  function item(label, v) {
    return `<div class="c360-item"><small>${esc(label)}</small><strong>${value(v)}</strong></div>`;
  }

  function list(title, rows, empty='No verified data connected yet.') {
    const body = arr(rows).length
      ? `<ul>${arr(rows).slice(0,12).map(x => `<li>${esc(typeof x === 'string' ? x : (x.title || x.name || x.description || JSON.stringify(x)))}</li>`).join('')}</ul>`
      : `<div class="c360-empty">${esc(empty)}</div>`;
    return `<div class="c360-card"><h3>${esc(title)}</h3>${body}</div>`;
  }

  function render(data) {
    const old = document.getElementById('taraCompany360');
    if (old) old.remove();
    const sections = [
      ['Identity', data.identity, ['Exchange','NSE Symbol','BSE Code','ISIN','Sector','Industry']],
      ['Market intelligence', data.market, ['Last Price','Change','Volume','Market Cap','52W High','52W Low']],
      ['Financial intelligence', data.financials, ['Revenue','Profit','EPS','Margins','Debt','Cash Flow']],
      ['Shareholding', data.shareholding, ['Promoter','FII','DII','Public']],
      ['Management & governance', data.management, ['Directors','CEO','Board Meetings','Governance']],
      ['Business intelligence', data.business, ['Business','Segments','Subsidiaries','Products']],
      ['Valuation & peers', data.valuation || data.peers, ['P/E','P/B','ROE','ROCE','Peer comparison']],
      ['Risk intelligence', data.risk, ['Business risk','Financial risk','Market risk','Regulatory risk']],
      ['Opportunities', data.opportunities, ['Growth drivers','Market gaps','Catalysts','Watch items']]
    ];

    const sectionHtml = sections.map(([title, obj, keys]) => {
      if (!obj || Array.isArray(obj)) return list(title, obj);
      return `<div class="c360-card"><h3>${esc(title)}</h3><div class="c360-grid">${keys.map(k => item(k, obj[k])).join('')}</div></div>`;
    }).join('');

    const sources = arr(data.sources).map(s => `<li>${esc(typeof s === 'string' ? s : (s.name || s.url || s.provider || 'Verified source'))}</li>`).join('');
    const news = arr(data.news).slice(0,8).map(n => `<li><b>${esc(n.title || n.name || 'Market update')}</b>${n.date ? ` <small>${esc(n.date)}</small>` : ''}</li>`).join('');

    const host = document.querySelector('.wrap') || document.getElementById('app');
    if (!host) return;
    host.insertAdjacentHTML('beforeend', `<section id="taraCompany360" class="panel wide company360-panel">
      <div class="c360-head"><div><div class="eyebrow">TARA AI • COMPANY 360°</div><h2>Company Intelligence</h2><p>One evidence-first view across identity, business, financials, ownership, governance, valuation and risk.</p></div><span class="c360-status">${data.status ? esc(data.status) : 'Verified-source architecture'}</span></div>
      <div class="c360-grid-wrap">${sectionHtml}</div>
      <div class="c360-lower">${list('News & announcements', news.length ? news : data.announcements)}${list('Corporate actions', data.corporateActions)}${list('Sources', sources ? sources.split('</li>').filter(Boolean).map(x => x.replace(/^<li>/,'').replace(/<\/li>$/,'')) : [])}</div>
      <div class="c360-note"><b>Tara AI evidence rule:</b> unavailable provider data stays unavailable. No fabricated financial, market, ownership or news values are displayed.</div>
    </section>`);
  }

  async function load() {
    try {
      const r = await fetch(`/api/company-intelligence/${encodeURIComponent(symbol)}`, {cache:'no-store', headers:{Accept:'application/json'}});
      const data = await r.json();
      if (!r.ok || data.success === false) throw new Error(data.error || 'Company intelligence unavailable');
      render(data);
    } catch (e) {
      const host = document.querySelector('.wrap') || document.getElementById('app');
      if (!host) return;
      host.insertAdjacentHTML('beforeend', `<section id="taraCompany360" class="panel wide company360-panel"><div class="c360-head"><div><div class="eyebrow">TARA AI • COMPANY 360°</div><h2>Company Intelligence</h2><p>Provider connection is not available yet.</p></div><span class="c360-status">Data unavailable</span></div><div class="c360-note">${esc(e.message)}<br>No fabricated company intelligence is shown.</div></section>`);
    }
  }

  const timer = setInterval(() => {
    if (document.querySelector('.wrap')) { clearInterval(timer); load(); }
  }, 100);
  setTimeout(() => clearInterval(timer), 10000);
})();
