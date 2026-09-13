const https = require('https');
const http = require('http');
const { processQuery } = require('./tara-intelligence-engine');

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url); const lib = target.protocol === 'https:' ? https : http; const payload = JSON.stringify(body);
    const req = lib.request(target,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Content-Length':Buffer.byteLength(payload),...headers}},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300){const e=new Error(`AI provider HTTP ${res.statusCode}`);e.statusCode=res.statusCode;reject(e);return;}try{resolve(JSON.parse(text));}catch{reject(new Error('AI provider returned non-JSON data'));}});});
    req.setTimeout(30000,()=>req.destroy(new Error('AI provider timeout'))); req.on('error',reject); req.write(payload); req.end();
  });
}
function cleanKey(value){let key=String(value||'').trim();const m=key.match(/^export\s+(?:TARA_AI_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)\s*=\s*(.+)$/i);if(m)key=m[1].trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return !key||key.startsWith('<')||['OPENAI_API_KEY','GEMINI_API_KEY'].includes(key)?'':key;}
function getExternalProvider(){const key=cleanKey(process.env.GEMINI_API_KEY);if(!key)return null;return {provider:'gemini',key,url:process.env.TARA_AI_API_URL||'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',model:process.env.TARA_AI_MODEL||'gemini-2.5-flash-lite'};}
function extract(raw){if(typeof raw?.output_text==='string')return raw.output_text.trim();return raw?.choices?.[0]?.message?.content||raw?.response||'';}
const SYSTEM='You are Tara AI. Be warm, respectful and concise. Focus only on market intelligence, finance education and company research. Never invent live/historical market data, sources or financial numbers. Distinguish facts, analysis, scenarios and uncertainty. Never guarantee profit or give harmful instructions. Support English, Hindi, Telugu, Marathi, Tamil, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Konkani and Nepali.';

function registerAIChatRoutes(app){
  app.get('/api/ai/status',(req,res)=>{const external=getExternalProvider();res.set('Cache-Control','no-store');res.json({success:true,nativeEngine:true,nativeMode:'primary',externalFallback:Boolean(external),provider:external?.provider||'native',model:external?.model||'native-rule-engine',voice:'browser-speech-ready',languages:['en','hi','te','mr','ta','bn','gu','kn','ml','pa','or','as','ur','gom','ne']});});
  app.post('/api/ai/chat',async(req,res)=>{
    const messages=(Array.isArray(req.body?.messages)?req.body.messages:[]).slice(-20).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:String(m?.content||'').slice(0,4000)})).filter(m=>m.content);
    if(!messages.length)return res.status(400).json({success:false,error:'Message is required'});
    const latest=messages[messages.length-1].content;
    // Native Tara is always the first decision layer. External AI is optional and replaceable, never mandatory.
    const native=processQuery(latest,req.body?.stockContext||{});
    const external=getExternalProvider();
    if(!external){return res.json({success:true,ai:true,native:true,provider:'native',reply:native.text,analysis:native,model:'native-rule-engine',asOf:new Date().toISOString()});}
    try{
      const raw=await postJson(external.url,{model:external.model,messages:[{role:'system',content:SYSTEM},...messages],max_tokens:900,temperature:.4},{Authorization:`Bearer ${external.key}`});
      const text=extract(raw); if(!text)throw new Error('No external response');
      res.set('Cache-Control','no-store');res.json({success:true,ai:true,native:true,provider:'gemini-fallback',reply:text,nativeAnalysis:native,model:external.model,asOf:new Date().toISOString()});
    }catch(e){
      // Provider failure never breaks Tara: return the native answer instead.
      console.error('[Tara AI] optional provider unavailable:',e.message);
      res.json({success:true,ai:true,native:true,provider:'native',fallbackFrom:'gemini',reply:native.text,analysis:native,model:'native-rule-engine',asOf:new Date().toISOString()});
    }
  });
}
module.exports={registerAIChatRoutes};