'use strict';
const http=require('http');
const base=String(process.env.TARA_BASE_URL||'http://127.0.0.1:4000').replace(/\/$/,'');
const total=Math.min(Number(process.env.LOAD_REQUESTS||40),200);
const concurrency=Math.min(Number(process.env.LOAD_CONCURRENCY||8),20);
function get(){return new Promise((resolve,reject)=>{const started=Date.now();const req=http.get(`${base}/api/health`,res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,ms:Date.now()-started}));});req.setTimeout(5000,()=>req.destroy(new Error('timeout')));req.on('error',reject);});}
(async()=>{let next=0,fail=0,max=0;async function worker(){while(true){const i=next++;if(i>=total)return;try{const r=await get();max=Math.max(max,r.ms);if(r.status!==200)fail++;}catch{fail++;}}}await Promise.all(Array.from({length:concurrency},worker));const report={ok:fail===0,total,concurrency,failures:fail,maxLatencyMs:max};console.log(JSON.stringify(report,null,2));if(fail)process.exitCode=1;})().catch(e=>{console.error(e.message);process.exitCode=1;});
