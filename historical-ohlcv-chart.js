(() => {
  const CHART_URL = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js';
  const RANGES = ['1D', '1W', '1M', '1Y', '5Y', 'MAX'];
  const INTERVALS = ['1d', '1h', '15m'];
  const colors = { bg: '#0B0E14', text: '#B8C0CC', grid: '#1A2230', bullish: '#00E676', bearish: '#FF5252', crosshair: '#8B98AA', volume: '#607D8B' };
  const symbol = new URLSearchParams(location.search).get('symbol');
  const esc = s => String(s ?? '—').replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  let chartApiPromise;

  function loadChartLibrary() {
    if (window.LightweightCharts) return Promise.resolve(window.LightweightCharts);
    if (chartApiPromise) return chartApiPromise;
    chartApiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = CHART_URL; script.async = true;
      script.onload = () => window.LightweightCharts ? resolve(window.LightweightCharts) : reject(new Error('TradingView Lightweight Charts failed to initialize'));
      script.onerror = () => reject(new Error('TradingView Lightweight Charts could not be loaded'));
      document.head.appendChild(script);
    });
    return chartApiPromise;
  }
  function shell() {
    return `<div class="panel wide history-panel tara-ohlcv-panel" id="taraHistoricalOHLCV"><div class="history-head"><div><div class="eyebrow">TARA AI • VERIFIED HISTORICAL DATA</div><h2>Historical OHLCV</h2><p>Exchange-source candles only. Missing sessions remain gaps; no synthetic candles or moving-average fills.</p></div><span class="history-status" id="taraOHLCVStatus">Waiting for verified data…</span></div><div class="tara-ohlcv-controls"><div class="range-tabs" role="tablist" aria-label="Historical range">${RANGES.map((r, i) => `<button class="range-tab tara-range${i === 3 ? ' active' : ''}" data-tara-range="${r}" role="tab">${r}</button>`).join('')}</div><label class="interval-control">Interval <select id="taraOHLCVInterval">${INTERVALS.map(v => `<option value="${v}"${v === '1d' ? ' selected' : ''}>${v}</option>`).join('')}</select></label></div><div id="taraOHLCVNotice" class="history-empty">Loading source-backed history…</div><div id="taraOHLCVChart" class="tara-ohlcv-chart" hidden></div><div id="taraOHLCVTooltip" class="tara-ohlcv-tooltip" hidden></div></div>`;
  }
  function mountShell() {
    const existing = document.getElementById('history');
    if (!existing || document.getElementById('taraHistoricalOHLCV')) return false;
    existing.outerHTML = shell();
    document.querySelectorAll('[data-tara-range]').forEach(btn => btn.addEventListener('click', () => load(btn.dataset.taraRange)));
    document.getElementById('taraOHLCVInterval').addEventListener('change', () => load(document.querySelector('[data-tara-range].active')?.dataset.taraRange || '1Y'));
    load('1Y');
    return true;
  }
  function setNotice(message, error = false) {
    const n = document.getElementById('taraOHLCVNotice'); if (!n) return;
    n.hidden = false; n.innerHTML = error ? `<strong>Historical data unavailable.</strong><p>${esc(message)}</p>` : `<strong>${esc(message)}</strong>`;
    const c = document.getElementById('taraOHLCVChart'); if (c) c.hidden = true;
  }
  function formatPrice(v) { return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  async function load(range) {
    const status = document.getElementById('taraOHLCVStatus');
    if (!status || !symbol) return;
    document.querySelectorAll('[data-tara-range]').forEach(b => b.classList.toggle('active', b.dataset.taraRange === range));
    status.textContent = 'Loading…'; setNotice('Loading verified exchange history…');
    const interval = document.getElementById('taraOHLCVInterval')?.value || '1d';
    try {
      const response = await fetch(`/api/v1/company/${encodeURIComponent(symbol)}/history?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (response.status === 404) throw new Error('Company not found in verified universe');
      if (!response.ok || data.success !== true) throw new Error(data.error || 'Historical provider unavailable');
      status.textContent = data.metadata?.verified ? `${data.candles.length.toLocaleString('en-IN')} verified candles • ${esc(data.metadata.source)}` : 'Pending exchange-data ingestion';
      if (!data.metadata?.verified || !data.candles?.length) { setNotice(data.metadata?.notice || 'Historical exchange data pending ingestion'); return; }
      await renderChart(data.candles, range, interval);
    } catch (error) { status.textContent = 'Data unavailable'; setNotice(error.message, true); }
  }
  async function renderChart(candles, range, interval) {
    const L = await loadChartLibrary();
    const host = document.getElementById('taraOHLCVChart'); const notice = document.getElementById('taraOHLCVNotice'); if (!host) return;
    host.hidden = false; notice.hidden = true; host.replaceChildren();
    const chart = L.createChart(host, { autoSize: true, layout: { background: { color: colors.bg }, textColor: colors.text }, grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } }, crosshair: { mode: L.CrosshairMode.Normal, vertLine: { color: colors.crosshair, width: 1, style: L.LineStyle.Dashed, labelBackgroundColor: colors.bg }, horzLine: { color: colors.crosshair, width: 1, style: L.LineStyle.Dashed, labelBackgroundColor: colors.bg } }, rightPriceScale: { borderColor: colors.grid }, timeScale: { borderColor: colors.grid, timeVisible: interval !== '1d', secondsVisible: false, rightOffset: 4, barSpacing: interval === '1d' ? 7 : 4 } });
    const candleSeries = chart.addCandlestickSeries({ upColor: colors.bullish, downColor: colors.bearish, borderUpColor: colors.bullish, borderDownColor: colors.bearish, wickUpColor: colors.bullish, wickDownColor: colors.bearish, priceFormat: { type: 'price', precision: 2, minMove: 0.01 } });
    const volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.82, bottom: 0 }, color: colors.volume });
    const mapped = candles.map(c => ({ time: interval === '1d' ? c.time : Math.floor(new Date(c.time).getTime() / 1000), open: c.open, high: c.high, low: c.low, close: c.close }));
    const volumes = candles.map(c => ({ time: interval === '1d' ? c.time : Math.floor(new Date(c.time).getTime() / 1000), value: Number(c.volume) || 0, color: c.close >= c.open ? colors.bullish : colors.bearish }));
    candleSeries.setData(mapped); volumeSeries.setData(volumes); chart.timeScale().fitContent();
    const tooltip = document.getElementById('taraOHLCVTooltip');
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.point || !tooltip) { if (tooltip) tooltip.hidden = true; return; }
      const c = param.seriesData.get(candleSeries); const v = param.seriesData.get(volumeSeries);
      if (!c) { tooltip.hidden = true; return; }
      const dateText = interval === '1d' ? String(param.time) : new Date(Number(param.time) * 1000).toLocaleString('en-IN');
      tooltip.innerHTML = `<b>${esc(dateText)}</b><span>O ${formatPrice(c.open)}</span><span>H ${formatPrice(c.high)}</span><span>L ${formatPrice(c.low)}</span><span>C ${formatPrice(c.close)}</span><span>V ${Number(v?.value || 0).toLocaleString('en-IN')}</span>`;
      tooltip.hidden = false;
      const rect = host.getBoundingClientRect(); tooltip.style.left = `${Math.min(Math.max(param.point.x + 14, 8), Math.max(8, rect.width - 180))}px`; tooltip.style.top = `${Math.min(Math.max(param.point.y + 14, 8), Math.max(8, rect.height - 100))}px`;
    });
    window.addEventListener('resize', () => chart.resize(host.clientWidth, host.clientHeight), { once: true });
    host.dataset.range = range; host.dataset.interval = interval;
  }
  function boot() {
    if (mountShell()) return;
    const observer = new MutationObserver(() => { if (mountShell()) observer.disconnect(); });
    observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
