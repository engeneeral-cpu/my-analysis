'use strict';
const http=require('http');
const base=String(process.env.TARA_BASE_URL||'http://127.0.0.1:4000').replace(/\/$/,'');
function get(path){return new Promise((resolve,reject)=>{const req=http.get(`${base}${path}`,res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.setTimeout(5000,()=>req.destroy(new Error('timeout')));req.on('error',reject);});}
(async()=>{
  const endpoints=['/api/health','/api/security-status','/api/tara-intelligence/status','/api/tara-knowledge/status'];
  const results=[];
  for(const endpoint of endpoints){const status=await get(endpoint);results.push({endpoint,status});if(status!==200)throw new Error(`${endpoint} returned HTTP ${status}`);}
  console.log(JSON.stringify({ok:true,checks:results},null,2));
})().catch(error=>{console.error('[Resilience smoke]',error.message);process.exitCode=1;});
