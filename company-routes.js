const https = require('https');

const NSE_EQUITY_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
let cache = { at: 0, rows: [] };
const CACHE_MS = 6 * 60 * 60 * 1000;

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'AarohiAI/1.0 market-intelligence',
        'Accept': 'text/csv,*/*'
      }
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        return download(response.headers.location).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`NSE universe request returned HTTP ${response.statusCode}`));
      }
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => resolve(data));
    });
    req.setTimeout(20000, () => req.destroy(new Error('NSE universe request timed out')));
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
  const idx = name => headers.findIndex(h => h === name || h.includes(name));
  const symbol = idx('SYMBOL');
  const name = idx('NAME OF COMPANY');
  const series = idx('SERIES');
  const isin = idx('ISIN NUMBER');

  return rows.slice(1).map(r => ({
    name: name >= 0 ? r[name] : '',
    symbol: symbol >= 0 ? r[symbol] : '',
    series: series >= 0 ? r[series] : '',
    isin: isin >= 0 ? r[isin] : '',
    exchange: 'NSE'
  })).filter(x => x.name && x.symbol && (!x.series || x.series === 'EQ'));
}

async function getUniverse() {
  if (cache.rows.length && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const csv = await download(NSE_EQUITY_URL);
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error('NSE security master returned no equity records');
  cache = { at: Date.now(), rows };
  return rows;
}

function registerCompanyRoutes(app) {
  app.get('/api/companies', async (req, res) => {
    try {
      const rows = await getUniverse();
      const q = String(req.query.q || '').trim().toLowerCase();
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const matches = q ? rows.filter(c => `${c.name} ${c.symbol} ${c.isin}`.toLowerCase().includes(q)) : rows;
      res.json({
        success: true,
        source: 'NSE official security master',
        updatedAt: new Date(cache.at).toISOString(),
        total: rows.length,
        matched: matches.length,
        results: matches.slice(0, limit).map(c => ({
          ...c,
          nseUrl: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(c.symbol)}`,
          searchUrl: `https://www.nseindia.com/search?q=${encodeURIComponent(c.name)}`
        }))
      });
    } catch (error) {
      console.error('[Aarohi Company Universe]', error.message);
      res.status(503).json({ success: false, error: 'Company universe is temporarily unavailable. Please try again shortly.' });
    }
  });
}

module.exports = { registerCompanyRoutes };
