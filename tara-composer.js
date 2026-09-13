(() => {
  const form = document.getElementById('taraPromptForm');
  const input = document.getElementById('taraQueryInput');
  const send = document.getElementById('sendQueryBtn');
  const status = document.getElementById('taraPromptStatus');
  const result = document.getElementById('taraResult');
  const resultText = document.getElementById('taraResultText');
  const modeText = document.getElementById('taraMode');
  const autocomplete = document.getElementById('taraAutocomplete');
  const fileInput = document.getElementById('taraFileInput');
  const attachBtn = document.getElementById('attachBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const marketStatus = document.getElementById('marketStatus');
  let mode = 'deep';
  let timer = null;

  const esc = value => String(value ?? '').replace(/[<>]/g, '');
  const setStatus = (text, type = '') => { status.textContent = text; status.className = `composer-status ${type}`.trim(); };

  function resize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 190)}px`;
    input.style.overflowY = input.scrollHeight > 190 ? 'auto' : 'hidden';
  }
  function syncSend() { send.disabled = !input.value.trim(); }
  function updateMarketStatus() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(now);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const weekday = map.weekday;
    const minutes = Number(map.hour) * 60 + Number(map.minute);
    const open = !['Sat','Sun'].includes(weekday) && minutes >= 555 && minutes <= 930;
    marketStatus.className = `market-status ${open ? 'open' : 'closed'}`;
    marketStatus.querySelector('b').textContent = open ? 'Market Open' : 'Market Closed';
    marketStatus.querySelector('small').textContent = open ? 'NSE/BSE · 9:15–15:30 IST' : 'NSE/BSE · next session 9:15 IST';
  }

  input.addEventListener('input', () => {
    resize(); syncSend();
    const q = input.value.trim(); clearTimeout(timer);
    if (q.length < 2) { autocomplete.classList.remove('show'); return; }
    timer = setTimeout(() => companySuggestions(q), 180);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!send.disabled) form.requestSubmit(); }
    if (e.key === 'Escape') autocomplete.classList.remove('show');
  });

  document.addEventListener('keydown', e => {
    const target = e.target;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if ((e.key === '/' || (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') && !typing) { e.preventDefault(); input.focus(); }
  });

  document.querySelectorAll('.mode-pill[data-mode]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-pill[data-mode]').forEach(x => x.classList.remove('active'));
    btn.classList.add('active'); mode = btn.dataset.mode || 'deep'; setStatus(`${btn.textContent.trim()} mode selected.`); input.focus();
  }));

  document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => {
    input.value = btn.dataset.prompt || ''; resize(); syncSend(); input.focus();
  }));

  async function companySuggestions(q) {
    try {
      const r = await fetch(`/api/companies?q=${encodeURIComponent(q)}&limit=6&exchange=ALL`, { headers: { Accept: 'application/json' } });
      const d = await r.json(); const rows = Array.isArray(d.companies) ? d.companies : Array.isArray(d.results) ? d.results : [];
      autocomplete.innerHTML = '';
      rows.slice(0, 6).forEach(c => {
        const b = document.createElement('button'); b.type='button'; b.className='suggestion';
        const symbol = c.nseSymbol || c.bseSymbol || c.symbol || ''; const exchange = c.exchanges || c.exchange || '';
        b.innerHTML = `<strong>${esc(c.name || symbol)}</strong><span>${esc(symbol)}${exchange ? ` · ${esc(exchange)}` : ''}${c.isin ? ` · ${esc(c.isin)}` : ''}</span>`;
        b.addEventListener('click', () => { input.value = symbol ? `${symbol} ` : `${c.name || ''} `; autocomplete.classList.remove('show'); resize(); syncSend(); input.focus(); });
        autocomplete.appendChild(b);
      });
      if (rows.length) autocomplete.classList.add('show'); else autocomplete.classList.remove('show');
    } catch { autocomplete.classList.remove('show'); }
  }

  attachBtn?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) setStatus(`Attached: ${file.name}. File analysis will activate when the document-analysis provider is connected.`); });

  voiceBtn?.addEventListener('click', () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setStatus('Voice input is not supported by this browser.', 'error'); return; }
    const recognition = new Recognition(); recognition.lang = document.documentElement.lang === 'te' ? 'te-IN' : 'en-IN'; recognition.interimResults=true; recognition.continuous=false;
    voiceBtn.classList.add('active'); setStatus('Listening… speak your market question.');
    recognition.onresult = event => { input.value = Array.from(event.results).map(x=>x[0].transcript).join(''); resize(); syncSend(); };
    recognition.onerror = () => setStatus('Voice input could not be completed.', 'error'); recognition.onend = () => voiceBtn.classList.remove('active'); recognition.start();
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault(); const message=input.value.trim(); if(!message){syncSend();input.focus();return;}
    autocomplete.classList.remove('show'); send.disabled=true; result.classList.add('show'); modeText.textContent=mode.toUpperCase(); resultText.textContent=''; setStatus('Tara is analyzing your request with the native intelligence layer…');
    try {
      const r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message:`[${mode}] ${message}`,language:document.documentElement.lang||'en'})});
      const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Tara AI is temporarily unavailable.');
      resultText.textContent=esc(d.reply||d.message||'Verified evidence is not available for this request yet.');
      const native=d.analysis||d.nativeAnalysis; setStatus(native?.decision==='insufficient_verified_evidence'?'Verified data is unavailable for a reliable conclusion.':'Tara analysis ready.',native?.decision==='insufficient_verified_evidence'?'error':'ok');
    } catch(err){ resultText.textContent=esc(err.message||'Tara AI is temporarily unavailable.'); setStatus('Tara could not complete the request.','error'); }
    finally { syncSend(); }
  });

  document.addEventListener('click', e => { if(!e.target.closest('.tara-composer-box')) autocomplete.classList.remove('show'); });
  resize(); syncSend(); updateMarketStatus(); setInterval(updateMarketStatus,30000);
})();
