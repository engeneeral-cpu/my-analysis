const https = require('https');
const { validateMetrics, calculateMultiFactorScore } = require('./tara-intelligence-engine');

const NSE_EQUITY_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
const BSE_SECURITY_MASTER_URL = String(process.env.BSE_SECURITY_MASTER_URL || '').trim();
const BSE_LICENSE_STATUS = String(process.env.BSE_SECURITY_MASTER_LICENSE_STATUS || '').trim().toLowerCase();
const BSE_ALLOWED = ['licensed', 'authorized', 'active'].includes(BSE_LICENSE_STATUS);
const CACHE_MS = 6 * 60 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
let cache = { at: 0, rows: [], sources: [], bseMasterConnected: false, refreshing: false, error: null };

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: {'User-Agent':'TaraAI/2.1 market-intelligence','Accept':'text/csv,application/gzip,application/octet-stream,*/*'} }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) { response.resume(); return download(response.headers.location).then(resolve,reject); }
      if (response.statusCode !== 200) { response.resume(); return reject(new Error(`Security master request returned HTTP ${response.statusCode}`)); }
      const chunks=[]; response.on('data',c=>chunks.push(Buffer.from(c))); response.on('end',()=>resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(30000,()=>req.destroy(new Error('Security master request timed out'))); req.on('error',reject);
  });
}
function parseCsv(text) {
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1]; if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;continue;} if(ch==='"'){quoted=!quoted;continue;} if(ch===','&&!quoted){row.push(cell.trim());cell='';continue;} if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[];continue;} cell+=ch;}
  if(cell.length||row.length){row.push(cell.trim());rows.push(row);} if(!rows.length)return [];
  const headers=rows[0].map(h=>h.toUpperCase().replace(/\s+/g,' ').trim()); const idx=(...names)=>headers.findIndex(h=>names.some(n=>h===n||h.includes(n)));
  const symbol=idx('SYMBOL','SECURITY ID','INSTRUMENT CODE'),name=idx('NAME OF COMPANY','SCRIP NAME','SECURITY NAME'),series=idx('SERIES','GROUP NAME'),isin=idx('ISIN NUMBER','ISIN CODE','ISIN'),bseCode=idx('SCRIP CODE','SC_CODE','SECURITY CODE');
  return rows.slice(1).map(r=>({name:name>=0?r[name]:'',symbol:symbol>=0?r[symbol]:'',series:series>=0?r[series]:'',isin:isin>=0?r[isin]:'',bseCode:bseCode>=0?r[bseCode]:''})).filter(x=>x.name&&x.isin);
}
function normalize(value){return String(value||'').trim().toUpperCase();}
function mergeUniverses(nseRows,bseRows){
  const byIsin=new Map(); const add=(item,exchange)=>{const isin=normalize(item.isin);if(!isin)return;const existing=byIsin.get(isin)||{name:item.name,isin,nseSymbol:'',bseCode:'',bseSymbol:'',series:item.series||'',exchanges:[],verifiedSources:[]};if(item.name&&(!existing.name||exchange==='NSE'))existing.name=item.name;if(exchange==='NSE')existing.nseSymbol=item.symbol||existing.nseSymbol;if(exchange==='BSE'){existing.bseCode=item.bseCode||existing.bseCode;existing.bseSymbol=item.symbol||existing.bseSymbol;}if(item.series&&!existing.series)existing.series=item.series;if(!existing.exchanges.includes(exchange))existing.exchanges.push(exchange);if(!existing.verifiedSources.includes(exchange))existing.verifiedSources.push(exchange);byIsin.set(isin,existing);};
  nseRows.forEach(r=>add(r,'NSE')); bseRows.forEach(r=>add(r,'BSE'));
  return [...byIsin.values()].map(c=>({...c,exchange:c.exchanges.length>1?'NSE+BSE':c.exchanges[0],symbol:c.nseSymbol||c.bseSymbol||'',nseUrl:c.nseSymbol?`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(c.nseSymbol)}`:null,bseUrl:c.bseCode?'https://www.bseindia.com/stock-share-price/':'https://www.bseindia.com/'})).sort((a,b)=>a.name.localeCompare(b.name));
}
async function refreshUniverse(){
  if(cache.refreshing)return cache;
  cache.refreshing=true;
  try{
    const nseCsv=await download(NSE_EQUITY_URL); const nseRows=parseCsv(nseCsv.toString('utf8')).filter(x=>!x.series||normalize(x.series)==='EQ');
    let bseRows=[],bseMasterConnected=false; const sources=['NSE official security master'];
    if(BSE_SECURITY_MASTER_URL&&BSE_ALLOWED){try{const bseCsv=await download(BSE_SECURITY_MASTER_URL);bseRows=parseCsv(bseCsv.toString('utf8')).filter(x=>!x.series||['EQ','A','B'].includes(normalize(x.series)));if(bseRows.length){bseMasterConnected=true;sources.push('BSE official/authorized security master');}}catch(error){console.error('[Tara BSE Master]',error.message);}}
    else if(BSE_SECURITY_MASTER_URL&&!BSE_ALLOWED)console.warn('[Tara BSE Master] Feed URL configured but license status is not licensed/authorized/active; BSE data disabled.');
    if(!nseRows.length)throw new Error('NSE security master returned no equity records');
    cache={...cache,at:Date.now(),rows:mergeUniverses(nseRows,bseRows),sources,bseMasterConnected,refreshing:false,error:null}; return cache;
  }catch(error){cache={...cache,refreshing:false,error:error.message};throw error;}
}
async function getUniverse(){
  const age=Date.now()-cache.at;
  if(cache.rows.length&&age<CACHE_MS)return cache;
  if(cache.rows.length&&age<STALE_MS){refreshUniverse().catch(()=>{});return cache;}
  return refreshUniverse();
}
function coverage(universe){const nse=universe.rows.filter(c=>c.exchanges.includes('NSE')).length,bse=universe.rows.filter(c=>c.exchanges.includes('BSE')).length,both=universe.rows.filter(c=>c.exchanges.includes('NSE')&&c.exchanges.includes('BSE')).length;return {nse,bse,both,bseMasterConnected:universe.bseMasterConnected};}
function searchRank(c,q){
  const query=String(q||'').trim().toLowerCase(); if(!query)return 0;
  const fields=[
    [c.nseSymbol,100],[c.bseCode,100],[c.bseSymbol,100],[c.isin,100],
    [c.nseSymbol,90],[c.bseSymbol,90],[c.name,80]
  ];
  let best=0;
  for(const [value,exactWeight] of fields){const v=String(value||'').toLowerCase();if(!v)continue;if(v===query)best=Math.max(best,exactWeight);else if(v.startsWith(query))best=Math.max(best,exactWeight-15);else if(v.includes(query))best=Math.max(best,exactWeight-35);}
  return best;
}
function registerCompanyRoutes(app){
  app.get('/api/companies/status',async(req,res)=>{try{const universe=await getUniverse();return res.json({success:true,coverage:coverage(universe),updatedAt:new Date(universe.at).toISOString(),cacheAgeMs:Date.now()-universe.at,cacheMode:Date.now()-universe.at<CACHE_MS?'fresh':'stale-while-revalidate',sources:universe.sources,error:universe.error});}catch(error){return res.status(503).json({success:false,error:'Company master is temporarily unavailable.'});}});
  const searchHandler=async(req,res)=>{try{const universe=await getUniverse();const q=String(req.query.q||'').trim(),exchange=String(req.query.exchange||'all').trim().toLowerCase(),limit=Math.min(Math.max(Number(req.query.limit)||10,1),500);const filtered=exchange==='nse'?universe.rows.filter(c=>c.exchanges.includes('NSE')):exchange==='bse'?universe.rows.filter(c=>c.exchanges.includes('BSE')):universe.rows;const matches=filtered.map(c=>({...c,searchRelevance:searchRank(c,q)})).filter(c=>!q||c.searchRelevance>0).sort((a,b)=>b.searchRelevance-a.searchRelevance||a.name.localeCompare(b.name)).slice(0,limit);res.json({success:true,query:q,totalMatches:matches.length,source:universe.sources,updatedAt:new Date(universe.at).toISOString(),coverage:coverage(universe),companies:matches});}catch(error){console.error('[Tara Company Search]',error.message);res.status(503).json({success:false,error:'Company search is temporarily unavailable.'});}};
  app.get('/api/companies',searchHandler);
  app.get('/api/companies/search',searchHandler);

  // Evidence-first analysis endpoint. It accepts only caller-supplied verified evidence;
  // no market values are stored or fabricated in this route.
  app.post('/api/tara/analyze',async(req,res)=>{try{
    const symbol=String(req.body?.symbol||'').trim().toUpperCase().replace(/[^A-Z0-9._-]/g,'');
    if(!symbol)return res.status(400).json({success:false,error:'Valid NSE/BSE symbol is required'});
    const data=req.body?.marketData||{};
    const required=['currentPrice','rsi','sma20','sma50','pe','debtToEquity'];
    const missing=required.filter(k=>data[k]===undefined||data[k]===null);
    if(missing.length)return res.json({success:true,data:{status:'EVIDENCE_GATEKEEPER_BLOCKED',symbol,verdict:'INSUFFICIENT_VERIFIED_EVIDENCE',conclusion:null,blockedReasons:missing.map(k=>`Missing ${k}`),nextRequired:missing,disclaimer:'Tara AI does not generate market conclusions without verified evidence.'}});
    const validation=validateMetrics(data);
    if(!validation.isValid)return res.json({success:true,data:{status:'EVIDENCE_GATEKEEPER_BLOCKED',symbol,verdict:'INSUFFICIENT_VERIFIED_EVIDENCE',conclusion:null,blockedReasons:validation.errors,disclaimer:'Tara AI does not generate market conclusions from unverified or anomalous data.'}});
    const analysis=calculateMultiFactorScore(data);
    return res.json({success:true,data:{status:'ANALYSIS_COMPLETE',engine:'Tara AI Native Intelligence Engine',version:'2.1.0-native-evidence',symbol,taraScore:`${analysis.score}/100`,verdict:analysis.verdict,strategicStance:analysis.stance,factorBreakdown:analysis.factors,dataSource:{name:data.dataSource.name,retrievedAt:data.dataSource.retrievedAt,licenseType:data.dataSource.licenseType||null},disclaimer:'Educational market research only; not SEBI registered investment advice.'}});
  }catch(error){return res.status(500).json({success:false,error:'Tara analysis could not be completed.'});}});
}
module.exports={registerCompanyRoutes};
