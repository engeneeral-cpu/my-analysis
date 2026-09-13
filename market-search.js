(() => {
  const form = document.getElementById('marketSearchForm');
  const input = document.getElementById('marketSearchInput');
  const results = document.getElementById('marketSearchResults');
  if (!form || !input || !results) return;

  let timer = null;
  let controller = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const render = list => {
    if (!list.length) {
      results.innerHTML = '<div class="market-search-empty">No verified company match found.</div>';
      results.classList.add('show');
      return;
    }
    results.innerHTML = list.slice(0, 8).map(company => {
      const symbol = company.nseSymbol || company.symbol || '';
      const profileSymbol = symbol || company.bseSymbol || '';
      const exchanges = (company.exchanges || []).join(' + ') || company.exchange || '—';
      return `<a class="market-search-result" role="option" href="company-profile.html?symbol=${encodeURIComponent(profileSymbol)}"><span><strong>${esc(company.name)}</strong><small>${esc(symbol ? `NSE ${symbol}` : 'NSE —')} · ${esc(exchanges)} · ISIN ${esc(company.isin || '—')}</small></span><b>→</b></a>`;
    }).join('');
    results.classList.add('show');
  };

  const search = async value => {
    const q = value.trim();
    if (q.length < 2) {
      results.innerHTML = '';
      results.classList.remove('show');
      return;
    }
    if (controller) controller.abort();
    controller = new AbortController();
    results.innerHTML = '<div class="market-search-loading">Searching verified NSE + BSE universe…</div>';
    results.classList.add('show');
    try {
      const response = await fetch(`/api/companies?limit=20&q=${encodeURIComponent(q)}&exchange=all`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data?.error || 'Company search unavailable');
      render(data.results || []);
    } catch (error) {
      if (error.name === 'AbortError') return;
      results.innerHTML = '<div class="market-search-empty">Verified company search is temporarily unavailable.</div>';
      results.classList.add('show');
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => search(input.value), 220);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    search(input.value);
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.market-search')) results.classList.remove('show');
  });

  input.addEventListener('focus', () => {
    if (results.innerHTML.trim()) results.classList.add('show');
  });
})();
