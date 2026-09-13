const https = require('https');

const NSE_EQUITY_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
// BSE publishes the standardized master as BSE_EQ_SCRIP_DDMMYYYY.csv.
// The actual distribution URL/access is controlled by BSE; configure the licensed/authorized
// endpoint in BSE_SECURITY_MASTER_URL instead of hard-coding an unverified URL.
const BSE_SECURITY_MASTER_URL = String(process.env.BSE_SECURITY_MASTER_URL || '').trim();
const CACHE_MS = 6 * 60 * 60 * 1000;
let cache = { at: 0, rows: [], sources: [] };

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'TaraAI/1.0 market-intelligence',
        'Accept': 'text/csv,application/gzip,application/octet-stream,*/*'
      }
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return download(response.headers.location).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Security master request returned HTTP ${response.statusCode}`));
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(30000, () => req.destroy(new Error('Security master request timed out')));
    req.on('error', reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { row.push(cell.trim()); cell = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.trim()); rows.push(row); }
  if (!rows.length) return [];

  const headers = rows[0].map(h => h.toUpperCase().replace(/\s+/g, ' ').trim());
  const idx = (...names) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));
  const symbol = idx('SYMBOL', 'SECURITY ID', 'INSTRUMENT CODE');
  const name = idx('NAME OF COMPANY', 'SCRIP NAME', 'SECURITY NAME');
  const series = idx('SERIES', 'GROUP NAME');
  const isin = idx('ISIN NUMBER', 'ISIN CODE', 'ISIN');
  const bseCode = idx('SCRIP CODE', 'SC_CODE', 'SECURITY CODE');

  return rows.slice(1).map(r => ({
    name: name >= 0 ? r[name] : '',
    symbol: symbol >= 0 ? r[symbol] : '',
    series: series >= 0 ? r[series] : '',
    isin: isin >= 0 ? r[isin] : '',
    bseCode: bseCode >= 0 ? r[bseCode] : ''
  })).filter(x => x.name && x.isin);
}

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

function mergeUniverses(nseRows, bseRows) {
  const byIsin = new Map();
  const add = (item, exchange) => {
    const isin = normalize(item.isin);
    if (!isin) return;
    const existing = byIsin.get(isin) || {
      name: item.name,
      isin,
      nseSymbol: '',
      bseCode: '',
      bseSymbol: '',
      series: item.series || '',
      exchanges: [],
      verifiedSources: []
    };
    if (item.name && (!existing.name || exchange === 'NSE')) existing.name = item.name;
    if (exchange === 'NSE') existing.nseSymbol = item.symbol || existing.nseSymbol;
    if (exchange === 'BSE') {
      existing.bseCode = item.bseCode || existing.bseCode;
      existing.bseSymbol = item.symbol || existing.bseSymbol;
    }
    if (item.series && !existing.series) existing.series = item.series;
    if (!existing.exchanges.includes(exchange)) existing.exchanges.push(exchange);
    if (!existing.verifiedSources.includes(exchange)) existing.verifiedSources.push(exchange);
    byIsin.set(isin, existing);
  };
  nseRows.forEach(r => add(r, 'NSE'));
  bseRows.forEach(r => add(r, 'BSE'));

  return [...byIsin.values()].map(c => ({
    ...c,
    exchange: c.exchanges.length > 1 ? 'NSE+BSE' : c.exchanges[0],
    symbol: c.nseSymbol || c.bseSymbol || '',
    nseUrl: c.nseSymbol ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(c.nseSymbol)}` : null,
    bseUrl: c.bseCode ? `https://www.bseindia.com/stock-share-price/` : 'https://www.bseindia.com/'
  })).sort((a, b) => a.name.localeCompare(b.name));
}

async function getUniverse() {
  if (cache.rows.length && Date.now() - cache.at < CACHE_MS) return cache;

  const nseCsv = await download(NSE_EQUITY_URL);
  const nseRows = parseCsv(nseCsv.toString('utf8')).filter(x => !x.series || normalize(x.series) === 'EQ');

  let bseRows = [];
  const sources = ['NSE official security master'];
  if (BSE_SECURITY_MASTER_URL) {
    try {
      const bseCsv = await download(BSE_SECURITY_MASTER_URL);
      bseRows = parseCsv(bseCsv.toString('utf8')).filter(x => !x.series || ['EQ', 'A', 'B'].includes(normalize(x.series)));
      if (bseRows.length) sources.push('BSE official/authorized security master');
    } catch (error) {
      console.error('[Tara BSE Master]', error.message);
    }
  }

  if (!nseRows.length) throw new Error('NSE security master returned no equity records');
  const rows = mergeUniverses(nseRows, bseRows);
  cache = { at: Date.now(), rows, sources };
  return cache;
}

function registerCompanyRoutes(app) {
  app.get('/api/companies', async (req, res) => {
    try {
      const universe = await getUniverse();
      const q = String(req.query.q || '').trim().toLowerCase();
      const exchange = String(req.query.exchange || 'all').trim().toLowerCase();
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const filteredExchange = exchange === 'nse' ? universe.rows.filter(c => c.exchanges.includes('NSE'))
        : exchange === 'bse' ? universe.rows.filter(c => c.exchanges.includes('BSE'))
        : universe.rows;
      const matches = q ? filteredExchange.filter(c => [c.name, c.nseSymbol, c.bseSymbol, c.bseCode, c.isin].some(v => String(v || '').toLowerCase().includes(q))) : filteredExchange;
      const nseCount = universe.rows.filter(c => c.exchanges.includes('NSE')).length;
      const bseCount = universe.rows.filter(c => c.exchanges.includes('BSE')).length;
      const bothCount = universe.rows.filter(c => c.exchanges.includes('NSE') && c.exchanges.includes('BSE')).length;
      res.json({
        success: true,
        source: universe.sources,
        updatedAt: new Date(universe.at).toISOString(),
        coverage: { nse: nseCount, bse: bseCount, both: bothCount, bseMasterConnected: BSE_SECURITY_MASTER_URL.length > 0 && bseCount > 0 },
        total: universe.rows.length,
        matched: matches.length,
        results: matches.slice(0, limit)
      });
    } catch (error) {
      console.error('[Tara Company Universe]', error.message);
      res.status(503).json({ success: false, error: 'Company universe is temporarily unavailable. Please try again shortly.' });
    }
  });
}

module.exports = { registerCompanyRoutes };
