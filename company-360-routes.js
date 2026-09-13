const https = require('https');

// Company 360 source layer: only official/authorized source URLs supplied by deployment config.
const NSE_RESULTS_URL = String(process.env.NSE_RESULTS_URL || '').trim();
const NSE_ANNOUNCEMENTS_URL = String(process.env.NSE_ANNOUNCEMENTS_URL || '').trim();
const BSE_CORPORATE_DATA_URL = String(process.env.BSE_CORPORATE_DATA_URL || '').trim();
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map();

function download(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('Source URL is not configured'));
    const req = https.get(url, { headers: { 'User-Agent': 'TaraAI/1.0 market-intelligence', Accept: 'application/json,text/csv,*/*' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); return download(res.headers.location).then(resolve, reject); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`Source returned HTTP ${res.statusCode}`)); }
      const chunks=[]; res.on('data',c=>chunks.push(Buffer.from(c))); res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(30000,()=>req.destroy(new Error('Source request timed out'))); req.on('error',reject);
  });
}

function safeJson(text) { try { return JSON.parse(text); } catch { return null; } }
function status(section, source, reason) { return { section, status: source ? 'configured' : 'unavailable', source: source || null, reason: reason || (source ? 'Awaiting source response.' : 'Authorized source is not configured; Tara will not fabricate this section.') }; }

async function get360(symbol) {
  const key=String(symbol||'').trim().toUpperCase(); if(!key) throw new Error('Symbol is required');
  const cached=cache.get(key); if(cached && Date.now()-cached.at<CACHE_MS) return cached.data;
  const sections={ identity:{status:'verified'}, financials:status('financials',NSE_RESULTS_URL), announcements:status('announcements',NSE_ANNOUNCEMENTS_URL), bseCorporate:status('bseCorporate',BSE_CORPORATE_DATA_URL), ownership:{status:'unavailable',reason:'Authorized shareholding source not configured.'}, dividends:{status:'unavailable',reason:'Authorized corporate-actions source not configured.'}, governance:{status:'unavailable',reason:'Authorized governance source not configured.'}, news:{status:'unavailable',reason:'Licensed news source not configured.'}, valuation:{status:'unavailable',reason:'Verified financial inputs are required.'}, risk:{status:'pending',reason:'Tara risk engine requires verified financial, market and corporate inputs.'}, scenarios:{status:'pending',reason:'Scenario analysis requires sufficient verified history and fundamentals.'} };
  const payload={success:true,symbol:key,generatedAt:new Date().toISOString(),policy:'verified-data-only',sections};
  // Providers can be added later without changing the API contract. Never silently substitute scraped data.
  if(NSE_RESULTS_URL){try{const raw=await download(NSE_RESULTS_URL);const parsed=safeJson(raw);payload.sections.financials={status:'configured',source:NSE_RESULTS_URL,available:true,data:parsed};}catch(e){payload.sections.financials={status:'error',source:NSE_RESULTS_URL,available:false,reason:e.message};}}
  if(NSE_ANNOUNCEMENTS_URL){try{const raw=await download(NSE_ANNOUNCEMENTS_URL);const parsed=safeJson(raw);payload.sections.announcements={status:'configured',source:NSE_ANNOUNCEMENTS_URL,available:true,data:parsed};}catch(e){payload.sections.announcements={status:'error',source:NSE_ANNOUNCEMENTS_URL,available:false,reason:e.message};}}
  if(BSE_CORPORATE_DATA_URL){try{const raw=await download(BSE_CORPORATE_DATA_URL);const parsed=safeJson(raw);payload.sections.bseCorporate={status:'configured',source:BSE_CORPORATE_DATA_URL,available:true,data:parsed};}catch(e){payload.sections.bseCorporate={status:'error',source:BSE_CORPORATE_DATA_URL,available:false,reason:e.message};}}
  cache.set(key,{at:Date.now(),data:payload}); return payload;
}

function registerCompany360Routes(app){
  app.get('/api/company-360/:symbol',async(req,res)=>{try{res.json(await get360(req.params.symbol));}catch(e){res.status(400).json({success:false,error:e.message});}});
}
module.exports={registerCompany360Routes};
