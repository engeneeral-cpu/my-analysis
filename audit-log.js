'use strict';

let pool=null;
let ready=false;
const memory=[];

async function initAuditStore(){
  const url=process.env.POSTGRES_URL||process.env.DATABASE_URL;
  if(!url)return false;
  try{
    const {Pool}=require('pg');
    pool=new Pool({connectionString:url,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined,max:3});
    await pool.query(`CREATE TABLE IF NOT EXISTS market_analysis_audit_log (id BIGSERIAL PRIMARY KEY, event_type TEXT NOT NULL, identity_type TEXT, identity_hash TEXT, ip_hash TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    ready=true;
    return true;
  }catch(error){console.error('[Audit] store unavailable:',error.message);pool=null;ready=false;return false;}
}

function digest(value){const crypto=require('crypto');return crypto.createHash('sha256').update(String(value||'')).digest('hex').slice(0,24);}
async function audit(eventType,{identityType,identity,ip,metadata}={}){
  const safe={event_type:String(eventType).slice(0,80),identity_type:identityType?String(identityType).slice(0,30):null,identity_hash:identity?digest(identity):null,ip_hash:ip?digest(ip):null,metadata:metadata&&typeof metadata==='object'?metadata:{}};
  if(ready){try{await pool.query('INSERT INTO market_analysis_audit_log (event_type,identity_type,identity_hash,ip_hash,metadata) VALUES ($1,$2,$3,$4,$5)',[safe.event_type,safe.identity_type,safe.identity_hash,safe.ip_hash,JSON.stringify(safe.metadata)]);return;}catch(error){console.error('[Audit] write failed:',error.message);}}
  memory.push({...safe,created_at:new Date().toISOString()});
  if(memory.length>500)memory.shift();
}
function status(){return {configured:ready,persistent:ready,fallback:'bounded-memory',eventsInFallback:memory.length,privacy:'credentials, OTPs and raw secrets are never logged'};}
module.exports={initAuditStore,audit,status};
