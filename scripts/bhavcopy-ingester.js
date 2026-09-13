#!/usr/bin/env node
'use strict';

/*
 * Tara AI — official exchange Bhavcopy ingestion utility.
 *
 * IMPORTANT: an exchange-hosted download is not automatically a commercial
 * redistribution licence. This utility therefore defaults to dry-run mode and
 * refuses website-facing ingestion unless the operator explicitly enables the
 * applicable exchange/data-provider permissions.
 *
 * Supported NSE formats:
 *   - 08-Jul-2024 onward: CM-UDiFF Common Bhavcopy Final ZIP/CSV
 *   - legacy archive: historical EQUITIES Bhavcopy ZIP/CSV
 *
 * Examples:
 *   node scripts/bhavcopy-ingester.js --date 2026-08-20 --dry-run
 *   node scripts/bhavcopy-ingester.js --from 2026-08-01 --to 2026-08-20 --dry-run
 *
 * The parser emits normalized JSON records to stdout. A future DB adapter can
 * consume the same normalized contract without changing source validation.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const https = require('https');

const NSE_NEW = 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{yyyymmdd}_F_0000.csv.zip';
const NSE_OLD = 'https://nsearchives.nseindia.com/content/historical/EQUITIES/{yyyy}/{MON}/cm{dd}{MON}{yyyy}bhav.csv.zip';
const ALLOWED_SERIES = new Set(['EQ', 'BE', 'BZ', 'SM', 'ST', 'SZ'] );
const FILTERED_SYMBOL_TOKENS = ['-BC', '-BL', '-T0'];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function hasArg(name) { return process.argv.includes(`--${name}`); }
function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) throw new Error(`Invalid date: ${value}`);
  const d = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error(`Invalid date: ${value}`);
  return d;
}
function fmt(d) { return d.toISOString().slice(0, 10); }
function yyyymmdd(d) { return fmt(d).replace(/-/g, ''); }
function oldParts(d) { const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']; return { yyyy:d.getUTCFullYear(), MON:months[d.getUTCMonth()], dd:String(d.getUTCDate()).padStart(2,'0') }; }
function nextDay(d) { const n=new Date(d); n.setUTCDate(n.getUTCDate()+1); return n; }
function dateRange(from, to) { const out=[]; for(let d=from;d<=to;d=nextDay(d)) out.push(new Date(d)); return out; }
function num(v) { if (v === null || v === undefined || String(v).trim() === '') return null; const n=Number(String(v).replace(/,/g,'')); return Number.isFinite(n) ? n : null; }

function parseCsv(text) {
  const rows=[]; let row=[]; let cell=''; let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){cell+='"'; i++;}
      else quoted=!quoted;
    } else if(ch===',' && !quoted){row.push(cell); cell='';}
    else if((ch==='\n' || ch==='\r') && !quoted){
      if(ch==='\r' && text[i+1]==='\n') i++;
      row.push(cell); cell=''; if(row.some(v=>v!=='') ) rows.push(row); row=[];
    } else cell+=ch;
  }
  if(cell!=='' || row.length){row.push(cell); if(row.some(v=>v!=='')) rows.push(row);}
  if(!rows.length) return [];
  const headers=rows[0].map(v=>String(v).trim());
  return rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,String(values[i]??'').trim()])));
}

function extractZip(buffer) {
  // Minimal ZIP reader supporting the two methods used by exchange CSV bundles:
  // stored (0) and deflate (8). This avoids adding a runtime dependency solely
  // for an exchange archive format.
  const sig=Buffer.from('PK\x03\x04','binary');
  let pos=0;
  while(pos < buffer.length-4){
    const start=buffer.indexOf(sig,pos);
    if(start<0) break;
    const method=buffer.readUInt16LE(start+8);
    const compressedSize=buffer.readUInt32LE(start+18);
    const nameLen=buffer.readUInt16LE(start+26);
    const extraLen=buffer.readUInt16LE(start+28);
    const name=buffer.slice(start+30,start+30+nameLen).toString('utf8');
    const dataStart=start+30+nameLen+extraLen;
    const data=buffer.slice(dataStart,dataStart+compressedSize);
    let out;
    if(method===0) out=data;
    else if(method===8) out=zlib.inflateRawSync(data);
    else throw new Error(`Unsupported ZIP compression method ${method} for ${name}`);
    if(name.toLowerCase().endsWith('.csv')) return out.toString('utf8');
    pos=dataStart+compressedSize;
  }
  throw new Error('No CSV member found in exchange ZIP');
}

function download(url) {
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{headers:{'User-Agent':'Tara-AI-Official-Bhavcopy-Ingestion/1.0','Accept':'application/zip, text/csv, application/octet-stream'}},res=>{
      if(res.statusCode>=300 && res.statusCode<400 && res.headers.location) return download(new URL(res.headers.location,url).toString()).then(resolve,reject);
      const chunks=[]; res.on('data',c=>chunks.push(c)); res.on('end',()=>{const body=Buffer.concat(chunks); if(res.statusCode!==200)return reject(new Error(`HTTP ${res.statusCode}`)); resolve(body);});
    });
    req.setTimeout(30000,()=>req.destroy(new Error('Download timeout'))); req.on('error',reject);
  });
}

function pick(row, names) { for(const n of names){ if(Object.prototype.hasOwnProperty.call(row,n) && row[n] !== '') return row[n]; } return null; }
function normalizeNew(row, sourceUrl) {
  const series=String(pick(row,['SctySrs','SctySrsNm','Series'])||'').toUpperCase();
  if(!ALLOWED_SERIES.has(series)) return null;
  const symbol=String(pick(row,['TckrSymb','Symbol'])||'').trim().toUpperCase();
  const tradeDate=String(pick(row,['TradDt','TradeDate'])||'').slice(0,10);
  const isin=pick(row,['ISIN','ISINCode','ISIN_CODE']);
  const open=num(pick(row,['OpnPric','OPEN'])); const high=num(pick(row,['HghPric','HIGH'])); const low=num(pick(row,['LwPric','LOW'])); const close=num(pick(row,['ClsPric','CLOSE'])); const volume=num(pick(row,['TtlTradgVol','TOTTRDQTY','Volume']));
  if(!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) || ![open,high,low,close].every(Number.isFinite)) return null;
  if(open<0||high<0||low<0||close<0||high<Math.max(open,high*0+low,close)||low>Math.min(open,high,close)) return null;
  if(FILTERED_SYMBOL_TOKENS.some(t=>symbol.includes(t))) return null;
  return {exchange:'NSE',symbol,isin:isin?String(isin).trim().toUpperCase():null,trade_date:tradeDate,open,high,low,close,volume:volume===null?null:Math.trunc(volume),source:'NSE_BHAVCOPY',source_url:sourceUrl,verified:true};
}
function normalizeOld(row, sourceUrl) {
  const series=String(pick(row,['SERIES','Series'])||'').toUpperCase();
  if(!ALLOWED_SERIES.has(series)) return null;
  const symbol=String(pick(row,['SYMBOL','Symbol'])||'').trim().toUpperCase();
  const rawDate=String(pick(row,['TIMESTAMP','TradeDate'])||'').trim();
  const m=rawDate.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/); if(!m) return null;
  const months={JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'}; const tradeDate=`${m[3]}-${months[m[2].toUpperCase()]||'00'}-${m[1]}`;
  if(tradeDate.includes('-00-')) return null;
  const open=num(pick(row,['OPEN','Open'])); const high=num(pick(row,['HIGH','High'])); const low=num(pick(row,['LOW','Low'])); const close=num(pick(row,['CLOSE','Close'])); const volume=num(pick(row,['TOTTRDQTY','Volume']));
  if(!symbol || ![open,high,low,close].every(Number.isFinite)) return null;
  if(open<0||high<0||low<0||close<0||high<Math.max(open,high*0+low,close)||low>Math.min(open,high,close)) return null;
  if(FILTERED_SYMBOL_TOKENS.some(t=>symbol.includes(t))) return null;
  return {exchange:'NSE',symbol,isin:pick(row,['ISIN','ISIN_CODE'])||null,trade_date:tradeDate,open,high,low,close,volume:volume===null?null:Math.trunc(volume),source:'NSE_BHAVCOPY',source_url:sourceUrl,verified:true};
}

async function ingestDate(date) {
  if(date.getUTCDay()===0 || date.getUTCDay()===6) return {date:fmt(date),status:'weekend',rows:0};
  const urls=[NSE_NEW.replace('{yyyymmdd}',yyyymmdd(date))]; const p=oldParts(date); urls.push(NSE_OLD.replace('{yyyy}',p.yyyy).replaceAll('{MON}',p.MON).replace('{dd}',p.dd));
  let lastError=null;
  for(let i=0;i<urls.length;i++){
    try{
      const body=await download(urls[i]); const csv=body.slice(0,2).toString('hex')==='504b'?extractZip(body):body.toString('utf8'); const rows=parseCsv(csv); const normalized=rows.map(r=>i===0?normalizeNew(r,urls[i]):normalizeOld(r,urls[i])).filter(Boolean);
      return {date:fmt(date),status:'processed',format:i===0?'udiff':'legacy',rows:normalized.length,candles:normalized};
    } catch(e){lastError=e;}
  }
  return {date:fmt(date),status:'no-source-data',rows:0,error:lastError?.message||'Unknown source error'};
}

async function main(){
  const single=arg('date'); const fromArg=arg('from'); const toArg=arg('to'); const from=parseDate(single||fromArg||fmt(new Date(Date.now()-86400000))); const to=parseDate(single||toArg||fmt(from));
  if(to<from) throw new Error('--to must be on/after --from');
  const dryRun=hasArg('dry-run') || String(process.env.BHAVCOPY_DRY_RUN||'true').toLowerCase()!=='false';
  const allowWrite=String(process.env.BHAVCOPY_ALLOW_DATABASE_WRITE||'false').toLowerCase()==='true';
  const allowRedistribution=String(process.env.BHAVCOPY_REDISTRIBUTION_PERMISSION||'false').toLowerCase()==='true';
  if(!dryRun && (!allowWrite || !allowRedistribution)) throw new Error('Database/website ingestion is disabled until applicable exchange data permissions are explicitly configured. Use --dry-run to validate source files.');
  const results=[]; let total=0;
  for(const d of dateRange(from,to)){ const r=await ingestDate(d); results.push(r); total+=r.rows; if(!hasArg('quiet')) console.error(`[Bhavcopy] ${r.date} ${r.status} rows=${r.rows}${r.error?` error=${r.error}`:''}`); if(r.candles && !dryRun){ const out=arg('output',path.join(process.cwd(),'data','bhavcopy','ohlcv_daily.ndjson')); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.appendFileSync(out,r.candles.map(v=>JSON.stringify(v)).join('\n')+'\n'); } }
  process.stdout.write(JSON.stringify({success:true,dry_run:dryRun,from:fmt(from),to:fmt(to),total_rows:total,results:results.map(({candles,...rest})=>rest)},null,2)+'\n');
}

if(require.main===module) main().catch(e=>{console.error(`[Bhavcopy] ${e.message}`);process.exitCode=1;});
module.exports={parseCsv,extractZip,normalizeNew,normalizeOld,ingestDate};
